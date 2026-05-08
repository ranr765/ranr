import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { serveStatic } from 'hono/cloudflare-workers'

type Bindings = { DB: D1Database }

const app = new Hono<{ Bindings: Bindings }>()

app.use('/api/*', cors())
app.use('/static/*', serveStatic({ root: './public' }))

// ----- API: matches -----

app.get('/api/matches', async (c) => {
  const { results } = await c.env.DB.prepare(
    `SELECT m.*,
       (SELECT COUNT(*) FROM players WHERE match_id = m.id) AS player_count,
       (SELECT COUNT(DISTINCT voter_id) FROM votes WHERE match_id = m.id) AS voted_count
     FROM matches m
     ORDER BY m.match_date, m.match_time, m.id`
  ).all()
  return c.json(results)
})

app.post('/api/matches', async (c) => {
  const body = await c.req.json<{
    name: string
    match_date: string
    match_time: string
    match_type?: string
    team_size?: number
    copy_players_from?: number
  }>()
  if (!body.name?.trim() || !body.match_date || !body.match_time) {
    return c.json({ error: 'name, match_date, match_time required' }, 400)
  }
  const db = c.env.DB
  const inserted = await db.prepare(
    `INSERT INTO matches (name, match_date, match_time, match_type, team_size)
     VALUES (?, ?, ?, ?, ?) RETURNING id`
  ).bind(
    body.name.trim(),
    body.match_date,
    body.match_time,
    body.match_type ?? 'T20',
    body.team_size ?? 11
  ).first<{ id: number }>()
  if (!inserted) return c.json({ error: 'insert failed' }, 500)

  const stmts: D1PreparedStatement[] = []
  for (let s = 1; s <= 4; s++) {
    stmts.push(
      db.prepare('INSERT INTO voters (match_id, slot, name) VALUES (?, ?, ?)')
        .bind(inserted.id, s, `Selector ${s}`)
    )
  }
  if (body.copy_players_from) {
    const { results } = await db.prepare(
      'SELECT name, sort_order FROM players WHERE match_id = ? ORDER BY sort_order, id'
    ).bind(body.copy_players_from).all<{ name: string; sort_order: number }>()
    for (const p of results) {
      stmts.push(
        db.prepare('INSERT INTO players (match_id, name, sort_order) VALUES (?, ?, ?)')
          .bind(inserted.id, p.name, p.sort_order)
      )
    }
  }
  if (stmts.length) await db.batch(stmts)

  return c.json({ id: inserted.id })
})

app.put('/api/matches/:id', async (c) => {
  const id = c.req.param('id')
  const body = await c.req.json<{
    name?: string
    match_date?: string
    match_time?: string
    match_type?: string
    team_size?: number
    finalized?: number
  }>()
  const fields: string[] = []
  const values: (string | number)[] = []
  for (const k of ['name', 'match_date', 'match_time', 'match_type', 'team_size', 'finalized'] as const) {
    const v = body[k]
    if (v !== undefined) {
      fields.push(`${k} = ?`)
      values.push(v as string | number)
    }
  }
  if (!fields.length) return c.json({ ok: true })
  values.push(id)
  await c.env.DB.prepare(`UPDATE matches SET ${fields.join(', ')} WHERE id = ?`).bind(...values).run()
  return c.json({ ok: true })
})

app.delete('/api/matches/:id', async (c) => {
  await c.env.DB.prepare('DELETE FROM matches WHERE id = ?').bind(c.req.param('id')).run()
  return c.json({ ok: true })
})

// ----- API: full state for one match -----

app.get('/api/matches/:id/state', async (c) => {
  const id = c.req.param('id')
  const db = c.env.DB
  const match = await db.prepare('SELECT * FROM matches WHERE id = ?').bind(id).first()
  if (!match) return c.json({ error: 'not found' }, 404)
  const [{ results: players }, { results: voters }, { results: votes }] = await Promise.all([
    db.prepare('SELECT id, name, sort_order FROM players WHERE match_id = ? ORDER BY sort_order, id').bind(id).all(),
    db.prepare('SELECT id, slot, name FROM voters WHERE match_id = ? ORDER BY slot').bind(id).all(),
    db.prepare('SELECT voter_id, player_id FROM votes WHERE match_id = ?').bind(id).all(),
  ])
  return c.json({ match, players, voters, votes })
})

// ----- API: players -----

app.post('/api/matches/:id/players', async (c) => {
  const id = c.req.param('id')
  const { name } = await c.req.json<{ name: string }>()
  if (!name?.trim()) return c.json({ error: 'name required' }, 400)
  const max = await c.env.DB.prepare(
    'SELECT COALESCE(MAX(sort_order), 0) AS m FROM players WHERE match_id = ?'
  ).bind(id).first<{ m: number }>()
  try {
    const row = await c.env.DB.prepare(
      'INSERT INTO players (match_id, name, sort_order) VALUES (?, ?, ?) RETURNING id'
    ).bind(id, name.trim(), (max?.m ?? 0) + 1).first<{ id: number }>()
    return c.json({ id: row?.id })
  } catch {
    return c.json({ error: 'duplicate name' }, 400)
  }
})

app.put('/api/matches/:id/players/:pid', async (c) => {
  const { id, pid } = c.req.param()
  const { name } = await c.req.json<{ name: string }>()
  if (!name?.trim()) return c.json({ error: 'name required' }, 400)
  try {
    await c.env.DB.prepare(
      'UPDATE players SET name = ? WHERE id = ? AND match_id = ?'
    ).bind(name.trim(), pid, id).run()
    return c.json({ ok: true })
  } catch {
    return c.json({ error: 'duplicate name' }, 400)
  }
})

app.delete('/api/matches/:id/players/:pid', async (c) => {
  const { id, pid } = c.req.param()
  await c.env.DB.prepare(
    'DELETE FROM players WHERE id = ? AND match_id = ?'
  ).bind(pid, id).run()
  return c.json({ ok: true })
})

// ----- API: voters -----

app.put('/api/matches/:id/voters/:slot', async (c) => {
  const { id, slot } = c.req.param()
  const { name } = await c.req.json<{ name: string }>()
  if (!name?.trim()) return c.json({ error: 'name required' }, 400)
  await c.env.DB.prepare(
    'UPDATE voters SET name = ? WHERE match_id = ? AND slot = ?'
  ).bind(name.trim(), id, slot).run()
  return c.json({ ok: true })
})

// ----- API: votes -----

// Replace a voter's selections in one go.
app.post('/api/matches/:id/votes', async (c) => {
  const id = c.req.param('id')
  const { voter_id, player_ids } = await c.req.json<{ voter_id: number; player_ids: number[] }>()
  if (!voter_id || !Array.isArray(player_ids)) {
    return c.json({ error: 'voter_id and player_ids required' }, 400)
  }
  const db = c.env.DB
  const owns = await db.prepare(
    'SELECT 1 FROM voters WHERE id = ? AND match_id = ?'
  ).bind(voter_id, id).first()
  if (!owns) return c.json({ error: 'voter not in match' }, 400)

  const stmts: D1PreparedStatement[] = [
    db.prepare('DELETE FROM votes WHERE voter_id = ?').bind(voter_id),
  ]
  for (const pid of player_ids) {
    stmts.push(
      db.prepare(
        'INSERT INTO votes (match_id, voter_id, player_id) VALUES (?, ?, ?)'
      ).bind(id, voter_id, pid)
    )
  }
  await db.batch(stmts)
  return c.json({ ok: true })
})

// ----- HTML pages -----

const layout = (title: string, body: string) => `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>${title}</title>
  <link rel="stylesheet" href="/static/style.css" />
</head>
<body>
  <header class="topbar">
    <a class="brand" href="/">
      <span class="ball"></span>
      <span>CVZ Cricket Selection</span>
    </a>
    <nav><a href="/">Matches</a></nav>
  </header>
  <main>${body}</main>
  <footer>Built for the CVZ crew · 4-selector voting</footer>
  <script src="/static/app.js" defer></script>
</body>
</html>`

app.get('/', (c) => c.html(layout('CVZ Cricket Selection', `
  <section class="hero">
    <h1>Pick the playing XI, together.</h1>
    <p>Each match has four selectors. Tick the players you want in. The top vote-getters make the team.</p>
  </section>
  <section class="card">
    <div class="card-header">
      <h2>Matches</h2>
      <button id="new-match-btn" class="btn primary">+ New match</button>
    </div>
    <div id="match-list" class="match-list">Loading…</div>
  </section>
  <dialog id="new-match-dialog">
    <form method="dialog" id="new-match-form">
      <h3>New match</h3>
      <label>Name<input name="name" required placeholder="Sunday League Final" /></label>
      <label>Date<input name="match_date" type="date" required /></label>
      <label>Time<input name="match_time" type="time" required /></label>
      <label>Type<input name="match_type" value="T20" /></label>
      <label>Team size<input name="team_size" type="number" min="1" max="20" value="11" /></label>
      <label class="checkbox"><input type="checkbox" name="copy" checked /> Copy players from latest match</label>
      <div class="dialog-actions">
        <button value="cancel" class="btn" formnovalidate>Cancel</button>
        <button value="ok" class="btn primary">Create</button>
      </div>
    </form>
  </dialog>
`)))

app.get('/m/:id', (c) => {
  const id = c.req.param('id')
  return c.html(layout('Match · CVZ Cricket', `
    <div data-match-id="${id}" id="match-root">Loading…</div>
  `))
})

export default app
