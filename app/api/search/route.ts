import { NextRequest, NextResponse } from 'next/server';
import { SearchResult, AssetType } from '@/lib/types';
import yahooFinance from '@/lib/yf';

export const dynamic = 'force-dynamic';

/** Map Yahoo Finance quoteType → our AssetType */
function mapQuoteType(quoteType: string | undefined): AssetType | null {
  switch ((quoteType || '').toUpperCase()) {
    case 'EQUITY': return 'stock';
    case 'ETF':    return 'etf';
    case 'FUTURE': return 'commodity';
    case 'CURRENCY': return 'forex';
    case 'OPTION': return 'option';
    // Skip crypto (we use CoinGecko) and index/mutualfund/etc.
    default: return null;
  }
}

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
    const results: SearchResult[] = [];
    const seenSymbols = new Set<string>();

    // Run Yahoo Finance search and CoinGecko in parallel
    const [yfResults, cryptoResults] = await Promise.allSettled([
      yahooFinance.search(q, undefined, { validateResult: false }),
      searchCoinGecko(q),
    ]);

    // Process Yahoo Finance results
    if (yfResults.status === 'fulfilled') {
      const yfValue = yfResults.value as { quotes?: Array<{ symbol?: string; isYahooFinance?: boolean; quoteType?: string; shortname?: string; longname?: string; exchDisp?: string; exchange?: string }> };
      for (const quote of (yfValue.quotes || []).slice(0, 8)) {
        if (!quote.symbol || !quote.isYahooFinance) continue;
        const type = mapQuoteType(quote.quoteType);
        if (!type) continue; // skip types we don't support

        const sym = quote.symbol;
        if (seenSymbols.has(sym.toLowerCase())) continue;
        seenSymbols.add(sym.toLowerCase());

        results.push({
          symbol: sym,
          name: (quote.shortname || quote.longname || sym) as string,
          exchange: (quote.exchDisp || quote.exchange) as string | undefined,
          type,
        });
      }
    }

    // Process CoinGecko results
    if (cryptoResults.status === 'fulfilled') {
      for (const c of cryptoResults.value) {
        if (!seenSymbols.has(c.symbol.toLowerCase())) {
          seenSymbols.add(c.symbol.toLowerCase());
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
