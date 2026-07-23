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

// per-screen HTML cache for instant navigation: paint the last view for a tab
// immediately, then refresh in the background. Cleared on any data write (api()).
let viewCache = {};

const state = {
  tab: 'home',
  entriesKind: 'sales',
  reportMonth: todayStr().slice(0, 7),
  daylogDate: todayStr(),
  customers: [],
  suppliers: [],
  products: [],
  stock: [],
  shopFilter: 'all',
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

/* Professional item code (SKU): CATEGORY-BRAND-SIZE, e.g. LDC-SPICE-1KG.
   Derived only from the item's own name + size via a fixed map, so a code
   never changes when other items are added/removed — it's permanent per item.
   New product names not in the map fall back to initials of the name. */
const SKU_MAP = {
  'Spice LD Cover': ['LDC', 'SPICE'], 'Money Gold LD Cover': ['LDC', 'GOLD'], 'Gulf LD Cover': ['LDC', 'GULF'], 'Fine Pack LD Cover': ['LDC', 'FINE'],
  'Elite HM Cover': ['HMC', 'ELITE'], 'JM HM Cover': ['HMC', 'JM'], 'Softy HM Cover': ['HMC', 'SOFTY'], 'Zamkudi HM Cover': ['HMC', 'ZAM'],
  'PP Cover Nice': ['PPC', 'NICE'], 'PP Cover Single T': ['PPC', 'ST'], 'PP Cover Double T': ['PPC', 'DT'],
  'Non Woven Cover': ['NWC', ''],
  'Bio Ecowin Carry Bag': ['BAG', 'BIOECO'], 'King Carry Bag': ['BAG', 'KING'], 'Palmtree Carry Bag': ['BAG', 'PALM'], 'Power Carry Bag': ['BAG', 'POWER'], 'Superdiamond Carry Bag': ['BAG', 'SDMND'], 'World Cup Carry Bag': ['BAG', 'WCUP'],
  'Garbage Bag': ['GBAG', ''],
  'Juice Glass': ['GLS', 'JUICE'], 'Juice Glass with Lid': ['GLS', 'JUICELID'], 'Paper Glass Bio': ['GLS', 'PAPBIO'], 'Paper Glass Normal': ['GLS', 'PAPER'], 'Plastic Glass': ['GLS', 'PLAS'], 'Plastic Glass Hard': ['GLS', 'PLASHARD'],
  'Ice Cup': ['CUP', 'ICE'], 'Mayonnaise Cup': ['CUP', 'MAYO'],
  'Aluminium Container': ['CON', 'ALU'], 'Plastic Container Rectangle': ['CON', 'PRECT'], 'Plastic Container Round': ['CON', 'PRND'],
  'Aluminium Foil': ['FOIL', ''], 'Cling Film': ['FILM', 'CLING'], 'Cling Film Normal': ['FILM', 'CLINGN'], 'Stretch Film': ['FILM', 'STRETCH'],
  'Neck Roll': ['ROLL', 'NECK'], 'Roll Normal': ['ROLL', 'NORMAL'], 'Saree Roll': ['ROLL', 'SAREE'], 'Shawarma Roll': ['ROLL', 'SHAW'],
  'Brown Paper': ['PAPR', 'BROWN'], 'Butter Paper': ['PAPR', 'BUTTER'],
  'JM Leaf': ['LEAF', 'JM'], 'SAS Bio Leaf': ['LEAF', 'SASBIO'], 'SAS Normal Leaf': ['LEAF', 'SAS'],
  'Plate': ['PLT', ''], 'VIP Plate': ['PLT', 'VIP'],
  'Sheet Nice': ['SHT', 'NICE'], 'Sheet Normal': ['SHT', 'NORMAL'],
  'Silver Pouch': ['POUCH', 'SILVER'], 'Standing Pouch': ['POUCH', 'STAND'],
  'Tissue Box': ['TIS', 'BOX'], 'Tissue Kitchen': ['TIS', 'KITCHEN'], 'Tissue Polo': ['TIS', 'POLO'], 'Tissue Prime': ['TIS', 'PRIME'], 'Tissue Rissun': ['TIS', 'RISSUN'],
  'Cap': ['CAP', ''], 'Gloves Normal': ['GLOV', 'NORMAL'], 'Gloves Surgical': ['GLOV', 'SURG'], 'Mask': ['MASK', ''], 'Onion Net': ['NET', 'ONION'], 'Rubber Band': ['RBAND', ''], 'Spoon': ['SPOON', ''], 'Straw': ['STRAW', ''],
};
const SKU_SIZE_WORD = { Small: 'SML', Medium: 'MED', Large: 'LRG', Big: 'BIG', 'Triple Zero': '000', '1/2 kg': 'HALFKG' };
function skuSize(size) {
  const s = String(size || '').trim();
  if (!s) return '';
  if (SKU_SIZE_WORD[s]) return SKU_SIZE_WORD[s];
  return s
    .replace(/(\d+)\s*kg/i, '$1KG').replace(/(\d+)\s*gm/i, '$1G').replace(/(\d+)\s*ml/i, '$1ML')
    .replace(/(\d+)\s*mtr/i, '$1MTR').replace(/(\d+)\s*nos/i, '$1NOS').replace(/(\d+)\s*inch/i, '$1IN')
    .replace(/(\d+)\s*x\s*(\d+)/i, '$1X$2')
    .toUpperCase().replace(/\s+/g, '');
}
function skuPrefix(name) {
  if (SKU_MAP[name]) return SKU_MAP[name];
  // fallback for a new, unmapped name: initials (or first word) → e.g. "Foo Bar" → FB
  const words = String(name || '').toUpperCase().replace(/[^A-Z0-9 ]/g, '').split(/\s+/).filter(Boolean);
  const pfx = words.length > 1 ? words.map((w) => w[0]).join('').slice(0, 4) : (words[0] || 'ITM').slice(0, 4);
  return [pfx, ''];
}
// full SKU for one item
function skuFor(name, size) {
  const [pfx, brand] = skuPrefix(name);
  return [pfx, brand, skuSize(size)].filter(Boolean).join('-');
}
// category-level code for a product name (no size), e.g. "LDC-SPICE"
function skuGroup(name) {
  const [pfx, brand] = skuPrefix(name);
  return [pfx, brand].filter(Boolean).join('-');
}
// SKU for a saved bill line whose label is "name size" — matches it back to a
// catalog item so the code shows on bills too. '' for hand-typed items.
function labelSku(label) {
  const t = String(label || '').trim();
  const p = (state.products || []).find((x) => `${x.name} ${x.size}`.trim() === t);
  return p ? p.sku || skuFor(p.name, p.size) : '';
}

function fmtTimeIST(createdAt) {
  if (!createdAt) return '';
  const d = new Date(String(createdAt).replace(' ', 'T') + 'Z');
  if (isNaN(d)) return '';
  return d.toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit' });
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

// add a show/hide (eye) toggle to every password field within root
function addEyeToggles(root) {
  $$('input[type="password"]', root).forEach((inp) => {
    if (inp.closest('.pw-wrap')) return;
    const wrap = document.createElement('div');
    wrap.className = 'pw-wrap';
    inp.parentNode.insertBefore(wrap, inp);
    wrap.appendChild(inp);
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'eye-toggle';
    btn.textContent = '👁';
    btn.setAttribute('aria-label', 'Show or hide password');
    btn.onclick = () => {
      const reveal = inp.type === 'password';
      inp.type = reveal ? 'text' : 'password';
      btn.textContent = reveal ? '🙈' : '👁';
    };
    wrap.appendChild(btn);
  });
}

// save some text as a downloaded file (used for the data backup)
function downloadFile(filename, text, type = 'application/json') {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
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
  // any successful write makes the cached screens stale — drop them so the next
  // render fetches fresh data instead of showing an out-of-date view
  if (opts.method && opts.method !== 'GET') viewCache = {};
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
  addEyeToggles(root);
  const first = $('input, select', root);
  if (first) first.focus();
  return { close };
}

/* ---------- searchable dropdown (combo) ----------
   Every dropdown in the app is a search box + filtered list: tap, type a few
   letters, tap the match. Native <select> is unusable with 170+ items. */

function comboHtml(name, placeholder) {
  return `
    <div class="combo" data-combo="${name}">
      <input type="hidden" name="${name}" />
      <input type="text" class="combo-input" placeholder="${esc(placeholder)}"
             autocomplete="off" autocapitalize="off" spellcheck="false" />
      <div class="combo-list hidden"></div>
    </div>`;
}

/* options: [{value, label, sub?}]; specials pinned at the bottom (e.g. "+ add new").
   Returns {set, clear} so callers can preselect or reset. */
function wireCombo(name, options, { specials = [], onPick } = {}) {
  const box = $(`#modal-root [data-combo="${name}"]`);
  if (!box) return { set() {}, clear() {} };
  const hidden = $('input[type="hidden"]', box);
  const input = $('.combo-input', box);
  const list = $('.combo-list', box);
  const all = [...options, ...specials];
  const labelOf = (v) => {
    const o = all.find((o) => String(o.value) === String(v));
    return o ? o.label : '';
  };

  const show = (q) => {
    const wasHidden = list.classList.contains('hidden');
    // word-wise match: "spice 1kg" finds "Spice LD Cover 1kg"
    const words = q.trim().toLowerCase().split(/\s+/).filter(Boolean);
    const match = words.length
      ? options.filter((o) => {
          const hay = (o.label + ' ' + (o.sub || '')).toLowerCase();
          const tight = hay.replace(/\s+/g, ''); // "1kg" finds "1 kg"
          return words.every((w) => hay.includes(w) || tight.includes(w));
        })
      : options;
    list.innerHTML =
      match
        .slice(0, 80)
        .map(
          (o) => `<button type="button" class="combo-opt" data-v="${esc(String(o.value))}">
            <span>${esc(o.label)}</span>${o.sub ? `<span class="combo-sub ${esc(o.subClass || '')}">${esc(o.sub)}</span>` : ''}
          </button>`
        )
        .join('') +
      (match.length ? '' : '<div class="combo-empty">No match found</div>') +
      specials
        .map(
          (o) => `<button type="button" class="combo-opt combo-special" data-v="${esc(String(o.value))}">
            <span>${esc(o.label)}</span>
          </button>`
        )
        .join('');
    list.classList.remove('hidden');
    // on first open, pull the search box to the top of the modal so the whole
    // list has room above the keyboard (otherwise it's crushed into one row).
    // Delayed so it runs after the mobile keyboard's own auto-scroll settles.
    if (wasHidden) setTimeout(() => input.scrollIntoView({ block: 'start' }), 250);
    $$('.combo-opt', list).forEach((b) => {
      // 'click' (not pointerdown) so DRAGGING to scroll the list never selects —
      // the browser suppresses click after a scroll gesture. onPick fires the tap.
      b.onclick = () => pick(b.dataset.v);
    });
  };

  const closeList = () => {
    list.classList.add('hidden');
    input.value = labelOf(hidden.value); // discard typed text that wasn't picked
  };

  const pick = (v) => {
    hidden.value = v;
    input.value = labelOf(v);
    list.classList.add('hidden');
    input.blur();
    if (onPick) onPick(v);
  };

  input.onfocus = () => {
    input.select();
    show('');
  };
  input.oninput = () => {
    if (hidden.value) {
      hidden.value = '';
      if (onPick) onPick('');
    }
    show(input.value);
  };
  input.onkeydown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const first = $('.combo-opt', list);
      if (first && !list.classList.contains('hidden')) pick(first.dataset.v);
    } else if (e.key === 'Escape') {
      closeList();
    }
  };
  // close the list when tapping anywhere outside this combo (replaces blur-hide,
  // which used to fire mid-scroll and close the list while you were scrolling it)
  const overlay = box.closest('.modal-overlay') || document;
  overlay.addEventListener('pointerdown', (e) => {
    if (!document.contains(box)) return; // modal gone — listener will drop with it
    if (!box.contains(e.target) && !list.classList.contains('hidden')) closeList();
  });

  return {
    set: pick,
    clear() {
      hidden.value = '';
      input.value = '';
      list.classList.add('hidden');
    },
  };
}

/* party picker with a built-in "+ add new" flow */
function partyField(label, name, list, addLabel) {
  return `
    <label>${label}
      ${comboHtml(name, 'Search or pick…')}
    </label>
    <div class="new-party hidden">
      <label>Name <input name="${name}_new_name" placeholder="Name" /></label>
      <label>Place <input name="${name}_new_place" placeholder="Place (optional)" /></label>
      <label>Phone <input name="${name}_new_phone" inputmode="tel" placeholder="Phone (optional)" /></label>
    </div>`;
}

function partyComboOptions(list) {
  return list.map((p) => ({ value: p.id, label: p.name, sub: p.place || '' }));
}

function wirePartyField(name, list, addLabel) {
  return wireCombo(name, partyComboOptions(list), {
    specials: [{ value: '__new__', label: `＋ ${addLabel}` }],
    onPick: (v) => {
      $('#modal-root .new-party').classList.toggle('hidden', v !== '__new__');
      if (v === '__new__') {
        const nameInput = $(`#modal-root input[name="${name}_new_name"]`);
        if (nameInput) nameInput.focus();
      }
    },
  });
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

function saleForm(prefill) {
  openModal(
    'New Sale',
    `
    <label>Date <input type="date" name="sale_date" value="${todayStr()}" required /></label>
    ${partyField('Shop / Customer', 'customer', state.customers, 'Add new shop')}
    ${itemPickerHtml('sale')}
    <input type="hidden" name="items" />
    <label>Total amount (₹) <input type="number" name="total_amount" min="0" step="0.01" inputmode="decimal" required placeholder="0" /></label>
    ${paymentModeField('cash')}
    <label>Received now (₹) <input type="number" name="paid_amount" min="0" step="0.01" inputmode="decimal" placeholder="Leave empty if full amount received" /></label>
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
          payment_mode: fd.get('payment_mode'),
        }),
      });
      if (prefill && prefill.orderId) {
        await api(`/api/orders/${prefill.orderId}`, {
          method: 'PUT',
          body: JSON.stringify({ status: 'done' }),
        });
      }
      close();
      toast(prefill && prefill.orderId ? 'Sale saved — order marked done ✓' : 'Sale saved ✓');
      render();
    }
  );
  const customerCombo = wirePartyField('customer', state.customers, 'Add new shop');
  wirePaymentMode();
  wireItemPicker('sale', prefill ? parseItemLines(prefill.items) : null);
  if (prefill && prefill.customer_id && state.customers.some((c) => c.id === prefill.customer_id)) {
    customerCombo.set(String(prefill.customer_id));
  }
}

function purchaseForm(prefillNote, fromNoteId) {
  openModal(
    'New Purchase',
    `
    <label>Date <input type="date" name="purchase_date" value="${todayStr()}" required /></label>
    ${partyField('Supplier', 'supplier', state.suppliers, 'Add new supplier')}
    ${itemPickerHtml('purchase')}
    <input type="hidden" name="items" />
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
      if (fromNoteId) await api(`/api/notes/${fromNoteId}`, { method: 'PUT' });
      close();
      toast(fromNoteId ? 'Purchase saved — note cleared ✓' : 'Purchase saved ✓');
      render();
    }
  );
  const supplierCombo = wirePartyField('supplier', state.suppliers, 'Add new supplier');
  wirePaidChips();
  wireItemPicker('purchase');
  if (prefillNote) {
    $('#modal-root input[name="notes"]').value = prefillNote;
    // if the note @-tags a supplier, preselect it
    const tagged = [...state.suppliers]
      .sort((a, b) => b.name.length - a.name.length)
      .find((s) => prefillNote.toLowerCase().includes('@' + s.name.toLowerCase()));
    if (tagged) supplierCombo.set(String(tagged.id));
  }
}

/* line-item builder: same shop buys many products — each becomes a visible
   line (item, qty, rate, amount) with a running total. Rates default from the
   catalog (sale or purchase rate by form) and stay editable per deal. */
function itemPickerHtml(mode) {
  return `
    <div class="li-box">
      <div class="li-title">Items</div>
      <div class="li-list" data-li-list></div>
      ${comboHtml('li_product', 'Search item to add…')}
      <input data-li-custom class="hidden" placeholder="Item name" />
      <div class="li-row2">
        <label class="li-mini">Qty
          <input type="number" data-li-qty value="1" min="0" step="0.25" inputmode="decimal" />
        </label>
        <label class="li-mini">Rate (₹)
          <input type="number" data-li-rate min="0" step="0.01" inputmode="decimal" placeholder="0" />
        </label>
        <button type="button" class="li-add-btn" data-li-add>＋ Add</button>
      </div>
    </div>`;
}

function parseItemLines(text) {
  return String(text || '')
    .split(/,\s*/)
    .filter(Boolean)
    .map((t) => {
      const m = /^(.+?) x ([\d.]+) @ ₹([\d.]+)$/.exec(t.trim());
      if (m) return { label: m[1], qty: parseFloat(m[2]), rate: parseFloat(m[3]) };
      return { label: t.trim(), qty: 1, rate: 0 };
    });
}

function wireItemPicker(mode, initialLines) {
  const root = $('#modal-root');
  if (!$('[data-combo="li_product"]', root)) return;
  const priceOf = (p) => (mode === 'purchase' ? p.purchase_price : p.sale_price) || 0;
  const customInput = $('[data-li-custom]', root);
  const qtyInput = $('[data-li-qty]', root);
  const rateInput = $('[data-li-rate]', root);
  const listEl = $('[data-li-list]', root);
  const itemsField = $('input[name="items"]', root);
  const totalField = $('input[name="total_amount"]', root);
  const lines = initialLines && initialLines.length ? initialLines.slice() : [];

  // updateTotal=false on the initial render so a manually-set total (e.g. a
  // discount or the ₹100 reconciliation on an edited bill) isn't clobbered by
  // the line-item sum. Adding/removing a line does recompute the total.
  const sync = (updateTotal = true) => {
    listEl.innerHTML = lines
      .map(
        (l, i) => `
        <div class="li-item">
          <div class="li-item-main">
            ${labelSku(l.label) ? `<span class="li-code">${esc(labelSku(l.label))}</span>` : ''}
            <b>${esc(l.label)}</b>
            <span>${l.qty} × ${fmtMoney(l.rate)}</span>
          </div>
          <div class="li-item-amt">${fmtMoney(l.qty * l.rate)}</div>
          <button type="button" class="li-del" data-li-del="${i}" title="Remove">&times;</button>
        </div>`
      )
      .join('');
    itemsField.value = lines.map((l) => `${l.label} x ${l.qty} @ ₹${l.rate}`).join(', ');
    if (updateTotal && lines.length)
      totalField.value = String(Math.round(lines.reduce((a, l) => a + l.qty * l.rate, 0) * 100) / 100);
    $$('[data-li-del]', root).forEach((b) => {
      b.onclick = () => {
        lines.splice(Number(b.dataset.liDel), 1);
        sync();
      };
    });
  };

  // stock balance per product, so the picker shows "how many are left"
  const stockByPid = {};
  for (const s of state.stock || []) stockByPid[s.product_id] = s;
  const stockBadge = (p) => {
    const s = stockByPid[p.id];
    if (!s || !s.tracked) return { text: '', cls: '' };
    if (s.balance <= 0.005) return { text: 'Out of stock', cls: 'bad' };
    if (s.balance <= 5) return { text: `${s.balance} left`, cls: 'pend' };
    return { text: `${s.balance} left`, cls: 'good' };
  };

  const productCombo = wireCombo(
    'li_product',
    state.products.map((p) => {
      const priceStr = priceOf(p) ? fmtMoney(priceOf(p)) : '';
      const sb = stockBadge(p);
      return {
        value: p.id,
        // "LDC-SPICE-1KG Spice LD Cover 1 kg" — searchable by code or name; the
        // stored line still uses just name+size (below), so P&L matching is unchanged.
        label: `${skuFor(p.name, p.size)} ${p.name} ${p.size}`.trim(),
        sub: [sb.text, priceStr].filter(Boolean).join(' · '),
        subClass: sb.cls,
      };
    }),
    {
      specials: [{ value: '__custom__', label: '✏️ Type item name…' }],
      onPick: (v) => {
        const isCustom = v === '__custom__';
        customInput.classList.toggle('hidden', !isCustom);
        if (isCustom) {
          rateInput.value = '';
          customInput.focus();
          return;
        }
        const p = state.products.find((x) => String(x.id) === String(v));
        rateInput.value = p ? String(priceOf(p) || '') : '';
      },
    }
  );
  const pickedProduct = () => $('[data-combo="li_product"] input[type="hidden"]', root).value;

  $('[data-li-add]', root).onclick = () => {
    const v = pickedProduct();
    let label = '';
    if (v === '__custom__') label = customInput.value.trim();
    else {
      const p = state.products.find((x) => String(x.id) === String(v));
      if (p) label = `${p.name} ${p.size}`.trim();
    }
    if (!label) return toast('Choose an item first', false);
    const qty = parseFloat(qtyInput.value);
    if (!(qty > 0)) return toast('Enter the quantity', false);
    const rate = Math.max(parseFloat(rateInput.value) || 0, 0);
    lines.push({ label, qty, rate });
    productCombo.clear();
    customInput.value = '';
    customInput.classList.add('hidden');
    qtyInput.value = '1';
    rateInput.value = '';
    sync();
  };
  if (lines.length) sync(false);
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

/* ---------- morning reminder (web push) ---------- */

const VAPID_PUBLIC_KEY =
  'BFQGMl1wbNlIwEpDxxIMDY8SaUj79z6S8RwuKue0reb7NZEZe1Y0GM4htBiusNQg7_tErYI1S-04kUd_bnv7_II';

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

function pushSupported() {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}
function reminderOn() {
  return localStorage.getItem('morningReminder') === '1';
}

async function enableMorningReminder() {
  if (!pushSupported()) {
    return infoModal(
      'Reminder not available',
      `<div class="hint" style="margin:0">This phone/browser can't show reminders here. On iPhone, open the app from its
      <b>Home Screen icon</b> (not the Safari tab) and try again — that's an Apple requirement for web apps.</div>`
    );
  }
  try {
    const perm = await Notification.requestPermission();
    if (perm !== 'granted') return toast('Permission not granted', false);
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    });
    await api('/api/push/subscribe', { method: 'POST', body: JSON.stringify(sub) });
    localStorage.setItem('morningReminder', '1');
    toast('Morning reminder on ✓');
    render();
  } catch (e) {
    toast('Could not turn on reminder: ' + (e.message || e), false);
  }
}

async function disableMorningReminder() {
  try {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (sub) {
      await api('/api/push/unsubscribe', {
        method: 'POST',
        body: JSON.stringify({ endpoint: sub.endpoint }),
      });
      await sub.unsubscribe();
    }
  } catch { /* clearing locally is enough */ }
  localStorage.removeItem('morningReminder');
  toast('Morning reminder off');
  render();
}

/* payment method selector — how the money came in: cash, credit (owed), cheque */
const PAY_MODES = [
  ['cash', '💵 Cash'],
  ['credit', '📋 Credit'],
  ['cheque', '🧾 Cheque'],
];
function payModeLabel(mode, paid, total) {
  if (mode === 'cash') return 'Cash';
  if (mode === 'credit') return 'Credit';
  if (mode === 'cheque') return 'Cheque';
  // old sales with no stored mode — infer from paid vs total
  if (paid >= total - 0.005) return 'Cash';
  if (paid <= 0.005) return 'Credit';
  return 'Part paid';
}
function paymentModeField(mode) {
  const m = PAY_MODES.some(([v]) => v === mode) ? mode : 'cash';
  return `
    <label>Payment method</label>
    <div class="seg-row pay-modes">
      ${PAY_MODES.map(([v, label]) => `<button type="button" class="seg pay-mode ${v === m ? 'active' : ''}" data-mode="${v}">${label}</button>`).join('')}
    </div>
    <input type="hidden" name="payment_mode" value="${m}" />`;
}
/* Tapping a mode also fills "Received now": cash/cheque = full, credit = 0.
   The received field stays editable for the odd part-payment. */
function wirePaymentMode() {
  const root = $('#modal-root');
  const hidden = $('input[name="payment_mode"]', root);
  if (!hidden) return;
  $$('.pay-mode', root).forEach((b) => {
    b.onclick = () => {
      $$('.pay-mode', root).forEach((x) => x.classList.remove('active'));
      b.classList.add('active');
      hidden.value = b.dataset.mode;
      const total = parseFloat($('input[name="total_amount"]', root).value) || 0;
      const paid = $('input[name="paid_amount"]', root);
      if (paid) paid.value = b.dataset.mode === 'credit' ? '0' : total ? String(total) : '';
    };
  });
}

function expenseForm() {
  openModal(
    'New Expense',
    `
    <label>Date <input type="date" name="expense_date" value="${todayStr()}" required /></label>
    <label>Category
      ${comboHtml('category', 'Search or pick a category…')}
    </label>
    <label>Amount (₹) <input type="number" name="amount" min="0" step="0.01" inputmode="decimal" required placeholder="0" /></label>
    <label>Notes <input name="notes" placeholder="Optional (e.g. petrol for Ollur route)" /></label>`,
    async (fd, close) => {
      if (!fd.get('category')) throw new Error('Choose a category');
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
  wireCombo('category', EXPENSE_CATEGORIES.map((c) => ({ value: c, label: c })));
}

function paymentForm(type, party) {
  const label = type === 'in' ? 'Collect from shop' : 'Pay supplier';
  const list = type === 'in' ? state.customers : state.suppliers;
  openModal(
    label,
    `
    <label>Date <input type="date" name="payment_date" value="${todayStr()}" required /></label>
    <label>${type === 'in' ? 'Shop / Customer' : 'Supplier'}
      ${comboHtml('party_id', 'Search or pick…')}
    </label>
    <label>Amount (₹) <input type="number" name="amount" min="0" step="0.01" inputmode="decimal" required placeholder="0" /></label>
    <label>Notes <input name="notes" placeholder="Optional" /></label>`,
    async (fd, close) => {
      const pid = Number(fd.get('party_id'));
      const p = list.find((x) => x.id === pid);
      if (!pid || !p) throw new Error(type === 'in' ? 'Choose the shop' : 'Choose the supplier');
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
  const partyCombo = wireCombo('party_id', partyComboOptions(list));
  if (party) partyCombo.set(String(party.id));
}

/* ---------- views ---------- */

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
}

const AVATAR_COLORS = ['#b91c1c', '#0e7490', '#15803d', '#6d28d9', '#946300', '#be185d'];
function avatarHtml(name) {
  let h = 0;
  for (const ch of String(name || '?')) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const color = AVATAR_COLORS[h % AVATAR_COLORS.length];
  const letter = String(name || '?').trim().charAt(0).toUpperCase() || '?';
  return `<span class="avatar" style="background:${color}">${esc(letter)}</span>`;
}

async function viewHome() {
  const today = todayStr();
  const month = today.slice(0, 7);
  const bundle = await api(`/api/bundle/home?date=${today}&month=${month}`);
  const t = bundle.today;
  const report = bundle.report;
  const pendingOrders = bundle.orders;
  const notes = bundle.notes;
  state.customers = bundle.customers;
  state.suppliers = bundle.suppliers;
  state.products = bundle.products;
  state.stock = bundle.stock || state.stock;
  state.pendingOrders = pendingOrders;
  state.notes = notes;

  const saleNotes = notes.filter((n) => n.kind !== 'purchase');
  const buyNotes = notes.filter((n) => n.kind === 'purchase');

  const noteRow = (n) => `
        <div class="row note-open row-tap" data-id="${n.id}">
          <div class="row-main">
            <div class="row-title row-wrap" style="font-weight:500">${esc(n.note)}</div>
            <div class="row-sub">${fmtDate(n.created_at.slice(0, 10))} · tap to view &amp; decide</div>
          </div>
          <span class="chev">›</span>
        </div>`;

  const inboxCard = `
  <section class="card">
    <div class="card-head-row">
      <h3>Inbox — shop orders${saleNotes.length ? ` (${saleNotes.length})` : ''}</h3>
      <button class="btn-small reminder-toggle ${reminderOn() ? 'on' : ''}" id="reminder-toggle">
        ${reminderOn() ? '🔔 Reminder on' : '🔕 Morning reminder'}
      </button>
    </div>
    ${saleNotes.length ? '' : '<div class="hint" style="margin-bottom:0">Empty — tap the red ＋ button (bottom right) to jot what a shop asked for. It waits here until you act on it.</div>'}
    <div class="rows">${saleNotes.map(noteRow).join('')}</div>
  </section>`;

  const buyInboxCard = `
  <section class="card">
    <div class="card-head-row">
      <h3>Inbox — to buy${buyNotes.length ? ` (${buyNotes.length})` : ''}</h3>
      <button class="btn-small" id="add-buy-note">＋ Note</button>
    </div>
    ${buyNotes.length ? '' : '<div class="hint" style="margin-bottom:0">Empty — note what you need to buy from vendors (e.g. 10 packets from @supplier). Convert it to a purchase when you buy.</div>'}
    <div class="rows">${buyNotes.map(noteRow).join('')}</div>
  </section>`;

  const ordersCard = pendingOrders.length
    ? `
  <section class="card">
    <h3>Order book — to prepare (${pendingOrders.length})</h3>
    <div class="rows">
      ${pendingOrders
        .map(
          (o) => `
        <div class="row">
          <div class="row-main">
            <div class="row-title">${esc(o.customer_name || 'Unknown shop')}</div>
            ${(o.items ? o.items.split(/,\s*/) : []).map((li) => `<div class="row-sub row-wrap">• ${esc(li)}</div>`).join('')}
            <div class="row-sub">${fmtDate(o.order_date)}${o.notes ? ' · ' + esc(o.notes) : ''}${o.total_amount > 0 ? ' · ~' + fmtMoney(o.total_amount) : ''}</div>
          </div>
          <button class="row-collect order-sale" data-id="${o.id}">→ Sale</button>
          <button class="row-stmt order-done" data-id="${o.id}" title="Mark done">✓</button>
          <button class="row-del order-del" data-id="${o.id}" title="Delete">&#128465;</button>
        </div>`
        )
        .join('')}
    </div>
  </section>`
    : '';

  const recv = report.outstanding.receivable;
  const pay = report.outstanding.payable;
  const insight =
    recv > 0.005
      ? `Shops owe you ${fmtMoney(recv)} — open a shop's 🧾 to send a reminder`
      : 'No pending collections — all clear ✓';

  return `
  <section class="hero">
    <div class="hero-hi">${greeting()}, ${esc(state.user.name || state.user.username)} 👋</div>
    <div class="hero-sub">${insight}</div>
  </section>
  <section class="twin">
    <div class="twin-card twin-in">
      <div class="twin-label">To collect</div>
      <div class="twin-val">${fmtMoney(recv)}</div>
      <div class="twin-sub">pending from shops</div>
    </div>
    <div class="twin-card twin-out">
      <div class="twin-label">To pay</div>
      <div class="twin-val">${fmtMoney(pay)}</div>
      <div class="twin-sub">due to suppliers</div>
    </div>
  </section>
  <section class="quick-actions">
    <button class="qa qa-sale" id="qa-sale"><span class="qa-ico">&#128176;</span>Sale</button>
    <button class="qa qa-purchase" id="qa-purchase"><span class="qa-ico">&#128666;</span>Purchase</button>
    <button class="qa qa-expense" id="qa-expense"><span class="qa-ico">&#9981;</span>Expense</button>
  </section>
  <section class="quick-actions secondary">
    <button class="qa-small" id="qa-order">&#128203; New order</button>
    <button class="qa-small" id="qa-collect">&#129297; Collect</button>
    <button class="qa-small" id="qa-payout">&#128184; Pay</button>
  </section>
  ${inboxCard}
  ${buyInboxCard}
  ${ordersCard}

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
  state.entriesRows = rows; // so the edit handler can find the tapped row
  const editable = kind === 'sales' || kind === 'purchases' || kind === 'expenses';

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
      let title = '', sub = '', amount = 0, pending = 0, modeTag = '';
      if (kind === 'sales') {
        title = r.customer_name || 'Cash sale';
        sub = r.items || r.notes || '';
        amount = r.total_amount;
        const ml = payModeLabel(r.payment_mode || '', r.paid_amount, r.total_amount);
        modeTag = `<span class="pay-badge pay-${ml.toLowerCase().replace(' ', '-')}">${ml}</span>`;
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
        <div class="row-main ${editable ? 'entry-edit row-tap' : ''}" ${editable ? `data-id="${r.id}"` : ''}>
          <div class="row-title">${esc(title)}${modeTag}${editable ? ' <span class="entry-edit-hint">✎</span>' : ''}</div>
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
  const [bal, products] = await Promise.all([api('/api/balances'), api('/api/products')]);
  const customers = bal.customers;
  const suppliers = bal.suppliers;
  state.customers = customers;
  state.suppliers = suppliers;
  state.products = products;

  const groups = {};
  for (const p of products) (groups[p.name] = groups[p.name] || []).push(p);
  const itemsHtml = Object.entries(groups)
    .map(
      ([name, list]) => `
      <div class="item-group">
        <div class="item-group-name"><span class="cat-no">${esc(skuGroup(name))}</span> ${esc(name)}</div>
        <div class="item-chips">
          ${list
            .map(
              (p) =>
                `<button class="chip item-chip" data-id="${p.id}"><span class="item-no">${esc(skuFor(p.name, p.size))}</span>${p.sale_price > 0 ? ' · ₹' + p.sale_price : ''}</button>`
            )
            .join('')}
        </div>
      </div>`
    )
    .join('');

  // suppliers stay a simple row; shops (customers) expand into a dated history
  const supplierRow = (p) => `
    <div class="row" data-name="${esc((p.name + ' ' + (p.place || '')).toLowerCase())}">
      ${avatarHtml(p.name)}
      <div class="row-main row-tap" data-edit-kind="supplier" data-edit-id="${p.id}">
        <div class="row-title">${esc(p.name)}${p.lat != null ? ' 📍' : ''}</div>
        <div class="row-sub">${esc([p.place, p.phone].filter(Boolean).join(' · ')) || 'Tap to edit'}</div>
      </div>
      <div class="row-amount ${p.balance > 0.005 ? 'bad' : 'muted'}">
        ${p.balance > 0.005 ? fmtMoney(p.balance) : '✓ Clear'}
      </div>
      ${p.balance > 0.005
        ? `<button class="row-collect" data-kind="supplier" data-id="${p.id}">Pay</button>`
        : `<button class="row-del party-del" data-kind="supplier" data-id="${p.id}" title="Delete">&#128465;</button>`}
    </div>`;

  const shopBlock = (p) => `
    <div class="shop-block" data-name="${esc((p.name + ' ' + (p.place || '')).toLowerCase())}">
      <div class="row shop-row">
        ${avatarHtml(p.name)}
        <div class="row-main shop-toggle" data-shop-id="${p.id}">
          <div class="row-title"><span class="chev" data-chev="${p.id}">▸</span> ${esc(p.name)}${p.lat != null ? ' 📍' : ''}</div>
          <div class="row-sub">${esc([p.place, p.phone].filter(Boolean).join(' · ')) || 'Tap to see bills'}</div>
        </div>
        <div class="row-amount ${p.balance > 0.005 ? 'good' : 'muted'}">
          ${p.balance > 0.005 ? fmtMoney(p.balance) : '✓ Clear'}
        </div>
        ${p.balance > 0.005
          ? `<button class="row-stmt" data-id="${p.id}" title="Bill statement">&#129534;</button>
             <button class="row-collect" data-kind="customer" data-id="${p.id}">Collect</button>`
          : `<button class="row-del party-del" data-kind="customer" data-id="${p.id}" title="Delete">&#128465;</button>`}
      </div>
      <div class="shop-history hidden" data-history-for="${p.id}"></div>
    </div>`;

  const pendingCustomers = customers.filter((p) => p.balance > 0.005);
  const totalPending = pendingCustomers.reduce((a, p) => a + p.balance, 0);
  const shownCustomers = state.shopFilter === 'pending' ? pendingCustomers : customers;

  return `
  <section class="card">
    <div class="card-head-row">
      <h3>Shops (customers)</h3>
      <div class="head-actions">
        <button class="btn-small" id="route-btn">&#128506;</button>
        <button class="btn-small" id="import-customers">&#8686; Import</button>
        <button class="btn-small" id="add-customer">＋ Add</button>
      </div>
    </div>
    <div class="hint">Tap a shop to open its bills by date &middot; tap any bill to edit it &middot; &#129534; = statement for WhatsApp</div>
    <div class="seg-row">
      <button class="seg ${state.shopFilter !== 'pending' ? 'active' : ''}" data-shopfilter="all">All (${customers.length})</button>
      <button class="seg ${state.shopFilter === 'pending' ? 'active' : ''}" data-shopfilter="pending">Pending${pendingCustomers.length ? ` · ${fmtMoney(totalPending)} (${pendingCustomers.length})` : ' (0)'}</button>
    </div>
    <input class="search-box" id="shop-search" placeholder="🔍 Search shop or place…" />
    <div class="rows">${shownCustomers.map((p) => shopBlock(p)).join('') || `<div class="empty">${state.shopFilter === 'pending' ? 'No pending amounts — all clear ✓' : 'No shops added yet'}</div>`}</div>
  </section>
  <section class="card">
    <div class="card-head-row">
      <h3>Suppliers</h3>
      <button class="btn-small" id="add-supplier">＋ Add</button>
    </div>
    <div class="hint">Amount shown = money you still owe the supplier</div>
    <div class="rows">${suppliers.map((p) => supplierRow(p)).join('') || '<div class="empty">No suppliers added yet</div>'}</div>
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

/* ---------- shop → expandable dated history ---------- */

function shopHistoryRows(data) {
  if (!data.bills.length) return '<div class="empty">No bills yet for this shop</div>';
  const shopName = data.customer.name;
  return (
    `<div class="hist-summary">
      <span>Billed <b>${fmtMoney(data.totals.billed)}</b></span>
      <span class="${data.totals.outstanding > 0.005 ? 'good' : 'muted'}">Due <b>${fmtMoney(data.totals.outstanding)}</b></span>
      ${data.totals.advance > 0.005 ? `<span class="muted">Advance ${fmtMoney(data.totals.advance)}</span>` : ''}
    </div>` +
    data.bills
      .map((b) => {
        const itemLines =
          parseItemLines(b.items)
            .map((l) => {
              const c = labelSku(l.label);
              return `<div class="hist-item">${c ? `<span class="li-code">${esc(c)}</span> ` : '• '}${esc(l.label)} — ${l.qty} × ${fmtMoney(l.rate)}</div>`;
            })
            .join('') || '<div class="hist-item">• Goods</div>';
        const status = b.settled
          ? '<span class="hist-paid">✓ Paid</span>'
          : `<span class="hist-due ${b.overdue ? 'bad' : 'pend'}">${b.overdue ? '⚠️ ' : ''}${fmtMoney(b.balance)} due</span>`;
        const ml = payModeLabel(b.mode || '', b.billPaid, b.total);
        return `
        <button type="button" class="hist-bill" data-bill-id="${b.id}" data-shop-id="${data.customer.id}" data-shop-name="${esc(shopName)}">
          <div class="hist-bill-top">
            <span class="hist-date">${fmtDateFull(b.date)} <span class="pay-badge pay-${ml.toLowerCase().replace(' ', '-')}">${ml}</span></span>
            <span class="hist-total">${fmtMoney(b.total)}</span>
          </div>
          <div class="hist-items">${itemLines}</div>
          <div class="hist-bill-foot">${status}<span class="hist-edit-hint">tap to edit ✎</span></div>
        </button>`;
      })
      .join('')
  );
}

async function toggleShopHistory(shopId) {
  const el = $(`.shop-history[data-history-for="${shopId}"]`);
  const chev = $(`[data-chev="${shopId}"]`);
  if (!el) return;
  const isOpen = !el.classList.contains('hidden');
  if (isOpen) {
    el.classList.add('hidden');
    if (chev) chev.textContent = '▸';
    return;
  }
  if (chev) chev.textContent = '▾';
  el.classList.remove('hidden');
  if (!el.dataset.loaded) {
    el.innerHTML = '<div class="loading">Loading bills…</div>';
    try {
      const data = await api(`/api/customers/${shopId}/history`);
      state.shopHistory = state.shopHistory || {};
      state.shopHistory[shopId] = data;
      el.innerHTML = shopHistoryRows(data);
      el.dataset.loaded = '1';
      wireShopHistory(el);
    } catch (e) {
      el.innerHTML = `<div class="empty">${esc(e.message)}</div>`;
    }
  }
}

function wireShopHistory(el) {
  $$('.hist-bill', el).forEach((b) => {
    b.onclick = () => {
      const data = state.shopHistory && state.shopHistory[b.dataset.shopId];
      const bill = data && data.bills.find((x) => String(x.id) === b.dataset.billId);
      if (bill) editSaleForm(bill, Number(b.dataset.shopId), b.dataset.shopName);
    };
  });
}

/* Edit or delete one past sale (owner correcting their own record). */
function editSaleForm(bill, customerId, customerName) {
  openModal(
    `Edit bill — ${customerName}`,
    `
    <div class="hint" style="margin-bottom:0">${esc(customerName)} · originally ${fmtDateFull(bill.date)}</div>
    <label>Date <input type="date" name="sale_date" value="${bill.date}" required /></label>
    ${itemPickerHtml('sale')}
    <input type="hidden" name="items" />
    <label>Total amount (₹) <input type="number" name="total_amount" min="0" step="0.01" inputmode="decimal" required value="${bill.total}" /></label>
    ${paymentModeField(bill.mode || payModeLabel('', bill.billPaid, bill.total).toLowerCase())}
    <label>Received on this bill (₹) <input type="number" name="paid_amount" min="0" step="0.01" inputmode="decimal" value="${bill.billPaid}" /></label>
    <label>Notes <input name="notes" value="${esc(bill.notes || '')}" placeholder="Optional" /></label>
    <button type="button" class="btn-danger" id="del-bill">🗑 Delete this bill</button>`,
    async (fd, close) => {
      const total = parseFloat(fd.get('total_amount'));
      const paidRaw = fd.get('paid_amount');
      const paid = paidRaw === '' ? 0 : parseFloat(paidRaw);
      await api(`/api/sales/${bill.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          sale_date: fd.get('sale_date'),
          items: fd.get('items'),
          total_amount: total,
          paid_amount: paid,
          notes: fd.get('notes'),
          payment_mode: fd.get('payment_mode'),
        }),
      });
      close();
      toast('Bill updated ✓');
      render();
    }
  );
  wirePaymentMode();
  wireItemPicker('sale', parseItemLines(bill.items));
  wireDeleteButton('del-bill', 'sales', bill.id, `bill (${fmtMoney(bill.total)}, ${fmtDateFull(bill.date)})`, 'sale');
}

// normalize a raw /api/sales row into the bill shape editSaleForm expects
function saleRowToBill(r) {
  return {
    id: r.id,
    date: r.sale_date,
    items: r.items || '',
    total: r.total_amount,
    billPaid: r.paid_amount,
    notes: r.notes || '',
    mode: r.payment_mode || '',
  };
}

/* Edit or delete one purchase (owner correcting their own record). */
function editPurchaseForm(row) {
  const supplierName = row.supplier_name || 'Purchase';
  openModal(
    `Edit purchase — ${supplierName}`,
    `
    <div class="hint" style="margin-bottom:0">${esc(supplierName)} · originally ${fmtDateFull(row.purchase_date)}</div>
    <label>Date <input type="date" name="purchase_date" value="${row.purchase_date}" required /></label>
    ${itemPickerHtml('purchase')}
    <input type="hidden" name="items" />
    <label>Total amount (₹) <input type="number" name="total_amount" min="0" step="0.01" inputmode="decimal" required value="${row.total_amount}" /></label>
    <label>Paid on this bill (₹) <input type="number" name="paid_amount" min="0" step="0.01" inputmode="decimal" value="${row.paid_amount}" /></label>
    <label>Notes <input name="notes" value="${esc(row.notes || '')}" placeholder="Optional" /></label>
    <button type="button" class="btn-danger" id="del-purchase">🗑 Delete this purchase</button>`,
    async (fd, close) => {
      const total = parseFloat(fd.get('total_amount'));
      const paidRaw = fd.get('paid_amount');
      const paid = paidRaw === '' ? 0 : parseFloat(paidRaw);
      await api(`/api/purchases/${row.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          purchase_date: fd.get('purchase_date'),
          items: fd.get('items'),
          total_amount: total,
          paid_amount: paid,
          notes: fd.get('notes'),
        }),
      });
      close();
      toast('Purchase updated ✓');
      render();
    }
  );
  wireItemPicker('purchase', parseItemLines(row.items));
  wireDeleteButton('del-purchase', 'purchases', row.id, `purchase (${fmtMoney(row.total_amount)}, ${fmtDateFull(row.purchase_date)})`, 'purchase');
}

/* Edit or delete one expense. */
function editExpenseForm(row) {
  openModal(
    'Edit expense',
    `
    <label>Date <input type="date" name="expense_date" value="${row.expense_date}" required /></label>
    <label>Category
      ${comboHtml('category', 'Search or pick a category…')}
    </label>
    <label>Amount (₹) <input type="number" name="amount" min="0" step="0.01" inputmode="decimal" required value="${row.amount}" /></label>
    <label>Notes <input name="notes" value="${esc(row.notes || '')}" placeholder="Optional" /></label>
    <button type="button" class="btn-danger" id="del-expense">🗑 Delete this expense</button>`,
    async (fd, close) => {
      if (!fd.get('category')) throw new Error('Choose a category');
      await api(`/api/expenses/${row.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          expense_date: fd.get('expense_date'),
          category: fd.get('category'),
          amount: parseFloat(fd.get('amount')),
          notes: fd.get('notes'),
        }),
      });
      close();
      toast('Expense updated ✓');
      render();
    }
  );
  // category list plus the row's own value if it was a custom one not in the list
  const cats = EXPENSE_CATEGORIES.includes(row.category)
    ? EXPENSE_CATEGORIES
    : [row.category, ...EXPENSE_CATEGORIES];
  const catCombo = wireCombo('category', cats.map((c) => ({ value: c, label: c })));
  catCombo.set(row.category);
  wireDeleteButton('del-expense', 'expenses', row.id, `expense (${fmtMoney(row.amount)}, ${esc(row.category)})`, 'expense');
}

/* Shared delete button for the edit modals: confirm, DELETE, close, refresh. */
function wireDeleteButton(btnId, kind, id, label, noun) {
  const btn = $(`#${btnId}`);
  if (!btn) return;
  btn.onclick = async () => {
    if (!confirm(`Delete this ${label}?\nThis removes a real recorded ${noun} and cannot be undone.`)) return;
    try {
      await api(`/api/${kind}/${id}`, { method: 'DELETE' });
      $('#modal-root').innerHTML = '';
      toast('Deleted');
      render();
    } catch (e) {
      toast(e.message, false);
    }
  };
}

/* ---------- stock registry ---------- */

async function viewStock() {
  const [rows, products] = await Promise.all([api('/api/stock'), api('/api/products')]);
  state.products = products;
  state.stock = rows;

  const tracked = rows.filter((r) => r.tracked);
  const out = tracked.filter((r) => r.balance <= 0.005).length;
  const low = tracked.filter((r) => r.balance > 0.005 && r.balance <= 5).length;

  const groups = {};
  for (const r of rows) (groups[r.name] = groups[r.name] || []).push(r);
  const stockRows = Object.entries(groups)
    .map(
      ([name, list]) => `
      <div class="item-group">
        <div class="item-group-name"><span class="cat-no">${esc(skuGroup(name))}</span> ${esc(name)}</div>
        <div class="rows">
          ${list
            .map((r) => {
              const cls = !r.tracked ? 'muted' : r.balance <= 0.005 ? 'bad' : r.balance <= 5 ? 'pend' : 'good';
              const bal = !r.tracked
                ? 'Not counted'
                : r.balance <= 0.005
                  ? 'Out of stock'
                  : `${r.balance} left`;
              const moves = r.tracked
                ? `counted ${r.counted}${r.bought ? ' · +' + r.bought + ' bought' : ''}${r.sold ? ' · −' + r.sold + ' sold' : ''}`
                : 'Tap to set opening count';
              return `
              <div class="row stock-row" data-pid="${r.product_id}">
                <div class="row-main">
                  <div class="row-title"><span class="li-code">${esc(r.sku)}</span> ${esc(r.size) || '—'}</div>
                  <div class="row-sub">${moves}</div>
                </div>
                <div class="row-amount ${cls}">${bal}</div>
              </div>`;
            })
            .join('')}
        </div>
      </div>`
    )
    .join('');

  return `
  <section class="card">
    <div class="card-head-row">
      <h3>Stock registry</h3>
      <button class="btn-small" id="stock-load">&#8686; Load stock</button>
    </div>
    <div class="hint">Set your counted stock, then every sale and purchase moves the balance automatically.</div>
    <div class="stat-row" style="margin-top:10px">
      <div class="stat"><div class="stat-label">Items tracked</div><div class="stat-val">${tracked.length}</div></div>
      <div class="stat"><div class="stat-label">Low (≤5)</div><div class="stat-val pend">${low}</div></div>
      <div class="stat"><div class="stat-label">Out of stock</div><div class="stat-val ${out ? 'bad' : 'muted'}">${out}</div></div>
    </div>
  </section>
  <section class="card">
    <input class="search-box" id="stock-search" placeholder="🔍 Search item, size or code…" />
    ${stockRows || '<div class="empty">No items yet</div>'}
  </section>`;
}

function setStockForm(row) {
  openModal(
    `Set stock — ${row.sku || row.name}`,
    `
    <div class="hint" style="margin-bottom:0">${esc(`${row.name} ${row.size}`.trim())}${row.tracked ? ` · now showing ${row.balance} left` : ''}</div>
    <label>Counted quantity (units you physically have)
      <input type="number" name="qty" min="0" step="0.01" inputmode="decimal" value="${row.tracked ? row.counted : ''}" placeholder="0" required />
    </label>
    <label>Count date <input type="date" name="count_date" value="${todayStr()}" required /></label>`,
    async (fd, close) => {
      await api('/api/stock', {
        method: 'POST',
        body: JSON.stringify({
          product_id: row.product_id,
          qty: parseFloat(fd.get('qty')),
          count_date: fd.get('count_date'),
        }),
      });
      close();
      toast('Stock updated ✓');
      render();
    }
  );
}

/* Paste "code or name = qty" lines to set opening stock in bulk. */
function importStockForm() {
  openModal(
    'Load stock',
    `
    <div class="hint" style="margin-bottom:0">One item per line — <b>code or name = quantity</b>.<br/>
    e.g. <code>LDC-SPICE-1KG = 50</code> or <code>Spice LD Cover 1 kg = 50</code></div>
    <label>Count date <input type="date" name="count_date" value="${todayStr()}" required /></label>
    <label>Your stock list
      <textarea name="list" rows="8" placeholder="LDC-SPICE-1KG = 50&#10;HMC-ZAM-3KG = 20&#10;..."></textarea>
    </label>`,
    async (fd, close) => {
      const lines = String(fd.get('list') || '').split('\n').map((l) => l.trim()).filter(Boolean);
      const items = [];
      const unmatched = [];
      for (const line of lines) {
        const m = /^(.+?)\s*[=:\t]\s*([\d.]+)\s*$/.exec(line);
        if (!m) { unmatched.push(line); continue; }
        const key = m[1].trim().toLowerCase();
        const qty = parseFloat(m[2]);
        const p = state.products.find(
          (x) =>
            (x.sku || skuFor(x.name, x.size)).toLowerCase() === key ||
            `${x.name} ${x.size}`.trim().toLowerCase() === key
        );
        if (p) items.push({ product_id: p.id, qty });
        else unmatched.push(line);
      }
      if (!items.length) throw new Error('No items matched. Use the exact code or "name size".');
      const res = await api('/api/stock/import', {
        method: 'POST',
        body: JSON.stringify({ items, count_date: fd.get('count_date') }),
      });
      close();
      toast(
        unmatched.length
          ? `${res.saved} set · ${unmatched.length} not matched`
          : `${res.saved} items stocked ✓`,
        !unmatched.length
      );
      render();
    }
  );
}

async function viewReport() {
  const month = state.reportMonth;
  const bundle = await api(
    `/api/bundle/report?month=${month}&date=${todayStr()}&daylog=${state.daylogDate}`
  );
  const r = bundle.report;
  const trend = bundle.trend;
  const customers = bundle.balances.customers;
  const monthSales = bundle.monthSales;
  const daylog = bundle.daylog;
  state.lastDaylog = daylog;
  const products = bundle.products;
  const psum = bundle.profitSummary;
  const ssum = bundle.salesSummary;
  state.products = products;

  const salesTile = (label, v) => `
    <div class="stat">
      <div class="stat-label">${label}</div>
      <div class="stat-val good">${fmtMoney(v.total)}</div>
      <div class="stat-sub">${v.count} ${v.count === 1 ? 'bill' : 'bills'}</div>
    </div>`;
  const salesCard = ssum
    ? `
  <section class="card">
    <h3>Sales at a glance</h3>
    <div class="stat-row">
      ${salesTile('Today', ssum.day)}
      ${salesTile('This week', ssum.week)}
      ${salesTile('This month', ssum.month)}
      ${salesTile('Year', ssum.ytd)}
    </div>
    <div class="hint" style="margin:8px 0 0">Total billed to shops in each period</div>
  </section>`
    : '';

  const glanceTile = (label, v) => `
    <div class="stat">
      <div class="stat-label">${label}</div>
      <div class="stat-val ${v.net >= 0 ? 'good' : 'bad'}">${fmtMoney(v.net)}</div>
      <div class="stat-sub">goods ${fmtMoney(v.gross)}</div>
    </div>`;
  const glanceCard = `
  <section class="card">
    <h3>Calculated profit at a glance</h3>
    <div class="stat-row">
      ${glanceTile('Today', psum.day)}
      ${glanceTile('This week', psum.week)}
      ${glanceTile('This month', psum.month)}
      ${glanceTile('Year', psum.ytd)}
    </div>
    <div class="hint" style="margin:8px 0 0">Net of expenses · margin basis from the price book</div>
  </section>`;

  // margin-basis P&L: price each sold line against the price book
  const bookByLabel = {};
  for (const p of products) bookByLabel[`${p.name} ${p.size}`.trim().toLowerCase()] = p;
  let estRevenue = 0, estCost = 0, matchedSaleAmount = 0;
  const marginByItem = {};
  const gapSales = []; // bills whose billed total differs from their item-priced value
  const unmatchedItems = {}; // item labels not found in the price book, with qty
  for (const sale of monthSales) {
    let saleMatched = false;
    let saleItemRev = 0;
    const saleUnmatched = [];
    for (const l of parseItemLines(sale.items)) {
      const p = bookByLabel[l.label.trim().toLowerCase()];
      const rate = l.rate > 0 ? l.rate : p ? p.sale_price || 0 : 0;
      if (!p || !(rate > 0)) {
        if (l.label) {
          saleUnmatched.push(l.label);
          unmatchedItems[l.label] = (unmatchedItems[l.label] || 0) + (l.qty || 0);
        }
        continue;
      }
      const rev = l.qty * rate;
      const cost = l.qty * (p.purchase_price || 0);
      estRevenue += rev;
      estCost += cost;
      saleItemRev += rev;
      saleMatched = true;
      const key = l.label;
      marginByItem[key] = marginByItem[key] || { qty: 0, revenue: 0, cost: 0 };
      marginByItem[key].qty += l.qty;
      marginByItem[key].revenue += rev;
      marginByItem[key].cost += cost;
    }
    if (saleMatched) matchedSaleAmount += sale.total_amount;
    const billed = Number(sale.total_amount) || 0;
    const gap = Math.round((billed - saleItemRev) * 100) / 100;
    if (Math.abs(gap) >= 0.5)
      gapSales.push({
        name: sale.customer_name || 'Cash sale',
        date: sale.sale_date,
        billed,
        itemRev: Math.round(saleItemRev * 100) / 100,
        gap,
        unmatched: saleUnmatched,
      });
  }
  gapSales.sort((a, b) => Math.abs(b.gap) - Math.abs(a.gap));
  const grossProfit = Math.round((estRevenue - estCost) * 100) / 100;
  const calcNet = Math.round((grossProfit - r.expenses.total) * 100) / 100;
  const unpricedDiff = Math.round((r.sales.total - estRevenue) * 100) / 100;

  const itemProfits = Object.entries(marginByItem)
    .map(([label, v]) => ({ label, profit: Math.round((v.revenue - v.cost) * 100) / 100, qty: v.qty }))
    .sort((a, b) => b.profit - a.profit)
    .slice(0, 8);
  const maxItemProfit = Math.max(1, ...itemProfits.map((x) => Math.abs(x.profit)));
  const itemProfitRows = itemProfits
    .map(
      (x) => `
      <div class="chart-row">
        <span class="chart-label" style="width:120px" title="${esc(x.label)}">${esc(x.label)}</span>
        <div class="mini-track"><div class="mini-bar ${x.profit >= 0 ? 'trend-bar-pos' : 'trend-bar-neg'}" style="width:${Math.round((Math.abs(x.profit) / maxItemProfit) * 100)}%"></div></div>
        <span class="chart-val ${x.profit >= 0 ? 'good' : 'bad'}">${fmtMoney(x.profit)}</span>
      </div>`
    )
    .join('');

  // breakdown behind the "Not item-priced" line so the gap is explainable
  const unmatchedList = Object.entries(unmatchedItems).sort((a, b) => b[1] - a[1]);
  const gapBillRows = gapSales
    .map(
      (g) => `
      <div class="row">
        <div class="row-main">
          <div class="row-title">${esc(g.name)} · ${fmtDate(g.date)}</div>
          <div class="row-sub">Billed ${fmtMoney(g.billed)} · priced ${fmtMoney(g.itemRev)}${g.unmatched.length ? ' · not in price book: ' + esc(g.unmatched.join(', ')) : ''}</div>
        </div>
        <div class="row-amount ${g.gap >= 0 ? '' : 'good'}">${fmtMoney(g.gap)}</div>
      </div>`
    )
    .join('');
  const unmatchedChips = unmatchedList.length
    ? `<div class="hint" style="margin-top:10px">Items not in your price book — tap to add so these bills get priced:</div>
       <div class="item-chips" style="margin-top:6px">${unmatchedList
         .map(([label, qty]) => `<button class="chip unpriced-add" data-name="${esc(label)}">＋ ${esc(label)}${qty ? ` <span class="muted">×${qty}</span>` : ''}</button>`)
         .join('')}</div>`
    : '';
  const unpricedDetail = `
    <div class="unpriced-detail hidden" id="unpriced-detail">
      <div class="hint" style="margin:0 0 6px">This is the part of your billing that couldn't be matched to a
      price-book item — cash sales with no items listed, hand-typed items, or amounts that differ from the item lines.
      Add the missing items (below) or edit those bills so the calculated profit gets sharper.</div>
      ${gapBillRows || '<div class="empty">No specific bills — the gap is only rounding.</div>'}
      ${unmatchedChips}
    </div>`;

  const marginCard = estRevenue > 0
    ? `
  <section class="card">
    <h3>Calculated profit — margin basis</h3>
    <div class="hint">Each sold item priced against the price book's buying rate — works even for
    old stock bought before the app.</div>
    <div class="pl-line"><span>Sold items (calculated revenue)</span><b class="good">${fmtMoney(estRevenue)}</b></div>
    ${Math.abs(unpricedDiff) >= 0.5 ? `<div class="pl-line pl-muted pl-expand" id="unpriced-toggle"><span><span class="chev" id="unpriced-chev">▸</span> Not item-priced (billed ${fmtMoney(r.sales.total)} − items ${fmtMoney(estRevenue)})</span><b>${fmtMoney(unpricedDiff)}</b></div>${unpricedDetail}` : ''}
    <div class="pl-line"><span>Buying cost (price book)</span><b>&minus; ${fmtMoney(estCost)}</b></div>
    <div class="pl-line"><span>Gross profit on goods</span><b class="${grossProfit >= 0 ? 'good' : 'bad'}">${fmtMoney(grossProfit)}</b></div>
    <div class="pl-line"><span>Expenses (${r.expenses.count})</span><b class="bad">&minus; ${fmtMoney(r.expenses.total)}</b></div>
    <div class="pl-line pl-total"><span>Calculated net profit</span><b class="${calcNet >= 0 ? 'good' : 'bad'}">${fmtMoney(calcNet)}</b></div>
    ${itemProfitRows ? '<div class="hint" style="margin-top:10px">Profit by item</div>' + itemProfitRows : ''}
  </section>`
    : '';

  const located = daylog.stops.filter((st) => st.lat != null && st.lng != null);
  const daylogRows = daylog.stops
    .map(
      (st, i) => `
      <div class="row">
        <span class="route-step">${i + 1}</span>
        <div class="row-main">
          <div class="row-title">${esc(st.name)}${st.lat != null ? ' 📍' : ''}</div>
          <div class="row-sub">${fmtTimeIST(st.time)}${st.place ? ' · ' + esc(st.place) : ''}</div>
          <div class="row-sub">${st.kind === 'sale' ? `Sale ${fmtMoney(st.amount)}${st.paid < st.amount ? ` (${fmtMoney(st.paid)} received)` : ''}` : `Collected ${fmtMoney(st.amount)}`}</div>
        </div>
      </div>`
    )
    .join('');

  const itemAgg = {};
  for (const sale of monthSales) {
    for (const l of parseItemLines(sale.items)) {
      if (!l.label || l.label === 'Goods') continue;
      const key = l.label;
      itemAgg[key] = itemAgg[key] || { qty: 0, revenue: 0 };
      itemAgg[key].qty += l.qty;
      itemAgg[key].revenue += l.qty * (l.rate || 0);
    }
  }
  const topItems = Object.entries(itemAgg)
    .sort((a, b) => b[1].qty - a[1].qty)
    .slice(0, 8);
  const maxItemQty = Math.max(1, ...topItems.map(([, v]) => v.qty));
  const topItemsRows = topItems
    .map(
      ([label, v]) => `
      <div class="chart-row">
        <span class="chart-label" style="width:120px" title="${esc(label)}">${esc(label)}</span>
        <div class="mini-track"><div class="mini-bar trend-bar-pos" style="width:${Math.round((v.qty / maxItemQty) * 100)}%"></div></div>
        <span class="chart-val">${v.qty}${v.revenue > 0 ? ' · ' + fmtMoney(v.revenue) : ''}</span>
      </div>`
    )
    .join('');

  const maxExp = Math.max(1, ...(r.expenses.byCategory || []).map((c) => c.total));
  const catRows = (r.expenses.byCategory || [])
    .map(
      (c) => `
      <div class="chart-row">
        <span class="chart-label" title="${esc(c.category)}">${esc(c.category)}</span>
        <div class="mini-track"><div class="mini-bar" style="width:${Math.round((c.total / maxExp) * 100)}%"></div></div>
        <span class="chart-val">${fmtMoney(c.total)}</span>
      </div>`
    )
    .join('');

  const maxProfit = Math.max(1, ...trend.map((t) => Math.abs(t.profit)));
  const monthName = (m) => {
    const [yy, mm] = m.split('-').map(Number);
    return new Date(yy, mm - 1, 1).toLocaleString('en-IN', { month: 'short' });
  };
  const trendRows = trend
    .map(
      (t) => `
      <div class="chart-row">
        <span class="chart-label">${monthName(t.month)}</span>
        <div class="mini-track"><div class="mini-bar ${t.profit >= 0 ? 'trend-bar-pos' : 'trend-bar-neg'}" style="width:${Math.round((Math.abs(t.profit) / maxProfit) * 100)}%"></div></div>
        <span class="chart-val ${t.profit >= 0 ? 'good' : 'bad'}">${fmtMoney(t.profit)}</span>
      </div>`
    )
    .join('');

  const topPending = customers
    .filter((c) => c.balance > 0.005)
    .sort((a, b) => b.balance - a.balance)
    .slice(0, 5)
    .map(
      (c) => `
      <div class="row">
        ${avatarHtml(c.name)}
        <div class="row-main">
          <div class="row-title">${esc(c.name)}</div>
          <div class="row-sub">${esc(c.place || '')}</div>
        </div>
        <div class="row-amount good">${fmtMoney(c.balance)}</div>
      </div>`
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
  ${salesCard}

  ${glanceCard}

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

  ${marginCard}

  ${topItemsRows ? `<section class="card"><h3>Top items — ${monthLabel(month)}</h3>${topItemsRows}</section>` : ''}

  <section class="card">
    <h3>Profit — last 6 months</h3>
    ${trendRows}
  </section>

  <section class="card">
    <h3>Outstanding (overall)</h3>
    <div class="pl-line"><span>Shops owe you</span><b class="good">${fmtMoney(r.outstanding.receivable)}</b></div>
    <div class="pl-line"><span>You owe suppliers</span><b class="bad">${fmtMoney(r.outstanding.payable)}</b></div>
    ${topPending ? '<div class="hint" style="margin-top:10px">Top pending shops</div>' + topPending : ''}
  </section>

  ${bars ? `<section class="card"><h3>Daily sales</h3>${bars}</section>` : ''}

  <section class="card">
    <div class="entries-head">
      <h3 style="margin:0">Route log</h3>
      <input type="date" id="daylog-date" value="${state.daylogDate}" />
    </div>
    <div class="hint">The day's shop visits in the order they were entered</div>
    ${daylogRows || '<div class="empty">No shop visits recorded this day</div>'}
    ${located.length >= 2 ? '<button type="button" class="btn-primary" id="daylog-route" style="margin-top:10px">🗺️ Open travelled route in Google Maps</button>' : ''}
  </section>`;
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

/* ---------- order book ---------- */

/* Tap an inbox memo → view it, with two ways forward: convert it into an order,
   or leave it. Closing (or "Keep in inbox") returns to the inbox unchanged. */
function noteDetailModal(note) {
  const isBuy = note.kind === 'purchase';
  const { close } = infoModal(
    'Inbox note',
    `
    <div class="note-view">${esc(note.note)}</div>
    <div class="row-sub" style="margin:0 0 14px">Added ${fmtDate(note.created_at.slice(0, 10))}${isBuy ? ' · to buy' : ' · shop order'}</div>
    <button type="button" class="btn-primary" id="nd-order">${isBuy ? '→ Convert to a purchase' : '→ Convert to an order'}</button>
    <button type="button" class="btn-small" id="nd-done">✓ Mark done &amp; clear from inbox</button>
    <button type="button" class="btn-small" id="nd-keep">Keep in inbox</button>
    <button type="button" class="btn-danger" id="nd-del">🗑 Delete</button>`
  );
  $('#nd-order').onclick = () => {
    close();
    if (isBuy) purchaseForm(note.note, note.id);
    else orderForm(note.note, note.id);
  };
  $('#nd-done').onclick = async () => {
    try {
      await api(`/api/notes/${note.id}`, { method: 'PUT' });
      close();
      toast('Done ✓');
      render();
    } catch (e) {
      toast(e.message, false);
    }
  };
  $('#nd-keep').onclick = close;
  $('#nd-del').onclick = async () => {
    if (!confirm('Delete this note?')) return;
    try {
      await api(`/api/notes/${note.id}`, { method: 'DELETE' });
      close();
      toast('Deleted');
      render();
    } catch (e) {
      toast(e.message, false);
    }
  };
}

function noteForm(kind = 'sale') {
  const m = kind === 'purchase' ? 'purchase' : 'sale';
  openModal(
    'Quick note',
    `
    <label>This note is for</label>
    <div class="seg-row pay-modes">
      <button type="button" class="seg note-kind ${m === 'sale' ? 'active' : ''}" data-kind="sale">🛒 A shop order</button>
      <button type="button" class="seg note-kind ${m === 'purchase' ? 'active' : ''}" data-kind="purchase">📦 To buy</button>
    </div>
    <input type="hidden" name="kind" value="${m}" />
    <label>What should you remember? <span class="muted" style="font-weight:400">(@ tags a shop/vendor · # picks an item)</span>
      <textarea name="note" rows="3" placeholder="e.g. Buy 10 #Spice LD Cover 1 kg from @supplier"></textarea>
    </label>
    <div class="mention-list hidden" data-mentions></div>`,
    async (fd, close) => {
      await api('/api/notes', {
        method: 'POST',
        body: JSON.stringify({ note: fd.get('note'), kind: fd.get('kind') }),
      });
      close();
      toast('Noted ✓');
      render();
    }
  );
  const hidden = $('#modal-root input[name="kind"]');
  $$('#modal-root .note-kind').forEach((b) => {
    b.onclick = () => {
      $$('#modal-root .note-kind').forEach((x) => x.classList.remove('active'));
      b.classList.add('active');
      hidden.value = b.dataset.kind;
    };
  });
  wireMentions();
}

async function wireMentions() {
  if (!state.products.length || (!state.customers.length && !state.suppliers.length)) {
    try { await loadParties(); } catch (e) { /* offline lists are fine */ }
  }
  const root = $('#modal-root');
  const ta = $('textarea[name="note"]', root);
  const list = $('[data-mentions]', root);
  if (!ta || !list) return;
  const parties = [
    ...state.customers.map((p) => ({ ...p, kind: 'Shop' })),
    ...state.suppliers.map((p) => ({ ...p, kind: 'Supplier' })),
  ];

  // the token being typed: @… tags a shop/supplier, #… picks a catalog item
  const activeToken = () => {
    const upto = ta.value.slice(0, ta.selectionStart);
    const m = /([@#])([^@#\n]*)$/.exec(upto);
    return m ? { trigger: m[1], query: m[2].trimStart(), start: upto.length - m[0].length } : null;
  };

  const insert = (text) => {
    const tok = activeToken();
    if (!tok) return;
    const before = ta.value.slice(0, tok.start);
    const after = ta.value.slice(ta.selectionStart);
    ta.value = before + text + ' ' + after;
    const pos = (before + text + ' ').length;
    ta.setSelectionRange(pos, pos);
    ta.focus();
    list.classList.add('hidden');
  };

  const refresh = () => {
    const tok = activeToken();
    if (!tok) return list.classList.add('hidden');
    const q = tok.query.toLowerCase();

    if (tok.trigger === '#') {
      // product picker: match on name, size or code — "cup" → the cup items
      const matches = (state.products || [])
        .filter((p) => {
          const code = p.sku || skuFor(p.name, p.size);
          const hay = `${p.name} ${p.size} ${code}`.toLowerCase();
          const tight = hay.replace(/\s+/g, '');
          return !q || hay.includes(q) || tight.includes(q);
        })
        .slice(0, 8);
      if (!matches.length) return list.classList.add('hidden');
      list.classList.remove('hidden');
      list.innerHTML = matches
        .map((p, i) => {
          const code = p.sku || skuFor(p.name, p.size);
          return `
          <button type="button" class="mention-item" data-mi="${i}">
            <span class="li-code">${esc(code)}</span>
            <span class="mention-name">${esc(`${p.name} ${p.size}`.trim())}</span>
            <span class="mention-kind">${p.sale_price > 0 ? '₹' + p.sale_price : 'Item'}</span>
          </button>`;
        })
        .join('');
      $$('.mention-item', list).forEach((btn) => {
        btn.onclick = () => {
          const p = matches[Number(btn.dataset.mi)];
          insert('#' + `${p.name} ${p.size}`.trim());
        };
      });
      return;
    }

    // @ — shops & suppliers
    const matches = parties
      .filter((p) => !q || p.name.toLowerCase().includes(q) || (p.place || '').toLowerCase().includes(q))
      .slice(0, 6);
    if (!matches.length) return list.classList.add('hidden');
    list.classList.remove('hidden');
    list.innerHTML = matches
      .map(
        (p, i) => `
      <button type="button" class="mention-item" data-mi="${i}">
        ${avatarHtml(p.name)}
        <span class="mention-name">${esc(p.name)}${p.place ? ' · ' + esc(p.place) : ''}</span>
        <span class="mention-kind">${p.kind}</span>
      </button>`
      )
      .join('');
    $$('.mention-item', list).forEach((btn) => {
      btn.onclick = () => insert('@' + matches[Number(btn.dataset.mi)].name);
    });
  };

  ta.addEventListener('input', refresh);
  ta.addEventListener('keyup', (e) => { if (e.key === 'Escape') list.classList.add('hidden'); });
}

function orderForm(prefillNote, fromNoteId) {
  openModal(
    'New Order (rough)',
    `
    <div class="hint" style="margin-bottom:0">Note down what a shop asked for — prepare it later
    and convert it to a sale with one tap when delivered.</div>
    <label>Date <input type="date" name="order_date" value="${todayStr()}" required /></label>
    ${partyField('Shop / Customer', 'customer', state.customers, 'Add new shop')}
    ${itemPickerHtml('sale')}
    <input type="hidden" name="items" />
    <label>Estimated total (₹, optional) <input type="number" name="total_amount" min="0" step="0.01" inputmode="decimal" placeholder="0" /></label>
    <label>Notes <input name="notes" placeholder="e.g. deliver Friday morning" /></label>`,
    async (fd, close) => {
      const party = await resolveParty(fd, 'customer', '/api/customers', state.customers);
      await api('/api/orders', {
        method: 'POST',
        body: JSON.stringify({
          order_date: fd.get('order_date'),
          customer_id: party.id,
          customer_name: party.name,
          items: fd.get('items'),
          total_amount: fd.get('total_amount') || 0,
          notes: fd.get('notes'),
        }),
      });
      if (fromNoteId) await api(`/api/notes/${fromNoteId}`, { method: 'PUT' });
      close();
      toast('Order noted ✓');
      render();
    }
  );
  const customerCombo = wirePartyField('customer', state.customers, 'Add new shop');
  wireItemPicker('sale');
  if (prefillNote) {
    $('#modal-root input[name="notes"]').value = prefillNote;
    // if the note tags a shop with @, preselect it
    const tagged = [...state.customers]
      .sort((a, b) => b.name.length - a.name.length)
      .find((c) => prefillNote.toLowerCase().includes('@' + c.name.toLowerCase()));
    if (tagged) customerCombo.set(String(tagged.id));
  }
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
    lines.push(`${i + 1}) Bought on ${fmtDateFull(b.date)}${b.overdue ? ' ⚠️ OVERDUE' : ''}`);
    for (const li of (b.items ? b.items.split(/,\s*/) : ['Goods'])) lines.push(`   • ${li}`);
    lines.push(`   Amount: ${fmtMoney(b.balance)}`);
  });
  lines.push('');
  if (st.totals.overdue > 0) lines.push(`⚠️ Overdue (old bills): ${fmtMoney(st.totals.overdue)}`);
  lines.push(`*Total to pay: ${fmtMoney(st.totals.due)}*`);
  lines.push('');
  lines.push('All bills are due on purchase — kindly settle at the earliest.');
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
        ${(b.items ? b.items.split(/,\s*/) : ['Goods']).map((li) => `<div class="row-sub row-wrap">• ${esc(li)}</div>`).join('')}
        ${b.overdue ? '<div class="row-pending">⚠️ Overdue</div>' : ''}
      </div>
      <div class="row-amount">${fmtMoney(b.balance)}</div>
    </div>`).join('');

  const phone = waPhone(c.phone);
  infoModal(
    `Statement — ${c.name}`,
    `
    <div class="rows">${billRows}</div>
    ${st.totals.overdue > 0 ? `<div class="pl-line"><span>⚠️ Overdue (old bills)</span><b class="bad">${fmtMoney(st.totals.overdue)}</b></div>` : ''}
    ${st.totals.overdue > 0 ? `<div class="pl-line"><span>Recent bills</span><b>${fmtMoney(st.totals.notYetDue)}</b></div>` : ''}
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
  const ITEMS_W = (W - M - 170) - ITEMS_X;
  let rowsHeight = 0;
  const rowLines = st.open.map((b) => {
    const itemList = b.items ? b.items.split(/,\s*/) : ['Goods'];
    const lines = itemList.flatMap((li) => wrapText(ctx, li, ITEMS_W));
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
  const logoImg = await loadImage('/static/logo.png');
  if (logoImg) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(M + 34, 65, 36, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.clip();
    ctx.drawImage(logoImg, M - 2, 29, 72, 72);
    ctx.restore();
  } else {
    ctx.fillStyle = '#fbbf24';
    ctx.beginPath();
    ctx.arc(M + 34, 65, 34, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#7f1d1d';
    ctx.font = 'bold 30px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('SS', M + 34, 76);
    ctx.textAlign = 'left';
  }
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
    if (b.overdue) {
      ctx.fillStyle = '#b91c1c';
      ctx.font = 'bold 17px system-ui, sans-serif';
      ctx.fillText('OVERDUE', M + 14, y + 60);
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
  if (st.totals.overdue > 0) totalLine('Overdue (old bills)', st.totals.overdue, false, '#b91c1c');
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
  ctx.fillText('All bills are due on purchase — kindly settle at the earliest.', M, y + 26);
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

function productForm(product, prefillName) {
  const itemCode = product ? skuFor(product.name, product.size) : '';
  openModal(
    product ? `Edit item ${itemCode}` : 'Add item',
    `
    ${itemCode ? `<div class="hint" style="margin-bottom:0">Item code <b>${esc(itemCode)}</b> · generated from the name & size</div>` : ''}
    <label>Item name <input name="name" required value="${esc(product ? product.name : prefillName || '')}" placeholder="e.g. Spice LD Cover" /></label>
    <label>Size <input name="size" value="${esc(product ? product.size : '')}" placeholder="e.g. 1 kg, 10x12, Triple Zero" /></label>
    <label>Selling price (₹, editable on each sale) <input type="number" name="sale_price" min="0" step="0.01" inputmode="decimal" value="${product && product.sale_price > 0 ? product.sale_price : ''}" placeholder="Auto-fills sale amount when picked" /></label>
    <label>Purchase price (₹, editable on each purchase) <input type="number" name="purchase_price" min="0" step="0.01" inputmode="decimal" value="${product && product.purchase_price > 0 ? product.purchase_price : ''}" placeholder="Auto-fills purchase amount when picked" /></label>`,
    async (fd, close) => {
      const body = JSON.stringify({
        name: fd.get('name'),
        size: fd.get('size'),
        sale_price: fd.get('sale_price') || 0,
        purchase_price: fd.get('purchase_price') || 0,
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
    <b>Name, Size, Selling price, Purchase price</b> — only the name is required.<br/>
    Example:<br/><code>Spice LD Cover, 1 kg, 120</code></div>
    <label>Item list <textarea name="list" rows="8" placeholder="Spice LD Cover, 1 kg, 120&#10;Gulf LD Cover, 10x12"></textarea></label>`,
    async (fd, close) => {
      const lines = String(fd.get('list') || '').split('\n').map((l) => l.trim()).filter(Boolean);
      if (!lines.length) throw new Error('Paste at least one line');
      let ok = 0;
      let failed = 0;
      for (const line of lines) {
        const [name, size, price, pprice] = line.split(',').map((t) => (t || '').trim());
        try {
          await api('/api/products', {
            method: 'POST',
            body: JSON.stringify({ name, size, sale_price: price || 0, purchase_price: pprice || 0 }),
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

function parseLatLng(text) {
  const t = String(text || '');
  const m = t.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/) ||
            t.match(/[?&](?:q|ll|query)=(-?\d+\.\d+)[,%2C]+(-?\d+\.\d+)/i) ||
            t.match(/^\s*(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)\s*$/);
  if (!m) return null;
  const lat = parseFloat(m[1]), lng = parseFloat(m[2]);
  if (Math.abs(lat) <= 90 && Math.abs(lng) <= 180) return { lat, lng };
  return null;
}

function partyForm(kind, party) {
  const isCust = kind === 'customer';
  const hasLoc = party && party.lat != null && party.lng != null;
  openModal(
    party ? (isCust ? 'Edit shop' : 'Edit supplier') : (isCust ? 'Add shop / customer' : 'Add supplier'),
    `
    <label>Name <input name="name" required value="${esc(party ? party.name : '')}" placeholder="Name" /></label>
    <label>Place <input name="place" value="${esc(party ? party.place : '')}" placeholder="e.g. Urakam, Ollur" /></label>
    <label>Phone <input name="phone" inputmode="tel" value="${esc(party ? party.phone : '')}" placeholder="Needed for WhatsApp bills" /></label>
    ${isCust ? `<label>Highlight as overdue after (days) <input type="number" name="credit_days" min="0" max="365" value="${party ? party.credit_days : 30}" inputmode="numeric" /></label>` : ''}
    <div class="loc-box">
      <div class="loc-status" data-loc-status>${hasLoc ? '📍 Location saved' : 'No map location yet'}</div>
      <input type="hidden" name="lat" value="${hasLoc ? party.lat : ''}" />
      <input type="hidden" name="lng" value="${hasLoc ? party.lng : ''}" />
      <div class="loc-actions">
        <button type="button" class="btn-small" data-loc-here>📍 Use current location</button>
        ${hasLoc ? `<button type="button" class="btn-small" data-loc-open>🧭 Navigate</button>` : ''}
        <button type="button" class="btn-small" data-loc-clear>Clear</button>
      </div>
      <input data-loc-paste placeholder="…or paste a Google Maps link here" />
    </div>`,
    async (fd, close) => {
      const body = JSON.stringify({
        name: fd.get('name'),
        place: fd.get('place'),
        phone: fd.get('phone'),
        credit_days: fd.get('credit_days'),
        lat: fd.get('lat'),
        lng: fd.get('lng'),
      });
      const ep = isCust ? '/api/customers' : '/api/suppliers';
      if (party) await api(`${ep}/${party.id}`, { method: 'PUT', body });
      else await api(ep, { method: 'POST', body });
      close();
      toast('Saved ✓');
      render();
    }
  );
  const root = $('#modal-root');
  const setLoc = (lat, lng) => {
    $('input[name="lat"]', root).value = lat == null ? '' : lat;
    $('input[name="lng"]', root).value = lng == null ? '' : lng;
    $('[data-loc-status]', root).textContent =
      lat == null ? 'No map location yet' : `📍 Location set (${lat.toFixed(5)}, ${lng.toFixed(5)})`;
  };
  $('[data-loc-here]', root).onclick = () => {
    if (!navigator.geolocation) return toast('Location not available on this browser', false);
    $('[data-loc-status]', root).textContent = 'Getting location…';
    navigator.geolocation.getCurrentPosition(
      (pos) => setLoc(pos.coords.latitude, pos.coords.longitude),
      () => {
        $('[data-loc-status]', root).textContent = 'Could not get location — allow location access and try again';
      },
      { enableHighAccuracy: true, timeout: 12000 }
    );
  };
  $('[data-loc-clear]', root).onclick = () => setLoc(null, null);
  const openBtn = $('[data-loc-open]', root);
  if (openBtn)
    openBtn.onclick = () => window.open(`https://www.google.com/maps?q=${party.lat},${party.lng}`, '_blank');
  $('[data-loc-paste]', root).oninput = (e) => {
    const p = parseLatLng(e.target.value);
    if (p) {
      setLoc(p.lat, p.lng);
      e.target.value = '';
      toast('Location read from link ✓');
    }
  };
}

function addPartyForm(kind) {
  partyForm(kind, null);
}

/* ---------- route builder: multi-stop Google Maps link ---------- */

function routeModal() {
  const located = state.customers.filter((c) => c.lat != null && c.lng != null);
  if (!located.length) {
    infoModal(
      'Plan a route',
      '<div class="empty">No shops have a map location yet.<br/>Open a shop and tap “📍 Use current location” while you are there — after a few visits your whole route is mapped.</div>'
    );
    return;
  }
  infoModal(
    'Plan a route',
    `
    <div class="hint" style="margin-bottom:4px">Tick the shops to visit — shops with pending money are pre-selected.</div>
    ${located
      .map(
        (c) => `
      <label class="route-row">
        <input type="checkbox" data-route-id="${c.id}" ${c.balance > 0.005 ? 'checked' : ''} />
        <span class="route-name">${esc(c.name)}${c.place ? ' · ' + esc(c.place) : ''}</span>
        ${c.balance > 0.005 ? `<b class="good">${fmtMoney(c.balance)}</b>` : ''}
      </label>`
      )
      .join('')}
    <button type="button" class="btn-primary" id="route-open">🗺️ Open route in Google Maps</button>`
  );
  $('#route-open').onclick = () => {
    const chosen = $$('#modal-root [data-route-id]:checked').map((el) =>
      located.find((c) => String(c.id) === el.dataset.routeId)
    );
    if (!chosen.length) return toast('Tick at least one shop', false);
    // greedy nearest-neighbour ordering from the first tick
    const order = [chosen[0]];
    const rest = chosen.slice(1);
    while (rest.length) {
      const last = order[order.length - 1];
      let bi = 0, bd = Infinity;
      rest.forEach((c, i) => {
        const d = (c.lat - last.lat) ** 2 + (c.lng - last.lng) ** 2;
        if (d < bd) { bd = d; bi = i; }
      });
      order.push(rest.splice(bi, 1)[0]);
    }
    const url = 'https://www.google.com/maps/dir/' + order.map((c) => `${c.lat},${c.lng}`).join('/');
    window.open(url, '_blank');
  };
}

function wireView() {
  const view = $('#view');

  if (state.tab === 'home') {
    $('#qa-sale').onclick = () => saleForm();
    $('#qa-order').onclick = () => orderForm();
    $$('.note-open', view).forEach((el) => {
      el.onclick = () => {
        const n = (state.notes || []).find((x) => String(x.id) === el.dataset.id);
        if (n) noteDetailModal(n);
      };
    });
    const remBtn = $('#reminder-toggle');
    if (remBtn) remBtn.onclick = () => (reminderOn() ? disableMorningReminder() : enableMorningReminder());
    const addBuy = $('#add-buy-note');
    if (addBuy) addBuy.onclick = () => noteForm('purchase');
    $$('.order-sale', view).forEach((b) => {
      b.onclick = () => {
        const o = (state.pendingOrders || []).find((x) => String(x.id) === b.dataset.id);
        if (o) saleForm({ orderId: o.id, customer_id: o.customer_id, customer_name: o.customer_name, items: o.items });
      };
    });
    $$('.order-done', view).forEach((b) => {
      b.onclick = async () => {
        await api(`/api/orders/${b.dataset.id}`, { method: 'PUT', body: JSON.stringify({ status: 'done' }) });
        toast('Order marked done ✓');
        render();
      };
    });
    $$('.order-del', view).forEach((b) => {
      b.onclick = async () => {
        if (!confirm('Delete this order?')) return;
        await api(`/api/orders/${b.dataset.id}`, { method: 'DELETE' });
        toast('Deleted');
        render();
      };
    });
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
    $$('.entry-edit', view).forEach((el) => {
      el.onclick = () => {
        const r = (state.entriesRows || []).find((x) => String(x.id) === el.dataset.id);
        if (!r) return;
        if (state.entriesKind === 'sales')
          editSaleForm(saleRowToBill(r), r.customer_id, r.customer_name || 'Cash sale');
        else if (state.entriesKind === 'purchases') editPurchaseForm(r);
        else if (state.entriesKind === 'expenses') editExpenseForm(r);
      };
    });
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
    const search = $('#shop-search');
    if (search) {
      search.oninput = () => {
        const q = search.value.trim().toLowerCase();
        $$('.rows > [data-name]', view).forEach((row) => {
          row.style.display = !q || row.dataset.name.includes(q) ? '' : 'none';
        });
      };
    }
    $('#add-customer').onclick = () => addPartyForm('customer');
    $('#add-supplier').onclick = () => addPartyForm('supplier');
    $('#route-btn').onclick = routeModal;
    $$('[data-shopfilter]', view).forEach((b) => {
      b.onclick = () => {
        state.shopFilter = b.dataset.shopfilter;
        render();
      };
    });
    $$('.row-tap', view).forEach((el) => {
      el.onclick = () => {
        const kind = el.dataset.editKind;
        const list = kind === 'customer' ? state.customers : state.suppliers;
        const p = list.find((x) => String(x.id) === el.dataset.editId);
        if (p) partyForm(kind, p);
      };
    });
    $$('.shop-toggle', view).forEach((el) => {
      el.onclick = () => toggleShopHistory(el.dataset.shopId);
    });
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

  if (state.tab === 'stock') {
    const s = $('#stock-load');
    if (s) s.onclick = importStockForm;
    const search = $('#stock-search');
    if (search) {
      search.oninput = () => {
        const q = search.value.trim().toLowerCase();
        $$('.item-group', view).forEach((g) => {
          let anyShown = false;
          $$('.stock-row', g).forEach((row) => {
            const hit = !q || row.textContent.toLowerCase().includes(q);
            row.style.display = hit ? '' : 'none';
            if (hit) anyShown = true;
          });
          g.style.display = anyShown ? '' : 'none';
        });
      };
    }
    $$('.stock-row', view).forEach((row) => {
      row.onclick = () => {
        const r = (state.stock || []).find((x) => String(x.product_id) === row.dataset.pid);
        if (r) setStockForm(r);
      };
    });
  }

  if (state.tab === 'report') {
    $('#report-month').onchange = (e) => {
      state.reportMonth = e.target.value;
      render();
    };
    const unpricedToggle = $('#unpriced-toggle');
    if (unpricedToggle) {
      unpricedToggle.onclick = () => {
        const detail = $('#unpriced-detail');
        const chev = $('#unpriced-chev');
        const open = detail.classList.toggle('hidden');
        if (chev) chev.textContent = open ? '▸' : '▾';
      };
    }
    $$('.unpriced-add', view).forEach((b) => {
      b.onclick = () => productForm(null, b.dataset.name);
    });
    $('#export-csv').onclick = exportCsv;
    const dl = $('#daylog-date');
    if (dl) dl.onchange = (e) => { state.daylogDate = e.target.value; render(); };
    const dr = $('#daylog-route');
    if (dr) dr.onclick = async () => {
      const daylog = state.lastDaylog || (await api(`/api/daylog?date=${state.daylogDate}`));
      const seen = new Set();
      const stops = daylog.stops.filter((st) => {
        if (st.lat == null || st.lng == null) return false;
        const k = st.lat + ',' + st.lng;
        if (seen.has(k)) return false;
        seen.add(k);
        return true;
      });
      if (stops.length < 2) return toast('Need at least 2 located stops', false);
      window.open('https://www.google.com/maps/dir/' + stops.map((st) => `${st.lat},${st.lng}`).join('/'), '_blank');
    };
  }
}

const viewKey = () => [state.tab, state.reportMonth, state.entriesKind, state.daylogDate, state.shopFilter].join('|');

async function render() {
  const view = $('#view');
  const key = viewKey();
  const cached = viewCache[key];
  if (cached) {
    // instant paint of the last-known screen so tapping feels immediate
    view.innerHTML = cached;
    wireView();
  } else {
    view.innerHTML = '<div class="loading">Loading…</div>';
  }
  try {
    const html =
      state.tab === 'home' ? await viewHome()
      : state.tab === 'entries' ? await viewEntries()
      : state.tab === 'parties' ? await viewParties()
      : state.tab === 'stock' ? await viewStock()
      : await viewReport();
    viewCache[key] = html;
    // only repaint if we're still on the same screen (user may have moved on)
    if (viewKey() === key) {
      view.innerHTML = html;
      wireView();
    }
  } catch (err) {
    if (!cached) {
      view.innerHTML = `<div class="empty">⚠️ ${esc(err.message)}<br/><button class="btn-small" onclick="render()">Retry</button></div>`;
    }
  }
}

/* ---------- auth screens ---------- */

function setAuthedChrome(authed) {
  document.body.classList.toggle('noauth', !authed);
  $('#account-btn').classList.toggle('hidden', !authed);
  $('#fab').classList.toggle('hidden', !authed);
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
      <button type="button" class="btn-small" id="forgot-btn" style="margin-top:10px">Forgot password?</button>
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
  const forgot = $('#forgot-btn');
  if (forgot) forgot.onclick = showResetScreen;
  addEyeToggles(view);
  const first = $('#auth-form input');
  if (first) first.focus();
}

function showResetScreen() {
  setAuthedChrome(false);
  const view = $('#view');
  view.innerHTML = `
    <section class="card auth-card">
      <h2>Reset password</h2>
      <p class="hint">Enter your username and the recovery code you saved, then choose a new password.
      (No recovery code? Log in and get one from the 👤 Account menu.)</p>
      <form id="reset-form">
        <label>Username <input name="username" required autocapitalize="none" autocomplete="username" /></label>
        <label>Recovery code <input name="code" required placeholder="SS-XXXX-XXXX" autocapitalize="characters" autocomplete="off" /></label>
        <label>New password <input type="password" name="password" required minlength="6" autocomplete="new-password" placeholder="Minimum 6 characters" /></label>
        <label>Repeat new password <input type="password" name="password2" required autocomplete="new-password" /></label>
        <button type="submit" class="btn-primary">Set new password</button>
      </form>
      <button type="button" class="btn-small" id="back-login" style="margin-top:10px">← Back to login</button>
    </section>`;
  addEyeToggles(view);
  $('#back-login').onclick = () => showAuthScreen(false);
  $('#reset-form').onsubmit = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const btn = $('button[type="submit"]', e.target);
    btn.disabled = true;
    try {
      if (fd.get('password') !== fd.get('password2')) throw new Error('Passwords do not match');
      await api('/api/auth/reset', {
        method: 'POST',
        body: JSON.stringify({
          username: fd.get('username'),
          code: fd.get('code'),
          password: fd.get('password'),
        }),
      });
      toast('Password reset — please log in with your new password ✓');
      showAuthScreen(false);
    } catch (err) {
      toast(err.message, false);
      btn.disabled = false;
    }
  };
  const first = $('#reset-form input');
  if (first) first.focus();
}

function accountModal() {
  openModal(
    'Account',
    `
    <div class="account-info">Logged in as <b>${esc(state.user.name || state.user.username)}</b> (${esc(state.user.username)})</div>
    <button type="button" class="btn-small" id="payment-settings-btn">&#128179; Payment QR &amp; UPI (shown on invoices)</button>
    <button type="button" class="btn-small" id="backup-btn">&#128190; Download backup (all data)</button>
    <button type="button" class="btn-small" id="recovery-btn">&#128273; Get a recovery code (for forgotten password)</button>
    <div class="hint" style="margin:2px 0 0">Your password is stored encrypted and can't be shown. Use the eye 👁 to see it as you type, or set a new one below.</div>
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
  $('#backup-btn').onclick = async () => {
    const btn = $('#backup-btn');
    btn.disabled = true;
    try {
      const data = await api('/api/export');
      downloadFile(`simple-serve-backup-${todayStr()}.json`, JSON.stringify(data, null, 2));
      toast('Backup downloaded ✓');
    } catch (e) {
      toast(e.message, false);
    }
    btn.disabled = false;
  };
  $('#recovery-btn').onclick = async () => {
    const btn = $('#recovery-btn');
    btn.disabled = true;
    try {
      const r = await api('/api/auth/recovery', { method: 'POST' });
      infoModal(
        '🔑 Your recovery code',
        `
        <div class="recovery-code">${esc(r.code)}</div>
        <div class="hint">Write this down or save it now — it's shown only once. If you ever forget your
        password, tap <b>"Forgot password?"</b> on the login screen and enter your username + this code to
        set a new password. Generating a new code replaces this one.</div>
        <button type="button" class="btn-small" id="copy-recovery">Copy code</button>`
      );
      const cp = $('#copy-recovery');
      if (cp)
        cp.onclick = async () => {
          try {
            await navigator.clipboard.writeText(r.code);
            toast('Copied ✓');
          } catch {
            toast('Copy not supported — write it down', false);
          }
        };
    } catch (e) {
      toast(e.message, false);
      btn.disabled = false;
    }
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
$('#fab').onclick = () => noteForm();

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
