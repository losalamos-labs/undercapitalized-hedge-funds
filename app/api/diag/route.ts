/**
 * Diagnostic endpoint — tests which external data sources are reachable
 * from this server. Remove before going to a real production release.
 * NOT auth-protected on purpose (used only for deploy debugging).
 */
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

async function probe(name: string, url: string, timeoutMs = 6000) {
  const start = Date.now();
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(timeoutMs),
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122 Safari/537.36',
        Accept: 'application/json,text/html',
      },
    });
    const body = await res.text();
    return {
      name,
      ok: res.ok,
      status: res.status,
      ms: Date.now() - start,
      preview: body.slice(0, 120),
    };
  } catch (err) {
    return {
      name,
      ok: false,
      status: 0,
      ms: Date.now() - start,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

export async function GET() {
  const results = await Promise.all([
    probe('stooq-AAPL',    'https://stooq.com/q/l/?s=aapl.us&f=sd2t2ohlcv&h&e=csv'),
    probe('yahoo-chart',   'https://query1.finance.yahoo.com/v8/finance/chart/AAPL?interval=1d&range=5d'),
    probe('yahoo-quote',   'https://query2.finance.yahoo.com/v6/finance/quote?symbols=AAPL'),
    probe('twelvedata-AAPL', 'https://api.twelvedata.com/price?symbol=AAPL&apikey=demo'),
    probe('twelvedata-SPY',  'https://api.twelvedata.com/price?symbol=SPY&apikey=demo'),
    probe('twelvedata-EURUSD', 'https://api.twelvedata.com/price?symbol=EUR%2FUSD&apikey=demo'),
    probe('twelvedata-XAUUSD', 'https://api.twelvedata.com/price?symbol=XAU%2FUSD&apikey=demo'),
    probe('coingecko-BTC', 'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd'),
    probe('fmp-AAPL',      'https://financialmodelingprep.com/api/v3/quote-short/AAPL?apikey=demo'),
    probe('marketstack',   'https://api.marketstack.com/v2/tickers/AAPL/eod/latest?access_key=demo'),
  ]);
  return NextResponse.json(results);
}
