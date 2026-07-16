/* Simple Serve — Business Book (frontend) */

const EXPENSE_CATEGORIES = [
  'Petrol / Fuel',
  'Vehicle Repair',
  'Electricity',
  'Phone / Internet',
  'Rent',
  'Food / Tea',
  'Packing Material',
  'Labour / Help',
  'Other',
];

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

const state = {
  tab: 'home',
  entriesKind: 'sales',
  reportMonth: todayStr().slice(0, 7),
  customers: [],
  suppliers: [],
  products: [],
  user: null,
};

function todayStr() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

function fmtMoney(n) {
  const v = Number(n) || 0;
  const s = '₹' + Math.abs(v).toLocaleString('en-IN', { maximumFractionDigits: 2 });
  return v < 0 ? '−' + s : s;
}

function fmtDate(s) {
  if (!s) return '';
  const [y, m, d] = s.split('-');
  return `${d}/${m}/${y.slice(2)}`;
}

function fmtDateFull(s) {
  if (!s) return '';
  const [y, m, d] = s.split('-');
  return `${d}/${m}/${y}`;
}

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

async function api(path, opts = {}) {
  const res = await fetch(path, {
    headers: { 'Content-Type': 'application/json' },
    ...opts,
  });
  const data = await res.json().catch(() => ({}));
  if (res.status === 401 && !path.startsWith('/api/auth/')) {
    state.user = null;
    showAuthScreen(false);
    throw new Error(data.error || 'Please log in');
  }
  if (!res.ok) throw new Error(data.error || 'Something went wrong');
  return data;
}

function toast(msg, ok = true) {
  const el = $('#toast');
  el.textContent = msg;
  el.className = ok ? 'show ok' : 'show err';
  clearTimeout(el._t);
  el._t = setTimeout(() => (el.className = ''), 2600);
}

async function loadParties() {
  const [customers, suppliers, products] = await Promise.all([
    api('/api/customers'),
    api('/api/suppliers'),
    api('/api/products'),
  ]);
  state.customers = customers;
  state.suppliers = suppliers;
  state.products = products;
}

/* ---------- modal helpers ---------- */

function openModal(title, bodyHtml, onSubmit) {
  const root = $('#modal-root');
  root.innerHTML = `
    <div class="modal-overlay">
      <div class="modal">
        <div class="modal-head">
          <h2>${esc(title)}</h2>
          <button class="modal-close" type="button">&times;</button>
        </div>
        <form class="modal-body">${bodyHtml}
          <button type="submit" class="btn-primary btn-save">Save</button>
        </form>
      </div>
    </div>`;
  const close = () => (root.innerHTML = '');
  $('.modal-close', root).onclick = close;
  $('.modal-overlay', root).onclick = (e) => {
    if (e.target.classList.contains('modal-overlay')) close();
  };
  $('form', root).onsubmit = async (e) => {
    e.preventDefault();
    const btn = $('.btn-save', root);
    btn.disabled = true;
    try {
      await onSubmit(new FormData(e.target), close);
    } catch (err) {
      toast(err.message, false);
      btn.disabled = false;
    }
  };
  const first = $('input, select', root);
  if (first) first.focus();
  return { close };
}

function partyOptions(list) {
  return list
    .map((p) => `<option value="${p.id}">${esc(p.name)}${p.place ? ' — ' + esc(p.place) : ''}</option>`)
    .join('');
}

/* party <select> with a built-in "+ add new" flow */
function partyField(label, name, list, addLabel) {
  return `
    <label>${label}
      <select name="${name}">
        <option value="">— select —</option>
        ${partyOptions(list)}
        <option value="__new__">＋ ${addLabel}</option>
      </select>
    </label>
    <div class="new-party hidden">
      <label>Name <input name="${name}_new_name" placeholder="Name" /></label>
      <label>Place <input name="${name}_new_place" placeholder="Place (optional)" /></label>
      <label>Phone <input name="${name}_new_phone" inputmode="tel" placeholder="Phone (optional)" /></label>
    </div>`;
}

function wirePartyField(name) {
  const sel = $(`#modal-root select[name="${name}"]`);
  sel.onchange = () => {
    $('#modal-root .new-party').classList.toggle('hidden', sel.value !== '__new__');
  };
}

/* Resolves the party select: creates the party first if "+ new" chosen.
   Returns {id, name} or {id:null, name:''} */
async function resolveParty(fd, name, endpoint, list) {
  const v = fd.get(name);
  if (v === '__new__') {
    const newName = (fd.get(`${name}_new_name`) || '').trim();
    if (!newName) throw new Error('Enter the new name');
    const created = await api(endpoint, {
      method: 'POST',
      body: JSON.stringify({
        name: newName,
        place: fd.get(`${name}_new_place`) || '',
        phone: fd.get(`${name}_new_phone`) || '',
      }),
    });
    await loadParties();
    return { id: created.id, name: created.name };
  }
  if (!v) return { id: null, name: '' };
  const p = list.find((x) => String(x.id) === String(v));
  return { id: Number(v), name: p ? p.name : '' };
}

/* ---------- quick-entry forms ---------- */

function saleForm() {
  openModal(
    'New Sale',
    `
    <label>Date <input type="date" name="sale_date" value="${todayStr()}" required /></label>
    ${partyField('Shop / Customer', 'customer', state.customers, 'Add new shop')}
    ${itemPickerHtml()}
    <label>Items sold <input name="items" placeholder="e.g. Spice LD Cover 1 kg x 10" /></label>
    <label>Total amount (₹) <input type="number" name="total_amount" min="0" step="0.01" inputmode="decimal" required placeholder="0" /></label>
    <label>Received now (₹) <input type="number" name="paid_amount" min="0" step="0.01" inputmode="decimal" placeholder="Leave empty if full amount received" /></label>
    <div class="paid-quick">
      <button type="button" class="chip" data-paid="full">Full cash</button>
      <button type="button" class="chip" data-paid="zero">Full credit</button>
    </div>
    <label>Notes <input name="notes" placeholder="Optional" /></label>`,
    async (fd, close) => {
      const party = await resolveParty(fd, 'customer', '/api/customers', state.customers);
      const total = parseFloat(fd.get('total_amount'));
      const paidRaw = fd.get('paid_amount');
      const paid = paidRaw === '' ? total : parseFloat(paidRaw);
      await api('/api/sales', {
        method: 'POST',
        body: JSON.stringify({
          sale_date: fd.get('sale_date'),
          customer_id: party.id,
          customer_name: party.name,
          items: fd.get('items'),
          total_amount: total,
          paid_amount: paid,
          notes: fd.get('notes'),
        }),
      });
      close();
      toast('Sale saved ✓');
      render();
    }
  );
  wirePartyField('customer');
  wirePaidChips();
  wireItemPicker(true);
}

function purchaseForm() {
  openModal(
    'New Purchase',
    `
    <label>Date <input type="date" name="purchase_date" value="${todayStr()}" required /></label>
    ${partyField('Supplier', 'supplier', state.suppliers, 'Add new supplier')}
    ${itemPickerHtml()}
    <label>Items bought <input name="items" placeholder="e.g. Spice LD Cover 5 kg x 20" /></label>
    <label>Total amount (₹) <input type="number" name="total_amount" min="0" step="0.01" inputmode="decimal" required placeholder="0" /></label>
    <label>Paid now (₹) <input type="number" name="paid_amount" min="0" step="0.01" inputmode="decimal" placeholder="Leave empty if fully paid" /></label>
    <div class="paid-quick">
      <button type="button" class="chip" data-paid="full">Fully paid</button>
      <button type="button" class="chip" data-paid="zero">On credit</button>
    </div>
    <label>Notes <input name="notes" placeholder="Optional" /></label>`,
    async (fd, close) => {
      const party = await resolveParty(fd, 'supplier', '/api/suppliers', state.suppliers);
      const total = parseFloat(fd.get('total_amount'));
      const paidRaw = fd.get('paid_amount');
      const paid = paidRaw === '' ? total : parseFloat(paidRaw);
      await api('/api/purchases', {
        method: 'POST',
        body: JSON.stringify({
          purchase_date: fd.get('purchase_date'),
          supplier_id: party.id,
          supplier_name: party.name,
          items: fd.get('items'),
          total_amount: total,
          paid_amount: paid,
          notes: fd.get('notes'),
        }),
      });
      close();
      toast('Purchase saved ✓');
      render();
    }
  );
  wirePartyField('supplier');
  wirePaidChips();
  wireItemPicker(false);
}

/* item picker inside sale/purchase forms: appends to the items text,
   and (for sales) adds qty × default price to the total when a price is set */
function itemPickerHtml() {
  if (!state.products.length) return '';
  const opts = state.products
    .map((p) => `<option value="${p.id}">${esc(p.name)} ${esc(p.size)}${p.sale_price > 0 ? ' — ₹' + p.sale_price : ''}</option>`)
    .join('');
  return `
    <div class="item-picker">
      <select data-pick-product><option value="">— pick item —</option>${opts}</select>
      <input type="number" data-pick-qty value="1" min="0.25" step="0.25" inputmode="decimal" title="Quantity" />
      <button type="button" class="btn-small" data-pick-add>＋</button>
    </div>`;
}

function wireItemPicker(applyPrice) {
  const addBtn = $('#modal-root [data-pick-add]');
  if (!addBtn) return;
  addBtn.onclick = () => {
    const sel = $('#modal-root [data-pick-product]');
    const qtyInput = $('#modal-root [data-pick-qty]');
    const p = state.products.find((x) => String(x.id) === sel.value);
    if (!p) return;
    const qty = Math.max(parseFloat(qtyInput.value) || 1, 0);
    const itemsInput = $('#modal-root input[name="items"]');
    const entry = `${p.name} ${p.size} x ${qty}`;
    itemsInput.value = itemsInput.value ? itemsInput.value + ', ' + entry : entry;
    if (applyPrice && p.sale_price > 0) {
      const totalInput = $('#modal-root input[name="total_amount"]');
      totalInput.value = String(Math.round(((parseFloat(totalInput.value) || 0) + p.sale_price * qty) * 100) / 100);
    }
    sel.value = '';
    qtyInput.value = '1';
  };
}

function wirePaidChips() {
  $$('#modal-root .chip').forEach((chip) => {
    chip.onclick = () => {
      const paidInput = $('#modal-root input[name="paid_amount"]');
      const totalInput = $('#modal-root input[name="total_amount"]');
      paidInput.value = chip.dataset.paid === 'zero' ? '0' : (totalInput.value || '');
    };
  });
}

function expenseForm() {
  openModal(
    'New Expense',
    `
    <label>Date <input type="date" name="expense_date" value="${todayStr()}" required /></label>
    <label>Category
      <select name="category" required>
        ${EXPENSE_CATEGORIES.map((c) => `<option>${c}</option>`).join('')}
      </select>
    </label>
    <label>Amount (₹) <input type="number" name="amount" min="0" step="0.01" inputmode="decimal" required placeholder="0" /></label>
    <label>Notes <input name="notes" placeholder="Optional (e.g. petrol for Ollur route)" /></label>`,
    async (fd, close) => {
      await api('/api/expenses', {
        method: 'POST',
        body: JSON.stringify({
          expense_date: fd.get('expense_date'),
          category: fd.get('category'),
          amount: parseFloat(fd.get('amount')),
          notes: fd.get('notes'),
        }),
      });
      close();
      toast('Expense saved ✓');
      render();
    }
  );
}

function paymentForm(type, party) {
  const label = type === 'in' ? 'Collect from shop' : 'Pay supplier';
  const list = type === 'in' ? state.customers : state.suppliers;
  openModal(
    label,
    `
    <label>Date <input type="date" name="payment_date" value="${todayStr()}" required /></label>
    <label>${type === 'in' ? 'Shop / Customer' : 'Supplier'}
      <select name="party_id" required>
        ${partyOptions(list)}
      </select>
    </label>
    <label>Amount (₹) <input type="number" name="amount" min="0" step="0.01" inputmode="decimal" required placeholder="0" /></label>
    <label>Notes <input name="notes" placeholder="Optional" /></label>`,
    async (fd, close) => {
      const pid = Number(fd.get('party_id'));
      const p = list.find((x) => x.id === pid);
      await api('/api/payments', {
        method: 'POST',
        body: JSON.stringify({
          payment_date: fd.get('payment_date'),
          type,
          party_id: pid,
          party_name: p ? p.name : '',
          amount: parseFloat(fd.get('amount')),
          notes: fd.get('notes'),
        }),
      });
      close();
      toast(type === 'in' ? 'Collection saved ✓' : 'Payment saved ✓');
      render();
    }
  );
  if (party) $('#modal-root select[name="party_id"]').value = String(party.id);
}

/* ---------- views ---------- */

async function viewHome() {
  const today = todayStr();
  const month = today.slice(0, 7);
  const [t, report] = await Promise.all([
    api(`/api/today?date=${today}`),
    api(`/api/report?month=${month}`),
  ]);

  return `
  <section class="quick-actions">
    <button class="qa qa-sale" id="qa-sale"><span class="qa-ico">&#128176;</span>Sale</button>
    <button class="qa qa-purchase" id="qa-purchase"><span class="qa-ico">&#128666;</span>Purchase</button>
    <button class="qa qa-expense" id="qa-expense"><span class="qa-ico">&#9981;</span>Expense</button>
  </section>
  <section class="quick-actions secondary">
    <button class="qa-small" id="qa-collect">&#129297; Collect payment</button>
    <button class="qa-small" id="qa-payout">&#128184; Pay supplier</button>
  </section>

  <section class="card">
    <h3>Today &middot; ${fmtDate(today)}</h3>
    <div class="stat-row">
      <div class="stat"><div class="stat-label">Sales</div><div class="stat-val good">${fmtMoney(t.sales.total)}</div><div class="stat-sub">${t.sales.count} entries</div></div>
      <div class="stat"><div class="stat-label">Purchases</div><div class="stat-val">${fmtMoney(t.purchases.total)}</div><div class="stat-sub">${t.purchases.count} entries</div></div>
      <div class="stat"><div class="stat-label">Expenses</div><div class="stat-val bad">${fmtMoney(t.expenses.total)}</div><div class="stat-sub">${t.expenses.count} entries</div></div>
      <div class="stat"><div class="stat-label">Collected</div><div class="stat-val good">${fmtMoney(t.collected)}</div><div class="stat-sub">old credit</div></div>
    </div>
  </section>

  <section class="card">
    <h3>This month &middot; ${monthLabel(month)}</h3>
    <div class="pl-line"><span>Sales</span><b class="good">${fmtMoney(report.sales.total)}</b></div>
    <div class="pl-line"><span>Purchases</span><b>&minus; ${fmtMoney(report.purchases.total)}</b></div>
    <div class="pl-line"><span>Expenses</span><b class="bad">&minus; ${fmtMoney(report.expenses.total)}</b></div>
    <div class="pl-line pl-total"><span>Profit</span><b class="${report.profit >= 0 ? 'good' : 'bad'}">${fmtMoney(report.profit)}</b></div>
    <div class="pl-line pl-muted"><span>Shops owe you (total)</span><b>${fmtMoney(report.outstanding.receivable)}</b></div>
    <div class="pl-line pl-muted"><span>You owe suppliers (total)</span><b>${fmtMoney(report.outstanding.payable)}</b></div>
  </section>`;
}

function monthLabel(m) {
  const [y, mo] = m.split('-').map(Number);
  return new Date(y, mo - 1, 1).toLocaleString('en-IN', { month: 'long', year: 'numeric' });
}

async function viewEntries() {
  const kind = state.entriesKind;
  const month = state.reportMonth;
  const rows = await api(`/api/${kind}?month=${month}`);

  const tabs = [
    ['sales', 'Sales'],
    ['purchases', 'Purchases'],
    ['expenses', 'Expenses'],
    ['payments', 'Collections'],
  ]
    .map(
      ([k, label]) =>
        `<button class="seg ${k === kind ? 'active' : ''}" data-kind="${k}">${label}</button>`
    )
    .join('');

  const rowHtml = rows
    .map((r) => {
      let title = '', sub = '', amount = 0, pending = 0;
      if (kind === 'sales') {
        title = r.customer_name || 'Cash sale';
        sub = r.items || r.notes || '';
        amount = r.total_amount;
        pending = r.total_amount - r.paid_amount;
      } else if (kind === 'purchases') {
        title = r.supplier_name || 'Purchase';
        sub = r.items || r.notes || '';
        amount = r.total_amount;
        pending = r.total_amount - r.paid_amount;
      } else if (kind === 'expenses') {
        title = r.category;
        sub = r.notes || '';
        amount = r.amount;
      } else {
        title = (r.type === 'in' ? 'From ' : 'To ') + (r.party_name || '?');
        sub = r.notes || '';
        amount = r.amount;
      }
      const dateField = r.sale_date || r.purchase_date || r.expense_date || r.payment_date;
      return `
      <div class="row">
        <div class="row-main">
          <div class="row-title">${esc(title)}</div>
          <div class="row-sub">${fmtDate(dateField)}${sub ? ' &middot; ' + esc(sub) : ''}</div>
          ${pending > 0.005 ? `<div class="row-pending">Pending: ${fmtMoney(pending)}</div>` : ''}
        </div>
        <div class="row-amount">${fmtMoney(amount)}</div>
        <button class="row-del" data-id="${r.id}" title="Delete">&#128465;</button>
      </div>`;
    })
    .join('');

  const total = rows.reduce((a, r) => a + (r.total_amount ?? r.amount ?? 0), 0);

  return `
  <section class="card">
    <div class="entries-head">
      <input type="month" id="entries-month" value="${month}" />
      <div class="entries-total">${rows.length} entries &middot; <b>${fmtMoney(total)}</b></div>
    </div>
    <div class="seg-row">${tabs}</div>
    <div class="rows">${rowHtml || '<div class="empty">No entries this month. Use the Home tab to add.</div>'}</div>
  </section>`;
}

async function viewParties() {
  const [{ customers, suppliers }, products] = await Promise.all([
    api('/api/balances'),
    api('/api/products'),
  ]);
  state.customers = customers;
  state.suppliers = suppliers;
  state.products = products;

  const groups = {};
  for (const p of products) (groups[p.name] = groups[p.name] || []).push(p);
  const itemsHtml = Object.entries(groups)
    .map(
      ([name, list]) => `
      <div class="item-group">
        <div class="item-group-name">${esc(name)}</div>
        <div class="item-chips">
          ${list
            .map(
              (p) =>
                `<button class="chip item-chip" data-id="${p.id}">${esc(p.size) || '—'}${p.sale_price > 0 ? ' · ₹' + p.sale_price : ''}</button>`
            )
            .join('')}
        </div>
      </div>`
    )
    .join('');

  const partyRow = (p, kind) => `
    <div class="row">
      <div class="row-main">
        <div class="row-title">${esc(p.name)}</div>
        <div class="row-sub">${esc([p.place, p.phone].filter(Boolean).join(' · '))}</div>
      </div>
      <div class="row-amount ${p.balance > 0.005 ? (kind === 'customer' ? 'good' : 'bad') : 'muted'}">
        ${p.balance > 0.005 ? fmtMoney(p.balance) : '✓ Clear'}
      </div>
      ${kind === 'customer' && p.balance > 0.005
        ? `<button class="row-stmt" data-id="${p.id}" title="Bill statement">&#129534;</button>`
        : ''}
      ${p.balance > 0.005
        ? `<button class="row-collect" data-kind="${kind}" data-id="${p.id}">${kind === 'customer' ? 'Collect' : 'Pay'}</button>`
        : `<button class="row-del party-del" data-kind="${kind}" data-id="${p.id}" title="Delete">&#128465;</button>`}
    </div>`;

  return `
  <section class="card">
    <div class="card-head-row">
      <h3>Shops (customers)</h3>
      <div class="head-actions">
        <button class="btn-small" id="import-customers">&#8686; Import</button>
        <button class="btn-small" id="add-customer">＋ Add</button>
      </div>
    </div>
    <div class="hint">Amount shown = money the shop still owes you &middot; &#129534; = bill statement for WhatsApp</div>
    <div class="rows">${customers.map((p) => partyRow(p, 'customer')).join('') || '<div class="empty">No shops added yet</div>'}</div>
  </section>
  <section class="card">
    <div class="card-head-row">
      <h3>Suppliers</h3>
      <button class="btn-small" id="add-supplier">＋ Add</button>
    </div>
    <div class="hint">Amount shown = money you still owe the supplier</div>
    <div class="rows">${suppliers.map((p) => partyRow(p, 'supplier')).join('') || '<div class="empty">No suppliers added yet</div>'}</div>
  </section>
  <section class="card">
    <div class="card-head-row">
      <h3>Items (catalog)</h3>
      <div class="head-actions">
        <button class="btn-small" id="import-products">&#8686; Import</button>
        <button class="btn-small" id="add-product">＋ Add</button>
      </div>
    </div>
    <div class="hint">Tap an item to set its price or remove it. Items appear in the Sale / Purchase forms.</div>
    ${itemsHtml || '<div class="empty">No items yet</div>'}
  </section>`;
}

async function viewReport() {
  const month = state.reportMonth;
  const r = await api(`/api/report?month=${month}`);

  const catRows = (r.expenses.byCategory || [])
    .map(
      (c) =>
        `<div class="pl-line pl-muted"><span>&nbsp;&nbsp;${esc(c.category)}</span><b>${fmtMoney(c.total)}</b></div>`
    )
    .join('');

  const maxDaily = Math.max(1, ...(r.salesDaily || []).map((d) => d.total));
  const bars = (r.salesDaily || [])
    .map(
      (d) => `
      <div class="bar-row">
        <span class="bar-label">${fmtDate(d.d)}</span>
        <div class="bar-track"><div class="bar" style="width:${Math.round((d.total / maxDaily) * 100)}%"></div></div>
        <span class="bar-val">${fmtMoney(d.total)}</span>
      </div>`
    )
    .join('');

  return `
  <section class="card">
    <div class="entries-head">
      <input type="month" id="report-month" value="${month}" />
      <button class="btn-small" id="export-csv">&#11015; CSV</button>
    </div>
    <h3>Profit &amp; Loss &middot; ${monthLabel(month)}</h3>
    <div class="pl-line"><span>Sales (${r.sales.count})</span><b class="good">${fmtMoney(r.sales.total)}</b></div>
    <div class="pl-line pl-muted"><span>&nbsp;&nbsp;Cash received</span><b>${fmtMoney(r.sales.paid)}</b></div>
    <div class="pl-line pl-muted"><span>&nbsp;&nbsp;Given on credit</span><b>${fmtMoney(r.sales.total - r.sales.paid)}</b></div>
    <div class="pl-line"><span>Purchases (${r.purchases.count})</span><b>&minus; ${fmtMoney(r.purchases.total)}</b></div>
    <div class="pl-line"><span>Expenses (${r.expenses.count})</span><b class="bad">&minus; ${fmtMoney(r.expenses.total)}</b></div>
    ${catRows}
    <div class="pl-line pl-total"><span>Net profit</span><b class="${r.profit >= 0 ? 'good' : 'bad'}">${fmtMoney(r.profit)}</b></div>
  </section>

  <section class="card">
    <h3>Outstanding (overall)</h3>
    <div class="pl-line"><span>Shops owe you</span><b class="good">${fmtMoney(r.outstanding.receivable)}</b></div>
    <div class="pl-line"><span>You owe suppliers</span><b class="bad">${fmtMoney(r.outstanding.payable)}</b></div>
  </section>

  ${bars ? `<section class="card"><h3>Daily sales</h3>${bars}</section>` : ''}`;
}

/* ---------- CSV export ---------- */

async function exportCsv() {
  const month = state.reportMonth;
  const [sales, purchases, expenses, payments] = await Promise.all([
    api(`/api/sales?month=${month}`),
    api(`/api/purchases?month=${month}`),
    api(`/api/expenses?month=${month}`),
    api(`/api/payments?month=${month}`),
  ]);
  const q = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const lines = ['Type,Date,Party/Category,Items,Total,Paid,Notes'];
  for (const s of sales)
    lines.push(['Sale', s.sale_date, q(s.customer_name), q(s.items), s.total_amount, s.paid_amount, q(s.notes)].join(','));
  for (const p of purchases)
    lines.push(['Purchase', p.purchase_date, q(p.supplier_name), q(p.items), p.total_amount, p.paid_amount, q(p.notes)].join(','));
  for (const e of expenses)
    lines.push(['Expense', e.expense_date, q(e.category), '', e.amount, e.amount, q(e.notes)].join(','));
  for (const p of payments)
    lines.push([p.type === 'in' ? 'Collection' : 'SupplierPayment', p.payment_date, q(p.party_name), '', p.amount, p.amount, q(p.notes)].join(','));
  const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `simple-serve-${month}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
  toast('CSV downloaded ✓');
}

/* ---------- statement / invoice (WhatsApp share) ---------- */

function infoModal(title, bodyHtml) {
  const root = $('#modal-root');
  root.innerHTML = `
    <div class="modal-overlay">
      <div class="modal">
        <div class="modal-head">
          <h2>${esc(title)}</h2>
          <button class="modal-close" type="button">&times;</button>
        </div>
        <div class="modal-body">${bodyHtml}</div>
      </div>
    </div>`;
  const close = () => (root.innerHTML = '');
  $('.modal-close', root).onclick = close;
  $('.modal-overlay', root).onclick = (e) => {
    if (e.target.classList.contains('modal-overlay')) close();
  };
  return { close };
}

function statementText(st) {
  const c = st.customer;
  const lines = [];
  lines.push('*Simple Serve* — Bill Summary');
  lines.push(`Bill for: *${c.name}${c.place ? ', ' + c.place : ''}*`);
  lines.push(`Statement date: ${fmtDateFull(st.date)}`);
  lines.push('');
  lines.push('Pending bills:');
  st.open.forEach((b, i) => {
    lines.push(
      `${i + 1}) Bought on ${fmtDateFull(b.date)}: ${b.items || 'Goods'} — ${fmtMoney(b.balance)}` +
      ` (pay by ${fmtDateFull(b.due_date)})${b.overdue ? ' ⚠️ OVERDUE' : ''}`
    );
  });
  lines.push('');
  if (st.totals.overdue > 0) lines.push(`Overdue: ${fmtMoney(st.totals.overdue)}`);
  if (st.totals.notYetDue > 0) lines.push(`Not yet due: ${fmtMoney(st.totals.notYetDue)}`);
  lines.push(`*Total to pay: ${fmtMoney(st.totals.due)}*`);
  lines.push('');
  lines.push(`Payment terms: within ${c.credit_days} days of each bill.`);
  lines.push('Simple Serve, Urakam, Thrissur');
  return lines.join('\n');
}

function waPhone(raw) {
  const digits = String(raw || '').replace(/\D/g, '');
  if (digits.length === 10) return '91' + digits;
  return digits;
}

async function statementModal(customerId) {
  const st = await api(`/api/statement/${customerId}?date=${todayStr()}`);
  const c = st.customer;
  if (!st.open.length) {
    infoModal(`Statement — ${c.name}`, '<div class="empty">No pending bills. All clear ✓</div>');
    return;
  }
  const billRows = st.open.map((b) => `
    <div class="row">
      <div class="row-main">
        <div class="row-title">Bought on ${fmtDateFull(b.date)}</div>
        <div class="row-sub">${esc(b.items || 'Goods')}</div>
        <div class="row-sub">Pay by ${fmtDateFull(b.due_date)}</div>
        ${b.overdue ? '<div class="row-pending">⚠️ Overdue</div>' : ''}
      </div>
      <div class="row-amount">${fmtMoney(b.balance)}</div>
    </div>`).join('');

  const phone = waPhone(c.phone);
  infoModal(
    `Statement — ${c.name}`,
    `
    <div class="rows">${billRows}</div>
    <div class="pl-line"><span>Overdue</span><b class="bad">${fmtMoney(st.totals.overdue)}</b></div>
    <div class="pl-line"><span>Not yet due</span><b>${fmtMoney(st.totals.notYetDue)}</b></div>
    <div class="pl-line pl-total"><span>Total to pay</span><b>${fmtMoney(st.totals.due)}</b></div>
    <button type="button" class="btn-primary btn-wa" id="stmt-img">&#129534; Invoice image → WhatsApp</button>
    <button type="button" class="btn-small" id="stmt-wa">&#128172; Send as text${phone ? '' : ' (no phone saved — pick contact)'}</button>
    <button type="button" class="btn-small" id="stmt-copy">Copy text</button>`
  );
  const text = statementText(st);
  $('#stmt-img').onclick = async () => {
    const btn = $('#stmt-img');
    btn.disabled = true;
    try {
      await shareInvoiceImage(st);
    } catch (e) {
      toast(e.message, false);
    }
    btn.disabled = false;
  };
  $('#stmt-wa').onclick = () => {
    const base = phone ? `https://wa.me/${phone}` : 'https://wa.me/';
    window.open(`${base}?text=${encodeURIComponent(text)}`, '_blank');
  };
  $('#stmt-copy').onclick = async () => {
    try {
      await navigator.clipboard.writeText(text);
      toast('Copied ✓');
    } catch {
      toast('Could not copy on this browser', false);
    }
  };
}

/* ---------- payment settings (QR + UPI id for invoices) ---------- */

function readImageAsDataUrl(file, maxSize) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Could not read the image'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('That file is not an image'));
      img.onload = () => {
        const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
        const c = document.createElement('canvas');
        c.width = Math.round(img.width * scale);
        c.height = Math.round(img.height * scale);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        resolve(c.toDataURL('image/png'));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

async function paymentSettingsForm() {
  const settings = await api('/api/settings');
  openModal(
    'Payment QR & UPI',
    `
    <div class="hint" style="margin-bottom:0">These appear on every invoice image so the shop can
    scan and pay you directly. Upload the QR from your PhonePe / Google Pay app
    (open the app → your QR → take a screenshot).</div>
    <div id="qr-preview" class="qr-preview">${settings.payment_qr ? `<img src="${settings.payment_qr}" alt="Payment QR" />` : '<span class="muted">No QR uploaded yet</span>'}</div>
    <label>Upload payment QR image <input type="file" name="qr_file" accept="image/*" /></label>
    <label>UPI ID (optional) <input name="upi_id" value="${esc(settings.upi_id || '')}" autocapitalize="none" placeholder="e.g. 9447282655@ybl" /></label>`,
    async (fd, close) => {
      const payload = { upi_id: fd.get('upi_id') || '' };
      const file = fd.get('qr_file');
      if (file && file.size) payload.payment_qr = await readImageAsDataUrl(file, 500);
      await api('/api/settings', { method: 'PUT', body: JSON.stringify(payload) });
      close();
      toast('Payment details saved ✓');
    }
  );
  const fileInput = $('#modal-root input[name="qr_file"]');
  fileInput.onchange = async () => {
    if (!fileInput.files[0]) return;
    try {
      const url = await readImageAsDataUrl(fileInput.files[0], 500);
      $('#qr-preview').innerHTML = `<img src="${url}" alt="Payment QR" />`;
    } catch (e) {
      toast(e.message, false);
    }
  };
}

/* ---------- invoice image (share on WhatsApp) ---------- */

function wrapText(ctx, text, maxWidth) {
  const words = String(text).split(/\s+/);
  const lines = [];
  let line = '';
  for (const w of words) {
    const test = line ? line + ' ' + w : w;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = w;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function loadImage(src) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

async function buildInvoiceCanvas(st, settings) {
  const W = 900;
  const M = 46; // margin
  const c = document.createElement('canvas');
  const ctx = c.getContext('2d');
  const money = (n) => '₹' + Math.abs(Number(n) || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 });

  // measure body height first
  ctx.font = '26px system-ui, sans-serif';
  const ITEMS_X = M + 205;
  const ITEMS_W = (W - M - 310) - ITEMS_X;
  let rowsHeight = 0;
  const rowLines = st.open.map((b) => {
    const lines = wrapText(ctx, b.items || 'Goods', ITEMS_W);
    const h = Math.max(40, lines.length * 32 + 26);
    rowsHeight += h;
    return { b, lines, h };
  });

  const qrImg = settings.payment_qr ? await loadImage(settings.payment_qr) : null;
  const qrBlock = qrImg || settings.upi_id ? (qrImg ? 320 : 90) : 0;
  const H = 300 + rowsHeight + 240 + qrBlock + 110;
  c.width = W;
  c.height = H;

  // page
  ctx.fillStyle = '#faf9f7';
  ctx.fillRect(0, 0, W, H);

  // header band
  const grad = ctx.createLinearGradient(0, 0, W, 130);
  grad.addColorStop(0, '#b91c1c');
  grad.addColorStop(1, '#7f1d1d');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, 130);
  ctx.fillStyle = '#fbbf24';
  ctx.beginPath();
  ctx.arc(M + 34, 65, 34, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#7f1d1d';
  ctx.font = 'bold 30px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('SS', M + 34, 76);
  ctx.textAlign = 'left';
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 40px system-ui, sans-serif';
  ctx.fillText('Simple Serve', M + 90, 62);
  ctx.font = '22px system-ui, sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,.9)';
  ctx.fillText('Packing Materials & Disposable Items · Urakam, Thrissur', M + 90, 96);

  // title + date + customer
  let y = 190;
  ctx.fillStyle = '#1c1917';
  ctx.font = 'bold 32px system-ui, sans-serif';
  ctx.fillText('BILL SUMMARY', M, y);
  ctx.font = '24px system-ui, sans-serif';
  ctx.fillStyle = '#78716c';
  ctx.textAlign = 'right';
  ctx.fillText('Date: ' + fmtDateFull(st.date), W - M, y);
  ctx.textAlign = 'left';
  y += 44;
  ctx.fillStyle = '#1c1917';
  ctx.font = 'bold 27px system-ui, sans-serif';
  ctx.fillText('Bill for: ' + st.customer.name + (st.customer.place ? ', ' + st.customer.place : ''), M, y);
  y += 40;

  // table head
  ctx.fillStyle = '#e7e5e4';
  ctx.fillRect(M, y, W - M * 2, 46);
  ctx.fillStyle = '#44403c';
  ctx.font = 'bold 22px system-ui, sans-serif';
  ctx.fillText('BOUGHT ON', M + 14, y + 31);
  ctx.fillText('ITEMS', ITEMS_X, y + 31);
  ctx.fillText('PAY BY', W - M - 300, y + 31);
  ctx.textAlign = 'right';
  ctx.fillText('AMOUNT', W - M - 14, y + 31);
  ctx.textAlign = 'left';
  y += 46;

  // rows
  for (const { b, lines, h } of rowLines) {
    ctx.strokeStyle = '#e7e5e4';
    ctx.beginPath();
    ctx.moveTo(M, y + h);
    ctx.lineTo(W - M, y + h);
    ctx.stroke();
    ctx.fillStyle = '#1c1917';
    ctx.font = '24px system-ui, sans-serif';
    ctx.fillText(fmtDateFull(b.date), M + 14, y + 34);
    lines.forEach((ln, i) => ctx.fillText(ln, ITEMS_X, y + 34 + i * 32));
    ctx.fillStyle = b.overdue ? '#b91c1c' : '#44403c';
    ctx.fillText(fmtDate(b.due_date), W - M - 300, y + 34);
    if (b.overdue) {
      ctx.font = 'bold 18px system-ui, sans-serif';
      ctx.fillText('OVERDUE', W - M - 300, y + 60);
    }
    ctx.font = 'bold 24px system-ui, sans-serif';
    ctx.fillStyle = '#1c1917';
    ctx.textAlign = 'right';
    ctx.fillText(money(b.balance), W - M - 14, y + 34);
    ctx.textAlign = 'left';
    y += h;
  }

  // totals
  y += 30;
  ctx.font = '25px system-ui, sans-serif';
  const totalLine = (label, val, bold, color) => {
    ctx.fillStyle = color || '#44403c';
    ctx.font = (bold ? 'bold 30px' : '25px') + ' system-ui, sans-serif';
    ctx.fillText(label, M, y);
    ctx.textAlign = 'right';
    ctx.fillText(money(val), W - M, y);
    ctx.textAlign = 'left';
    y += bold ? 50 : 40;
  };
  if (st.totals.overdue > 0) totalLine('Overdue', st.totals.overdue, false, '#b91c1c');
  if (st.totals.notYetDue > 0) totalLine('Not yet due', st.totals.notYetDue);
  ctx.strokeStyle = '#1c1917';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(M, y - 26);
  ctx.lineTo(W - M, y - 26);
  ctx.stroke();
  ctx.lineWidth = 1;
  y += 14;
  totalLine('TOTAL TO PAY', st.totals.due, true, '#b91c1c');

  // payment block
  if (qrImg || settings.upi_id) {
    y += 6;
    ctx.fillStyle = '#ffffff';
    const blockH = qrImg ? 300 : 74;
    ctx.fillRect(M, y, W - M * 2, blockH);
    ctx.strokeStyle = '#e7e5e4';
    ctx.strokeRect(M, y, W - M * 2, blockH);
    if (qrImg) {
      const qs = 250;
      ctx.drawImage(qrImg, M + 24, y + 25, qs, qs);
      ctx.fillStyle = '#1c1917';
      ctx.font = 'bold 28px system-ui, sans-serif';
      ctx.fillText('Scan & Pay', M + qs + 60, y + 110);
      ctx.font = '24px system-ui, sans-serif';
      ctx.fillStyle = '#44403c';
      ctx.fillText('PhonePe · Google Pay · any UPI app', M + qs + 60, y + 150);
      if (settings.upi_id) {
        const upiText = 'UPI: ' + settings.upi_id;
        const maxW = W - M - (M + qs + 60) - 16;
        let size = 24;
        ctx.font = `bold ${size}px system-ui, sans-serif`;
        while (size > 14 && ctx.measureText(upiText).width > maxW) {
          size -= 1;
          ctx.font = `bold ${size}px system-ui, sans-serif`;
        }
        ctx.fillText(upiText, M + qs + 60, y + 195);
      }
    } else {
      ctx.fillStyle = '#1c1917';
      ctx.font = 'bold 26px system-ui, sans-serif';
      ctx.fillText('Pay via UPI: ' + settings.upi_id, M + 24, y + 46);
    }
    y += blockH + 20;
  }

  // footer
  ctx.fillStyle = '#78716c';
  ctx.font = '22px system-ui, sans-serif';
  ctx.fillText(`Payment terms: within ${st.customer.credit_days} days of each bill date.`, M, y + 26);
  ctx.fillText('Thank you for your business! — Simple Serve', M, y + 60);

  return c;
}

async function shareInvoiceImage(st) {
  const settings = await api('/api/settings');
  const canvas = await buildInvoiceCanvas(st, settings);
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
  if (!blob) return toast('Could not create the image', false);
  const fileName = `bill-${st.customer.name.replace(/[^\w]+/g, '-')}-${st.date}.png`;
  const file = new File([blob], fileName, { type: 'image/png' });
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: 'Simple Serve — Bill Summary' });
      return;
    } catch (e) {
      if (e.name === 'AbortError') return; // user closed the share sheet
    }
  }
  // fallback: download, user attaches it in WhatsApp
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(a.href);
  toast('Invoice image downloaded — attach it in WhatsApp');
}

/* ---------- bulk import of shops ---------- */

function importCustomersForm() {
  openModal(
    'Import shops',
    `
    <div class="hint" style="margin-bottom:0">One shop per line, comma separated:<br/>
    <b>Name, Place, Phone, Credit days</b> — only the name is required.<br/>
    Example:<br/><code>Krishna Bakery, Urakam, 9876543210, 15</code></div>
    <label>Shop list <textarea name="list" rows="8" placeholder="Krishna Bakery, Urakam, 9876543210, 15&#10;Hotel Aramana, Ollur"></textarea></label>`,
    async (fd, close) => {
      const lines = String(fd.get('list') || '').split('\n').map((l) => l.trim()).filter(Boolean);
      if (!lines.length) throw new Error('Paste at least one line');
      let ok = 0;
      const failed = [];
      for (const line of lines) {
        const [name, place, phone, days] = line.split(',').map((t) => (t || '').trim());
        try {
          await api('/api/customers', {
            method: 'POST',
            body: JSON.stringify({ name, place, phone, credit_days: days }),
          });
          ok++;
        } catch {
          failed.push(line);
        }
      }
      close();
      toast(failed.length ? `${ok} added, ${failed.length} failed` : `${ok} shops added ✓`, !failed.length);
      render();
    }
  );
}

/* ---------- item catalog management ---------- */

function productForm(product) {
  openModal(
    product ? 'Edit item' : 'Add item',
    `
    <label>Item name <input name="name" required value="${esc(product ? product.name : '')}" placeholder="e.g. Spice LD Cover" /></label>
    <label>Size <input name="size" value="${esc(product ? product.size : '')}" placeholder="e.g. 1 kg, 10x12, Triple Zero" /></label>
    <label>Default selling price (₹, optional) <input type="number" name="sale_price" min="0" step="0.01" inputmode="decimal" value="${product && product.sale_price > 0 ? product.sale_price : ''}" placeholder="Auto-fills sale amount when picked" /></label>`,
    async (fd, close) => {
      const body = JSON.stringify({
        name: fd.get('name'),
        size: fd.get('size'),
        sale_price: fd.get('sale_price') || 0,
      });
      if (product) await api(`/api/products/${product.id}`, { method: 'PUT', body });
      else await api('/api/products', { method: 'POST', body });
      close();
      toast('Saved ✓');
      render();
    }
  );
  if (product) {
    const del = document.createElement('button');
    del.type = 'button';
    del.className = 'btn-logout';
    del.textContent = 'Remove item';
    del.onclick = async () => {
      if (!confirm('Remove this item from the catalog? Old entries are not affected.')) return;
      await api(`/api/products/${product.id}`, { method: 'DELETE' });
      $('#modal-root').innerHTML = '';
      toast('Removed');
      render();
    };
    $('#modal-root .btn-save').after(del);
  }
}

function importProductsForm() {
  openModal(
    'Import items',
    `
    <div class="hint" style="margin-bottom:0">One item per line, comma separated:<br/>
    <b>Name, Size, Price</b> — only the name is required.<br/>
    Example:<br/><code>Spice LD Cover, 1 kg, 120</code></div>
    <label>Item list <textarea name="list" rows="8" placeholder="Spice LD Cover, 1 kg, 120&#10;Gulf LD Cover, 10x12"></textarea></label>`,
    async (fd, close) => {
      const lines = String(fd.get('list') || '').split('\n').map((l) => l.trim()).filter(Boolean);
      if (!lines.length) throw new Error('Paste at least one line');
      let ok = 0;
      let failed = 0;
      for (const line of lines) {
        const [name, size, price] = line.split(',').map((t) => (t || '').trim());
        try {
          await api('/api/products', {
            method: 'POST',
            body: JSON.stringify({ name, size, sale_price: price || 0 }),
          });
          ok++;
        } catch {
          failed++;
        }
      }
      close();
      toast(failed ? `${ok} added, ${failed} failed` : `${ok} items added ✓`, !failed);
      render();
    }
  );
}

/* ---------- wiring ---------- */

function addPartyForm(kind) {
  const isCust = kind === 'customer';
  openModal(
    isCust ? 'Add shop / customer' : 'Add supplier',
    `
    <label>Name <input name="name" required placeholder="Name" /></label>
    <label>Place <input name="place" placeholder="e.g. Urakam, Ollur" /></label>
    <label>Phone <input name="phone" inputmode="tel" placeholder="Needed for WhatsApp bills" /></label>
    ${isCust ? '<label>Credit days (pay within) <input type="number" name="credit_days" min="0" max="365" value="15" inputmode="numeric" /></label>' : ''}`,
    async (fd, close) => {
      await api(isCust ? '/api/customers' : '/api/suppliers', {
        method: 'POST',
        body: JSON.stringify({
          name: fd.get('name'),
          place: fd.get('place'),
          phone: fd.get('phone'),
          credit_days: fd.get('credit_days'),
        }),
      });
      close();
      toast('Saved ✓');
      render();
    }
  );
}

function wireView() {
  const view = $('#view');

  if (state.tab === 'home') {
    $('#qa-sale').onclick = saleForm;
    $('#qa-purchase').onclick = purchaseForm;
    $('#qa-expense').onclick = expenseForm;
    $('#qa-collect').onclick = () => {
      if (!state.customers.length) return toast('Add a shop first (Shops tab)', false);
      paymentForm('in');
    };
    $('#qa-payout').onclick = () => {
      if (!state.suppliers.length) return toast('Add a supplier first (Shops tab)', false);
      paymentForm('out');
    };
  }

  if (state.tab === 'entries') {
    $$('.seg', view).forEach((b) => {
      b.onclick = () => {
        state.entriesKind = b.dataset.kind;
        render();
      };
    });
    $('#entries-month').onchange = (e) => {
      state.reportMonth = e.target.value;
      render();
    };
    $$('.row-del', view).forEach((b) => {
      b.onclick = async () => {
        if (!confirm('Delete this entry?')) return;
        await api(`/api/${state.entriesKind}/${b.dataset.id}`, { method: 'DELETE' });
        toast('Deleted');
        render();
      };
    });
  }

  if (state.tab === 'parties') {
    $('#add-customer').onclick = () => addPartyForm('customer');
    $('#add-supplier').onclick = () => addPartyForm('supplier');
    $('#add-product').onclick = () => productForm(null);
    $('#import-products').onclick = importProductsForm;
    $$('.item-chip', view).forEach((b) => {
      b.onclick = () => {
        const p = state.products.find((x) => String(x.id) === b.dataset.id);
        if (p) productForm(p);
      };
    });
    $('#import-customers').onclick = importCustomersForm;
    $$('.row-stmt', view).forEach((b) => {
      b.onclick = () => statementModal(b.dataset.id).catch((e) => toast(e.message, false));
    });
    $$('.row-collect', view).forEach((b) => {
      b.onclick = () => {
        const kind = b.dataset.kind;
        const list = kind === 'customer' ? state.customers : state.suppliers;
        const p = list.find((x) => String(x.id) === b.dataset.id);
        paymentForm(kind === 'customer' ? 'in' : 'out', p);
      };
    });
    $$('.party-del', view).forEach((b) => {
      b.onclick = async () => {
        if (!confirm('Delete? Old entries will keep the name.')) return;
        const ep = b.dataset.kind === 'customer' ? 'customers' : 'suppliers';
        await api(`/api/${ep}/${b.dataset.id}`, { method: 'DELETE' });
        toast('Deleted');
        render();
      };
    });
  }

  if (state.tab === 'report') {
    $('#report-month').onchange = (e) => {
      state.reportMonth = e.target.value;
      render();
    };
    $('#export-csv').onclick = exportCsv;
  }
}

async function render() {
  const view = $('#view');
  view.innerHTML = '<div class="loading">Loading…</div>';
  try {
    if (state.tab === 'home' || state.tab === 'entries') await loadParties();
    const html =
      state.tab === 'home' ? await viewHome()
      : state.tab === 'entries' ? await viewEntries()
      : state.tab === 'parties' ? await viewParties()
      : await viewReport();
    view.innerHTML = html;
    wireView();
  } catch (err) {
    view.innerHTML = `<div class="empty">⚠️ ${esc(err.message)}<br/><button class="btn-small" onclick="render()">Retry</button></div>`;
  }
}

/* ---------- auth screens ---------- */

function setAuthedChrome(authed) {
  document.body.classList.toggle('noauth', !authed);
  $('#account-btn').classList.toggle('hidden', !authed);
}

function showAuthScreen(setupRequired) {
  setAuthedChrome(false);
  const view = $('#view');
  if (setupRequired) {
    view.innerHTML = `
    <section class="card auth-card">
      <h2>Welcome! 🎉</h2>
      <p class="hint">First time here — create the owner account. Remember this username
      and password: they protect all your business data.</p>
      <form id="auth-form">
        <label>Your name <input name="name" placeholder="e.g. Rajesh" /></label>
        <label>Username <input name="username" required autocapitalize="none" autocomplete="username" placeholder="e.g. rajesh" /></label>
        <label>Password <input type="password" name="password" required minlength="6" autocomplete="new-password" placeholder="Minimum 6 characters" /></label>
        <label>Repeat password <input type="password" name="password2" required autocomplete="new-password" /></label>
        <button type="submit" class="btn-primary">Create account</button>
      </form>
    </section>`;
  } else {
    view.innerHTML = `
    <section class="card auth-card">
      <h2>Login</h2>
      <form id="auth-form">
        <label>Username <input name="username" required autocapitalize="none" autocomplete="username" /></label>
        <label>Password <input type="password" name="password" required autocomplete="current-password" /></label>
        <button type="submit" class="btn-primary">Login</button>
      </form>
    </section>`;
  }
  $('#auth-form').onsubmit = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const btn = $('button[type="submit"]', e.target);
    btn.disabled = true;
    try {
      if (setupRequired) {
        if (fd.get('password') !== fd.get('password2'))
          throw new Error('Passwords do not match');
        const r = await api('/api/auth/setup', {
          method: 'POST',
          body: JSON.stringify({
            name: fd.get('name'),
            username: fd.get('username'),
            password: fd.get('password'),
          }),
        });
        state.user = r.user;
      } else {
        const r = await api('/api/auth/login', {
          method: 'POST',
          body: JSON.stringify({
            username: fd.get('username'),
            password: fd.get('password'),
          }),
        });
        state.user = r.user;
      }
      setAuthedChrome(true);
      toast(`Welcome, ${state.user.name || state.user.username}!`);
      state.tab = 'home';
      $$('.nav-btn').forEach((x) => x.classList.toggle('active', x.dataset.tab === 'home'));
      render();
    } catch (err) {
      toast(err.message, false);
      btn.disabled = false;
    }
  };
  const first = $('#auth-form input');
  if (first) first.focus();
}

function accountModal() {
  openModal(
    'Account',
    `
    <div class="account-info">Logged in as <b>${esc(state.user.name || state.user.username)}</b> (${esc(state.user.username)})</div>
    <button type="button" class="btn-small" id="payment-settings-btn">&#128179; Payment QR &amp; UPI (shown on invoices)</button>
    <label>Current password <input type="password" name="current" autocomplete="current-password" /></label>
    <label>New password <input type="password" name="next" minlength="6" autocomplete="new-password" placeholder="Minimum 6 characters" /></label>
    <label>Repeat new password <input type="password" name="next2" autocomplete="new-password" /></label>`,
    async (fd, close) => {
      if (!fd.get('current') && !fd.get('next')) return close();
      if (fd.get('next') !== fd.get('next2')) throw new Error('New passwords do not match');
      await api('/api/auth/password', {
        method: 'POST',
        body: JSON.stringify({ current: fd.get('current'), next: fd.get('next') }),
      });
      close();
      toast('Password changed ✓');
    }
  );
  // rename Save button and add logout
  const save = $('#modal-root .btn-save');
  save.textContent = 'Change password';
  const logout = document.createElement('button');
  logout.type = 'button';
  logout.className = 'btn-logout';
  logout.textContent = 'Logout';
  logout.onclick = async () => {
    await api('/api/auth/logout', { method: 'POST' });
    $('#modal-root').innerHTML = '';
    state.user = null;
    toast('Logged out');
    showAuthScreen(false);
  };
  save.after(logout);
  $('#payment-settings-btn').onclick = () => {
    $('#modal-root').innerHTML = '';
    paymentSettingsForm().catch((e) => toast(e.message, false));
  };
}

/* ---------- boot ---------- */

$$('.nav-btn').forEach((b) => {
  b.onclick = () => {
    if (!state.user) return;
    $$('.nav-btn').forEach((x) => x.classList.remove('active'));
    b.classList.add('active');
    state.tab = b.dataset.tab;
    render();
  };
});

$('#account-btn').onclick = accountModal;

async function boot() {
  try {
    const s = await api('/api/auth/status');
    if (s.user) {
      state.user = s.user;
      setAuthedChrome(true);
      render();
    } else {
      showAuthScreen(s.setupRequired);
    }
  } catch (err) {
    $('#view').innerHTML = `<div class="empty">⚠️ ${esc(err.message)}<br/><button class="btn-small" onclick="location.reload()">Retry</button></div>`;
  }
}

window.render = render;
boot();
