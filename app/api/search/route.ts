import { NextRequest, NextResponse } from 'next/server';
import { SearchResult, AssetType } from '@/lib/types';

export const dynamic = 'force-dynamic';

const TD_API_KEY = process.env.TWELVEDATA_API_KEY || 'demo';
const TD_BASE = 'https://api.twelvedata.com';

/** Map Twelve Data instrument_type → our AssetType */
function mapInstrumentType(t: string | undefined): AssetType | null {
  switch ((t || '').toLowerCase()) {
    case 'common stock':
    case 'equity':
    case 'depositary receipt':
      return 'stock';
    case 'etf':
    case 'fund':
      return 'etf';
    case 'forex':
    case 'currency':
      return 'forex';
    case 'commodity':
    case 'physical currency':
      return 'commodity';
    default:
      return null;
  }
}

async function searchTwelveData(q: string): Promise<SearchResult[]> {
  try {
    const url = `${TD_BASE}/symbol_search?symbol=${encodeURIComponent(q)}&apikey=${TD_API_KEY}&outputsize=8`;
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return [];
    const data = await res.json();
    const matches: Array<{
      symbol: string;
      instrument_name: string;
      exchange: string;
      instrument_type: string;
    }> = data.data || [];
    return matches
      .map((m) => {
        const type = mapInstrumentType(m.instrument_type);
        if (!type) return null;
        return {
          symbol: m.symbol,
          name: m.instrument_name,
          exchange: m.exchange,
          type,
        } as SearchResult;
      })
      .filter((r): r is SearchResult => r !== null)
      .slice(0, 6);
  } catch {
    return [];
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
    const [tdResults, cryptoResults] = await Promise.allSettled([
      searchTwelveData(q),
      searchCoinGecko(q),
    ]);

    const results: SearchResult[] = [];
    const seenSymbols = new Set<string>();

    if (tdResults.status === 'fulfilled') {
      for (const r of tdResults.value) {
        if (!seenSymbols.has(r.symbol.toLowerCase())) {
          seenSymbols.add(r.symbol.toLowerCase());
          results.push(r);
        }
      }
    }

    if (cryptoResults.status === 'fulfilled') {
      for (const r of cryptoResults.value) {
        if (!seenSymbols.has(r.symbol.toLowerCase())) {
          seenSymbols.add(r.symbol.toLowerCase());
          results.push(r);
        }
      }
    }

    return NextResponse.json(results);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
