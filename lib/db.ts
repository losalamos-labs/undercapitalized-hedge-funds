import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

export default pool;

export async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at BIGINT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS portfolios (
      id TEXT PRIMARY KEY,
      user_id TEXT REFERENCES users(id),
      name TEXT NOT NULL,
      cash DOUBLE PRECISION DEFAULT 100000,
      created_at BIGINT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS holdings (
      portfolio_id TEXT NOT NULL,
      symbol TEXT NOT NULL,
      asset_type TEXT NOT NULL,
      name TEXT,
      quantity DOUBLE PRECISION NOT NULL DEFAULT 0,
      avg_cost DOUBLE PRECISION NOT NULL DEFAULT 0,
      PRIMARY KEY (portfolio_id, symbol)
    );

    CREATE TABLE IF NOT EXISTS transactions (
      id TEXT PRIMARY KEY,
      portfolio_id TEXT NOT NULL,
      symbol TEXT NOT NULL,
      asset_type TEXT NOT NULL,
      name TEXT,
      action TEXT NOT NULL,
      quantity DOUBLE PRECISION NOT NULL,
      price DOUBLE PRECISION NOT NULL,
      total DOUBLE PRECISION NOT NULL,
      timestamp BIGINT NOT NULL
    );
  `);
}
