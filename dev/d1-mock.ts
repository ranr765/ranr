/**
 * A D1 stand-in backed by node:sqlite, so the API can be exercised in plain
 * Node without wrangler or a network. Implements the slice of the D1 interface
 * the API actually uses: prepare/bind/first/all/run and batch.
 */
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';

type Row = Record<string, unknown>;

class MockStatement {
  db: DatabaseSync;
  sql: string;
  params: unknown[];

  constructor(db: DatabaseSync, sql: string, params: unknown[] = []) {
    this.db = db;
    this.sql = sql;
    this.params = params;
  }

  bind(...params: unknown[]): MockStatement {
    return new MockStatement(this.db, this.sql, params);
  }

  private normalised(): unknown[] {
    // node:sqlite rejects undefined and booleans; D1 accepts null and numbers.
    return this.params.map((p) => {
      if (p === undefined) return null;
      if (typeof p === 'boolean') return p ? 1 : 0;
      return p;
    });
  }

  async first<T = Row>(column?: string): Promise<T | null> {
    const row = this.db.prepare(this.sql).get(...this.normalised()) as Row | undefined;
    if (!row) return null;
    return (column ? (row[column] as T) : (row as T)) ?? null;
  }

  async all<T = Row>(): Promise<{ results: T[]; success: true }> {
    const rows = this.db.prepare(this.sql).all(...this.normalised()) as T[];
    return { results: rows, success: true };
  }

  async run(): Promise<{ success: true }> {
    this.db.prepare(this.sql).run(...this.normalised());
    return { success: true };
  }
}

export class MockD1 {
  db: DatabaseSync;

  constructor(schemaPath: string) {
    this.db = new DatabaseSync(':memory:');
    this.db.exec('PRAGMA foreign_keys = ON');
    this.db.exec(readFileSync(schemaPath, 'utf8'));
  }

  prepare(sql: string): MockStatement {
    return new MockStatement(this.db, sql);
  }

  async batch(statements: MockStatement[]): Promise<unknown[]> {
    this.db.exec('BEGIN');
    try {
      const out = [];
      for (const s of statements) out.push(await s.run());
      this.db.exec('COMMIT');
      return out;
    } catch (err) {
      this.db.exec('ROLLBACK');
      throw err;
    }
  }

  close() {
    this.db.close();
  }
}
