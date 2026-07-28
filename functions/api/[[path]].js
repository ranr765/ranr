/**
 * Simple Serve — Business Book API
 * Cloudflare Pages Function (catch-all under /api/*), no dependencies.
 * Storage: Cloudflare D1 (SQLite), binding name: DB
 */

// ---------- helpers ----------

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })

const num = (v) => {
  const n = typeof v === 'string' ? parseFloat(v) : Number(v)
  return Number.isFinite(n) ? n : 0
}

const str = (v) => (typeof v === 'string' ? v.trim() : '')

const isDate = (s) => /^\d{4}-\d{2}-\d{2}$/.test(s)
const isMonth = (s) => /^\d{4}-\d{2}$/.test(s)

const round2 = (n) => Math.round(n * 100) / 100

// ---------- item code (SKU) — mirrors public/static/app.js skuFor() ----------

const SKU_MAP = {
  'Spice LD Cover': ['LDC', 'SPICE'], 'Money Gold LD Cover': ['LDC', 'GOLD'], 'Gulf LD Cover': ['LDC', 'GULF'], 'Fine Pack LD Cover': ['LDC', 'FINE'],
  'Elite HM Cover': ['HMC', 'ELITE'], 'JM HM Cover': ['HMC', 'JM'], 'Softy HM Cover': ['HMC', 'SOFTY'], 'Zamkudi HM Cover': ['HMC', 'ZAM'],
  'PP Cover Nice': ['PPC', 'NICE'], 'PP Cover Single T': ['PPC', 'ST'], 'PP Cover Double T': ['PPC', 'DT'], 'Non Woven Cover': ['NWC', ''],
  'Bio Ecowin Carry Bag': ['BAG', 'BIOECO'], 'King Carry Bag': ['BAG', 'KING'], 'Palmtree Carry Bag': ['BAG', 'PALM'], 'Power Carry Bag': ['BAG', 'POWER'], 'Superdiamond Carry Bag': ['BAG', 'SDMND'], 'World Cup Carry Bag': ['BAG', 'WCUP'], 'Garbage Bag': ['GBAG', ''],
  'Juice Glass': ['GLS', 'JUICE'], 'Juice Glass with Lid': ['GLS', 'JUICELID'], 'Paper Glass Bio': ['GLS', 'PAPBIO'], 'Paper Glass Normal': ['GLS', 'PAPER'], 'Plastic Glass': ['GLS', 'PLAS'], 'Plastic Glass Hard': ['GLS', 'PLASHARD'],
  'Ice Cup': ['CUP', 'ICE'], 'Mayonnaise Cup': ['CUP', 'MAYO'], 'Aluminium Container': ['CON', 'ALU'], 'Plastic Container Rectangle': ['CON', 'PRECT'], 'Plastic Container Round': ['CON', 'PRND'],
  'Aluminium Foil': ['FOIL', ''], 'Cling Film': ['FILM', 'CLING'], 'Cling Film Normal': ['FILM', 'CLINGN'], 'Stretch Film': ['FILM', 'STRETCH'],
  'Neck Roll': ['ROLL', 'NECK'], 'Roll Normal': ['ROLL', 'NORMAL'], 'Saree Roll': ['ROLL', 'SAREE'], 'Shawarma Roll': ['ROLL', 'SHAW'],
  'Brown Paper': ['PAPR', 'BROWN'], 'Butter Paper': ['PAPR', 'BUTTER'], 'JM Leaf': ['LEAF', 'JM'], 'SAS Bio Leaf': ['LEAF', 'SASBIO'], 'SAS Normal Leaf': ['LEAF', 'SAS'],
  'Plate': ['PLT', ''], 'VIP Plate': ['PLT', 'VIP'], 'Sheet Nice': ['SHT', 'NICE'], 'Sheet Normal': ['SHT', 'NORMAL'], 'Silver Pouch': ['POUCH', 'SILVER'], 'Standing Pouch': ['POUCH', 'STAND'],
  'Tissue Box': ['TIS', 'BOX'], 'Tissue Kitchen': ['TIS', 'KITCHEN'], 'Tissue Polo': ['TIS', 'POLO'], 'Tissue Prime': ['TIS', 'PRIME'], 'Tissue Rissun': ['TIS', 'RISSUN'],
  'Cap': ['CAP', ''], 'Gloves Normal': ['GLOV', 'NORMAL'], 'Gloves Surgical': ['GLOV', 'SURG'], 'Mask': ['MASK', ''], 'Onion Net': ['NET', 'ONION'], 'Rubber Band': ['RBAND', ''], 'Spoon': ['SPOON', ''], 'Straw': ['STRAW', ''],
}
const SKU_SIZE_WORD = { Small: 'SML', Medium: 'MED', Large: 'LRG', Big: 'BIG', 'Triple Zero': '000', '1/2 kg': 'HALFKG' }
function skuSize(size) {
  const s = String(size || '').trim()
  if (!s) return ''
  if (SKU_SIZE_WORD[s]) return SKU_SIZE_WORD[s]
  return s
    .replace(/(\d+)\s*kg/i, '$1KG').replace(/(\d+)\s*gm/i, '$1G').replace(/(\d+)\s*ml/i, '$1ML')
    .replace(/(\d+)\s*mtr/i, '$1MTR').replace(/(\d+)\s*nos/i, '$1NOS').replace(/(\d+)\s*inch/i, '$1IN')
    .replace(/(\d+)\s*x\s*(\d+)/i, '$1X$2')
    .toUpperCase().replace(/\s+/g, '')
}
function skuFor(name, size) {
  let pfx, brand
  if (SKU_MAP[name]) [pfx, brand] = SKU_MAP[name]
  else {
    const words = String(name || '').toUpperCase().replace(/[^A-Z0-9 ]/g, '').split(/\s+/).filter(Boolean)
    pfx = words.length > 1 ? words.map((w) => w[0]).join('').slice(0, 4) : (words[0] || 'ITM').slice(0, 4)
    brand = ''
  }
  return [pfx, brand, skuSize(size)].filter(Boolean).join('-')
}

// ---------- auth ----------

const SESSION_COOKIE = 'ss_session'
const SESSION_DAYS = 90
const PBKDF2_ITERATIONS = 100000

const enc = new TextEncoder()

const toHex = (buf) =>
  [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('')

const randHex = (bytes) => {
  const a = new Uint8Array(bytes)
  crypto.getRandomValues(a)
  return toHex(a)
}

async function hashPassword(password, saltHex) {
  const salt = new Uint8Array(saltHex.match(/../g).map((h) => parseInt(h, 16)))
  const key = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, [
    'deriveBits',
  ])
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
    key,
    256
  )
  return toHex(bits)
}

// recovery code: unambiguous alphabet (no 0/O/1/I/L), format SS-XXXX-XXXX
const RECOVERY_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
function genRecoveryCode() {
  const a = new Uint8Array(8)
  crypto.getRandomValues(a)
  const c = [...a].map((b) => RECOVERY_ALPHABET[b % RECOVERY_ALPHABET.length])
  return 'SS-' + c.slice(0, 4).join('') + '-' + c.slice(4, 8).join('')
}
// normalize so entry is lenient about case, spaces and dashes
const normalizeCode = (s) => String(s || '').toUpperCase().replace(/[^A-Z0-9]/g, '')

// constant-time string comparison
const safeEqual = (a, b) => {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false
  let r = 0
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return r === 0
}

const getSessionToken = (request) => {
  const cookie = request.headers.get('Cookie') || ''
  const m = cookie.match(/(?:^|;\s*)ss_session=([a-f0-9]+)/)
  return m ? m[1] : ''
}

const sessionCookie = (token, url, maxAge) => {
  const secure = url.protocol === 'https:' ? '; Secure' : ''
  return `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure}`
}

const isoNow = () => new Date().toISOString()

const isoInDays = (days) => new Date(Date.now() + days * 86400000).toISOString()

async function currentUserFor(db, request) {
  const token = getSessionToken(request)
  if (!token) return null
  const row = await db
    .prepare(
      `SELECT u.id, u.username, u.name, s.expires_at FROM sessions s
       JOIN users u ON u.id = s.user_id WHERE s.token = ?`
    )
    .bind(token)
    .first()
  if (!row) return null
  if (row.expires_at <= isoNow()) {
    await db.prepare('DELETE FROM sessions WHERE token = ?').bind(token).run()
    return null
  }
  return { id: row.id, username: row.username, name: row.name, token }
}

async function userCount(db) {
  const r = await db.prepare('SELECT COUNT(*) AS n FROM users').first()
  return num(r.n)
}

async function createUser(db, { name, username, password }) {
  const salt = randHex(16)
  const hash = await hashPassword(password, salt)
  const r = await db
    .prepare('INSERT INTO users (username, name, password_hash, salt) VALUES (?, ?, ?, ?)')
    .bind(username, name, hash, salt)
    .run()
  return r.meta.last_row_id
}

async function startSession(db, userId, url) {
  const token = randHex(32)
  await db
    .prepare('INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)')
    .bind(token, userId, isoInDays(SESSION_DAYS))
    .run()
  // opportunistic cleanup of expired sessions
  await db.prepare('DELETE FROM sessions WHERE expires_at <= ?').bind(isoNow()).run()
  return {
    headers: {
      'Content-Type': 'application/json',
      'Set-Cookie': sessionCookie(token, url, SESSION_DAYS * 86400),
    },
  }
}

const validCredentials = (username, password) => {
  if (!/^[a-z0-9._@-]{3,40}$/.test(username))
    return 'Username: 3–40 letters/numbers (no spaces)'
  if (typeof password !== 'string' || password.length < 6)
    return 'Password must be at least 6 characters'
  return null
}

async function handleAuth(db, request, url, action) {
  const method = request.method

  if (action === 'status' && method === 'GET') {
    const [count, user] = await Promise.all([userCount(db), currentUserFor(db, request)])
    return json({
      setupRequired: count === 0,
      user: user ? { id: user.id, username: user.username, name: user.name } : null,
    })
  }

  const readBody = async () => {
    try {
      return await request.json()
    } catch {
      return {}
    }
  }

  if (action === 'setup' && method === 'POST') {
    if ((await userCount(db)) > 0) return json({ error: 'Setup is already done. Please log in.' }, 403)
    const b = await readBody()
    const username = str(b.username).toLowerCase()
    const password = typeof b.password === 'string' ? b.password : ''
    const bad = validCredentials(username, password)
    if (bad) return json({ error: bad }, 400)
    const userId = await createUser(db, { name: str(b.name) || username, username, password })
    const init = await startSession(db, userId, url)
    return new Response(
      JSON.stringify({ user: { id: userId, username, name: str(b.name) || username } }),
      { status: 201, ...init }
    )
  }

  if (action === 'login' && method === 'POST') {
    const b = await readBody()
    const username = str(b.username).toLowerCase()
    const password = typeof b.password === 'string' ? b.password : ''
    const user = await db
      .prepare('SELECT * FROM users WHERE username = ?')
      .bind(username)
      .first()
    // always run the hash so response time doesn't reveal whether the user exists
    const hash = await hashPassword(password, user ? user.salt : randHex(16))
    if (!user || !safeEqual(hash, user.password_hash))
      return json({ error: 'Wrong username or password' }, 401)
    const init = await startSession(db, user.id, url)
    return new Response(
      JSON.stringify({ user: { id: user.id, username: user.username, name: user.name } }),
      { status: 200, ...init }
    )
  }

  if (action === 'logout' && method === 'POST') {
    const token = getSessionToken(request)
    if (token) await db.prepare('DELETE FROM sessions WHERE token = ?').bind(token).run()
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Set-Cookie': sessionCookie('', url, 0),
      },
    })
  }

  if (action === 'password' && method === 'POST') {
    const user = await currentUserFor(db, request)
    if (!user) return json({ error: 'Unauthorized' }, 401)
    const b = await readBody()
    const current = typeof b.current === 'string' ? b.current : ''
    const next = typeof b.next === 'string' ? b.next : ''
    if (next.length < 6) return json({ error: 'New password must be at least 6 characters' }, 400)
    const row = await db.prepare('SELECT * FROM users WHERE id = ?').bind(user.id).first()
    const currentHash = await hashPassword(current, row.salt)
    if (!safeEqual(currentHash, row.password_hash))
      return json({ error: 'Current password is wrong' }, 401)
    const salt = randHex(16)
    const hash = await hashPassword(next, salt)
    await db
      .prepare('UPDATE users SET password_hash = ?, salt = ? WHERE id = ?')
      .bind(hash, salt, user.id)
      .run()
    // invalidate every other session for this user
    await db
      .prepare('DELETE FROM sessions WHERE user_id = ? AND token != ?')
      .bind(user.id, user.token)
      .run()
    return json({ ok: true })
  }

  // generate a one-time recovery code (only its hash is stored); returned once
  if (action === 'recovery' && method === 'POST') {
    const user = await currentUserFor(db, request)
    if (!user) return json({ error: 'Unauthorized' }, 401)
    const code = genRecoveryCode()
    const salt = randHex(16)
    const hash = await hashPassword(normalizeCode(code), salt)
    await db
      .prepare('UPDATE users SET recovery_hash = ?, recovery_salt = ? WHERE id = ?')
      .bind(hash, salt, user.id)
      .run()
    return json({ code })
  }

  // reset password using the recovery code — reachable without a session
  if (action === 'reset' && method === 'POST') {
    const b = await readBody()
    const username = str(b.username).toLowerCase()
    const code = normalizeCode(b.code)
    const next = typeof b.password === 'string' ? b.password : ''
    if (next.length < 6) return json({ error: 'New password must be at least 6 characters' }, 400)
    const user = await db.prepare('SELECT * FROM users WHERE username = ?').bind(username).first()
    // always hash (against a random salt if needed) so timing/response can't
    // reveal whether the account exists or has a recovery code
    const salt = user && user.recovery_salt ? user.recovery_salt : randHex(16)
    const codeHash = await hashPassword(code, salt)
    const okCode = !!(user && user.recovery_hash && code && safeEqual(codeHash, user.recovery_hash))
    if (!okCode) return json({ error: 'Wrong username or recovery code' }, 401)
    const newSalt = randHex(16)
    const hash = await hashPassword(next, newSalt)
    // single-use: clear the recovery code, and log out everywhere
    await db
      .prepare("UPDATE users SET password_hash = ?, salt = ?, recovery_hash = '', recovery_salt = '' WHERE id = ?")
      .bind(hash, newSalt, user.id)
      .run()
    await db.prepare('DELETE FROM sessions WHERE user_id = ?').bind(user.id).run()
    return json({ ok: true })
  }

  return json({ error: 'Not found' }, 404)
}

// ---------- generic list/create/delete configs ----------

const PARTY_TABLES = { customers: 'customers', suppliers: 'suppliers' }

const ENTRY_TABLES = {
  sales: { table: 'sales', dateCol: 'sale_date' },
  purchases: { table: 'purchases', dateCol: 'purchase_date' },
  expenses: { table: 'expenses', dateCol: 'expense_date' },
  payments: { table: 'payments', dateCol: 'payment_date' },
}

// ---------- handlers ----------

async function listParties(db, table) {
  const { results } = await db
    .prepare(`SELECT * FROM ${table} ORDER BY name COLLATE NOCASE`)
    .all()
  return json(results)
}

const latLngOf = (b) => {
  const lat = parseFloat(b.lat)
  const lng = parseFloat(b.lng)
  if (Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180)
    return { lat, lng }
  return { lat: null, lng: null }
}

async function createParty(db, table, b) {
  const name = str(b.name)
  if (!name) return json({ error: 'Name is required' }, 400)
  const { lat, lng } = latLngOf(b)
  let r
  if (table === 'customers') {
    const n = parseFloat(b.credit_days)
    const days = Number.isFinite(n) ? Math.min(365, Math.max(0, Math.round(n))) : 30
    r = await db
      .prepare(
        `INSERT INTO customers (name, place, phone, credit_days, lat, lng) VALUES (?, ?, ?, ?, ?, ?)`
      )
      .bind(name, str(b.place), str(b.phone), days, lat, lng)
      .run()
  } else {
    r = await db
      .prepare(`INSERT INTO ${table} (name, place, phone, lat, lng) VALUES (?, ?, ?, ?, ?)`)
      .bind(name, str(b.place), str(b.phone), lat, lng)
      .run()
  }
  return json({ id: r.meta.last_row_id, name }, 201)
}

async function updateParty(db, table, id, b) {
  const name = str(b.name)
  if (!name) return json({ error: 'Name is required' }, 400)
  const { lat, lng } = latLngOf(b)
  if (table === 'customers') {
    const n = parseFloat(b.credit_days)
    const days = Number.isFinite(n) ? Math.min(365, Math.max(0, Math.round(n))) : 30
    await db
      .prepare(
        `UPDATE customers SET name = ?, place = ?, phone = ?, credit_days = ?, lat = ?, lng = ? WHERE id = ?`
      )
      .bind(name, str(b.place), str(b.phone), days, lat, lng, id)
      .run()
    // keep history readable if the name changed
    await db.prepare('UPDATE sales SET customer_name = ? WHERE customer_id = ?').bind(name, id).run()
  } else {
    await db
      .prepare(`UPDATE suppliers SET name = ?, place = ?, phone = ?, lat = ?, lng = ? WHERE id = ?`)
      .bind(name, str(b.place), str(b.phone), lat, lng, id)
      .run()
    await db.prepare('UPDATE purchases SET supplier_name = ? WHERE supplier_id = ?').bind(name, id).run()
  }
  return json({ ok: true })
}

// ---------- shop statement (for invoice / WhatsApp share) ----------

const addDays = (dateStr, days) => {
  const [y, m, d] = dateStr.split('-').map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d + days))
  return dt.toISOString().slice(0, 10)
}

/**
 * Outstanding bills for one shop, with collections applied to the oldest
 * bills first (FIFO). Bills are due immediately; credit_days is only the
 * window after which an unpaid bill is highlighted as overdue (default 30).
 */
async function customerStatement(db, customerId, today) {
  if (!isDate(today)) return json({ error: 'date=YYYY-MM-DD is required' }, 400)
  const customer = await db
    .prepare('SELECT * FROM customers WHERE id = ?')
    .bind(customerId)
    .first()
  if (!customer) return json({ error: 'Shop not found' }, 404)

  const [salesRes, collectedRow] = await Promise.all([
    db
      .prepare('SELECT * FROM sales WHERE customer_id = ? ORDER BY sale_date, id')
      .bind(customerId)
      .all(),
    db
      .prepare(
        `SELECT COALESCE(SUM(amount),0) AS v FROM payments WHERE type = 'in' AND party_id = ?`
      )
      .bind(customerId)
      .first(),
  ])

  let pool = num(collectedRow.v)
  const creditDays = Number.isFinite(num(customer.credit_days)) && customer.credit_days !== null ? num(customer.credit_days) : 30
  const open = []
  for (const s of salesRes.results) {
    let bal = num(s.total_amount) - num(s.paid_amount)
    if (bal <= 0.005) continue
    const applied = Math.min(pool, bal)
    pool -= applied
    bal = round2(bal - applied)
    if (bal <= 0.005) continue
    const dueDate = addDays(s.sale_date, creditDays)
    open.push({
      id: s.id,
      date: s.sale_date,
      items: s.items,
      total: num(s.total_amount),
      balance: bal,
      due_date: dueDate,
      overdue: dueDate < today,
    })
  }

  const sum = (rows) => round2(rows.reduce((a, r) => a + r.balance, 0))
  const overdueRows = open.filter((o) => o.overdue)
  return json({
    date: today,
    customer: {
      id: customer.id,
      name: customer.name,
      place: customer.place,
      phone: customer.phone,
      credit_days: creditDays,
    },
    open,
    totals: {
      due: sum(open),
      overdue: sum(overdueRows),
      notYetDue: round2(sum(open) - sum(overdueRows)),
    },
  })
}

async function listEntries(db, kind, month) {
  const { table, dateCol } = ENTRY_TABLES[kind]
  const where = isMonth(month) ? `WHERE substr(${dateCol}, 1, 7) = ?` : ''
  const stmt = db.prepare(
    `SELECT * FROM ${table} ${where} ORDER BY ${dateCol} DESC, id DESC LIMIT 500`
  )
  const { results } = await (where ? stmt.bind(month) : stmt).all()
  return json(results)
}

const PAYMENT_MODES = ['cash', 'credit', 'cheque']
const payModeOf = (b) => (PAYMENT_MODES.includes(str(b.payment_mode)) ? str(b.payment_mode) : '')

async function createSale(db, b) {
  const date = str(b.sale_date)
  const total = num(b.total_amount)
  if (!isDate(date)) return json({ error: 'Valid date is required' }, 400)
  if (total <= 0) return json({ error: 'Amount must be more than 0' }, 400)
  const paid = Math.min(Math.max(num(b.paid_amount), 0), total)
  const r = await db
    .prepare(
      `INSERT INTO sales (sale_date, customer_id, customer_name, items, total_amount, paid_amount, notes, payment_mode)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      date,
      b.customer_id ? Number(b.customer_id) : null,
      str(b.customer_name),
      str(b.items),
      total,
      paid,
      str(b.notes),
      payModeOf(b)
    )
    .run()
  return json({ id: r.meta.last_row_id }, 201)
}

/**
 * Correct an existing sale in place (owner fixing their own record — the ₹100
 * kind of mistake). Only the fields on the bill change; collections/payments are
 * untouched, so the shop's running balance recomputes naturally from the new
 * totals. Never deletes or resets — this is an additive edit to one row.
 */
async function updateSale(db, id, b) {
  const existing = await db.prepare('SELECT * FROM sales WHERE id = ?').bind(id).first()
  if (!existing) return json({ error: 'Bill not found' }, 404)
  const date = str(b.sale_date)
  const total = num(b.total_amount)
  if (!isDate(date)) return json({ error: 'Valid date is required' }, 400)
  if (total <= 0) return json({ error: 'Amount must be more than 0' }, 400)
  const paid = Math.min(Math.max(num(b.paid_amount), 0), total)
  await db
    .prepare(
      `UPDATE sales SET sale_date = ?, items = ?, total_amount = ?, paid_amount = ?, notes = ?, payment_mode = ? WHERE id = ?`
    )
    .bind(date, str(b.items), total, paid, str(b.notes), payModeOf(b), id)
    .run()
  return json({ ok: true })
}

async function updatePurchase(db, id, b) {
  const existing = await db.prepare('SELECT * FROM purchases WHERE id = ?').bind(id).first()
  if (!existing) return json({ error: 'Bill not found' }, 404)
  const date = str(b.purchase_date)
  const total = num(b.total_amount)
  if (!isDate(date)) return json({ error: 'Valid date is required' }, 400)
  if (total <= 0) return json({ error: 'Amount must be more than 0' }, 400)
  const paid = Math.min(Math.max(num(b.paid_amount), 0), total)
  await db
    .prepare(
      `UPDATE purchases SET purchase_date = ?, items = ?, total_amount = ?, paid_amount = ?, notes = ? WHERE id = ?`
    )
    .bind(date, str(b.items), total, paid, str(b.notes), id)
    .run()
  return json({ ok: true })
}

/**
 * Full dated ledger for one shop: every sale newest-first, with each bill's
 * remaining balance after applying pooled collections oldest-first (FIFO),
 * so the same rupee is never double-counted against two bills.
 */
/**
 * One shop's buying pattern: which weekdays it orders, how often, what it buys
 * consistently (in most orders) vs occasionally, and its recent orders — so you
 * can see what's regular and what changed week to week.
 */
async function customerPattern(db, customerId) {
  const customer = await db.prepare('SELECT * FROM customers WHERE id = ?').bind(customerId).first()
  if (!customer) return json({ error: 'Shop not found' }, 404)
  const sales = (
    await db
      .prepare('SELECT sale_date, items, total_amount FROM sales WHERE customer_id = ? ORDER BY sale_date, id')
      .bind(customerId)
      .all()
  ).results

  const dow = (d) => {
    const [y, m, dd] = String(d).split('-').map(Number)
    return new Date(Date.UTC(y, m - 1, dd)).getUTCDay()
  }
  const daysBetween = (a, b) => {
    const [ay, am, ad] = a.split('-').map(Number)
    const [by, bm, bd] = b.split('-').map(Number)
    return Math.round((Date.UTC(by, bm - 1, bd) - Date.UTC(ay, am - 1, ad)) / 86400000)
  }
  const parse = (s) => {
    const out = []
    for (const part of String(s || '').split(/,\s*/)) {
      const m = /^(.+?) x ([\d.]+) @ ₹([\d.]+)$/.exec(part.trim())
      if (m) out.push({ label: m[1].trim(), qty: parseFloat(m[2]) || 0 })
    }
    return out
  }

  const weekdayCounts = [0, 0, 0, 0, 0, 0, 0]
  const itemStats = {} // label -> { orders, qty, lastDate }
  for (const s of sales) {
    if (!s.sale_date) continue
    weekdayCounts[dow(s.sale_date)]++
    const seen = new Set()
    for (const l of parse(s.items)) {
      const st = (itemStats[l.label] = itemStats[l.label] || { orders: 0, qty: 0, lastDate: null })
      if (!seen.has(l.label)) {
        st.orders++
        seen.add(l.label)
      }
      st.qty += l.qty
      if (!st.lastDate || s.sale_date > st.lastDate) st.lastDate = s.sale_date
    }
  }
  const orderCount = sales.length
  const items = Object.entries(itemStats)
    .map(([label, st]) => ({
      label,
      orders: st.orders,
      share: orderCount ? Math.round((st.orders / orderCount) * 100) : 0,
      avgQty: st.orders ? Math.round((st.qty / st.orders) * 100) / 100 : 0,
      lastDate: st.lastDate,
    }))
    .sort((a, b) => b.orders - a.orders || b.avgQty - a.avgQty)
  const consistent = items.filter((i) => orderCount >= 2 && i.share >= 50)
  const occasional = items.filter((i) => !(orderCount >= 2 && i.share >= 50))

  const dates = [...new Set(sales.map((s) => s.sale_date).filter(Boolean))].sort()
  let avgGap = null
  if (dates.length >= 2) avgGap = Math.round(daysBetween(dates[0], dates[dates.length - 1]) / (dates.length - 1))
  const topWeekday = weekdayCounts.some((c) => c > 0) ? weekdayCounts.indexOf(Math.max(...weekdayCounts)) : null

  const recent = sales
    .slice(-8)
    .reverse()
    .map((s) => ({ date: s.sale_date, weekday: dow(s.sale_date), items: s.items || '', total: num(s.total_amount) }))

  return json({
    customer: { id: customer.id, name: customer.name, place: customer.place },
    orderCount,
    orderDays: dates.length,
    weekdayCounts,
    topWeekday,
    avgGap,
    lastDate: dates.length ? dates[dates.length - 1] : null,
    consistent,
    occasional,
    recent,
  })
}

async function customerHistory(db, customerId) {
  const customer = await db
    .prepare('SELECT * FROM customers WHERE id = ?')
    .bind(customerId)
    .first()
  if (!customer) return json({ error: 'Shop not found' }, 404)

  const [salesRes, collectedRow] = await Promise.all([
    db
      .prepare('SELECT * FROM sales WHERE customer_id = ? ORDER BY sale_date, id')
      .bind(customerId)
      .all(),
    db
      .prepare(`SELECT COALESCE(SUM(amount),0) AS v FROM payments WHERE type = 'in' AND party_id = ?`)
      .bind(customerId)
      .first(),
  ])

  let pool = num(collectedRow.v)
  const creditDays =
    Number.isFinite(num(customer.credit_days)) && customer.credit_days !== null
      ? num(customer.credit_days)
      : 30
  const today = new Date().toISOString().slice(0, 10)

  // walk oldest-first to apply the collection pool, then present newest-first
  const bills = salesRes.results.map((s) => {
    const total = num(s.total_amount)
    const billPaid = Math.min(Math.max(num(s.paid_amount), 0), total)
    let remaining = round2(total - billPaid)
    const fromPool = Math.min(pool, remaining)
    pool = round2(pool - fromPool)
    remaining = round2(remaining - fromPool)
    const settled = remaining <= 0.005
    const overdue = !settled && addDays(s.sale_date, creditDays) < today
    return {
      id: s.id,
      date: s.sale_date,
      items: s.items || '',
      total,
      billPaid, // received on this bill itself (for editing) — excludes pooled collections
      paid: round2(total - remaining), // effective paid incl. pooled collections (for display)
      balance: remaining,
      settled,
      overdue,
      notes: s.notes || '',
      mode: s.payment_mode || '',
    }
  })
  bills.reverse()

  const totalBilled = round2(bills.reduce((a, b) => a + b.total, 0))
  const outstanding = round2(bills.reduce((a, b) => a + b.balance, 0))
  return json({
    customer: { id: customer.id, name: customer.name, place: customer.place, phone: customer.phone },
    bills,
    totals: { billed: totalBilled, outstanding, advance: round2(pool) },
  })
}

async function createPurchase(db, b) {
  const date = str(b.purchase_date)
  const total = num(b.total_amount)
  if (!isDate(date)) return json({ error: 'Valid date is required' }, 400)
  if (total <= 0) return json({ error: 'Amount must be more than 0' }, 400)
  const paid = Math.min(Math.max(num(b.paid_amount), 0), total)
  const r = await db
    .prepare(
      `INSERT INTO purchases (purchase_date, supplier_id, supplier_name, items, total_amount, paid_amount, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      date,
      b.supplier_id ? Number(b.supplier_id) : null,
      str(b.supplier_name),
      str(b.items),
      total,
      paid,
      str(b.notes)
    )
    .run()
  return json({ id: r.meta.last_row_id }, 201)
}

async function createExpense(db, b) {
  const date = str(b.expense_date)
  const amount = num(b.amount)
  if (!isDate(date)) return json({ error: 'Valid date is required' }, 400)
  if (amount <= 0) return json({ error: 'Amount must be more than 0' }, 400)
  const r = await db
    .prepare(`INSERT INTO expenses (expense_date, category, amount, notes) VALUES (?, ?, ?, ?)`)
    .bind(date, str(b.category) || 'Other', amount, str(b.notes))
    .run()
  return json({ id: r.meta.last_row_id }, 201)
}

async function updateExpense(db, id, b) {
  const existing = await db.prepare('SELECT id FROM expenses WHERE id = ?').bind(id).first()
  if (!existing) return json({ error: 'Expense not found' }, 404)
  const date = str(b.expense_date)
  const amount = num(b.amount)
  if (!isDate(date)) return json({ error: 'Valid date is required' }, 400)
  if (amount <= 0) return json({ error: 'Amount must be more than 0' }, 400)
  await db
    .prepare('UPDATE expenses SET expense_date = ?, category = ?, amount = ?, notes = ? WHERE id = ?')
    .bind(date, str(b.category) || 'Other', amount, str(b.notes), id)
    .run()
  return json({ ok: true })
}

async function createPayment(db, b) {
  const date = str(b.payment_date)
  const amount = num(b.amount)
  const type = str(b.type)
  if (!isDate(date)) return json({ error: 'Valid date is required' }, 400)
  if (amount <= 0) return json({ error: 'Amount must be more than 0' }, 400)
  if (type !== 'in' && type !== 'out') return json({ error: 'Invalid payment type' }, 400)
  const r = await db
    .prepare(
      `INSERT INTO payments (payment_date, type, party_id, party_name, amount, notes)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
    .bind(date, type, b.party_id ? Number(b.party_id) : null, str(b.party_name), amount, str(b.notes))
    .run()
  return json({ id: r.meta.last_row_id }, 201)
}

async function balancesData(db) {
  const [customers, custSales, custPays, suppliers, supPurchases, supPays] = await Promise.all([
    db.prepare('SELECT * FROM customers ORDER BY name COLLATE NOCASE').all(),
    db
      .prepare(
        `SELECT customer_id AS pid, SUM(total_amount) AS total, SUM(paid_amount) AS paid
         FROM sales WHERE customer_id IS NOT NULL GROUP BY customer_id`
      )
      .all(),
    db
      .prepare(
        `SELECT party_id AS pid, SUM(amount) AS paid FROM payments
         WHERE type = 'in' AND party_id IS NOT NULL GROUP BY party_id`
      )
      .all(),
    db.prepare('SELECT * FROM suppliers ORDER BY name COLLATE NOCASE').all(),
    db
      .prepare(
        `SELECT supplier_id AS pid, SUM(total_amount) AS total, SUM(paid_amount) AS paid
         FROM purchases WHERE supplier_id IS NOT NULL GROUP BY supplier_id`
      )
      .all(),
    db
      .prepare(
        `SELECT party_id AS pid, SUM(amount) AS paid FROM payments
         WHERE type = 'out' AND party_id IS NOT NULL GROUP BY party_id`
      )
      .all(),
  ])

  const balanceMap = (rows, payRows) => {
    const m = new Map()
    for (const r of rows) m.set(r.pid, num(r.total) - num(r.paid))
    for (const p of payRows) m.set(p.pid, (m.get(p.pid) || 0) - num(p.paid))
    return m
  }

  const custBal = balanceMap(custSales.results, custPays.results)
  const supBal = balanceMap(supPurchases.results, supPays.results)

  return {
    customers: customers.results.map((r) => ({ ...r, balance: round2(custBal.get(r.id) || 0) })),
    suppliers: suppliers.results.map((r) => ({ ...r, balance: round2(supBal.get(r.id) || 0) })),
  }
}

async function trendData(db, endMonth) {
  const [y, m] = endMonth.split('-').map(Number)
  const months = []
  for (let i = 5; i >= 0; i--) {
    const d = new Date(Date.UTC(y, m - 1 - i, 1))
    months.push(d.toISOString().slice(0, 7))
  }
  const start = months[0] + '-01'
  const sumByMonth = async (table, dateCol, amountCol) => {
    const { results } = await db
      .prepare(
        `SELECT substr(${dateCol},1,7) AS m, COALESCE(SUM(${amountCol}),0) AS v
         FROM ${table} WHERE ${dateCol} >= ? GROUP BY m`
      )
      .bind(start)
      .all()
    const map = {}
    for (const r of results) map[r.m] = num(r.v)
    return map
  }
  const [s, p, e] = await Promise.all([
    sumByMonth('sales', 'sale_date', 'total_amount'),
    sumByMonth('purchases', 'purchase_date', 'total_amount'),
    sumByMonth('expenses', 'expense_date', 'amount'),
  ])
  return months.map((mo) => {
    const sales = s[mo] || 0, purchases = p[mo] || 0, expenses = e[mo] || 0
    return {
      month: mo,
      sales,
      purchases,
      expenses,
      profit: Math.round((sales - purchases - expenses) * 100) / 100,
    }
  })
}

async function reportData(db, month) {

  const [sales, purchases, expenses, expByCat, receivable, payable, salesDaily] =
    await Promise.all([
      db
        .prepare(
          `SELECT COUNT(*) AS count, COALESCE(SUM(total_amount),0) AS total,
                  COALESCE(SUM(paid_amount),0) AS paid
           FROM sales WHERE substr(sale_date,1,7) = ?`
        )
        .bind(month)
        .first(),
      db
        .prepare(
          `SELECT COUNT(*) AS count, COALESCE(SUM(total_amount),0) AS total,
                  COALESCE(SUM(paid_amount),0) AS paid
           FROM purchases WHERE substr(purchase_date,1,7) = ?`
        )
        .bind(month)
        .first(),
      db
        .prepare(
          `SELECT COUNT(*) AS count, COALESCE(SUM(amount),0) AS total
           FROM expenses WHERE substr(expense_date,1,7) = ?`
        )
        .bind(month)
        .first(),
      db
        .prepare(
          `SELECT category, SUM(amount) AS total FROM expenses
           WHERE substr(expense_date,1,7) = ? GROUP BY category ORDER BY total DESC`
        )
        .bind(month)
        .all(),
      db
        .prepare(
          `SELECT COALESCE((SELECT SUM(total_amount - paid_amount) FROM sales),0)
                - COALESCE((SELECT SUM(amount) FROM payments WHERE type='in'),0) AS v`
        )
        .first(),
      db
        .prepare(
          `SELECT COALESCE((SELECT SUM(total_amount - paid_amount) FROM purchases),0)
                - COALESCE((SELECT SUM(amount) FROM payments WHERE type='out'),0) AS v`
        )
        .first(),
      db
        .prepare(
          `SELECT sale_date AS d, SUM(total_amount) AS total FROM sales
           WHERE substr(sale_date,1,7) = ? GROUP BY sale_date ORDER BY sale_date`
        )
        .bind(month)
        .all(),
    ])

  const profit = num(sales.total) - num(purchases.total) - num(expenses.total)

  return {
    month,
    sales: { count: num(sales.count), total: num(sales.total), paid: num(sales.paid) },
    purchases: { count: num(purchases.count), total: num(purchases.total), paid: num(purchases.paid) },
    expenses: { count: num(expenses.count), total: num(expenses.total), byCategory: expByCat.results },
    profit,
    outstanding: { receivable: num(receivable.v), payable: num(payable.v) },
    salesDaily: salesDaily.results,
  }
}

async function todayData(db, date) {
  const [s, p, e, coll] = await Promise.all([
    db
      .prepare(
        `SELECT COUNT(*) AS count, COALESCE(SUM(total_amount),0) AS total FROM sales WHERE sale_date = ?`
      )
      .bind(date)
      .first(),
    db
      .prepare(
        `SELECT COUNT(*) AS count, COALESCE(SUM(total_amount),0) AS total FROM purchases WHERE purchase_date = ?`
      )
      .bind(date)
      .first(),
    db
      .prepare(
        `SELECT COUNT(*) AS count, COALESCE(SUM(amount),0) AS total FROM expenses WHERE expense_date = ?`
      )
      .bind(date)
      .first(),
    db
      .prepare(
        `SELECT COALESCE(SUM(amount),0) AS total FROM payments WHERE type='in' AND payment_date = ?`
      )
      .bind(date)
      .first(),
  ])
  return { date, sales: s, purchases: p, expenses: e, collected: coll.total }
}

async function daylogData(db, date) {
  const [salesRes, collRes] = await Promise.all([
    db
      .prepare(
        `SELECT s.created_at, s.total_amount, s.paid_amount, s.items,
                COALESCE(c.name, s.customer_name) AS name, c.place, c.lat, c.lng
         FROM sales s LEFT JOIN customers c ON c.id = s.customer_id
         WHERE s.sale_date = ?`
      )
      .bind(date)
      .all(),
    db
      .prepare(
        `SELECT p.created_at, p.amount,
                COALESCE(c.name, p.party_name) AS name, c.place, c.lat, c.lng
         FROM payments p LEFT JOIN customers c ON c.id = p.party_id
         WHERE p.type = 'in' AND p.payment_date = ?`
      )
      .bind(date)
      .all(),
  ])
  const stops = [
    ...salesRes.results.map((r) => ({
      kind: 'sale',
      time: r.created_at,
      name: r.name || 'Cash sale',
      place: r.place || '',
      lat: r.lat,
      lng: r.lng,
      amount: num(r.total_amount),
      paid: num(r.paid_amount),
      items: r.items || '',
    })),
    ...collRes.results.map((r) => ({
      kind: 'collection',
      time: r.created_at,
      name: r.name || '?',
      place: r.place || '',
      lat: r.lat,
      lng: r.lng,
      amount: num(r.amount),
    })),
  ].sort((a, b) => String(a.time).localeCompare(String(b.time)))
  return { date, stops }
}

async function profitSummaryData(db, date) {
  const { results: products } = await db
    .prepare('SELECT name, size, sale_price, purchase_price FROM products')
    .all()
  const book = {}
  for (const p of products) book[`${p.name} ${p.size}`.trim().toLowerCase()] = p

  const [y, m, d] = date.split('-').map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d))
  const monday = new Date(dt)
  monday.setUTCDate(dt.getUTCDate() - ((dt.getUTCDay() + 6) % 7))
  const ranges = {
    day: [date, date],
    week: [monday.toISOString().slice(0, 10), date],
    month: [date.slice(0, 7) + '-01', date],
    ytd: [date.slice(0, 4) + '-01-01', date],
  }

  const calc = async ([from, to]) => {
    const [salesRes, expRow] = await Promise.all([
      db
        .prepare(
          `SELECT items, total_amount FROM sales WHERE sale_date >= ? AND sale_date <= ? LIMIT 5000`
        )
        .bind(from, to)
        .all(),
      db
        .prepare(
          `SELECT COALESCE(SUM(amount),0) AS v FROM expenses WHERE expense_date >= ? AND expense_date <= ?`
        )
        .bind(from, to)
        .first(),
    ])
    let billed = 0, revenue = 0, cost = 0
    for (const sRow of salesRes.results) {
      billed += num(sRow.total_amount)
      for (const part of String(sRow.items || '').split(/,\s*/)) {
        const mm = /^(.+?) x ([\d.]+) @ ₹([\d.]+)$/.exec(part.trim())
        if (!mm) continue
        const p = book[mm[1].trim().toLowerCase()]
        if (!p) continue
        const qty = parseFloat(mm[2])
        const rate = parseFloat(mm[3]) > 0 ? parseFloat(mm[3]) : num(p.sale_price)
        if (!(qty > 0 && rate > 0)) continue
        revenue += qty * rate
        cost += qty * num(p.purchase_price)
      }
    }
    const expenses = num(expRow.v)
    return {
      billed: round2(billed),
      revenue: round2(revenue),
      cost: round2(cost),
      gross: round2(revenue - cost),
      expenses: round2(expenses),
      net: round2(revenue - cost - expenses),
      unpriced: round2(billed - revenue),
    }
  }

  const [day, week, month, ytd] = await Promise.all([
    calc(ranges.day),
    calc(ranges.week),
    calc(ranges.month),
    calc(ranges.ytd),
  ])
  return { date, day, week, month, ytd }
}

// Sales totals for day / week / month / year-to-date (mirrors the profit ranges)
async function salesSummaryData(db, date) {
  const [y, m, d] = date.split('-').map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d))
  const monday = new Date(dt)
  monday.setUTCDate(dt.getUTCDate() - ((dt.getUTCDay() + 6) % 7))
  const ranges = {
    day: [date, date],
    week: [monday.toISOString().slice(0, 10), date],
    month: [date.slice(0, 7) + '-01', date],
    ytd: [date.slice(0, 4) + '-01-01', date],
  }
  const calc = async ([from, to]) => {
    const row = await db
      .prepare(
        `SELECT COALESCE(SUM(total_amount),0) AS total, COALESCE(SUM(paid_amount),0) AS paid, COUNT(*) AS count
         FROM sales WHERE sale_date >= ? AND sale_date <= ?`
      )
      .bind(from, to)
      .first()
    return { total: round2(num(row.total)), paid: round2(num(row.paid)), count: num(row.count) }
  }
  const [day, week, month, ytd] = await Promise.all([
    calc(ranges.day),
    calc(ranges.week),
    calc(ranges.month),
    calc(ranges.ytd),
  ])
  return { date, day, week, month, ytd }
}

/**
 * Day plan from history: for a weekday (0=Sun..6=Sat), which shops you usually
 * serve that day and the items/quantities they typically take — so you know the
 * route and what to load. Purely descriptive aggregation of past sales.
 */
async function dayPlanData(db, weekday) {
  const [salesRes, custRes] = await Promise.all([
    db.prepare('SELECT customer_id, customer_name, sale_date, items FROM sales').all(),
    db.prepare('SELECT id, name, place, lat, lng FROM customers').all(),
  ])
  const custById = {}
  for (const c of custRes.results) custById[c.id] = c
  const dow = (d) => {
    const [y, m, dd] = String(d).split('-').map(Number)
    return new Date(Date.UTC(y, m - 1, dd)).getUTCDay()
  }
  const parse = (itemsStr) => {
    const out = []
    for (const part of String(itemsStr || '').split(/,\s*/)) {
      const m = /^(.+?) x ([\d.]+) @ ₹([\d.]+)$/.exec(part.trim())
      if (m) out.push({ label: m[1].trim(), qty: parseFloat(m[2]) || 0 })
    }
    return out
  }

  const weekdayDates = new Set()
  const shopDays = {} // customer_id -> Set(dates)
  const shopLast = {} // customer_id -> last date
  const itemTotals = {} // label -> total qty

  for (const s of salesRes.results) {
    if (!s.sale_date || dow(s.sale_date) !== weekday) continue
    weekdayDates.add(s.sale_date)
    if (s.customer_id) {
      ;(shopDays[s.customer_id] = shopDays[s.customer_id] || new Set()).add(s.sale_date)
      if (!shopLast[s.customer_id] || s.sale_date > shopLast[s.customer_id]) shopLast[s.customer_id] = s.sale_date
    }
    for (const l of parse(s.items)) itemTotals[l.label] = (itemTotals[l.label] || 0) + l.qty
  }

  const days = weekdayDates.size || 1
  const shops = Object.keys(shopDays)
    .map((cid) => {
      const c = custById[cid] || {}
      return {
        id: Number(cid),
        name: c.name || 'Shop',
        place: c.place || '',
        lat: c.lat != null ? c.lat : null,
        lng: c.lng != null ? c.lng : null,
        visits: shopDays[cid].size,
        lastDate: shopLast[cid] || null,
      }
    })
    .sort((a, b) => b.visits - a.visits || String(b.lastDate).localeCompare(String(a.lastDate)))

  const carry = Object.entries(itemTotals)
    .map(([label, total]) => ({
      label,
      total: round2(total),
      suggest: Math.ceil(total / days),
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 40)

  return { weekday, days: weekdayDates.size, shops, carry }
}

// ---------- stock registry ----------

const parseItemQtys = (itemsStr) => {
  const out = []
  for (const part of String(itemsStr || '').split(/,\s*/)) {
    const m = /^(.+?) x ([\d.]+) @ ₹([\d.]+)$/.exec(part.trim())
    if (m) out.push({ label: m[1].trim().toLowerCase(), qty: parseFloat(m[2]) || 0 })
  }
  return out
}

/**
 * Per-item stock: latest physical count as the baseline, plus purchases (in) and
 * minus sales (out) recorded AFTER that count (compared on created_at, so a sale
 * you ring up right after counting drops the balance immediately). Items with no
 * count are returned untracked (balance null).
 */
async function stockData(db) {
  const [prodRes, countRes, salesRes, purchRes] = await Promise.all([
    db.prepare('SELECT id, name, size, sku FROM products ORDER BY name COLLATE NOCASE, id').all(),
    db.prepare('SELECT product_id, qty, count_date, created_at FROM stock_counts ORDER BY product_id, created_at, id').all(),
    db.prepare('SELECT items, created_at FROM sales').all(),
    db.prepare('SELECT items, created_at FROM purchases').all(),
  ])

  const latest = {} // product_id -> latest count {qty, count_date, created_at}
  for (const c of countRes.results) latest[c.product_id] = { qty: num(c.qty), count_date: c.count_date, created_at: c.created_at }

  const labelToId = {}
  for (const p of prodRes.results) labelToId[`${p.name} ${p.size}`.trim().toLowerCase()] = p.id

  const move = (rows, sign, bucket) => {
    for (const r of rows.results) {
      for (const l of parseItemQtys(r.items)) {
        const pid = labelToId[l.label]
        if (!pid) continue
        const c = latest[pid]
        if (!c) continue // untracked item — don't account movements
        if (String(r.created_at) > String(c.created_at)) bucket[pid] = (bucket[pid] || 0) + sign * l.qty
      }
    }
  }
  const sold = {}, bought = {}
  move(salesRes, 1, sold)
  move(purchRes, 1, bought)

  return prodRes.results.map((p) => {
    const c = latest[p.id]
    const s = sold[p.id] || 0
    const b = bought[p.id] || 0
    return {
      product_id: p.id,
      name: p.name,
      size: p.size,
      sku: p.sku || '',
      tracked: !!c,
      counted: c ? c.qty : null,
      count_date: c ? c.count_date : null,
      sold: round2(s),
      bought: round2(b),
      balance: c ? round2(c.qty + b - s) : null,
    }
  })
}

async function setStockCount(db, b) {
  const pid = Number(b.product_id)
  if (!pid) return json({ error: 'Item is required' }, 400)
  const qty = num(b.qty)
  const date = isDate(str(b.count_date)) ? str(b.count_date) : new Date().toISOString().slice(0, 10)
  await db
    .prepare('INSERT INTO stock_counts (product_id, qty, count_date) VALUES (?, ?, ?)')
    .bind(pid, Math.max(qty, 0), date)
    .run()
  return json({ ok: true }, 201)
}

async function importStockCounts(db, b) {
  const items = Array.isArray(b.items) ? b.items : []
  const date = isDate(str(b.count_date)) ? str(b.count_date) : new Date().toISOString().slice(0, 10)
  let saved = 0
  for (const it of items) {
    const pid = Number(it.product_id)
    if (!pid) continue
    await db
      .prepare('INSERT INTO stock_counts (product_id, qty, count_date) VALUES (?, ?, ?)')
      .bind(pid, Math.max(num(it.qty), 0), date)
      .run()
    saved++
  }
  return json({ ok: true, saved }, 201)
}

// ---------- router ----------

export async function onRequest(context) {
  const { request, env } = context
  const db = env.DB
  const url = new URL(request.url)
  const parts = url.pathname.replace(/^\/api\/?/, '').split('/').filter(Boolean)
  const [resource, id, sub] = parts
  const method = request.method

  const readBody = async () => {
    try {
      return await request.json()
    } catch {
      return {}
    }
  }

  try {
    // auth endpoints (login/setup/status are reachable without a session)
    if (resource === 'auth') return await handleAuth(db, request, url, id)

    // everything else requires a valid session
    const user = await currentUserFor(db, request)
    if (!user) return json({ error: 'Unauthorized' }, 401)

    // full dated history for one shop: /api/customers/:id/history
    if (resource === 'customers' && id && sub === 'history' && method === 'GET')
      return await customerHistory(db, id)
    if (resource === 'customers' && id && sub === 'pattern' && method === 'GET')
      return await customerPattern(db, id)

    // parties: /api/customers, /api/suppliers
    if (PARTY_TABLES[resource]) {
      const table = PARTY_TABLES[resource]
      if (method === 'GET' && !id) return await listParties(db, table)
      if (method === 'POST' && !id) return await createParty(db, table, await readBody())
      if (method === 'PUT' && id) return await updateParty(db, table, id, await readBody())
      if (method === 'DELETE' && id) {
        await db.prepare(`DELETE FROM ${table} WHERE id = ?`).bind(id).run()
        return json({ ok: true })
      }
    }

    // entries: /api/sales, /api/purchases, /api/expenses, /api/payments
    if (ENTRY_TABLES[resource]) {
      if (method === 'GET' && !id)
        return await listEntries(db, resource, url.searchParams.get('month') || '')
      if (method === 'DELETE' && id) {
        await db
          .prepare(`DELETE FROM ${ENTRY_TABLES[resource].table} WHERE id = ?`)
          .bind(id)
          .run()
        return json({ ok: true })
      }
      if (method === 'POST' && !id) {
        const b = await readBody()
        if (resource === 'sales') return await createSale(db, b)
        if (resource === 'purchases') return await createPurchase(db, b)
        if (resource === 'expenses') return await createExpense(db, b)
        if (resource === 'payments') return await createPayment(db, b)
      }
      if (method === 'PUT' && id) {
        const b = await readBody()
        if (resource === 'sales') return await updateSale(db, id, b)
        if (resource === 'purchases') return await updatePurchase(db, id, b)
        if (resource === 'expenses') return await updateExpense(db, id, b)
      }
    }

    // inbox notes: /api/notes
    if (resource === 'notes') {
      if (method === 'GET' && !id) {
        const { results } = await db
          .prepare(`SELECT * FROM notes WHERE status = 'pending' ORDER BY id DESC LIMIT 100`)
          .all()
        return json(results)
      }
      if (method === 'POST' && !id) {
        const b = await readBody()
        const note = str(b.note)
        if (!note) return json({ error: 'Write something first' }, 400)
        const kind = str(b.kind) === 'purchase' ? 'purchase' : 'sale'
        const r = await db.prepare('INSERT INTO notes (note, kind) VALUES (?, ?)').bind(note, kind).run()
        return json({ id: r.meta.last_row_id }, 201)
      }
      if (method === 'PUT' && id) {
        await db.prepare(`UPDATE notes SET status = 'done' WHERE id = ?`).bind(id).run()
        return json({ ok: true })
      }
      if (method === 'DELETE' && id) {
        await db.prepare('DELETE FROM notes WHERE id = ?').bind(id).run()
        return json({ ok: true })
      }
    }

    // web-push subscriptions for the morning inbox reminder: /api/push
    if (resource === 'push') {
      if (method === 'POST' && id === 'subscribe') {
        const b = await readBody()
        const endpoint = str(b.endpoint)
        const keys = b.keys || {}
        const p256dh = str(keys.p256dh)
        const auth = str(keys.auth)
        if (!endpoint || !p256dh || !auth) return json({ error: 'Invalid subscription' }, 400)
        await db
          .prepare(
            `INSERT INTO push_subscriptions (endpoint, p256dh, auth) VALUES (?, ?, ?)
             ON CONFLICT(endpoint) DO UPDATE SET p256dh = excluded.p256dh, auth = excluded.auth`
          )
          .bind(endpoint, p256dh, auth)
          .run()
        return json({ ok: true }, 201)
      }
      if (method === 'POST' && id === 'unsubscribe') {
        const b = await readBody()
        const endpoint = str(b.endpoint)
        if (endpoint) await db.prepare('DELETE FROM push_subscriptions WHERE endpoint = ?').bind(endpoint).run()
        return json({ ok: true })
      }
    }

    // order book: /api/orders
    if (resource === 'orders') {
      if (method === 'GET' && !id) {
        const status = str(url.searchParams.get('status') || '')
        const where = status === 'pending' || status === 'done' ? 'WHERE status = ?' : ''
        const stmt = db.prepare(
          `SELECT * FROM orders ${where} ORDER BY order_date, id LIMIT 200`
        )
        const { results } = await (where ? stmt.bind(status) : stmt).all()
        return json(results)
      }
      if (method === 'POST' && !id) {
        const b = await readBody()
        const date = str(b.order_date)
        if (!isDate(date)) return json({ error: 'Valid date is required' }, 400)
        const items = str(b.items)
        if (!items && !str(b.notes)) return json({ error: 'Add at least one item or a note' }, 400)
        const r = await db
          .prepare(
            `INSERT INTO orders (order_date, customer_id, customer_name, items, total_amount, notes)
             VALUES (?, ?, ?, ?, ?, ?)`
          )
          .bind(
            date,
            b.customer_id ? Number(b.customer_id) : null,
            str(b.customer_name),
            items,
            Math.max(num(b.total_amount), 0),
            str(b.notes)
          )
          .run()
        return json({ id: r.meta.last_row_id }, 201)
      }
      if (method === 'PUT' && id) {
        const b = await readBody()
        const status = str(b.status)
        if (status !== 'pending' && status !== 'done')
          return json({ error: 'Invalid status' }, 400)
        await db.prepare('UPDATE orders SET status = ? WHERE id = ?').bind(status, id).run()
        return json({ ok: true })
      }
      if (method === 'DELETE' && id) {
        await db.prepare('DELETE FROM orders WHERE id = ?').bind(id).run()
        return json({ ok: true })
      }
    }

    // settings: /api/settings (payment QR, UPI id, ...)
    if (resource === 'settings') {
      if (method === 'GET' && !id) {
        const { results } = await db.prepare('SELECT key, value FROM settings').all()
        const out = {}
        for (const r of results) out[r.key] = r.value
        return json(out)
      }
      if (method === 'PUT' && !id) {
        const b = await readBody()
        const ALLOWED = ['payment_qr', 'upi_id', 'invoice_note']
        const entries = Object.entries(b).filter(([k]) => ALLOWED.includes(k))
        if (!entries.length) return json({ error: 'Nothing to save' }, 400)
        for (const [k, v] of entries) {
          const value = typeof v === 'string' ? v : ''
          if (value.length > 400000) return json({ error: 'Image is too large — use a smaller one' }, 400)
          await db
            .prepare(
              `INSERT INTO settings (key, value, updated_at) VALUES (?, ?, datetime('now'))
               ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`
            )
            .bind(k, value)
            .run()
        }
        return json({ ok: true })
      }
    }

    // item catalog: /api/products
    if (resource === 'products') {
      if (method === 'GET' && !id) {
        const { results } = await db
          .prepare('SELECT * FROM products ORDER BY name COLLATE NOCASE, id')
          .all()
        return json(results)
      }
      if (method === 'POST' && !id) {
        const b = await readBody()
        const name = str(b.name)
        if (!name) return json({ error: 'Item name is required' }, 400)
        const codeRow = await db
          .prepare('SELECT COALESCE(MAX(item_code), 0) + 1 AS next FROM products')
          .first()
        const itemCode = codeRow ? num(codeRow.next) : 1
        const sku = skuFor(name, str(b.size))
        const r = await db
          .prepare(
            'INSERT INTO products (name, size, sale_price, purchase_price, item_code, sku) VALUES (?, ?, ?, ?, ?, ?)'
          )
          .bind(name, str(b.size), Math.max(num(b.sale_price), 0), Math.max(num(b.purchase_price), 0), itemCode, sku)
          .run()
        return json({ id: r.meta.last_row_id, item_code: itemCode, sku }, 201)
      }
      if (method === 'PUT' && id) {
        const b = await readBody()
        const name = str(b.name)
        if (!name) return json({ error: 'Item name is required' }, 400)
        await db
          .prepare('UPDATE products SET name = ?, size = ?, sale_price = ?, purchase_price = ?, sku = ? WHERE id = ?')
          .bind(name, str(b.size), Math.max(num(b.sale_price), 0), Math.max(num(b.purchase_price), 0), skuFor(name, str(b.size)), id)
          .run()
        return json({ ok: true })
      }
      if (method === 'DELETE' && id) {
        await db.prepare('DELETE FROM products WHERE id = ?').bind(id).run()
        return json({ ok: true })
      }
    }

    if (resource === 'statement' && id && method === 'GET')
      return await customerStatement(db, id, url.searchParams.get('date') || '')

    // stock registry: /api/stock
    if (resource === 'stock') {
      if (method === 'GET' && !id) return json(await stockData(db))
      if (method === 'POST' && id === 'import') return await importStockCounts(db, await readBody())
      if (method === 'POST' && !id) return await setStockCount(db, await readBody())
    }

    // full data backup (JSON of every table) — the owner downloading their own data
    if (resource === 'export' && method === 'GET') {
      const out = { app: 'simple-serve', version: 1, exported_at: new Date().toISOString() }
      const BUSINESS = [
        'customers', 'suppliers', 'products', 'sales', 'purchases',
        'expenses', 'payments', 'orders', 'notes', 'stock_counts', 'settings',
      ]
      for (const t of BUSINESS) {
        try {
          out[t] = (await db.prepare(`SELECT * FROM ${t}`).all()).results
        } catch {
          out[t] = []
        }
      }
      // account identity only — never the password hash / salt
      try {
        out.users = (await db.prepare('SELECT id, username, name, created_at FROM users').all()).results
      } catch {
        out.users = []
      }
      return json(out)
    }

    // calculated profit for day / week / month / year-to-date
    if (resource === 'profit-summary' && method === 'GET') {
      const date = str(url.searchParams.get('date') || '')
      if (!isDate(date)) return json({ error: 'date=YYYY-MM-DD is required' }, 400)
      return json(await profitSummaryData(db, date))
    }

    // day plan (route + what to carry) for a weekday, from history
    if (resource === 'dayplan' && method === 'GET') {
      const w = Number(url.searchParams.get('weekday'))
      if (!Number.isInteger(w) || w < 0 || w > 6) return json({ error: 'weekday 0-6 required' }, 400)
      return json(await dayPlanData(db, w))
    }

    // one-round-trip bundles per screen
    if (resource === 'bundle' && id === 'home' && method === 'GET') {
      const date = str(url.searchParams.get('date') || '')
      const month = str(url.searchParams.get('month') || '')
      if (!isDate(date) || !isMonth(month)) return json({ error: 'date and month required' }, 400)
      const [today, report, orders, notes, customers, suppliers, products, stock] = await Promise.all([
        todayData(db, date),
        reportData(db, month),
        db.prepare(`SELECT * FROM orders WHERE status = 'pending' ORDER BY order_date, id LIMIT 200`).all().then((r) => r.results),
        db.prepare(`SELECT * FROM notes WHERE status = 'pending' ORDER BY id DESC LIMIT 100`).all().then((r) => r.results),
        db.prepare('SELECT * FROM customers ORDER BY name COLLATE NOCASE').all().then((r) => r.results),
        db.prepare('SELECT * FROM suppliers ORDER BY name COLLATE NOCASE').all().then((r) => r.results),
        db.prepare('SELECT * FROM products ORDER BY name COLLATE NOCASE, id').all().then((r) => r.results),
        stockData(db),
      ])
      return json({ today, report, orders, notes, customers, suppliers, products, stock })
    }

    if (resource === 'bundle' && id === 'report' && method === 'GET') {
      const month = str(url.searchParams.get('month') || '')
      const date = str(url.searchParams.get('date') || '')
      const daylogDate = str(url.searchParams.get('daylog') || '')
      if (!isMonth(month) || !isDate(date) || !isDate(daylogDate))
        return json({ error: 'month, date and daylog required' }, 400)
      const [report, trend, bal, monthSales, daylog, products, profitSummary, salesSummary] = await Promise.all([
        reportData(db, month),
        trendData(db, month),
        balancesData(db),
        db
          .prepare(`SELECT * FROM sales WHERE substr(sale_date,1,7) = ? ORDER BY sale_date DESC, id DESC LIMIT 500`)
          .bind(month)
          .all()
          .then((r) => r.results),
        daylogData(db, daylogDate),
        db.prepare('SELECT * FROM products ORDER BY name COLLATE NOCASE, id').all().then((r) => r.results),
        profitSummaryData(db, date),
        salesSummaryData(db, date),
      ])
      return json({ report, trend, balances: bal, monthSales, daylog, products, profitSummary, salesSummary })
    }


    // travel log: the day's shop visits in entry order
    if (resource === 'daylog' && method === 'GET') {
      const date = str(url.searchParams.get('date') || '')
      if (!isDate(date)) return json({ error: 'date=YYYY-MM-DD is required' }, 400)
      return json(await daylogData(db, date))
    }

    if (resource === 'balances' && method === 'GET') return json(await balancesData(db))
    if (resource === 'report' && id === 'trend' && method === 'GET')
      {
        const m2 = str(url.searchParams.get('month') || '')
        if (!isMonth(m2)) return json({ error: 'month=YYYY-MM is required' }, 400)
        return json(await trendData(db, m2))
      }
    if (resource === 'report' && method === 'GET')
      {
        const m2 = str(url.searchParams.get('month') || '')
        if (!isMonth(m2)) return json({ error: 'month=YYYY-MM is required' }, 400)
        return json(await reportData(db, m2))
      }
    if (resource === 'today' && method === 'GET')
      {
        const d2 = str(url.searchParams.get('date') || '')
        if (!isDate(d2)) return json({ error: 'date=YYYY-MM-DD is required' }, 400)
        return json(await todayData(db, d2))
      }

    return json({ error: 'Not found' }, 404)
  } catch (err) {
    return json({ error: 'Server error: ' + (err && err.message) }, 500)
  }
}
