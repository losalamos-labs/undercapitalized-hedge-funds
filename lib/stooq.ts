/**
 * Market data via Yahoo Finance (yahoo-finance2).
 * This module kept its original name for backwards compatibility — the functions
 * are drop-in replacements for the old Stooq-backed versions.
 */
import yahooFinance from '@/lib/yf';
import { ChartPoint } from '@/lib/types';

/**
 * Validates and normalises a symbol for Yahoo Finance.
 * Accepts all standard Yahoo Finance formats:
 *   - US stocks/ETFs: AAPL, SPY, QQQ
 *   - Futures/Commodities: GC=F, CL=F, NG=F, ZW=F, SI=F
 *   - Forex: EURUSD=X, GBPUSD=X, USDJPY=X
 *   - Global stocks: 7203.T, HSBA.L, VOW3.DE, RELIANCE.NS
 *   - Options: AAPL260117C00300000
 */
export function toStooqSymbol(symbol: string): string | null {
  const raw = symbol.trim().toUpperCase();
  if (!raw) return null;
  // Yahoo Finance symbols: letters, digits, dots, dashes, equals, caret — max 30 chars
  if (/^[A-Z0-9.=\-^]{1,30}$/.test(raw)) return raw;
  return null;
}

export interface StooqQuote {
  date: string;
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number | null;
  name: string;
}

export async function fetchStooqQuote(symbol: string): Promise<StooqQuote> {
  const q = await yahooFinance.quote(symbol, undefined, { validateResult: false });
  const price = q.regularMarketPrice;
  if (!price) throw new Error(`No price available for ${symbol}`);
  return {
    date: new Date().toISOString().split('T')[0],
    time: new Date().toTimeString().split(' ')[0],
    open: q.regularMarketOpen ?? price,
    high: q.regularMarketDayHigh ?? price,
    low: q.regularMarketDayLow ?? price,
    close: price,
    volume: q.regularMarketVolume ?? null,
    name: q.shortName || q.longName || symbol,
  };
}

export async function fetchStooqDailyHistory(symbol: string): Promise<ChartPoint[]> {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setFullYear(startDate.getFullYear() - 2);

  // yahoo-finance2's historical() maps to chart() internally
  const historical = await yahooFinance.historical(
    symbol,
    {
      period1: startDate.toISOString().split('T')[0],
      period2: endDate.toISOString().split('T')[0],
      interval: '1d',
    },
    { validateResult: false }
  );

  return historical
    .map((item: { date: Date; close?: number | null }) => ({
      date: new Date(item.date).toISOString(),
      close: item.close ?? 0,
    }))
    .filter((p: ChartPoint) => p.close > 0);
}
