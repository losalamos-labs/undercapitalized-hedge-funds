import { Pool } from 'pg';

const connectionString = process.env.DATABASE_URL;
const isProd = process.env.NODE_ENV === 'production';

// Railway's internal Postgres (.railway.internal) does not use TLS;
// don't pass an ssl option at all so pg uses its defaults (no SSL).
// External connections in production use SSL with self-signed cert tolerance.
const isRailwayInternal = !!connectionString && connectionString.includes('.railway.internal');

const poolConfig: ConstructorParameters<typeof Pool>[0] = { connectionString };
if (isProd && !isRailwayInternal) {
  poolConfig.ssl = { rejectUnauthorized: false };
}

const pool = new Pool(poolConfig);

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

let ensurePromise: Promise<void> | null = null;

/**
 * Ensures required tables exist. Safe to call on every request.
 *
 * We intentionally do this lazily at runtime (instead of migrations) to keep the
 * demo app zero-setup.
 */
export async function ensureDb() {
  if (!ensurePromise) {
    ensurePromise = initDb().catch((err) => {
      ensurePromise = null;
      throw err;
    });
  }
  return ensurePromise;
}
