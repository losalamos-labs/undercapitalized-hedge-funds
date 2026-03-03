import { NextRequest, NextResponse } from 'next/server';
import yahooFinance from '@/lib/yf';
import { SearchResult, AssetType } from '@/lib/types';
import { guessAssetType } from '@/lib/asset';

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
      symbol: c.id,
      name: c.name,
      exchange: 'CoinGecko',
      type: 'crypto' as AssetType,
      logoUrl: c.large || c.thumb,
      coinGeckoId: c.id,
    }));
  } catch {
    return [];
  }
}


export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q');

  if (!q || q.length < 1) {
    return NextResponse.json([]);
  }

  try {
    const [yahooResults, cryptoResults] = await Promise.allSettled([
      yahooFinance.search(q, { newsCount: 0, quotesCount: 10 }),
      searchCoinGecko(q),
    ]);

    const results: SearchResult[] = [];
    const seenSymbols = new Set<string>();

    if (yahooResults.status === 'fulfilled') {
      const quotes = yahooResults.value.quotes || [];
      for (const quote of quotes.slice(0, 10)) {
        if (!quote.symbol) continue;
        const qq = quote as {
          symbol: string;
          longname?: string;
          shortname?: string;
          quoteType?: string;
          exchange?: string;
        };
        const type = guessAssetType(qq.symbol, qq.quoteType);
        // Include all exchange types — international stocks, ETFs, forex, commodities
        results.push({
          symbol: qq.symbol,
          name: qq.longname || qq.shortname || qq.symbol,
          exchange: qq.exchange,
          type,
        });
        seenSymbols.add(qq.symbol.toLowerCase());
      }
    }

    if (cryptoResults.status === 'fulfilled') {
      // Add crypto results that aren't already in Yahoo results
      for (const c of cryptoResults.value) {
        if (!seenSymbols.has(c.symbol.toLowerCase())) {
          results.push(c);
        }
      }
    }

    return NextResponse.json(results);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
