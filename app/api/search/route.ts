import { NextRequest, NextResponse } from 'next/server';
import yahooFinance from '@/lib/yf';
import { SearchResult, AssetType } from '@/lib/types';

async function searchCoinGecko(q: string): Promise<SearchResult[]> {
  try {
    const resp = await fetch(
      `https://api.coingecko.com/api/v3/search?query=${encodeURIComponent(q)}`,
      { signal: AbortSignal.timeout(5000) }
    );
    if (!resp.ok) return [];
    const data = await resp.json();
    const coins = (data.coins || []).slice(0, 5);
    return coins.map((c: { id: string; symbol: string; name: string; large?: string; thumb?: string }) => ({
      symbol: c.id, // use coingecko id as symbol for crypto
      name: c.name,
      exchange: 'Crypto',
      type: 'crypto' as AssetType,
      logoUrl: c.large || c.thumb,
      coinGeckoId: c.id,
    }));
  } catch {
    return [];
  }
}

function guessType(quoteType: string | undefined, symbol: string): AssetType {
  const qt = quoteType?.toUpperCase() || '';
  if (qt === 'ETF' || qt === 'MUTUALFUND') return 'etf';
  if (qt === 'CURRENCY' || symbol.includes('=X')) return 'forex';
  if (symbol.endsWith('=F')) return 'commodity';
  return 'stock';
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q');

  if (!q || q.length < 1) {
    return NextResponse.json([]);
  }

  try {
    const [yahooResults, cryptoResults] = await Promise.allSettled([
      yahooFinance.search(q, { newsCount: 0, quotesCount: 8 }),
      searchCoinGecko(q),
    ]);

    const results: SearchResult[] = [];

    if (yahooResults.status === 'fulfilled') {
      const quotes = yahooResults.value.quotes || [];
      for (const quote of quotes.slice(0, 8)) {
        if (!quote.symbol) continue;
        const q = quote as { symbol: string; longname?: string; shortname?: string; quoteType?: string; exchange?: string };
        results.push({
          symbol: q.symbol,
          name: q.longname || q.shortname || q.symbol,
          exchange: q.exchange,
          type: guessType(q.quoteType, q.symbol),
        });
      }
    }

    if (cryptoResults.status === 'fulfilled') {
      results.push(...cryptoResults.value);
    }

    return NextResponse.json(results);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
