import express from 'express';
import { randomBytes } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { TaskStore } from './task-store.js';
import { ClaudeRunner } from './claude-runner.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3456;
const DATA_DIR = join(__dirname, 'data');
const TOKEN_FILE = join(DATA_DIR, 'auth-token');

// Generate or load auth token
mkdirSync(DATA_DIR, { recursive: true });
let AUTH_TOKEN = process.env.AGENT_API_KEY || '';
if (!AUTH_TOKEN) {
  if (existsSync(TOKEN_FILE)) {
    AUTH_TOKEN = readFileSync(TOKEN_FILE, 'utf-8').trim();
  } else {
    AUTH_TOKEN = randomBytes(24).toString('base64url');
    writeFileSync(TOKEN_FILE, AUTH_TOKEN, { mode: 0o600 });
  }
}

const app = express();
const store = new TaskStore();
const runner = new ClaudeRunner();

app.use(express.json());
app.use(express.static(join(__dirname, 'public')));

// Auth middleware — all /api routes except /api/auth/verify require token
function auth(req, res, next) {
  const key = req.headers['x-api-key'] || req.query.key;
  if (key !== AUTH_TOKEN) return res.status(401).json({ error: 'Unauthorized' });
  next();
}

// Verify token (public endpoint — used by login screen)
app.post('/api/auth/verify', (req, res) => {
  const { token } = req.body || {};
  if (token === AUTH_TOKEN) {
    res.json({ ok: true });
  } else {
    res.status(401).json({ ok: false, error: 'Invalid token' });
  }
});

// ── API Routes ──────────────────────────────────────────

// Submit a new task
app.post('/api/tasks', auth, (req, res) => {
  const { prompt, projectDir, allowedTools } = req.body;
  if (!prompt) return res.status(400).json({ error: 'prompt is required' });

  const task = store.create({ prompt, projectDir, allowedTools });
  processQueue(); // Kick off processing
  res.status(201).json(task);
});

// List tasks
app.get('/api/tasks', auth, (req, res) => {
  const { status, limit } = req.query;
  const tasks = store.list({ status, limit: limit ? parseInt(limit) : undefined });
  res.json(tasks);
});

// Get single task
app.get('/api/tasks/:id', auth, (req, res) => {
  const task = store.get(req.params.id);
  if (!task) return res.status(404).json({ error: 'Task not found' });
  res.json(task);
});

// Abort running task
app.post('/api/tasks/:id/abort', auth, (req, res) => {
  const task = store.get(req.params.id);
  if (!task) return res.status(404).json({ error: 'Task not found' });

  if (task.status === 'running') {
    runner.abort();
    store.update(task.id, { status: 'aborted', completedAt: new Date().toISOString() });
    res.json({ message: 'Task aborted', task: store.get(task.id) });
  } else if (task.status === 'queued') {
    store.update(task.id, { status: 'aborted', completedAt: new Date().toISOString() });
    res.json({ message: 'Task removed from queue', task: store.get(task.id) });
  } else {
    res.status(400).json({ error: `Cannot abort task in ${task.status} state` });
  }
});

// Delete a task
app.delete('/api/tasks/:id', auth, (req, res) => {
  const task = store.get(req.params.id);
  if (!task) return res.status(404).json({ error: 'Task not found' });
  if (task.status === 'running') return res.status(400).json({ error: 'Cannot delete running task' });
  store.delete(req.params.id);
  res.json({ message: 'Deleted' });
});

// Agent status
app.get('/api/status', auth, (req, res) => {
  res.json({
    running: runner.isRunning(),
    currentTaskId: runner.currentTaskId,
    queued: store.list({ status: 'queued' }).length,
    completed: store.list({ status: 'completed' }).length,
    failed: store.list({ status: 'failed' }).length,
    uptime: process.uptime(),
  });
});

// ── Task Queue Processor ────────────────────────────────

let processing = false;

async function processQueue() {
  if (processing || runner.isRunning()) return;
  processing = true;

  try {
    while (true) {
      const task = store.nextQueued();
      if (!task) break;

      store.update(task.id, { status: 'running', startedAt: new Date().toISOString() });
      console.log(`▶ Running task ${task.id}: ${task.prompt.slice(0, 80)}...`);

      try {
        const result = await runner.run(task.id, {
          prompt: task.prompt,
          projectDir: task.projectDir,
          allowedTools: task.allowedTools,
        });
        store.update(task.id, {
          status: 'completed',
          output: result.output,
          completedAt: new Date().toISOString(),
        });
        console.log(`✓ Task ${task.id} completed`);
      } catch (err) {
        store.update(task.id, {
          status: 'failed',
          output: err.message,
          completedAt: new Date().toISOString(),
        });
        console.error(`✗ Task ${task.id} failed: ${err.message.slice(0, 200)}`);
      }
    }
  } finally {
    processing = false;
  }
}

// Stream output to task store
runner.on('output', ({ taskId, text }) => {
  store.appendOutput(taskId, text);
});

// ── Dashboard (serves index.html) ──────────────────────

app.get('/', (req, res) => {
  res.sendFile(join(__dirname, 'public', 'index.html'));
});

// ── Start ───────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`
┌─────────────────────────────────────────┐
│  Mac Mini Agent Wrapper                 │
│  http://localhost:${PORT}                  │
│                                         │
│  Dashboard: http://localhost:${PORT}       │
│  API:       http://localhost:${PORT}/api   │
│                                         │
│  Auth token (enter on first login):     │
│  ${AUTH_TOKEN}  │
│                                         │
│  Token saved to: data/auth-token        │
│                                         │
│  To expose remotely:                    │
│  cloudflared tunnel --url localhost:${PORT}│
└─────────────────────────────────────────┘
  `);

  // Process any queued tasks from previous runs
  processQueue();
});
