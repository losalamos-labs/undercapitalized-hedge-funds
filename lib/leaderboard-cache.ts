import pool, { ensureDb } from '@/lib/db';
import { getCached, setCached } from '@/lib/cache';
import { fetchStooqQuote, toStooqSymbol } from '@/lib/stooq';

export interface LeaderboardEntry {
  portfolioId: string;
  username: string;
  portfolioName: string;
  cash: number;
  totalValue: number;
  totalReturn: number;
  totalReturnPct: number;
}

export interface CachedLeaderboard {
  data: LeaderboardEntry[];
  fetchedAt: number;
}

const CACHE_KEY = 'leaderboard:live';
const CACHE_TTL = 15 * 60 * 1000; // 15 minutes

async function fetchPrice(symbol: string, assetType: string): Promise<number | null> {
  try {
    if (assetType === 'crypto') {
      const coinId = symbol.toLowerCase();
      const resp = await fetch(
        `https://api.coingecko.com/api/v3/coins/markets?ids=${coinId}&vs_currency=usd`,
        { signal: AbortSignal.timeout(8000) }
      );
      if (!resp.ok) return null;
      const data = await resp.json();
      return data?.[0]?.current_price ?? null;
    }

    const stooqSymbol = toStooqSymbol(symbol);
    if (!stooqSymbol) return null;
    const q = await fetchStooqQuote(stooqSymbol);
    return q.close ?? null;
  } catch {
    return null;
  }
}

export async function getLeaderboard(forceRefresh = false): Promise<CachedLeaderboard> {
  await ensureDb();
  if (!forceRefresh) {
    const cached = getCached<CachedLeaderboard>(CACHE_KEY);
    if (cached) return cached;
  }

  // Fetch all portfolios with their user info
  const portfoliosResult = await pool.query(`
    SELECT p.id, p.name, p.cash, p.user_id, p.created_at,
           COALESCE(u.username, p.name) as username
    FROM portfolios p
    LEFT JOIN users u ON p.user_id = u.id
    ORDER BY p.created_at ASC
  `);

  const portfolios = portfoliosResult.rows;

  // Fetch all holdings at once
  const holdingsResult = await pool.query(`
    SELECT portfolio_id, symbol, asset_type, quantity, avg_cost
    FROM holdings
    WHERE quantity > 0
  `);

  const holdingsByPortfolio = new Map<string, typeof holdingsResult.rows>();
  for (const h of holdingsResult.rows) {
    const list = holdingsByPortfolio.get(h.portfolio_id) || [];
    list.push(h);
    holdingsByPortfolio.set(h.portfolio_id, list);
  }

  // Collect all unique symbols to batch price fetches
  const symbolTypeMap = new Map<string, string>();
  for (const h of holdingsResult.rows) {
    symbolTypeMap.set(`${h.symbol}:${h.asset_type}`, h.asset_type);
  }

  // Fetch prices in parallel (with concurrency limit)
  const priceCache = new Map<string, number>();
  const symbolEntries = Array.from(symbolTypeMap.entries());
  
  // Batch in groups of 5 to avoid hammering APIs
  for (let i = 0; i < symbolEntries.length; i += 5) {
    const batch = symbolEntries.slice(i, i + 5);
    const results = await Promise.allSettled(
      batch.map(async ([key]) => {
        const [symbol, assetType] = key.split(':');
        const price = await fetchPrice(symbol, assetType);
        return { key, price };
      })
    );
    for (const result of results) {
      if (result.status === 'fulfilled' && result.value.price !== null) {
        priceCache.set(result.value.key, result.value.price);
      }
    }
  }

  const entries: LeaderboardEntry[] = portfolios.map((p) => {
    const holdings = holdingsByPortfolio.get(p.id) || [];
    let holdingsValue = 0;
    for (const h of holdings) {
      const key = `${h.symbol}:${h.asset_type}`;
      const price = priceCache.get(key) ?? h.avg_cost;
      holdingsValue += h.quantity * price;
    }
    const totalValue = p.cash + holdingsValue;
    const totalReturn = totalValue - 100000;
    const totalReturnPct = (totalReturn / 100000) * 100;

    return {
      portfolioId: p.id,
      username: p.username,
      portfolioName: p.name,
      cash: p.cash,
      totalValue,
      totalReturn,
      totalReturnPct,
    };
  });

  entries.sort((a, b) => b.totalReturnPct - a.totalReturnPct);

  const result: CachedLeaderboard = { data: entries, fetchedAt: Date.now() };
  setCached(CACHE_KEY, result, CACHE_TTL);
  return result;
}
