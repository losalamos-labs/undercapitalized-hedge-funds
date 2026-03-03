import { ChartPoint } from '@/lib/types';

/**
 * Stooq is a simple, unauthenticated CSV data source that tends to work in
 * restricted hosting environments where Yahoo endpoints may fail.
 */

export function toStooqSymbol(symbol: string): string | null {
  const raw = symbol.trim();
  if (!raw) return null;

  // If the user already provided a Stooq-style symbol, keep it.
  if (raw.includes('.')) return raw.toLowerCase();

  // Basic US ticker support: AAPL -> aapl.us
  if (/^[A-Za-z]{1,10}$/.test(raw)) return `${raw.toLowerCase()}.us`;

  return null;
}

export async function fetchStooqQuote(stooqSymbol: string) {
  const url = `https://stooq.com/q/l/?s=${encodeURIComponent(stooqSymbol)}&f=sd2t2ohlcv&h&e=csv`;
  const resp = await fetch(url, { signal: AbortSignal.timeout(8000) });
  if (!resp.ok) throw new Error(`Stooq quote fetch failed: ${resp.status}`);
  const text = (await resp.text()).trim();
  const lines = text.split(/\r?\n/);
  if (lines.length < 2) throw new Error('Stooq quote returned no data');

  const row = lines[1].split(',');
  // Symbol,Date,Time,Open,High,Low,Close,Volume
  const date = row[1];
  const time = row[2];
  const open = Number(row[3]);
  const high = Number(row[4]);
  const low = Number(row[5]);
  const close = Number(row[6]);
  const volume = row[7] ? Number(row[7]) : null;

  if (!Number.isFinite(close)) throw new Error('Stooq quote missing close price');

  return { date, time, open, high, low, close, volume };
}

export async function fetchStooqDailyHistory(stooqSymbol: string): Promise<ChartPoint[]> {
  const url = `https://stooq.com/q/d/l/?s=${encodeURIComponent(stooqSymbol)}&i=d`;
  const resp = await fetch(url, { signal: AbortSignal.timeout(12000) });
  if (!resp.ok) throw new Error(`Stooq history fetch failed: ${resp.status}`);
  const text = (await resp.text()).trim();
  const lines = text.split(/\r?\n/);
  // Date,Open,High,Low,Close,Volume
  const points: ChartPoint[] = [];
  for (let i = 1; i < lines.length; i++) {
    const row = lines[i].split(',');
    if (row.length < 5) continue;
    const date = row[0];
    const close = Number(row[4]);
    if (!date || !Number.isFinite(close)) continue;
    points.push({ date: new Date(date).toISOString(), close });
  }
  return points;
}
