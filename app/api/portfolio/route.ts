import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { nanoid } from 'nanoid';
import { Portfolio, Holding } from '@/lib/types';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'id required' }, { status: 400 });
  }

  const portfolioResult = await pool.query('SELECT * FROM portfolios WHERE id = $1', [id]);
  if (portfolioResult.rows.length === 0) {
    return NextResponse.json({ error: 'Portfolio not found' }, { status: 404 });
  }

  const portfolio = portfolioResult.rows[0] as Portfolio;
  const holdingsResult = await pool.query(
    'SELECT * FROM holdings WHERE portfolio_id = $1 AND quantity > 0',
    [id]
  );
  const holdings = holdingsResult.rows as Holding[];

  return NextResponse.json({ portfolio, holdings });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { name } = body;

  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    return NextResponse.json({ error: 'name required' }, { status: 400 });
  }

  // Get user from session if available
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id || null;

  const id = nanoid();
  const now = Date.now();

  await pool.query(
    'INSERT INTO portfolios (id, user_id, name, cash, created_at) VALUES ($1, $2, $3, 100000, $4)',
    [id, userId, name.trim(), now]
  );

  const result = await pool.query('SELECT * FROM portfolios WHERE id = $1', [id]);
  return NextResponse.json(result.rows[0], { status: 201 });
}
