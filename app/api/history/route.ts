import { NextRequest, NextResponse } from 'next/server';
import pool, { ensureDb } from '@/lib/db';
import { Transaction } from '@/lib/types';

export async function GET(request: NextRequest) {
  await ensureDb();
  const { searchParams } = new URL(request.url);
  const portfolioId = searchParams.get('portfolioId');
  const symbol = searchParams.get('symbol');
  const action = searchParams.get('action');

  if (!portfolioId) {
    return NextResponse.json({ error: 'portfolioId required' }, { status: 400 });
  }

  let query = 'SELECT * FROM transactions WHERE portfolio_id = $1';
  const params: (string | number)[] = [portfolioId];
  let paramIdx = 2;

  if (symbol) {
    query += ` AND symbol = $${paramIdx++}`;
    params.push(symbol);
  }
  if (action && ['buy', 'sell'].includes(action)) {
    query += ` AND action = $${paramIdx++}`;
    params.push(action);
  }

  query += ' ORDER BY timestamp DESC';

  const result = await pool.query(query, params);
  return NextResponse.json(result.rows as Transaction[]);
}
