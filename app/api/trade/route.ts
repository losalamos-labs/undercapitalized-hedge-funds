import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { nanoid } from 'nanoid';
import { AssetType, Holding, Portfolio } from '@/lib/types';

async function fetchCurrentPrice(symbol: string, type: AssetType): Promise<number> {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
  const resp = await fetch(`${baseUrl}/api/quote?symbol=${encodeURIComponent(symbol)}&type=${type}`);
  if (!resp.ok) throw new Error('Failed to fetch price');
  const data = await resp.json();
  return data.price;
}

export async function POST(request: NextRequest) {
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

  const db = getDb();
  const portfolio = db.prepare('SELECT * FROM portfolios WHERE id = ?').get(portfolioId) as Portfolio | undefined;
  if (!portfolio) {
    return NextResponse.json({ error: 'Portfolio not found' }, { status: 404 });
  }

  let price: number;
  try {
    price = await fetchCurrentPrice(symbol, type as AssetType);
  } catch {
    return NextResponse.json({ error: 'Failed to fetch current price' }, { status: 502 });
  }

  const total = price * qty;

  if (action === 'buy') {
    if (portfolio.cash < total) {
      return NextResponse.json({ error: 'Insufficient cash balance' }, { status: 400 });
    }

    const existing = db
      .prepare('SELECT * FROM holdings WHERE portfolio_id = ? AND symbol = ?')
      .get(portfolioId, symbol) as Holding | undefined;

    const executeTrade = db.transaction(() => {
      if (existing) {
        const newQty = existing.quantity + qty;
        const newAvgCost = (existing.avg_cost * existing.quantity + price * qty) / newQty;
        db.prepare(
          'UPDATE holdings SET quantity = ?, avg_cost = ?, name = ? WHERE portfolio_id = ? AND symbol = ?'
        ).run(newQty, newAvgCost, name || existing.name, portfolioId, symbol);
      } else {
        db.prepare(
          'INSERT INTO holdings (portfolio_id, symbol, asset_type, name, quantity, avg_cost) VALUES (?, ?, ?, ?, ?, ?)'
        ).run(portfolioId, symbol, type, name || symbol, qty, price);
      }

      db.prepare('UPDATE portfolios SET cash = cash - ? WHERE id = ?').run(total, portfolioId);

      const txId = nanoid();
      db.prepare(
        'INSERT INTO transactions (id, portfolio_id, symbol, asset_type, name, action, quantity, price, total, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
      ).run(txId, portfolioId, symbol, type, name || symbol, action, qty, price, total, Date.now());
    });

    executeTrade();
  } else {
    // sell
    const existing = db
      .prepare('SELECT * FROM holdings WHERE portfolio_id = ? AND symbol = ?')
      .get(portfolioId, symbol) as Holding | undefined;

    if (!existing || existing.quantity < qty) {
      return NextResponse.json({ error: 'Insufficient holdings' }, { status: 400 });
    }

    const executeTrade = db.transaction(() => {
      const newQty = existing.quantity - qty;
      if (newQty === 0) {
        db.prepare('DELETE FROM holdings WHERE portfolio_id = ? AND symbol = ?').run(portfolioId, symbol);
      } else {
        db.prepare('UPDATE holdings SET quantity = ? WHERE portfolio_id = ? AND symbol = ?').run(
          newQty,
          portfolioId,
          symbol
        );
      }

      db.prepare('UPDATE portfolios SET cash = cash + ? WHERE id = ?').run(total, portfolioId);

      const txId = nanoid();
      db.prepare(
        'INSERT INTO transactions (id, portfolio_id, symbol, asset_type, name, action, quantity, price, total, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
      ).run(txId, portfolioId, symbol, type, name || symbol, action, qty, price, total, Date.now());
    });

    executeTrade();
  }

  const updatedPortfolio = db.prepare('SELECT * FROM portfolios WHERE id = ?').get(portfolioId);
  return NextResponse.json({ success: true, price, total, portfolio: updatedPortfolio });
}
