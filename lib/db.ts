import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const DB_PATH = path.join(process.cwd(), 'data', 'positions.db');

let db: Database.Database | null = null;

function getDb(): Database.Database {
  if (!db) {
    const dir = path.dirname(DB_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    initSchema(db);
  }
  return db;
}

function initSchema(database: Database.Database) {
  database.exec(`
    CREATE TABLE IF NOT EXISTS positions (
      id TEXT PRIMARY KEY,
      token TEXT NOT NULL,
      amount REAL NOT NULL,
      entry_price REAL NOT NULL,
      entry_usdcx REAL NOT NULL,
      entry_txid TEXT,
      entry_date TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'open',
      sold_amount REAL NOT NULL DEFAULT 0,
      sold_usdcx REAL NOT NULL DEFAULT 0,
      last_alert_price REAL,
      last_alert_date TEXT
    );

    CREATE TABLE IF NOT EXISTS trades (
      id TEXT PRIMARY KEY,
      position_id TEXT REFERENCES positions(id),
      type TEXT NOT NULL CHECK(type IN ('buy', 'sell')),
      token TEXT NOT NULL,
      amount REAL NOT NULL,
      price REAL NOT NULL,
      usdcx REAL NOT NULL,
      txid TEXT,
      date TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS config (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);
}

// ── Positions ──

export interface Position {
  id: string;
  token: string;
  amount: number;
  entry_price: number;
  entry_usdcx: number;
  entry_txid: string | null;
  entry_date: string;
  status: 'open' | 'closed' | 'partial';
  sold_amount: number;
  sold_usdcx: number;
  last_alert_price: number | null;
  last_alert_date: string | null;
}

export interface Trade {
  id: string;
  position_id: string | null;
  type: 'buy' | 'sell';
  token: string;
  amount: number;
  price: number;
  usdcx: number;
  txid: string | null;
  date: string;
}

export interface PositionSummary {
  totalInvested: number;
  totalSold: number;
  totalProfit: number;
  openPositions: number;
}

export function createPosition(pos: Omit<Position, 'last_alert_price' | 'last_alert_date'>): Position {
  const database = getDb();
  const stmt = database.prepare(`
    INSERT INTO positions (id, token, amount, entry_price, entry_usdcx, entry_txid, entry_date, status, sold_amount, sold_usdcx)
    VALUES (@id, @token, @amount, @entry_price, @entry_usdcx, @entry_txid, @entry_date, @status, @sold_amount, @sold_usdcx)
  `);
  stmt.run(pos);
  return getPosition(pos.id)!;
}

export function getPosition(id: string): Position | null {
  const database = getDb();
  return database.prepare('SELECT * FROM positions WHERE id = ?').get(id) as Position | null;
}

export function getOpenPositions(): Position[] {
  const database = getDb();
  return database.prepare("SELECT * FROM positions WHERE status != 'closed' ORDER BY entry_date DESC").all() as Position[];
}

export function getAllPositions(): Position[] {
  const database = getDb();
  return database.prepare('SELECT * FROM positions ORDER BY entry_date DESC').all() as Position[];
}

export function updatePosition(id: string, updates: Partial<Position>) {
  const database = getDb();
  const sets: string[] = [];
  const vals: Record<string, unknown> = { id };

  for (const [k, v] of Object.entries(updates)) {
    if (k === 'id') continue;
    sets.push(`${k} = @${k}`);
    vals[k] = v;
  }

  if (sets.length === 0) return;
  database.prepare(`UPDATE positions SET ${sets.join(', ')} WHERE id = @id`).run(vals);
}

export function recordAlert(id: string, alertPrice: number) {
  const database = getDb();
  database.prepare('UPDATE positions SET last_alert_price = ?, last_alert_date = ? WHERE id = ?')
    .run(alertPrice, new Date().toISOString(), id);
}

// ── Trades ──

export function createTrade(trade: Trade) {
  const database = getDb();
  database.prepare(`
    INSERT INTO trades (id, position_id, type, token, amount, price, usdcx, txid, date)
    VALUES (@id, @position_id, @type, @token, @amount, @price, @usdcx, @txid, @date)
  `).run(trade);
}

export function getTrades(limit = 50): Trade[] {
  const database = getDb();
  return database.prepare('SELECT * FROM trades ORDER BY date DESC LIMIT ?').all(limit) as Trade[];
}

export function getPositionTrades(positionId: string): Trade[] {
  const database = getDb();
  return database.prepare('SELECT * FROM trades WHERE position_id = ? ORDER BY date DESC').all(positionId) as Trade[];
}

// ── Summary ──

export function getSummary(): PositionSummary {
  const database = getDb();
  const row = database.prepare(`
    SELECT
      COALESCE(SUM(CASE WHEN type='buy' THEN usdcx ELSE 0 END), 0) as totalInvested,
      COALESCE(SUM(CASE WHEN type='sell' THEN usdcx ELSE 0 END), 0) as totalSold,
      COUNT(CASE WHEN status!='closed' THEN 1 END) as openPositions
    FROM positions
    LEFT JOIN trades ON trades.position_id = positions.id
  `).get() as { totalInvested: number; totalSold: number; openPositions: number };
  return {
    totalInvested: row.totalInvested,
    totalSold: row.totalSold,
    totalProfit: row.totalSold - row.totalInvested,
    openPositions: row.openPositions,
  };
}

// ── Config ──

export function getConfig(key: string): string | null {
  const database = getDb();
  const row = database.prepare('SELECT value FROM config WHERE key = ?').get(key) as { value: string } | undefined;
  return row?.value ?? null;
}

export function setConfig(key: string, value: string) {
  const database = getDb();
  database.prepare('INSERT OR REPLACE INTO config (key, value) VALUES (?, ?)').run(key, value);
}
