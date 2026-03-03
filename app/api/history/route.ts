import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { Transaction } from '@/lib/types';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const portfolioId = searchParams.get('portfolioId');
  const symbol = searchParams.get('symbol');
  const action = searchParams.get('action');

  if (!portfolioId) {
    return NextResponse.json({ error: 'portfolioId required' }, { status: 400 });
  }

  const db = getDb();
  let query = 'SELECT * FROM transactions WHERE portfolio_id = ?';
  const params: (string)[] = [portfolioId];

  if (symbol) {
    query += ' AND symbol = ?';
    params.push(symbol);
  }
  if (action && ['buy', 'sell'].includes(action)) {
    query += ' AND action = ?';
    params.push(action);
  }

  query += ' ORDER BY timestamp DESC';

  const transactions = db.prepare(query).all(...params) as Transaction[];
  return NextResponse.json(transactions);
}
