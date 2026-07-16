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

async function createParty(db, table, b) {
  const name = str(b.name)
  if (!name) return json({ error: 'Name is required' }, 400)
  const r = await db
    .prepare(`INSERT INTO ${table} (name, place, phone) VALUES (?, ?, ?)`)
    .bind(name, str(b.place), str(b.phone))
    .run()
  return json({ id: r.meta.last_row_id, name }, 201)
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
    // parties: /api/customers, /api/suppliers
    if (PARTY_TABLES[resource]) {
      const table = PARTY_TABLES[resource]
      if (method === 'GET' && !id) return await listParties(db, table)
      if (method === 'POST' && !id) return await createParty(db, table, await readBody())
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

    if (resource === 'balances' && method === 'GET') return await balances(db)
    if (resource === 'report' && method === 'GET')
      return await report(db, url.searchParams.get('month') || '')
    if (resource === 'today' && method === 'GET')
      return await today(db, url.searchParams.get('date') || '')

    return json({ error: 'Not found' }, 404)
  } catch (err) {
    return json({ error: 'Server error: ' + (err && err.message) }, 500)
  }
}
