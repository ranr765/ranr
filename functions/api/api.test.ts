/**
 * API tests. Runs the real handler against a node:sqlite-backed D1 stand-in,
 * so routing, auth, validation and the day payload are all exercised for real.
 *
 *   node --experimental-strip-types --experimental-sqlite --test functions/api/api.test.ts
 */
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { MockD1 } from '../../dev/d1-mock.ts';
import { onRequest } from './[[path]].ts';

const here = dirname(fileURLToPath(import.meta.url));
const schema = join(here, '../../migrations/0001_init.sql');

let db: MockD1;
let cookie = '';

before(() => {
  db = new MockD1(schema);
});
after(() => db.close());

async function call(
  method: string,
  path: string,
  body?: unknown,
  opts: { withCookie?: boolean } = { withCookie: true },
) {
  const headers: Record<string, string> = { 'content-type': 'application/json' };
  if (opts.withCookie !== false && cookie) headers.cookie = cookie;
  const request = new Request(`https://standing.test/api/${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const response = await (onRequest as any)({ request, env: { DB: db }, params: {} });
  const setCookie = response.headers.get('set-cookie');
  if (setCookie) cookie = setCookie.split(';')[0];
  const text = await response.text();
  return { status: response.status, body: text ? JSON.parse(text) : null };
}

test('a fresh install reports that it needs setup', async () => {
  const res = await call('GET', 'auth/needs-setup');
  assert.equal(res.status, 200);
  assert.equal(res.body.needsSetup, true);
});

test('the day view is closed to anyone without a session', async () => {
  const res = await call('GET', 'day', undefined, { withCookie: false });
  assert.equal(res.status, 401);
});

test('registration rejects a weak password and creates the first account', async () => {
  const weak = await call('POST', 'auth/register', { email: 'a@b.co', password: 'short' });
  assert.equal(weak.status, 400);

  const res = await call('POST', 'auth/register', {
    email: 'Ranjith@Example.com', password: 'a-long-enough-password', timezone: 'Europe/Zurich',
  });
  assert.equal(res.status, 201);
  assert.ok(cookie.startsWith('standing_session='));
});

test('a second registration is refused without a signup code', async () => {
  const res = await call('POST', 'auth/register', { email: 'other@b.co', password: 'a-long-enough-password' });
  assert.equal(res.status, 403);
});

test('email is normalised to lowercase for login', async () => {
  const res = await call('POST', 'auth/login', { email: 'ranjith@example.com', password: 'a-long-enough-password' });
  assert.equal(res.status, 200);
});

test('a wrong password is refused', async () => {
  const saved = cookie;
  const res = await call('POST', 'auth/login', { email: 'ranjith@example.com', password: 'wrong-password-here' });
  assert.equal(res.status, 401);
  cookie = saved;
});

test('the profile drives target calculation', async () => {
  const res = await call('PUT', 'profile', {
    displayName: 'Ranjith',
    sex: 'male',
    birthDate: '1985-03-14',
    heightCm: 175,
    activity: 'light',
    goal: 'lose',
    ratePctPerWeek: 0.7,
    weightKg: 82,
    timezone: 'Europe/Zurich',
  });
  assert.equal(res.status, 200);
  const t = res.body.targets;
  assert.ok(t.calculated, 'targets should compute once height, birth date and weight exist');
  assert.equal(t.calculated.bmr, 1714);
  assert.ok(t.effective.kcal > t.calculated.bmr);
  assert.equal(t.basedOnWeightKg, 82);
});

test('an implausible height is refused', async () => {
  const res = await call('PUT', 'profile', { heightCm: 17 });
  assert.equal(res.status, 400);
});

test('a manual target override wins, and the calculation stays visible', async () => {
  const res = await call('PUT', 'targets', { calories: 2000 });
  assert.equal(res.status, 200);
  assert.equal(res.body.targets.effective.kcal, 2000);
  assert.ok(res.body.targets.calculated.calories !== 2000, 'the recommendation is still there');

  const cleared = await call('PUT', 'targets', { calories: null });
  assert.equal(cleared.body.targets.effective.kcal, cleared.body.targets.calculated.calories);
});

test('an entry is logged and shows up in the day', async () => {
  const res = await call('POST', 'entries', {
    slot: 'breakfast',
    source: 'manual',
    items: [
      { label: 'Idli', qty: 3, unit: 'piece', kcal: 117, protein: 3.9, carbs: 24, fat: 0.3, fibre: 1.2, sodium: 190 },
      { label: 'Sambar', qty: 1, unit: 'bowl', kcal: 140, protein: 6, carbs: 20, fat: 4, fibre: 4.5, sodium: 480, estimated: true, confidence: 'medium' },
    ],
  });
  assert.equal(res.status, 201);

  const day = await call('GET', 'day');
  assert.equal(day.status, 200);
  assert.equal(day.body.entries.length, 1);
  assert.equal(day.body.consumed.kcal, 257);
  assert.equal(day.body.entries[0].estimated, true, 'the entry is flagged as containing an estimate');
  assert.equal(day.body.remaining.kcal, day.body.targets.effective.kcal - 257);
  assert.ok(day.body.budget.text.length > 0);
  assert.ok(day.body.pace.message.includes('%'));
});

test('a replayed offline request does not double-log', async () => {
  const payload = {
    clientId: 'offline-abc-123',
    slot: 'lunch',
    items: [{ label: 'Rajma chawal', kcal: 520, protein: 18, carbs: 82, fat: 12 }],
  };
  const first = await call('POST', 'entries', payload);
  assert.equal(first.status, 201);
  const replay = await call('POST', 'entries', payload);
  assert.equal(replay.status, 200);
  assert.equal(replay.body.duplicate, true);
  assert.equal(replay.body.id, first.body.id);

  const day = await call('GET', 'day');
  assert.equal(day.body.entries.length, 2, 'still two entries, not three');
});

test('correcting an estimate marks it measured', async () => {
  const day = await call('GET', 'day');
  const entry = day.body.entries.find((e: any) => e.slot === 'breakfast');
  const sambar = entry.items.find((i: any) => i.label === 'Sambar');
  assert.equal(sambar.estimated, true);

  const res = await call('PATCH', `entries/${entry.id}`, { itemId: sambar.id, kcal: 165 });
  assert.equal(res.status, 200);

  const after = await call('GET', 'day');
  const corrected = after.body.entries
    .find((e: any) => e.id === entry.id).items.find((i: any) => i.label === 'Sambar');
  assert.equal(corrected.kcal, 165);
  assert.equal(corrected.estimated, false, 'a hand-corrected number is no longer an estimate');
  assert.equal(corrected.edited, true);
});

test('repeats surface what has been eaten, ready to re-log', async () => {
  const res = await call('GET', 'repeats');
  assert.equal(res.status, 200);
  assert.ok(res.body.repeats.length >= 2);
  const idli = res.body.repeats.find((r: any) => r.labels.includes('Idli'));
  assert.ok(idli, 'the breakfast should be offered back');

  const detail = await call('GET', `repeats/${idli.entryId}`);
  assert.equal(detail.status, 200);
  assert.equal(detail.body.items.length, 2);
  assert.equal(detail.body.slot, 'breakfast');
});

test('saving a food and logging it counts a use', async () => {
  const created = await call('POST', 'foods', {
    name: 'Zopf', servingLabel: 'slice', kcal: 190, protein: 5.4, carbs: 30, fat: 5.2,
  });
  assert.equal(created.status, 201);

  await call('POST', 'entries', {
    slot: 'snack',
    items: [{ foodId: created.body.id, label: 'Zopf', qty: 2, kcal: 380, protein: 10.8, carbs: 60, fat: 10.4 }],
  });

  const foods = await call('GET', 'foods?q=zop');
  assert.equal(foods.body.foods.length, 1);
  assert.equal(foods.body.foods[0].timesUsed, 1);
});

test('deleting an entry removes it from the day', async () => {
  const day = await call('GET', 'day');
  const target = day.body.entries.at(-1);
  const res = await call('DELETE', `entries/${target.id}`);
  assert.equal(res.status, 200);
  const after = await call('GET', 'day');
  assert.equal(after.body.entries.length, day.body.entries.length - 1);
});

test('water adds up and weight is stored once per day', async () => {
  await call('POST', 'water', { ml: 250 });
  const second = await call('POST', 'water', { ml: 500 });
  assert.equal(second.body.ml, 750);

  await call('POST', 'weights', { weightKg: 81.6, date: '2026-08-05' });
  await call('POST', 'weights', { weightKg: 81.4, date: '2026-08-05' }); // same day, corrected
  const list = await call('GET', 'weights');
  const onDate = list.body.weights.filter((w: any) => w.date === '2026-08-05');
  assert.equal(onDate.length, 1);
  assert.equal(onDate[0].weight_kg, 81.4);

  const silly = await call('POST', 'weights', { weightKg: 8 });
  assert.equal(silly.status, 400);
});

test('export returns everything, with no lock-in', async () => {
  const res = await call('GET', 'export');
  assert.equal(res.status, 200);
  for (const table of ['profiles', 'weights', 'foods', 'entries', 'entry_items', 'water_log']) {
    assert.ok(Array.isArray(res.body[table]), `${table} should be exported`);
  }
  assert.ok(res.body.entries.length > 0);
  assert.ok(res.body.entry_items.length > 0);
});

test('logging out ends the session', async () => {
  const res = await call('POST', 'auth/logout');
  assert.equal(res.status, 200);
  const day = await call('GET', 'day');
  assert.equal(day.status, 401);
});

test('unknown endpoints 404 rather than falling through', async () => {
  await call('POST', 'auth/login', { email: 'ranjith@example.com', password: 'a-long-enough-password' });
  const res = await call('GET', 'nonsense');
  assert.equal(res.status, 404);
});
