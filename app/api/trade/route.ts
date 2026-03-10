import { NextRequest, NextResponse } from 'next/server';
import pool, { ensureDb } from '@/lib/db';
import { nanoid } from 'nanoid';
import { fetchStooqQuote, toStooqSymbol } from '@/lib/stooq';
import { AssetType, Holding, Portfolio } from '@/lib/types';

export const dynamic = 'force-dynamic';

async function fetchCurrentPrice(symbol: string, type: AssetType): Promise<number> {
  if (type === 'crypto') {
    const coinId = symbol.toLowerCase();
    const resp = await fetch(
      `https://api.coingecko.com/api/v3/coins/markets?ids=${coinId}&vs_currency=usd`,
      { signal: AbortSignal.timeout(8000) }
    );
    if (!resp.ok) throw new Error('Failed to fetch crypto price');
    const data = await resp.json();
    const price = data?.[0]?.current_price;
    if (!price) throw new Error('No price returned');
    return price;
  }

  const stooqSymbol = toStooqSymbol(symbol);
  if (!stooqSymbol) throw new Error('Unsupported symbol format (Stooq)');
  const q = await fetchStooqQuote(stooqSymbol);
  return q.close;
}

export async function POST(request: NextRequest) {
  await ensureDb();

  const body = await request.json();
  const { portfolioId, symbol, type, action, quantity, name } = body;

  if (!portfolioId || !symbol || !type || !action || !quantity) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  if (!['buy', 'sell'].includes(action)) {
    return NextResponse.json({ error: 'action must be buy or sell' }, { status: 400 });
  }

  const qty = Number(quantity);
  if (isNaN(qty) || qty <= 0) {
    return NextResponse.json({ error: 'quantity must be positive' }, { status: 400 });
  }

  const portfolioResult = await pool.query('SELECT * FROM portfolios WHERE id = $1', [portfolioId]);
  if (portfolioResult.rows.length === 0) {
    return NextResponse.json({ error: 'Portfolio not found' }, { status: 404 });
  }
  const portfolio = portfolioResult.rows[0] as Portfolio;

  let price: number;
  try {
    price = await fetchCurrentPrice(symbol, type as AssetType);
  } catch {
    return NextResponse.json({ error: 'Failed to fetch current price' }, { status: 502 });
  }

  // Options are priced per contract (1 contract = 100 shares × premium)
  const contractMultiplier = type === 'option' ? 100 : 1;
  const total = price * qty * contractMultiplier;
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    if (action === 'buy') {
      if (portfolio.cash < total) {
        await client.query('ROLLBACK');
        return NextResponse.json({ error: 'Insufficient cash balance' }, { status: 400 });
      }

      const existingResult = await client.query(
        'SELECT * FROM holdings WHERE portfolio_id = $1 AND symbol = $2',
        [portfolioId, symbol]
      );
      const existing = existingResult.rows[0] as Holding | undefined;

      if (existing) {
        const newQty = existing.quantity + qty;
        const newAvgCost = (existing.avg_cost * existing.quantity + price * qty) / newQty;
        await client.query(
          'UPDATE holdings SET quantity = $1, avg_cost = $2, name = $3 WHERE portfolio_id = $4 AND symbol = $5',
          [newQty, newAvgCost, name || existing.name, portfolioId, symbol]
        );
      } else {
        await client.query(
          'INSERT INTO holdings (portfolio_id, symbol, asset_type, name, quantity, avg_cost) VALUES ($1, $2, $3, $4, $5, $6)',
          [portfolioId, symbol, type, name || symbol, qty, price]
        );
      }

      await client.query('UPDATE portfolios SET cash = cash - $1 WHERE id = $2', [total, portfolioId]);
    } else {
      // sell
      const existingResult = await client.query(
        'SELECT * FROM holdings WHERE portfolio_id = $1 AND symbol = $2',
        [portfolioId, symbol]
      );
      const existing = existingResult.rows[0] as Holding | undefined;

      if (!existing || existing.quantity < qty) {
        await client.query('ROLLBACK');
        return NextResponse.json({ error: 'Insufficient holdings' }, { status: 400 });
      }

      const newQty = existing.quantity - qty;
      if (newQty === 0) {
        await client.query('DELETE FROM holdings WHERE portfolio_id = $1 AND symbol = $2', [
          portfolioId,
          symbol,
        ]);
      } else {
        await client.query(
          'UPDATE holdings SET quantity = $1 WHERE portfolio_id = $2 AND symbol = $3',
          [newQty, portfolioId, symbol]
        );
      }

      await client.query('UPDATE portfolios SET cash = cash + $1 WHERE id = $2', [total, portfolioId]);
    }

    const txId = nanoid();
    await client.query(
      'INSERT INTO transactions (id, portfolio_id, symbol, asset_type, name, action, quantity, price, total, timestamp) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)',
      [txId, portfolioId, symbol, type, name || symbol, action, qty, price, total, Date.now()]
    );

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }

  const updatedPortfolio = await pool.query('SELECT * FROM portfolios WHERE id = $1', [portfolioId]);
  return NextResponse.json({ success: true, price, total, portfolio: updatedPortfolio.rows[0] });
}
