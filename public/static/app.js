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
  const [customers, suppliers] = await Promise.all([
    api('/api/customers'),
    api('/api/suppliers'),
  ]);
  state.customers = customers;
  state.suppliers = suppliers;
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
    <label>Items sold <input name="items" placeholder="e.g. Paper cups 200ml x 10 pkt" /></label>
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
}

function purchaseForm() {
  openModal(
    'New Purchase',
    `
    <label>Date <input type="date" name="purchase_date" value="${todayStr()}" required /></label>
    ${partyField('Supplier', 'supplier', state.suppliers, 'Add new supplier')}
    <label>Items bought <input name="items" placeholder="e.g. Packing covers 5kg" /></label>
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
  const { customers, suppliers } = await api('/api/balances');
  state.customers = customers;
  state.suppliers = suppliers;

  const partyRow = (p, kind) => `
    <div class="row">
      <div class="row-main">
        <div class="row-title">${esc(p.name)}</div>
        <div class="row-sub">${esc([p.place, p.phone].filter(Boolean).join(' · '))}</div>
      </div>
      <div class="row-amount ${p.balance > 0.005 ? (kind === 'customer' ? 'good' : 'bad') : 'muted'}">
        ${p.balance > 0.005 ? fmtMoney(p.balance) : '✓ Clear'}
      </div>
      ${p.balance > 0.005
        ? `<button class="row-collect" data-kind="${kind}" data-id="${p.id}">${kind === 'customer' ? 'Collect' : 'Pay'}</button>`
        : `<button class="row-del party-del" data-kind="${kind}" data-id="${p.id}" title="Delete">&#128465;</button>`}
    </div>`;

  return `
  <section class="card">
    <div class="card-head-row">
      <h3>Shops (customers)</h3>
      <button class="btn-small" id="add-customer">＋ Add</button>
    </div>
    <div class="hint">Amount shown = money the shop still owes you</div>
    <div class="rows">${customers.map((p) => partyRow(p, 'customer')).join('') || '<div class="empty">No shops added yet</div>'}</div>
  </section>
  <section class="card">
    <div class="card-head-row">
      <h3>Suppliers</h3>
      <button class="btn-small" id="add-supplier">＋ Add</button>
    </div>
    <div class="hint">Amount shown = money you still owe the supplier</div>
    <div class="rows">${suppliers.map((p) => partyRow(p, 'supplier')).join('') || '<div class="empty">No suppliers added yet</div>'}</div>
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

/* ---------- wiring ---------- */

function addPartyForm(kind) {
  const isCust = kind === 'customer';
  openModal(
    isCust ? 'Add shop / customer' : 'Add supplier',
    `
    <label>Name <input name="name" required placeholder="Name" /></label>
    <label>Place <input name="place" placeholder="e.g. Urakam, Ollur" /></label>
    <label>Phone <input name="phone" inputmode="tel" placeholder="Optional" /></label>`,
    async (fd, close) => {
      await api(isCust ? '/api/customers' : '/api/suppliers', {
        method: 'POST',
        body: JSON.stringify({
          name: fd.get('name'),
          place: fd.get('place'),
          phone: fd.get('phone'),
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
