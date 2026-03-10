/**
 * Twelve Data API wrapper for stocks, ETFs, forex, and commodities.
 * Set TWELVEDATA_API_KEY in environment for full access.
 * Falls back to the demo key (limited to AAPL + EUR/USD) if not set.
 */

import { ChartPoint } from '@/lib/types';

const BASE = 'https://api.twelvedata.com';
const API_KEY = process.env.TWELVEDATA_API_KEY || 'demo';

// Twelve Data uses EUR/USD, XAU/USD format (not Yahoo's EURUSD=X, GC=F)
export function toTwelveSymbol(symbol: string, type: string): string {
  const s = symbol.toUpperCase();
  // Forex: convert EURUSD=X → EUR/USD
  if (type === 'forex' || s.endsWith('=X')) {
    const base = s.replace('=X', '');
    if (base.length === 6) return `${base.slice(0, 3)}/${base.slice(3)}`;
  }
  // Commodity futures: convert Yahoo futures (GC=F, CL=F, NG=F, SI=F) → Twelve Data equivalents
  const FUTURES_MAP: Record<string, string> = {
    'GC=F': 'XAU/USD',  // Gold
    'SI=F': 'XAG/USD',  // Silver
    'CL=F': 'WTI/USD',  // WTI Crude Oil
    'NG=F': 'XNG/USD',  // Natural Gas
    'ZW=F': 'WHEAT',    // Wheat
  };
  if (FUTURES_MAP[s]) return FUTURES_MAP[s];
  // Stocks, ETFs, options — use symbol as-is
  return s;
}

export interface TwelveQuote {
  close: number;
  open: number;
  high: number;
  low: number;
  volume: number | null;
  name: string;
  date: string;
  time: string;
}

export async function fetchTwelveQuote(symbol: string): Promise<TwelveQuote> {
  const url = `${BASE}/quote?symbol=${encodeURIComponent(symbol)}&apikey=${API_KEY}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
  if (!res.ok) throw new Error(`Twelve Data HTTP ${res.status} for ${symbol}`);
  const data = await res.json();
  if (data.status === 'error' || data.code) {
    throw new Error(data.message || `Twelve Data error for ${symbol}`);
  }
  const close = parseFloat(data.close);
  if (isNaN(close)) throw new Error(`No price from Twelve Data for ${symbol}`);
  return {
    close,
    open: parseFloat(data.open) || close,
    high: parseFloat(data.high) || close,
    low: parseFloat(data.low) || close,
    volume: data.volume ? parseInt(data.volume, 10) : null,
    name: data.name || symbol,
    date: data.datetime || new Date().toISOString().split('T')[0],
    time: new Date().toTimeString().split(' ')[0],
  };
}

export async function fetchTwelveDailyHistory(symbol: string): Promise<ChartPoint[]> {
  // 2 years of daily data = 730 data points (max per call is 5000 on free tier)
  const url =
    `${BASE}/time_series?symbol=${encodeURIComponent(symbol)}&interval=1day` +
    `&outputsize=730&order=ASC&apikey=${API_KEY}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
  if (!res.ok) throw new Error(`Twelve Data chart HTTP ${res.status} for ${symbol}`);
  const data = await res.json();
  if (data.status === 'error' || data.code) {
    throw new Error(data.message || `Twelve Data chart error for ${symbol}`);
  }
  const values: Array<{ datetime: string; close: string }> = data.values || [];
  return values
    .map((v) => ({ date: new Date(v.datetime).toISOString(), close: parseFloat(v.close) }))
    .filter((p) => p.close > 0);
}
