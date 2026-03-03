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

  if (qt === 'ETF' || qt === 'MUTUALFUND') return 'etf';
  if (qt === 'CURRENCY' || symbol.includes('=X')) return 'forex';
  if (symbol.endsWith('=F')) return 'commodity';
  if (KNOWN_CRYPTO_IDS.has(symbol.toLowerCase())) return 'crypto';

  return 'stock';
}
