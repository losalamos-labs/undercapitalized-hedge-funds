import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { Portfolio, Holding } from '@/lib/types';

export async function GET() {
  const db = getDb();
  const portfolios = db.prepare('SELECT * FROM portfolios ORDER BY created_at ASC').all() as Portfolio[];

  const leaderboard = portfolios.map((p) => {
    const holdings = db
      .prepare('SELECT * FROM holdings WHERE portfolio_id = ? AND quantity > 0')
      .all(p.id) as Holding[];

    // We don't fetch live prices here to avoid rate limits
    // Return basic info; client can enrich if needed
    const holdingsValue = holdings.reduce((sum, h) => sum + h.quantity * h.avg_cost, 0);
    const totalValue = p.cash + holdingsValue;
    const totalReturn = totalValue - 100000;
    const totalReturnPercent = (totalReturn / 100000) * 100;

    return {
      id: p.id,
      name: p.name,
      cash: p.cash,
      totalValue,
      totalReturn,
      totalReturnPercent,
      created_at: p.created_at,
    };
  });

  leaderboard.sort((a, b) => b.totalReturnPercent - a.totalReturnPercent);

  return NextResponse.json(leaderboard);
}
