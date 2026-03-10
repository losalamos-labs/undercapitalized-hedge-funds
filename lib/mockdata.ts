/**
 * Mock market data for development/testing when external APIs are unavailable.
 * Enabled by setting NEXT_PUBLIC_MOCK_DATA=true OR MOCK_DATA=true in environment.
 * Prices have small pseudo-random variance so charts look realistic.
 */

import { AssetType, QuoteResult, ChartPoint } from '@/lib/types';

export const MOCK_ENABLED =
  process.env.MOCK_DATA === 'true' || process.env.NEXT_PUBLIC_MOCK_DATA === 'true';

interface MockAsset {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  type: AssetType;
  exchange: string;
}

const MOCK_ASSETS: Record<string, MockAsset> = {
  // Stocks
  AAPL:    { symbol: 'AAPL',    name: 'Apple Inc.',             price: 259.89,  change: 2.44,   changePercent: 0.95,  type: 'stock',     exchange: 'NASDAQ' },
  TSLA:    { symbol: 'TSLA',    name: 'Tesla, Inc.',            price: 178.22,  change: -3.12,  changePercent: -1.72, type: 'stock',     exchange: 'NASDAQ' },
  NVDA:    { symbol: 'NVDA',    name: 'NVIDIA Corporation',     price: 895.32,  change: 12.45,  changePercent: 1.41,  type: 'stock',     exchange: 'NASDAQ' },
  MSFT:    { symbol: 'MSFT',    name: 'Microsoft Corporation',  price: 418.76,  change: 1.88,   changePercent: 0.45,  type: 'stock',     exchange: 'NASDAQ' },
  AMZN:    { symbol: 'AMZN',    name: 'Amazon.com, Inc.',       price: 221.45,  change: 3.21,   changePercent: 1.47,  type: 'stock',     exchange: 'NASDAQ' },
  GOOGL:   { symbol: 'GOOGL',   name: 'Alphabet Inc.',          price: 188.33,  change: 2.10,   changePercent: 1.13,  type: 'stock',     exchange: 'NASDAQ' },
  // ETFs
  SPY:     { symbol: 'SPY',     name: 'SPDR S&P 500 ETF',       price: 564.21,  change: 4.55,   changePercent: 0.81,  type: 'etf',       exchange: 'NYSE' },
  QQQ:     { symbol: 'QQQ',     name: 'Invesco QQQ Trust',      price: 486.32,  change: 5.21,   changePercent: 1.08,  type: 'etf',       exchange: 'NASDAQ' },
  // Forex
  'EURUSD=X': { symbol: 'EURUSD=X', name: 'EUR/USD',            price: 1.1638,  change: 0.0027, changePercent: 0.23,  type: 'forex',     exchange: 'Forex' },
  'GBPUSD=X': { symbol: 'GBPUSD=X', name: 'GBP/USD',            price: 1.2944,  change: 0.0041, changePercent: 0.32,  type: 'forex',     exchange: 'Forex' },
  'USDJPY=X': { symbol: 'USDJPY=X', name: 'USD/JPY',            price: 157.83,  change: -0.22,  changePercent: -0.14, type: 'forex',     exchange: 'Forex' },
  // Commodities
  'GC=F':  { symbol: 'GC=F',   name: 'Gold Futures',           price: 2932.40, change: 18.60,  changePercent: 0.64,  type: 'commodity', exchange: 'COMEX' },
  'SI=F':  { symbol: 'SI=F',   name: 'Silver Futures',         price: 33.24,   change: 0.42,   changePercent: 1.28,  type: 'commodity', exchange: 'COMEX' },
  'CL=F':  { symbol: 'CL=F',   name: 'WTI Crude Oil',          price: 68.92,   change: -0.88,  changePercent: -1.26, type: 'commodity', exchange: 'NYMEX' },
  'NG=F':  { symbol: 'NG=F',   name: 'Natural Gas',            price: 4.12,    change: 0.08,   changePercent: 1.98,  type: 'commodity', exchange: 'NYMEX' },
  // Crypto (CoinGecko handles these normally, but include for fallback)
  bitcoin:  { symbol: 'BTC',   name: 'Bitcoin',                price: 70450,   change: 2490,   changePercent: 3.66,  type: 'crypto',    exchange: 'CoinGecko' },
  ethereum: { symbol: 'ETH',   name: 'Ethereum',               price: 2052,    change: 61.5,   changePercent: 3.09,  type: 'crypto',    exchange: 'CoinGecko' },
};

/** Slight variance so mock prices look live */
function jitter(base: number, pct = 0.001): number {
  return parseFloat((base * (1 + (Math.random() - 0.5) * pct * 2)).toFixed(base >= 100 ? 2 : 4));
}

export function getMockQuote(symbol: string, type: AssetType): QuoteResult | null {
  const key = symbol.toUpperCase();
  const asset = MOCK_ASSETS[key] || MOCK_ASSETS[symbol.toLowerCase()];
  if (!asset) return null;
  const price = jitter(asset.price);
  return {
    symbol: asset.symbol,
    name: asset.name,
    price,
    change: asset.change,
    changePercent: asset.changePercent,
    marketCap: undefined,
    exchange: `${asset.exchange} (mock)`,
    currency: 'USD',
    type: type || asset.type,
  };
}

/** Generate ~730 days of synthetic daily price history */
export function getMockHistory(symbol: string): ChartPoint[] {
  const key = symbol.toUpperCase();
  const asset = MOCK_ASSETS[key] || MOCK_ASSETS[symbol.toLowerCase()];
  const basePrice = asset?.price ?? 100;

  const points: ChartPoint[] = [];
  let price = basePrice * 0.7; // start ~30% lower 2 years ago
  const now = Date.now();
  const twoYearsAgo = now - 730 * 24 * 60 * 60 * 1000;

  for (let i = 0; i < 730; i++) {
    const ts = twoYearsAgo + i * 24 * 60 * 60 * 1000;
    // Random walk with slight upward drift
    price = price * (1 + (Math.random() - 0.48) * 0.025);
    points.push({ date: new Date(ts).toISOString(), close: parseFloat(price.toFixed(4)) });
  }
  return points;
}
