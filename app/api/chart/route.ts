import { NextRequest, NextResponse } from 'next/server';
import { fetchTwelveDailyHistory, toTwelveSymbol } from '@/lib/twelvedata';
import { getCached, setCached } from '@/lib/cache';
import { ChartPoint, AssetType } from '@/lib/types';
import { MOCK_ENABLED, getMockHistory } from '@/lib/mockdata';

export const dynamic = 'force-dynamic';

type Range = '1d' | '1w' | '1mo' | '3mo' | '1y';

interface RangeConfig {
  days: number;
  cgDays: string;
  interval: '1m' | '5m' | '15m' | '1d' | '1wk' | '1mo';
  intraday?: boolean;
}

const RANGE_CONFIG: Record<Range, RangeConfig> = {
  '1d': { days: 1, cgDays: '1', interval: '5m', intraday: true },
  '1w': { days: 7, cgDays: '7', interval: '1d', intraday: false },
  '1mo': { days: 30, cgDays: '30', interval: '1d' },
  '3mo': { days: 90, cgDays: '90', interval: '1d' },
  '1y': { days: 365, cgDays: '365', interval: '1wk' },
};

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get('symbol');
  const type = (searchParams.get('type') || 'stock') as AssetType;
  const range = (searchParams.get('range') || '1mo') as Range;

  if (!symbol) {
    return NextResponse.json({ error: 'symbol required' }, { status: 400 });
  }

  const cacheKey = `chart:${symbol}:${type}:${range}`;
  const cached = getCached<ChartPoint[]>(cacheKey);
  if (cached) return NextResponse.json(cached);

  const config = RANGE_CONFIG[range] || RANGE_CONFIG['1mo'];

  // Mock mode
  if (MOCK_ENABLED) {
    const all = getMockHistory(symbol);
    const cutoff = Date.now() - config.days * 24 * 60 * 60 * 1000;
    const points = all.filter((p) => new Date(p.date).getTime() >= cutoff);
    setCached(cacheKey, points, 30000);
    return NextResponse.json(points);
  }

  try {
    let points: ChartPoint[] = [];

    if (type === 'crypto') {
      const resp = await fetch(
        `https://api.coingecko.com/api/v3/coins/${symbol}/market_chart?vs_currency=usd&days=${config.cgDays}`,
        { signal: AbortSignal.timeout(10000) }
      );
      if (!resp.ok) throw new Error('CoinGecko chart fetch failed');
      const data = await resp.json();
      const prices: [number, number][] = data.prices || [];
      points = prices.map(([ts, price]) => ({
        date: new Date(ts).toISOString(),
        close: price,
      }));
    } else {
      // Options don't have multi-year historical OHLC data; return empty gracefully
      if (type === 'option') {
        return NextResponse.json([]);
      }

      const tdSymbol = toTwelveSymbol(symbol, type);
      const all = await fetchTwelveDailyHistory(tdSymbol);
      const cutoff = Date.now() - config.days * 24 * 60 * 60 * 1000;
      points = all.filter((p) => new Date(p.date).getTime() >= cutoff);
    }

    const ttl = range === '1d' ? 60000 : 300000;
    setCached(cacheKey, points, ttl);
    return NextResponse.json(points);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
