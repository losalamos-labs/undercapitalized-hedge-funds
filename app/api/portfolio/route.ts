import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { nanoid } from 'nanoid';
import { Portfolio, Holding } from '@/lib/types';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'id required' }, { status: 400 });
  }

  const db = getDb();
  const portfolio = db.prepare('SELECT * FROM portfolios WHERE id = ?').get(id) as Portfolio | undefined;

  if (!portfolio) {
    return NextResponse.json({ error: 'Portfolio not found' }, { status: 404 });
  }

  const holdings = db
    .prepare('SELECT * FROM holdings WHERE portfolio_id = ? AND quantity > 0')
    .all(id) as Holding[];

  return NextResponse.json({ portfolio, holdings });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { name } = body;

  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    return NextResponse.json({ error: 'name required' }, { status: 400 });
  }

  const db = getDb();
  const id = nanoid();
  const now = Date.now();

  db.prepare('INSERT INTO portfolios (id, name, cash, created_at) VALUES (?, ?, 100000, ?)').run(
    id,
    name.trim(),
    now
  );

  const portfolio = db.prepare('SELECT * FROM portfolios WHERE id = ?').get(id) as Portfolio;
  return NextResponse.json(portfolio, { status: 201 });
}
