import { NextRequest, NextResponse } from 'next/server';
import { SearchResult, AssetType } from '@/lib/types';

export const dynamic = 'force-dynamic';

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

    // Lightweight ticker support (primarily US tickers) for Stooq-backed quotes.
    const trimmed = q.trim();
    if (/^[A-Za-z]{1,10}(?:\.US)?$/.test(trimmed)) {
      const sym = trimmed.toUpperCase().replace(/\.US$/, '');
      results.push({ symbol: sym, name: sym, exchange: 'US', type: 'stock' });
      seenSymbols.add(sym.toLowerCase());
    }

    const cryptoResults = await searchCoinGecko(q);
    for (const c of cryptoResults) {
      if (!seenSymbols.has(c.symbol.toLowerCase())) results.push(c);
    }

    return NextResponse.json(results);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
