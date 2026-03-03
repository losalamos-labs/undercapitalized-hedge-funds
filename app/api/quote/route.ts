import { NextRequest, NextResponse } from 'next/server';
import yahooFinance from '@/lib/yf';
import { getCached, setCached } from '@/lib/cache';
import { AssetType, QuoteResult } from '@/lib/types';

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
      const quote = await yahooFinance.quote(symbol);
      if (!quote) {
        return NextResponse.json({ error: `Symbol not found: ${symbol}` }, { status: 404 });
      }
      const price = quote.regularMarketPrice;
      if (!price) {
        return NextResponse.json({ error: `No price available for ${symbol}` }, { status: 404 });
      }
      result = {
        symbol: quote.symbol,
        name: quote.longName || quote.shortName || symbol,
        price,
        change: quote.regularMarketChange || 0,
        changePercent: quote.regularMarketChangePercent || 0,
        marketCap: quote.marketCap,
        exchange: quote.fullExchangeName || quote.exchange,
        currency: quote.currency,
        type,
      };
    }

    setCached(cacheKey, result, 60000); // 1-minute quote cache
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    // Distinguish 404 vs 500
    if (message.toLowerCase().includes('not found') || message.toLowerCase().includes('no fundamentals')) {
      return NextResponse.json({ error: `Symbol not found: ${symbol}` }, { status: 404 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
