import { AssetType } from '@/lib/types';

// A small convenience list for search/type-guessing.
// Crypto quotes come from CoinGecko anyway, so this is mainly used for UI hints.
export const KNOWN_CRYPTO_IDS = new Set([
  'bitcoin',
  'ethereum',
  'solana',
  'ripple',
  'cardano',
  'dogecoin',
  'polkadot',
  'litecoin',
  'chainlink',
  'avalanche-2',
  'matic-network',
  'binancecoin',
  'shiba-inu',
  'uniswap',
  'cosmos',
  'algorand',
  'stellar',
  'tron',
]);

export function guessAssetType(symbol: string, quoteType?: string): AssetType {
  const qt = quoteType?.toUpperCase() || '';

  if (qt === 'OPTION') return 'option';
  if (qt === 'ETF' || qt === 'MUTUALFUND') return 'etf';
  if (qt === 'CURRENCY' || symbol.includes('=X')) return 'forex';
  if (symbol.endsWith('=F')) return 'commodity';
  if (KNOWN_CRYPTO_IDS.has(symbol.toLowerCase())) return 'crypto';
  // Option symbol pattern: e.g. AAPL260618C00185000
  if (/^[A-Z]{1,6}\d{6}[CP]\d{8}$/.test(symbol)) return 'option';

  return 'stock';
}

export interface ParsedOption {
  underlying: string;
  expiry: Date;
  optionType: 'call' | 'put';
  strike: number;
}

/**
 * Parses a standard OCC option symbol (e.g. AAPL260618C00185000).
 * Returns null if the symbol doesn't match the option format.
 */
export function parseOptionSymbol(symbol: string): ParsedOption | null {
  const match = symbol.match(/^([A-Z]{1,6})(\d{2})(\d{2})(\d{2})([CP])(\d{8})$/);
  if (!match) return null;
  const [, underlying, yy, mm, dd, cp, strikeRaw] = match;
  const year = 2000 + parseInt(yy, 10);
  const month = parseInt(mm, 10) - 1;
  const day = parseInt(dd, 10);
  const expiry = new Date(year, month, day);
  const strike = parseInt(strikeRaw, 10) / 1000;
  const optionType: 'call' | 'put' = cp === 'C' ? 'call' : 'put';
  return { underlying, expiry, optionType, strike };
}
