import { randomUUID } from 'node:crypto';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, 'data');
const STORE_FILE = join(DATA_DIR, 'tasks.json');

export class TaskStore {
  constructor() {
    this.tasks = new Map();
    mkdirSync(DATA_DIR, { recursive: true });
    this.load();
  }

  load() {
    try {
      if (existsSync(STORE_FILE)) {
        const data = JSON.parse(readFileSync(STORE_FILE, 'utf-8'));
        for (const task of data) {
          this.tasks.set(task.id, task);
        }
      }
    } catch {
      // Start fresh if corrupted
    }
  }

  save() {
    writeFileSync(STORE_FILE, JSON.stringify([...this.tasks.values()], null, 2));
  }

  create({ prompt, projectDir, allowedTools }) {
    const task = {
      id: randomUUID(),
      prompt,
      projectDir: projectDir || process.env.HOME,
      allowedTools: allowedTools || [],
      status: 'queued',
      output: '',
      createdAt: new Date().toISOString(),
      startedAt: null,
      completedAt: null,
    };
    this.tasks.set(task.id, task);
    this.save();
    return task;
  }

  get(id) {
    return this.tasks.get(id) || null;
  }

  list({ status, limit = 50 } = {}) {
    let items = [...this.tasks.values()].sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
    );
    if (status) {
      items = items.filter((t) => t.status === status);
    }
    return items.slice(0, limit);
  }

  update(id, updates) {
    const task = this.tasks.get(id);
    if (!task) return null;
    Object.assign(task, updates);
    this.save();
    return task;
  }

  nextQueued() {
    const queued = [...this.tasks.values()]
      .filter((t) => t.status === 'queued')
      .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    return queued[0] || null;
  }

  appendOutput(id, text) {
    const task = this.tasks.get(id);
    if (task) {
      task.output += text;
    }
  }

  delete(id) {
    this.tasks.delete(id);
    this.save();
  }
}
