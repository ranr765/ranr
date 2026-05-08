// Cricket selection client app

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));

const fmtDate = (d) => {
  if (!d) return '';
  const dt = new Date(d + 'T00:00:00');
  return dt.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
};
const fmtTime = (t) => {
  if (!t) return '';
  const [h, m] = t.split(':').map(Number);
  const d = new Date();
  d.setHours(h, m || 0);
  return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
};

async function api(path, opts = {}) {
  const res = await fetch(path, {
    headers: { 'Content-Type': 'application/json' },
    ...opts,
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || res.statusText);
  return data;
}

// ----- Home: list of matches -----

async function renderHome() {
  const list = $('#match-list');
  if (!list) return;
  try {
    const matches = await api('/api/matches');
    if (!matches.length) {
      list.innerHTML = `<p class="empty">No matches yet. Click <strong>New match</strong> to start.</p>`;
      return;
    }
    list.innerHTML = matches
      .map((m) => `
        <a class="match-card" href="/m/${m.id}">
          <div class="match-card-main">
            <div class="match-card-name">${esc(m.name)}</div>
            <div class="match-card-meta">
              <span class="pill">${esc(m.match_type)}</span>
              <span>${fmtDate(m.match_date)}</span>
              <span>${fmtTime(m.match_time)}</span>
            </div>
          </div>
          <div class="match-card-stats">
            <div><strong>${m.voted_count ?? 0}</strong>/4 voted</div>
            <div class="muted">${m.player_count ?? 0} players · XI of ${m.team_size}</div>
          </div>
        </a>
      `)
      .join('');
  } catch (e) {
    list.innerHTML = `<p class="error">Could not load matches: ${esc(e.message)}</p>`;
  }
}

function bindNewMatchDialog() {
  const btn = $('#new-match-btn');
  const dialog = $('#new-match-dialog');
  const form = $('#new-match-form');
  if (!btn || !dialog || !form) return;

  btn.addEventListener('click', () => dialog.showModal());
  form.addEventListener('submit', async (e) => {
    if (e.submitter && e.submitter.value !== 'ok') return;
    e.preventDefault();
    const fd = new FormData(form);
    const copy = fd.get('copy') === 'on';
    let copyFrom;
    if (copy) {
      const matches = await api('/api/matches').catch(() => []);
      copyFrom = matches[matches.length - 1]?.id;
    }
    try {
      const created = await api('/api/matches', {
        method: 'POST',
        body: {
          name: fd.get('name'),
          match_date: fd.get('match_date'),
          match_time: fd.get('match_time'),
          match_type: fd.get('match_type') || 'T20',
          team_size: Number(fd.get('team_size')) || 11,
          copy_players_from: copyFrom,
        },
      });
      dialog.close();
      location.href = `/m/${created.id}`;
    } catch (err) {
      alert('Could not create match: ' + err.message);
    }
  });
}

// ----- Match page -----

let state = null; // { match, players, voters, votes }
let activeVoterId = null;

async function loadState(matchId) {
  state = await api(`/api/matches/${matchId}/state`);
  const stored = Number(localStorage.getItem(`cvz:active:${matchId}`));
  if (stored && state.voters.some((v) => v.id === stored)) {
    activeVoterId = stored;
  } else {
    activeVoterId = state.voters[0]?.id ?? null;
  }
}

function tally() {
  const counts = new Map(state.players.map((p) => [p.id, 0]));
  for (const v of state.votes) counts.set(v.player_id, (counts.get(v.player_id) ?? 0) + 1);
  const ranked = state.players
    .map((p) => ({ ...p, votes: counts.get(p.id) ?? 0 }))
    .sort((a, b) => b.votes - a.votes || a.sort_order - b.sort_order || a.name.localeCompare(b.name));
  return ranked;
}

function votedSet(voterId) {
  return new Set(state.votes.filter((v) => v.voter_id === voterId).map((v) => v.player_id));
}

function renderMatch() {
  const root = $('#match-root');
  if (!root || !state) return;
  const m = state.match;
  const ranked = tally();
  const teamSize = m.team_size;
  const cutoff = ranked[teamSize - 1]?.votes ?? 0;
  const inTeam = (p, idx) => idx < teamSize && p.votes > 0;
  const voted = votedSet(activeVoterId);
  const votersDone = new Set(state.votes.map((v) => v.voter_id));

  root.innerHTML = `
    <section class="match-header">
      <div>
        <h1 class="match-title" data-edit="match.name">${esc(m.name)}</h1>
        <div class="match-sub">
          <span class="pill">${esc(m.match_type)}</span>
          <span>${fmtDate(m.match_date)}</span>
          <span>${fmtTime(m.match_time)}</span>
          <span class="muted">·</span>
          <span>Pick ${teamSize} of ${state.players.length}</span>
        </div>
      </div>
      <div class="header-actions">
        <button class="btn" id="share-btn">Share link</button>
        <button class="btn" id="settings-btn">Match settings</button>
      </div>
    </section>

    <section class="card">
      <div class="card-header">
        <h2>Selectors</h2>
        <span class="muted">${votersDone.size}/4 voted</span>
      </div>
      <div class="voter-tabs" role="tablist">
        ${state.voters.map((v) => `
          <button class="voter-tab ${v.id === activeVoterId ? 'active' : ''} ${votersDone.has(v.id) ? 'done' : ''}"
                  data-voter-id="${v.id}" data-slot="${v.slot}">
            <span class="voter-tab-name" data-edit="voter.${v.slot}">${esc(v.name)}</span>
            ${votersDone.has(v.id) ? '<span class="check">✓</span>' : ''}
          </button>
        `).join('')}
      </div>
    </section>

    <section class="card">
      <div class="card-header">
        <h2>Vote as <span id="active-voter-name">${esc(state.voters.find((v) => v.id === activeVoterId)?.name ?? '')}</span></h2>
        <span class="muted"><span id="vote-count">${voted.size}</span> selected</span>
      </div>
      <ul class="player-list" id="player-list">
        ${state.players.map((p) => `
          <li>
            <label class="player-row">
              <input type="checkbox" data-player-id="${p.id}" ${voted.has(p.id) ? 'checked' : ''} />
              <span class="player-name" data-edit="player.${p.id}">${esc(p.name)}</span>
              <button class="icon-btn delete-player" data-player-id="${p.id}" title="Remove player">×</button>
            </label>
          </li>
        `).join('')}
      </ul>
      <form id="add-player-form" class="add-player">
        <input name="name" placeholder="Add player…" required />
        <button class="btn">Add</button>
      </form>
      <div class="vote-actions">
        <button class="btn primary" id="save-vote">Save votes</button>
        <button class="btn ghost" id="clear-vote">Clear my votes</button>
      </div>
    </section>

    <section class="card">
      <div class="card-header">
        <h2>Live tally</h2>
        <span class="muted">Top ${teamSize} make the XI</span>
      </div>
      <ol class="tally">
        ${ranked.map((p, idx) => {
          const picked = inTeam(p, idx);
          const onCutoff = p.votes === cutoff && p.votes > 0 && idx >= teamSize - 1;
          return `
            <li class="${picked ? 'in-team' : ''} ${onCutoff ? 'cutoff' : ''}">
              <span class="rank">${idx + 1}</span>
              <span class="name">${esc(p.name)}</span>
              <span class="bar"><span style="width:${p.votes * 25}%"></span></span>
              <span class="votes">${p.votes}</span>
            </li>
          `;
        }).join('')}
      </ol>
    </section>

    <dialog id="settings-dialog">
      <form method="dialog" id="settings-form">
        <h3>Match settings</h3>
        <label>Name<input name="name" value="${esc(m.name)}" required /></label>
        <label>Date<input name="match_date" type="date" value="${esc(m.match_date)}" required /></label>
        <label>Time<input name="match_time" type="time" value="${esc(m.match_time)}" required /></label>
        <label>Type<input name="match_type" value="${esc(m.match_type)}" /></label>
        <label>Team size<input name="team_size" type="number" min="1" max="20" value="${m.team_size}" /></label>
        <div class="dialog-actions">
          <button value="delete" class="btn danger" formnovalidate>Delete match</button>
          <span style="flex:1"></span>
          <button value="cancel" class="btn" formnovalidate>Cancel</button>
          <button value="ok" class="btn primary">Save</button>
        </div>
      </form>
    </dialog>
  `;

  bindMatchHandlers();
}

function bindMatchHandlers() {
  const matchId = state.match.id;

  // Voter tabs
  $$('.voter-tab').forEach((tab) => {
    tab.addEventListener('click', (e) => {
      if (e.target.closest('[data-edit]')) return;
      activeVoterId = Number(tab.dataset.voterId);
      localStorage.setItem(`cvz:active:${matchId}`, String(activeVoterId));
      renderMatch();
    });
  });

  // Inline edits via dblclick
  $$('[data-edit]').forEach((el) => {
    el.addEventListener('dblclick', () => beginEdit(el));
  });

  // Checkbox count
  const list = $('#player-list');
  list?.addEventListener('change', () => {
    const n = $$('#player-list input[type=checkbox]:checked').length;
    $('#vote-count').textContent = String(n);
  });

  // Add player
  $('#add-player-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const name = String(fd.get('name') || '').trim();
    if (!name) return;
    try {
      await api(`/api/matches/${matchId}/players`, { method: 'POST', body: { name } });
      await loadState(matchId);
      renderMatch();
    } catch (err) {
      alert('Could not add: ' + err.message);
    }
  });

  // Delete player
  $$('.delete-player').forEach((btn) => {
    btn.addEventListener('click', async (e) => {
      e.preventDefault();
      e.stopPropagation();
      const pid = btn.dataset.playerId;
      if (!confirm('Remove this player from the match?')) return;
      try {
        await api(`/api/matches/${matchId}/players/${pid}`, { method: 'DELETE' });
        await loadState(matchId);
        renderMatch();
      } catch (err) {
        alert('Could not remove: ' + err.message);
      }
    });
  });

  // Save vote
  $('#save-vote')?.addEventListener('click', async () => {
    const playerIds = $$('#player-list input[type=checkbox]:checked').map((cb) =>
      Number(cb.dataset.playerId)
    );
    try {
      await api(`/api/matches/${matchId}/votes`, {
        method: 'POST',
        body: { voter_id: activeVoterId, player_ids: playerIds },
      });
      await loadState(matchId);
      renderMatch();
    } catch (err) {
      alert('Could not save: ' + err.message);
    }
  });

  // Clear vote
  $('#clear-vote')?.addEventListener('click', async () => {
    if (!confirm('Clear your selections?')) return;
    try {
      await api(`/api/matches/${matchId}/votes`, {
        method: 'POST',
        body: { voter_id: activeVoterId, player_ids: [] },
      });
      await loadState(matchId);
      renderMatch();
    } catch (err) {
      alert('Could not clear: ' + err.message);
    }
  });

  // Share
  $('#share-btn')?.addEventListener('click', async () => {
    const url = location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title: state.match.name, url });
      } else {
        await navigator.clipboard.writeText(url);
        flash('Link copied to clipboard');
      }
    } catch {}
  });

  // Settings
  const settingsDialog = $('#settings-dialog');
  $('#settings-btn')?.addEventListener('click', () => settingsDialog.showModal());
  $('#settings-form')?.addEventListener('submit', async (e) => {
    const action = e.submitter?.value;
    if (action === 'cancel') return;
    if (action === 'delete') {
      e.preventDefault();
      if (!confirm('Delete this match and all its votes?')) return;
      await api(`/api/matches/${matchId}`, { method: 'DELETE' });
      location.href = '/';
      return;
    }
    if (action !== 'ok') return;
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    try {
      await api(`/api/matches/${matchId}`, {
        method: 'PUT',
        body: {
          name: fd.get('name'),
          match_date: fd.get('match_date'),
          match_time: fd.get('match_time'),
          match_type: fd.get('match_type') || 'T20',
          team_size: Number(fd.get('team_size')) || 11,
        },
      });
      settingsDialog.close();
      await loadState(matchId);
      renderMatch();
    } catch (err) {
      alert('Could not save: ' + err.message);
    }
  });
}

function beginEdit(el) {
  if (el.querySelector('input')) return;
  const original = el.textContent ?? '';
  const input = document.createElement('input');
  input.value = original;
  input.className = 'inline-edit';
  el.replaceChildren(input);
  input.focus();
  input.select();

  const finish = async (commit) => {
    const next = input.value.trim();
    if (!commit || !next || next === original) {
      el.textContent = original;
      return;
    }
    el.textContent = next;
    try {
      await applyEdit(el.dataset.edit, next);
      await loadState(state.match.id);
      renderMatch();
    } catch (err) {
      alert('Could not save: ' + err.message);
      el.textContent = original;
    }
  };
  input.addEventListener('blur', () => finish(true));
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); input.blur(); }
    if (e.key === 'Escape') { input.value = original; input.blur(); }
  });
}

async function applyEdit(key, value) {
  const matchId = state.match.id;
  if (key === 'match.name') {
    return api(`/api/matches/${matchId}`, { method: 'PUT', body: { name: value } });
  }
  if (key.startsWith('voter.')) {
    const slot = key.split('.')[1];
    return api(`/api/matches/${matchId}/voters/${slot}`, { method: 'PUT', body: { name: value } });
  }
  if (key.startsWith('player.')) {
    const pid = key.split('.')[1];
    return api(`/api/matches/${matchId}/players/${pid}`, { method: 'PUT', body: { name: value } });
  }
}

function flash(msg) {
  let el = $('#flash');
  if (!el) {
    el = document.createElement('div');
    el.id = 'flash';
    document.body.appendChild(el);
  }
  el.textContent = msg;
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 1800);
}

// ----- Boot -----

async function boot() {
  if ($('#match-list')) {
    bindNewMatchDialog();
    await renderHome();
    return;
  }
  const root = $('#match-root');
  if (root) {
    const matchId = root.dataset.matchId;
    try {
      await loadState(matchId);
      renderMatch();
    } catch (e) {
      root.innerHTML = `<p class="error">Could not load match: ${esc(e.message)}</p>`;
    }
  }
}

document.addEventListener('DOMContentLoaded', boot);
