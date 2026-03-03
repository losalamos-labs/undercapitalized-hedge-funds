import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import pool from '@/lib/db';

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const result = await pool.query(
    'SELECT * FROM portfolios WHERE user_id = $1 ORDER BY created_at ASC LIMIT 1',
    [session.user.id]
  );

  if (result.rows.length === 0) {
    return NextResponse.json({ error: 'No portfolio found' }, { status: 404 });
  }

  return NextResponse.json(result.rows[0]);
}
