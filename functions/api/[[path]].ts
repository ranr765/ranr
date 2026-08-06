/**
 * Standing — API.
 *
 * A single Cloudflare Pages Function handling every /api/* route. Kept in one
 * file for the same reason the rest of this app is small: it is a private tool
 * for one person, and a router you can read top to bottom beats a directory of
 * indirection.
 */

import {
  computeTargets,
  rollingWeight,
  type ActivityLevel,
  type Goal,
  type Sex,
  type Targets,
} from '../../shared/targets.ts';
import {
  describeBudget,
  loggingStreak,
  pacing,
  sumNutrients,
  type Nutrients,
  type Slot,
  type SlotAverages,
} from '../../shared/standing.ts';

export interface Env {
  DB: D1Database;
  /** Optional. When set, accounts after the first need this code to register. */
  SIGNUP_CODE?: string;
}

type Ctx = EventContext<Env, string, Record<string, unknown>>;

const SESSION_COOKIE = 'standing_session';
const SESSION_DAYS = 90;
const PBKDF2_ITERATIONS = 150_000;

/* ------------------------------------------------------------------ helpers */

const json = (data: unknown, status = 200, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', ...headers },
  });

const fail = (status: number, message: string, extra: Record<string, unknown> = {}) =>
  json({ error: message, ...extra }, status);

const nowIso = () => new Date().toISOString();
const uid = () => crypto.randomUUID();

/** 'YYYY-MM-DD' in the given IANA timezone. Correct while travelling. */
function localDate(timezone: string, at: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(at);
}

/** Fractional local hour, e.g. 14.5 for 14:30. */
function localHour(timezone: string, at: Date = new Date()): number {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: timezone, hour: '2-digit', minute: '2-digit', hour12: false,
  }).formatToParts(at);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? 0);
  return (get('hour') % 24) + get('minute') / 60;
}

function isValidTimezone(tz: string): boolean {
  try {
    new Intl.DateTimeFormat('en', { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

const isDate = (s: unknown): s is string => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s);

function shiftDate(date: string, days: number): string {
  return new Date(Date.parse(date + 'T00:00:00Z') + days * 86_400_000).toISOString().slice(0, 10);
}

const num = (v: unknown, fallback = 0): number => {
  const n = typeof v === 'string' ? Number(v) : typeof v === 'number' ? v : NaN;
  return Number.isFinite(n) ? n : fallback;
};

/* --------------------------------------------------------------------- auth */

const b64 = (bytes: ArrayBuffer | Uint8Array) =>
  btoa(String.fromCharCode(...(bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes))));

async function hashPassword(password: string, salt: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits'],
  );
  const bits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: Uint8Array.from(atob(salt), (c) => c.charCodeAt(0)),
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    key, 256,
  );
  return b64(bits);
}

/** Constant-time-ish comparison, so a wrong password leaks nothing by timing. */
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function readCookie(request: Request, name: string): string | null {
  const header = request.headers.get('cookie');
  if (!header) return null;
  for (const part of header.split(';')) {
    const [k, ...rest] = part.trim().split('=');
    if (k === name) return decodeURIComponent(rest.join('='));
  }
  return null;
}

function sessionCookie(id: string, maxAgeSeconds: number): string {
  return [
    `${SESSION_COOKIE}=${id}`,
    'Path=/',
    'HttpOnly',
    'Secure',
    'SameSite=Lax',
    `Max-Age=${maxAgeSeconds}`,
  ].join('; ');
}

interface UserRow { id: string; email: string; }
interface ProfileRow {
  user_id: string; display_name: string | null; sex: Sex; birth_date: string | null;
  height_cm: number | null; activity: ActivityLevel; goal: Goal; rate_pct_per_week: number;
  protein_g_per_kg: number | null; fat_pct_of_energy: number | null; timezone: string;
  use_active_energy: number; onboarded_at: string | null;
}

async function authenticate(ctx: Ctx): Promise<{ user: UserRow; profile: ProfileRow } | null> {
  const sid = readCookie(ctx.request, SESSION_COOKIE);
  if (!sid) return null;
  const row = await ctx.env.DB.prepare(
    `SELECT u.id, u.email FROM sessions s
       JOIN users u ON u.id = s.user_id
      WHERE s.id = ?1 AND s.expires_at > ?2`,
  ).bind(sid, nowIso()).first<UserRow>();
  if (!row) return null;
  const profile = await ctx.env.DB.prepare('SELECT * FROM profiles WHERE user_id = ?1')
    .bind(row.id).first<ProfileRow>();
  if (!profile) return null;
  return { user: row, profile };
}

/* ------------------------------------------------------------------ targets */

interface TargetPayload {
  /** What the equations recommend. Always present when the profile allows it,
   *  so the UI can show it beside any manual override. */
  calculated: Targets | null;
  /** What the app actually holds you to: calculated, with overrides applied. */
  effective: Effective;
  overrides: Record<string, number | null>;
  basedOnWeightKg: number | null;
}

/** The calculated targets, plus whatever the user has overridden by hand. */
async function targetsFor(env: Env, profile: ProfileRow, onDate: string): Promise<TargetPayload> {
  const weights = await env.DB.prepare(
    'SELECT date, weight_kg FROM weights WHERE user_id = ?1 AND date <= ?2 ORDER BY date DESC LIMIT 60',
  ).bind(profile.user_id, onDate).all<{ date: string; weight_kg: number }>();

  const weightKg = rollingWeight(
    (weights.results ?? []).map((w) => ({ date: w.date, weightKg: w.weight_kg })),
    onDate,
  );

  const overrideRow = await env.DB.prepare('SELECT * FROM target_overrides WHERE user_id = ?1')
    .bind(profile.user_id).first<Record<string, number | null>>();

  let calculated: Targets | null = null;
  if (weightKg && profile.birth_date && profile.height_cm) {
    calculated = computeTargets({
      sex: profile.sex,
      birthDate: profile.birth_date,
      heightCm: profile.height_cm,
      activity: profile.activity,
      goal: profile.goal,
      ratePctPerWeek: profile.rate_pct_per_week,
      weightKg,
      proteinGPerKg: profile.protein_g_per_kg ?? undefined,
      fatPctOfEnergy: profile.fat_pct_of_energy ?? undefined,
      today: onDate,
    });
  }

  const pick = (key: string, calc: number | undefined): number =>
    overrideRow && overrideRow[key] != null ? Number(overrideRow[key]) : (calc ?? 0);

  const effective: Effective = {
    kcal: pick('calories', calculated?.calories),
    protein: pick('protein_g', calculated?.protein),
    carbs: pick('carbs_g', calculated?.carbs),
    fat: pick('fat_g', calculated?.fat),
    fibre: pick('fibre_g', calculated?.fibre),
    addedSugar: pick('added_sugar_g', calculated?.addedSugar),
    satFat: pick('sat_fat_g', calculated?.satFat),
    sodium: pick('sodium_mg', calculated?.sodium),
    waterMl: pick('water_ml', calculated?.waterMl),
  };

  const overrides: Record<string, number | null> = {};
  for (const k of ['calories', 'protein_g', 'carbs_g', 'fat_g', 'fibre_g', 'added_sugar_g', 'sat_fat_g', 'sodium_mg', 'water_ml']) {
    overrides[k] = overrideRow?.[k] ?? null;
  }

  return { calculated, effective, overrides, basedOnWeightKg: weightKg };
}

interface Effective extends Nutrients { waterMl: number; }

/* ------------------------------------------------------------------ entries */

interface EntryItemRow {
  id: string; entry_id: string; food_id: string | null; label: string; qty: number; unit: string;
  kcal: number; protein_g: number; carbs_g: number; fat_g: number; fibre_g: number;
  added_sugar_g: number; sat_fat_g: number; sodium_mg: number;
  estimated: number; confidence: string; edited: number; position: number;
}

const itemNutrients = (i: EntryItemRow): Nutrients => ({
  kcal: i.kcal, protein: i.protein_g, carbs: i.carbs_g, fat: i.fat_g,
  fibre: i.fibre_g, addedSugar: i.added_sugar_g, satFat: i.sat_fat_g, sodium: i.sodium_mg,
});

const shapeItem = (i: EntryItemRow) => ({
  id: i.id, foodId: i.food_id, label: i.label, qty: i.qty, unit: i.unit,
  ...itemNutrients(i),
  estimated: !!i.estimated, confidence: i.confidence, edited: !!i.edited,
});

async function loadEntries(env: Env, userId: string, date: string) {
  const entries = await env.DB.prepare(
    'SELECT * FROM entries WHERE user_id = ?1 AND date = ?2 ORDER BY eaten_at ASC',
  ).bind(userId, date).all<Record<string, string>>();
  const rows = entries.results ?? [];
  if (rows.length === 0) return [];

  const placeholders = rows.map((_, i) => `?${i + 1}`).join(',');
  const items = await env.DB.prepare(
    `SELECT * FROM entry_items WHERE entry_id IN (${placeholders}) ORDER BY position ASC`,
  ).bind(...rows.map((r) => r.id)).all<EntryItemRow>();

  const byEntry = new Map<string, EntryItemRow[]>();
  for (const item of items.results ?? []) {
    const list = byEntry.get(item.entry_id) ?? [];
    list.push(item);
    byEntry.set(item.entry_id, list);
  }

  return rows.map((e) => {
    const own = byEntry.get(e.id) ?? [];
    return {
      id: e.id,
      date: e.date,
      eatenAt: e.eaten_at,
      slot: e.slot as Slot,
      note: e.note,
      source: e.source,
      photoKey: e.photo_key,
      items: own.map(shapeItem),
      totals: sumNutrients(own.map(itemNutrients)),
      estimated: own.some((i) => i.estimated),
    };
  });
}

/** Average calories per meal slot from the user's own history, for the budget copy. */
async function slotAverages(env: Env, userId: string, before: string): Promise<SlotAverages> {
  const rows = await env.DB.prepare(
    `SELECT e.slot AS slot, SUM(i.kcal) AS kcal
       FROM entries e JOIN entry_items i ON i.entry_id = e.id
      WHERE e.user_id = ?1 AND e.date < ?2 AND e.date >= ?3
      GROUP BY e.id, e.slot`,
  ).bind(userId, before, shiftDate(before, -30)).all<{ slot: Slot; kcal: number }>();

  const totals: Partial<Record<Slot, { sum: number; n: number }>> = {};
  for (const r of rows.results ?? []) {
    const t = totals[r.slot] ?? { sum: 0, n: 0 };
    t.sum += r.kcal;
    t.n += 1;
    totals[r.slot] = t;
  }
  const out: SlotAverages = {};
  for (const [slot, t] of Object.entries(totals)) {
    // Two data points is not an average worth trusting.
    if (t && t.n >= 3) out[slot as Slot] = t.sum / t.n;
  }
  return out;
}

/* ------------------------------------------------------------------- router */

export const onRequest: PagesFunction<Env> = async (context) => {
  const ctx = context as Ctx;
  const url = new URL(ctx.request.url);
  const path = url.pathname.replace(/^\/api\/?/, '').replace(/\/$/, '');
  const method = ctx.request.method.toUpperCase();

  try {
    return await route(ctx, method, path, url);
  } catch (err) {
    console.error('api error', path, err);
    return fail(500, 'Something went wrong on our side.');
  }
};

async function route(ctx: Ctx, method: string, path: string, url: URL): Promise<Response> {
  const { env } = ctx;
  const body = method === 'GET' || method === 'DELETE'
    ? {}
    : await ctx.request.json().catch(() => ({})) as Record<string, unknown>;

  /* ---- open routes ---- */

  if (path === 'health') return json({ ok: true });

  if (path === 'auth/needs-setup' && method === 'GET') {
    const row = await env.DB.prepare('SELECT COUNT(*) AS n FROM users').first<{ n: number }>();
    return json({ needsSetup: (row?.n ?? 0) === 0 });
  }

  if (path === 'auth/register' && method === 'POST') {
    const email = String(body.email ?? '').trim().toLowerCase();
    const password = String(body.password ?? '');
    if (!email.includes('@')) return fail(400, 'That does not look like an email address.');
    if (password.length < 8) return fail(400, 'Use at least 8 characters.');

    const count = await env.DB.prepare('SELECT COUNT(*) AS n FROM users').first<{ n: number }>();
    if ((count?.n ?? 0) > 0) {
      const code = env.SIGNUP_CODE;
      if (!code || String(body.signupCode ?? '') !== code) {
        return fail(403, 'This app is already set up.');
      }
    }

    const existing = await env.DB.prepare('SELECT id FROM users WHERE email = ?1').bind(email).first();
    if (existing) return fail(409, 'That email is already registered.');

    const salt = b64(crypto.getRandomValues(new Uint8Array(16)));
    const hash = await hashPassword(password, salt);
    const userId = uid();
    const at = nowIso();
    const tz = isValidTimezone(String(body.timezone ?? '')) ? String(body.timezone) : 'Europe/Zurich';

    await env.DB.batch([
      env.DB.prepare(
        'INSERT INTO users (id, email, password_hash, password_salt, created_at) VALUES (?1,?2,?3,?4,?5)',
      ).bind(userId, email, hash, salt, at),
      env.DB.prepare(
        `INSERT INTO profiles (user_id, timezone, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?3)`,
      ).bind(userId, tz, at),
    ]);

    const sid = await startSession(env, userId);
    return json({ ok: true }, 201, { 'set-cookie': sessionCookie(sid, SESSION_DAYS * 86400) });
  }

  if (path === 'auth/login' && method === 'POST') {
    const email = String(body.email ?? '').trim().toLowerCase();
    const password = String(body.password ?? '');
    const user = await env.DB.prepare(
      'SELECT id, password_hash, password_salt FROM users WHERE email = ?1',
    ).bind(email).first<{ id: string; password_hash: string; password_salt: string }>();

    // Hash regardless, so a missing account and a wrong password take the same time.
    const salt = user?.password_salt ?? b64(new Uint8Array(16));
    const attempt = await hashPassword(password, salt);
    if (!user || !safeEqual(attempt, user.password_hash)) {
      return fail(401, 'Email or password is wrong.');
    }

    const sid = await startSession(env, user.id);
    return json({ ok: true }, 200, { 'set-cookie': sessionCookie(sid, SESSION_DAYS * 86400) });
  }

  if (path === 'auth/logout' && method === 'POST') {
    const sid = readCookie(ctx.request, SESSION_COOKIE);
    if (sid) await env.DB.prepare('DELETE FROM sessions WHERE id = ?1').bind(sid).run();
    return json({ ok: true }, 200, { 'set-cookie': sessionCookie('', 0) });
  }

  /* ---- everything below needs a session ---- */

  const auth = await authenticate(ctx);
  if (!auth) return fail(401, 'Not signed in.');
  const { user, profile } = auth;
  const tz = profile.timezone;

  if (path === 'me' && method === 'GET') {
    const today = localDate(tz);
    return json({
      user: { id: user.id, email: user.email },
      profile: shapeProfile(profile),
      targets: await targetsFor(env, profile, today),
      today,
    });
  }

  if (path === 'profile' && method === 'PUT') {
    const sex = ['male', 'female', 'unspecified'].includes(String(body.sex)) ? String(body.sex) : profile.sex;
    const activity = ['sedentary', 'light', 'moderate', 'active', 'very_active'].includes(String(body.activity))
      ? String(body.activity) : profile.activity;
    const goal = ['lose', 'maintain', 'gain'].includes(String(body.goal)) ? String(body.goal) : profile.goal;
    const timezone = isValidTimezone(String(body.timezone ?? '')) ? String(body.timezone) : profile.timezone;
    const birthDate = isDate(body.birthDate) ? body.birthDate : profile.birth_date;
    const heightCm = body.heightCm != null ? num(body.heightCm, profile.height_cm ?? 0) : profile.height_cm;
    const rate = body.ratePctPerWeek != null ? num(body.ratePctPerWeek, profile.rate_pct_per_week) : profile.rate_pct_per_week;

    if (heightCm != null && (heightCm < 80 || heightCm > 250)) {
      return fail(400, 'Height should be between 80 and 250 cm.');
    }

    await env.DB.prepare(
      `UPDATE profiles SET display_name=?2, sex=?3, birth_date=?4, height_cm=?5, activity=?6,
         goal=?7, rate_pct_per_week=?8, protein_g_per_kg=?9, timezone=?10,
         use_active_energy=?11, onboarded_at=COALESCE(onboarded_at, ?12), updated_at=?12
       WHERE user_id=?1`,
    ).bind(
      user.id,
      body.displayName != null ? String(body.displayName).slice(0, 80) : profile.display_name,
      sex, birthDate, heightCm, activity, goal, rate,
      body.proteinGPerKg != null ? num(body.proteinGPerKg) : profile.protein_g_per_kg,
      timezone,
      body.useActiveEnergy != null ? (body.useActiveEnergy ? 1 : 0) : profile.use_active_energy,
      nowIso(),
    ).run();

    // An initial weight can arrive with the profile during onboarding.
    if (body.weightKg != null) {
      await upsertWeight(env, user.id, localDate(timezone), num(body.weightKg));
    }

    const fresh = await env.DB.prepare('SELECT * FROM profiles WHERE user_id=?1')
      .bind(user.id).first<ProfileRow>();
    const today = localDate(timezone);
    const targets = await targetsFor(env, fresh!, today);
    return json({ profile: shapeProfile(fresh!), targets });
  }

  if (path === 'targets' && method === 'PUT') {
    // null clears an override and returns that field to the calculated value.
    const cols = ['calories', 'protein_g', 'carbs_g', 'fat_g', 'fibre_g', 'added_sugar_g', 'sat_fat_g', 'sodium_mg', 'water_ml'];
    const keys: Record<string, string> = {
      calories: 'calories', protein: 'protein_g', carbs: 'carbs_g', fat: 'fat_g',
      fibre: 'fibre_g', addedSugar: 'added_sugar_g', satFat: 'sat_fat_g',
      sodium: 'sodium_mg', waterMl: 'water_ml',
    };
    const existing = await env.DB.prepare('SELECT * FROM target_overrides WHERE user_id=?1')
      .bind(user.id).first<Record<string, number | null>>();
    const next: Record<string, number | null> = {};
    for (const col of cols) next[col] = existing?.[col] ?? null;
    for (const [inKey, col] of Object.entries(keys)) {
      if (inKey in body) next[col] = body[inKey] == null ? null : num(body[inKey]);
    }

    await env.DB.prepare(
      `INSERT INTO target_overrides (user_id, ${cols.join(',')}, updated_at)
       VALUES (?1, ${cols.map((_, i) => `?${i + 2}`).join(',')}, ?${cols.length + 2})
       ON CONFLICT(user_id) DO UPDATE SET
         ${cols.map((c, i) => `${c}=?${i + 2}`).join(', ')}, updated_at=?${cols.length + 2}`,
    ).bind(user.id, ...cols.map((c) => next[c]), nowIso()).run();

    const today = localDate(tz);
    return json({ targets: await targetsFor(env, profile, today) });
  }

  /* ---- the standing view ---- */

  if (path === 'day' && method === 'GET') {
    const date = isDate(url.searchParams.get('date')) ? url.searchParams.get('date')! : localDate(tz);
    const today = localDate(tz);
    const isToday = date === today;

    const [targets, entries, water, averages] = await Promise.all([
      targetsFor(env, profile, date),
      loadEntries(env, user.id, date),
      env.DB.prepare('SELECT COALESCE(SUM(ml),0) AS ml FROM water_log WHERE user_id=?1 AND date=?2')
        .bind(user.id, date).first<{ ml: number }>(),
      slotAverages(env, user.id, date),
    ]);

    const { effective } = targets;
    const consumed = sumNutrients(entries.map((e) => e.totals));
    // Past days are shown as they finished, not as they stood at this hour.
    const hour = isToday ? localHour(tz) : 23.99;
    const pace = pacing(consumed.kcal, effective.kcal, hour);
    const remainingKcal = effective.kcal - consumed.kcal;

    const logged = await env.DB.prepare(
      'SELECT DISTINCT date FROM entries WHERE user_id=?1 AND date <= ?2 ORDER BY date DESC LIMIT 400',
    ).bind(user.id, today).all<{ date: string }>();

    return json({
      date,
      isToday,
      timezone: tz,
      localHour: hour,
      targets,
      consumed,
      remaining: {
        kcal: remainingKcal,
        protein: effective.protein - consumed.protein,
        carbs: effective.carbs - consumed.carbs,
        fat: effective.fat - consumed.fat,
      },
      pace,
      budget: describeBudget(remainingKcal, effective.kcal, averages),
      entries,
      water: { ml: water?.ml ?? 0, targetMl: effective.waterMl },
      streak: loggingStreak((logged.results ?? []).map((r) => r.date), today),
    });
  }

  /* ---- logging ---- */

  if (path === 'entries' && method === 'POST') {
    const items = Array.isArray(body.items) ? body.items as Record<string, unknown>[] : [];
    if (items.length === 0) return fail(400, 'An entry needs at least one item.');

    const clientId = body.clientId ? String(body.clientId) : uid();
    const existing = await env.DB.prepare('SELECT id FROM entries WHERE user_id=?1 AND client_id=?2')
      .bind(user.id, clientId).first<{ id: string }>();
    if (existing) {
      // A replayed offline request. Return the entry rather than logging it twice.
      const date = await env.DB.prepare('SELECT date FROM entries WHERE id=?1').bind(existing.id).first<{ date: string }>();
      return json({ id: existing.id, duplicate: true, date: date?.date }, 200);
    }

    const eatenAt = typeof body.eatenAt === 'string' ? body.eatenAt : nowIso();
    const date = isDate(body.date) ? body.date : localDate(tz, new Date(eatenAt));
    const slot = ['breakfast', 'lunch', 'dinner', 'snack'].includes(String(body.slot))
      ? String(body.slot) : slotForHour(localHour(tz, new Date(eatenAt)));
    const entryId = uid();
    const at = nowIso();

    const statements = [
      env.DB.prepare(
        `INSERT INTO entries (id, user_id, date, eaten_at, slot, note, source, photo_key, client_id, created_at)
         VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10)`,
      ).bind(
        entryId, user.id, date, eatenAt, slot,
        body.note != null ? String(body.note).slice(0, 500) : null,
        ['manual', 'repeat', 'text', 'photo'].includes(String(body.source)) ? String(body.source) : 'manual',
        body.photoKey != null ? String(body.photoKey) : null,
        clientId, at,
      ),
    ];

    items.forEach((item, index) => {
      const qty = num(item.qty, 1);
      statements.push(env.DB.prepare(
        `INSERT INTO entry_items
           (id, entry_id, food_id, label, qty, unit, kcal, protein_g, carbs_g, fat_g,
            fibre_g, added_sugar_g, sat_fat_g, sodium_mg, estimated, confidence, edited, position)
         VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13,?14,?15,?16,?17,?18)`,
      ).bind(
        uid(), entryId,
        item.foodId != null ? String(item.foodId) : null,
        String(item.label ?? 'Item').slice(0, 200),
        qty,
        String(item.unit ?? 'serving').slice(0, 40),
        num(item.kcal), num(item.protein), num(item.carbs), num(item.fat),
        num(item.fibre), num(item.addedSugar), num(item.satFat), num(item.sodium),
        item.estimated ? 1 : 0,
        ['measured', 'high', 'medium', 'low'].includes(String(item.confidence)) ? String(item.confidence) : 'measured',
        item.edited ? 1 : 0,
        index,
      ));
    });

    // Count the food as used, so repeats surface what is actually eaten often.
    for (const item of items) {
      if (item.foodId) {
        statements.push(env.DB.prepare(
          'UPDATE foods SET times_used = times_used + 1, last_used_at = ?2 WHERE id = ?1 AND user_id = ?3',
        ).bind(String(item.foodId), at, user.id));
      }
    }

    await env.DB.batch(statements);
    return json({ id: entryId, date, slot }, 201);
  }

  const entryMatch = path.match(/^entries\/([\w-]+)$/);
  if (entryMatch && (method === 'DELETE' || method === 'PATCH')) {
    const id = entryMatch[1];
    const owned = await env.DB.prepare('SELECT id, date FROM entries WHERE id=?1 AND user_id=?2')
      .bind(id, user.id).first<{ id: string; date: string }>();
    if (!owned) return fail(404, 'No such entry.');

    if (method === 'DELETE') {
      await env.DB.batch([
        env.DB.prepare('DELETE FROM entry_items WHERE entry_id=?1').bind(id),
        env.DB.prepare('DELETE FROM entries WHERE id=?1').bind(id),
      ]);
      return json({ ok: true, date: owned.date });
    }

    // PATCH edits one item's numbers — the manual override on an estimate.
    const itemId = String(body.itemId ?? '');
    const item = await env.DB.prepare(
      'SELECT * FROM entry_items WHERE id=?1 AND entry_id=?2',
    ).bind(itemId, id).first<EntryItemRow>();
    if (!item) return fail(404, 'No such item.');

    await env.DB.prepare(
      `UPDATE entry_items SET label=?2, qty=?3, kcal=?4, protein_g=?5, carbs_g=?6, fat_g=?7,
         fibre_g=?8, added_sugar_g=?9, sat_fat_g=?10, sodium_mg=?11, edited=1, estimated=?12,
         confidence=?13
       WHERE id=?1`,
    ).bind(
      itemId,
      body.label != null ? String(body.label).slice(0, 200) : item.label,
      body.qty != null ? num(body.qty, item.qty) : item.qty,
      body.kcal != null ? num(body.kcal) : item.kcal,
      body.protein != null ? num(body.protein) : item.protein_g,
      body.carbs != null ? num(body.carbs) : item.carbs_g,
      body.fat != null ? num(body.fat) : item.fat_g,
      body.fibre != null ? num(body.fibre) : item.fibre_g,
      body.addedSugar != null ? num(body.addedSugar) : item.added_sugar_g,
      body.satFat != null ? num(body.satFat) : item.sat_fat_g,
      body.sodium != null ? num(body.sodium) : item.sodium_mg,
      // A hand-corrected number is no longer an estimate.
      0, 'measured',
    ).run();
    return json({ ok: true, date: owned.date });
  }

  /* ---- foods and repeats ---- */

  if (path === 'foods' && method === 'GET') {
    const q = (url.searchParams.get('q') ?? '').trim();
    const like = `%${q.replace(/[%_]/g, '')}%`;
    const rows = q
      ? await env.DB.prepare(
          `SELECT * FROM foods WHERE user_id=?1 AND archived=0 AND name LIKE ?2 COLLATE NOCASE
             ORDER BY times_used DESC, last_used_at DESC LIMIT 40`,
        ).bind(user.id, like).all()
      : await env.DB.prepare(
          `SELECT * FROM foods WHERE user_id=?1 AND archived=0
             ORDER BY times_used DESC, last_used_at DESC LIMIT 40`,
        ).bind(user.id).all();
    return json({ foods: (rows.results ?? []).map(shapeFood) });
  }

  if (path === 'foods' && method === 'POST') {
    const name = String(body.name ?? '').trim();
    if (!name) return fail(400, 'Give the food a name.');
    const id = uid();
    const at = nowIso();
    await env.DB.prepare(
      `INSERT INTO foods (id, user_id, name, brand, serving_label, serving_grams, kcal, protein_g,
         carbs_g, fat_g, fibre_g, added_sugar_g, sat_fat_g, sodium_mg, source, confidence,
         created_at, updated_at)
       VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13,?14,?15,?16,?17,?17)`,
    ).bind(
      id, user.id, name.slice(0, 200),
      body.brand != null ? String(body.brand).slice(0, 120) : null,
      String(body.servingLabel ?? 'serving').slice(0, 60),
      body.servingGrams != null ? num(body.servingGrams) : null,
      num(body.kcal), num(body.protein), num(body.carbs), num(body.fat),
      num(body.fibre), num(body.addedSugar), num(body.satFat), num(body.sodium),
      ['manual', 'estimate_confirmed', 'estimate'].includes(String(body.source)) ? String(body.source) : 'manual',
      ['measured', 'high', 'medium', 'low'].includes(String(body.confidence)) ? String(body.confidence) : 'measured',
      at,
    ).run();
    return json({ id }, 201);
  }

  if (path === 'repeats' && method === 'GET') {
    // What gets eaten regularly, so re-logging is one tap. Ranked by how often
    // a meal has been logged, with recency breaking ties.
    const rows = await env.DB.prepare(
      `SELECT e.id, e.slot, e.note, MAX(e.eaten_at) AS last_at,
              GROUP_CONCAT(i.label, ' + ') AS labels,
              SUM(i.kcal) AS kcal, SUM(i.protein_g) AS protein
         FROM entries e JOIN entry_items i ON i.entry_id = e.id
        WHERE e.user_id = ?1 AND e.date >= ?2
        GROUP BY e.id
        ORDER BY e.eaten_at DESC
        LIMIT 60`,
    ).bind(user.id, shiftDate(localDate(tz), -45)).all<Record<string, string | number>>();

    // Group identical meals together and count them.
    const groups = new Map<string, { key: string; entryId: string; slot: string; labels: string; kcal: number; protein: number; count: number; lastAt: string }>();
    for (const r of rows.results ?? []) {
      const key = `${r.slot}|${String(r.labels ?? '').toLowerCase()}`;
      const found = groups.get(key);
      if (found) {
        found.count += 1;
      } else {
        groups.set(key, {
          key,
          entryId: String(r.id),
          slot: String(r.slot),
          labels: String(r.labels ?? ''),
          kcal: Math.round(Number(r.kcal)),
          protein: Math.round(Number(r.protein)),
          count: 1,
          lastAt: String(r.last_at),
        });
      }
    }
    const ranked = [...groups.values()]
      .sort((a, b) => b.count - a.count || b.lastAt.localeCompare(a.lastAt))
      .slice(0, 12);
    return json({ repeats: ranked });
  }

  const repeatMatch = path.match(/^repeats\/([\w-]+)$/);
  if (repeatMatch && method === 'GET') {
    // The items of a past entry, ready to re-log.
    const id = repeatMatch[1];
    const owned = await env.DB.prepare('SELECT id, slot, note FROM entries WHERE id=?1 AND user_id=?2')
      .bind(id, user.id).first<{ id: string; slot: string; note: string | null }>();
    if (!owned) return fail(404, 'No such entry.');
    const items = await env.DB.prepare('SELECT * FROM entry_items WHERE entry_id=?1 ORDER BY position')
      .bind(id).all<EntryItemRow>();
    return json({ slot: owned.slot, note: owned.note, items: (items.results ?? []).map(shapeItem) });
  }

  /* ---- water and weight ---- */

  if (path === 'water' && method === 'POST') {
    const ml = num(body.ml, 250);
    const date = isDate(body.date) ? body.date : localDate(tz);
    const clientId = body.clientId ? String(body.clientId) : uid();
    await env.DB.prepare(
      `INSERT INTO water_log (id, user_id, date, ml, client_id, created_at) VALUES (?1,?2,?3,?4,?5,?6)
       ON CONFLICT(user_id, client_id) DO NOTHING`,
    ).bind(uid(), user.id, date, ml, clientId, nowIso()).run();
    const total = await env.DB.prepare('SELECT COALESCE(SUM(ml),0) AS ml FROM water_log WHERE user_id=?1 AND date=?2')
      .bind(user.id, date).first<{ ml: number }>();
    return json({ ml: total?.ml ?? 0 });
  }

  if (path === 'weights' && method === 'POST') {
    const weightKg = num(body.weightKg);
    if (weightKg < 20 || weightKg > 400) return fail(400, 'That weight looks off. Between 20 and 400 kg.');
    const date = isDate(body.date) ? body.date : localDate(tz);
    await upsertWeight(env, user.id, date, weightKg);
    return json({ ok: true, date, weightKg });
  }

  if (path === 'weights' && method === 'GET') {
    const rows = await env.DB.prepare(
      'SELECT date, weight_kg FROM weights WHERE user_id=?1 ORDER BY date DESC LIMIT 400',
    ).bind(user.id).all<{ date: string; weight_kg: number }>();
    return json({ weights: rows.results ?? [] });
  }

  /* ---- export: everything, no lock-in ---- */

  if (path === 'export' && method === 'GET') {
    const tables = ['profiles', 'target_overrides', 'weights', 'foods', 'entries', 'water_log'];
    const out: Record<string, unknown> = {
      exportedAt: nowIso(),
      app: 'standing',
      user: { id: user.id, email: user.email },
    };
    for (const table of tables) {
      const rows = await env.DB.prepare(`SELECT * FROM ${table} WHERE user_id = ?1`).bind(user.id).all();
      out[table] = rows.results ?? [];
    }
    const entryIds = (out.entries as Array<{ id: string }>).map((e) => e.id);
    out.entry_items = entryIds.length
      ? (await env.DB.prepare(
          `SELECT * FROM entry_items WHERE entry_id IN (${entryIds.map((_, i) => `?${i + 1}`).join(',')})`,
        ).bind(...entryIds).all()).results ?? []
      : [];
    return json(out, 200, {
      'content-disposition': `attachment; filename="standing-export-${localDate(tz)}.json"`,
    });
  }

  return fail(404, 'No such endpoint.');
}

/* ------------------------------------------------------------------ small bits */

async function startSession(env: Env, userId: string): Promise<string> {
  const sid = uid();
  const at = new Date();
  const expires = new Date(at.getTime() + SESSION_DAYS * 86_400_000);
  await env.DB.prepare(
    'INSERT INTO sessions (id, user_id, created_at, expires_at) VALUES (?1,?2,?3,?4)',
  ).bind(sid, userId, at.toISOString(), expires.toISOString()).run();
  return sid;
}

async function upsertWeight(env: Env, userId: string, date: string, weightKg: number) {
  await env.DB.prepare(
    `INSERT INTO weights (id, user_id, date, weight_kg, created_at) VALUES (?1,?2,?3,?4,?5)
     ON CONFLICT(user_id, date) DO UPDATE SET weight_kg = ?4`,
  ).bind(uid(), userId, date, weightKg, nowIso()).run();
}

function slotForHour(hour: number): Slot {
  if (hour < 10.5) return 'breakfast';
  if (hour < 15) return 'lunch';
  if (hour < 17.5) return 'snack';
  if (hour < 22) return 'dinner';
  return 'snack';
}

function shapeProfile(p: ProfileRow) {
  return {
    displayName: p.display_name,
    sex: p.sex,
    birthDate: p.birth_date,
    heightCm: p.height_cm,
    activity: p.activity,
    goal: p.goal,
    ratePctPerWeek: p.rate_pct_per_week,
    proteinGPerKg: p.protein_g_per_kg,
    timezone: p.timezone,
    useActiveEnergy: !!p.use_active_energy,
    onboarded: !!p.onboarded_at,
  };
}

function shapeFood(f: Record<string, unknown>) {
  return {
    id: f.id, name: f.name, brand: f.brand,
    servingLabel: f.serving_label, servingGrams: f.serving_grams,
    kcal: f.kcal, protein: f.protein_g, carbs: f.carbs_g, fat: f.fat_g,
    fibre: f.fibre_g, addedSugar: f.added_sugar_g, satFat: f.sat_fat_g, sodium: f.sodium_mg,
    source: f.source, confidence: f.confidence, timesUsed: f.times_used,
  };
}
