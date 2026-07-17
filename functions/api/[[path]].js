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

async function createSale(db, b) {
  const date = str(b.sale_date)
  const total = num(b.total_amount)
  if (!isDate(date)) return json({ error: 'Valid date is required' }, 400)
  if (total <= 0) return json({ error: 'Amount must be more than 0' }, 400)
  const paid = Math.min(Math.max(num(b.paid_amount), 0), total)
  const r = await db
    .prepare(
      `INSERT INTO sales (sale_date, customer_id, customer_name, items, total_amount, paid_amount, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      date,
      b.customer_id ? Number(b.customer_id) : null,
      str(b.customer_name),
      str(b.items),
      total,
      paid,
      str(b.notes)
    )
    .run()
  return json({ id: r.meta.last_row_id }, 201)
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

async function balances(db) {
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

  return json({
    customers: customers.results.map((r) => ({ ...r, balance: round2(custBal.get(r.id) || 0) })),
    suppliers: suppliers.results.map((r) => ({ ...r, balance: round2(supBal.get(r.id) || 0) })),
  })
}

async function trendReport(db, endMonth) {
  if (!isMonth(endMonth)) return json({ error: 'month=YYYY-MM is required' }, 400)
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
  return json(
    months.map((mo) => {
      const sales = s[mo] || 0, purchases = p[mo] || 0, expenses = e[mo] || 0
      return {
        month: mo,
        sales,
        purchases,
        expenses,
        profit: Math.round((sales - purchases - expenses) * 100) / 100,
      }
    })
  )
}

async function report(db, month) {
  if (!isMonth(month)) return json({ error: 'month=YYYY-MM is required' }, 400)

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

  return json({
    month,
    sales: { count: num(sales.count), total: num(sales.total), paid: num(sales.paid) },
    purchases: { count: num(purchases.count), total: num(purchases.total), paid: num(purchases.paid) },
    expenses: { count: num(expenses.count), total: num(expenses.total), byCategory: expByCat.results },
    profit,
    outstanding: { receivable: num(receivable.v), payable: num(payable.v) },
    salesDaily: salesDaily.results,
  })
}

async function today(db, date) {
  if (!isDate(date)) return json({ error: 'date=YYYY-MM-DD is required' }, 400)
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
  return json({ date, sales: s, purchases: p, expenses: e, collected: coll.total })
}

// ---------- router ----------

export async function onRequest(context) {
  const { request, env } = context
  const db = env.DB
  const url = new URL(request.url)
  const parts = url.pathname.replace(/^\/api\/?/, '').split('/').filter(Boolean)
  const [resource, id] = parts
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
        const r = await db
          .prepare('INSERT INTO products (name, size, sale_price, purchase_price) VALUES (?, ?, ?, ?)')
          .bind(name, str(b.size), Math.max(num(b.sale_price), 0), Math.max(num(b.purchase_price), 0))
          .run()
        return json({ id: r.meta.last_row_id }, 201)
      }
      if (method === 'PUT' && id) {
        const b = await readBody()
        const name = str(b.name)
        if (!name) return json({ error: 'Item name is required' }, 400)
        await db
          .prepare('UPDATE products SET name = ?, size = ?, sale_price = ?, purchase_price = ? WHERE id = ?')
          .bind(name, str(b.size), Math.max(num(b.sale_price), 0), Math.max(num(b.purchase_price), 0), id)
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

    if (resource === 'balances' && method === 'GET') return await balances(db)
    if (resource === 'report' && id === 'trend' && method === 'GET')
      return await trendReport(db, url.searchParams.get('month') || '')
    if (resource === 'report' && method === 'GET')
      return await report(db, url.searchParams.get('month') || '')
    if (resource === 'today' && method === 'GET')
      return await today(db, url.searchParams.get('date') || '')

    return json({ error: 'Not found' }, 404)
  } catch (err) {
    return json({ error: 'Server error: ' + (err && err.message) }, 500)
  }
}
