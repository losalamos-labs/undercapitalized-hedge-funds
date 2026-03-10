import { NextRequest, NextResponse } from 'next/server';
import { fetchTwelveQuote, toTwelveSymbol } from '@/lib/twelvedata';
import { getCached, setCached } from '@/lib/cache';
import { AssetType, QuoteResult } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get('symbol');
  const type = (searchParams.get('type') || 'stock') as AssetType;

  if (!symbol) {
    return NextResponse.json({ error: 'symbol required' }, { status: 400 });
  }

  const cacheKey = `quote:${symbol}:${type}`;
  const cached = getCached<QuoteResult>(cacheKey);
  if (cached) return NextResponse.json(cached);

  try {
    let result: QuoteResult;

    if (type === 'crypto') {
      const coinId = symbol.toLowerCase();
      const resp = await fetch(
        `https://api.coingecko.com/api/v3/coins/markets?ids=${coinId}&vs_currency=usd&price_change_percentage=24h`,
        { signal: AbortSignal.timeout(8000) }
      );
      if (!resp.ok) {
        return NextResponse.json({ error: `CoinGecko API error: ${resp.status}` }, { status: 502 });
      }
      const data = await resp.json();
      if (!data || data.length === 0) {
        return NextResponse.json({ error: `Crypto asset not found: ${symbol}` }, { status: 404 });
      }
      const coin = data[0];
      if (!coin.current_price) {
        return NextResponse.json({ error: `No price available for ${symbol}` }, { status: 404 });
      }
      result = {
        symbol: coin.symbol.toUpperCase(),
        name: coin.name,
        price: coin.current_price,
        change: coin.price_change_24h || 0,
        changePercent: coin.price_change_percentage_24h || 0,
        marketCap: coin.market_cap,
        exchange: 'CoinGecko',
        currency: 'USD',
        type: 'crypto',
      };
    } else {
      // Convert to Twelve Data symbol format
      const tdSymbol = toTwelveSymbol(symbol, type);

      const q = await fetchTwelveQuote(tdSymbol);
      const price = q.close;
      const change = Number.isFinite(q.open) ? price - q.open : 0;
      const changePercent = q.open ? (change / q.open) * 100 : 0;

      result = {
        symbol: symbol.toUpperCase(),
        name: q.name || symbol.toUpperCase(),
        price,
        change,
        changePercent,
        marketCap: undefined,
        exchange: 'Twelve Data',
        currency: 'USD',
        type,
      };
    }

    setCached(cacheKey, result, 60000); // 1-minute quote cache
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    if (message.toLowerCase().includes('not found') || message.toLowerCase().includes('no symbol')) {
      return NextResponse.json({ error: `Symbol not found: ${symbol}` }, { status: 404 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
