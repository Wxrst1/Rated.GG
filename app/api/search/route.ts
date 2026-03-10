import { NextRequest, NextResponse } from 'next/server';
import { searchPlayer } from '@/lib/search';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get('q');
  
  if (!q) {
    return NextResponse.json({ error: 'QUERY_REQUIRED' }, { status: 400 });
  }

  try {
    const result = await searchPlayer(q);

    if (!result) {
      return NextResponse.json({ error: 'PLAYER_NOT_FOUND' }, { status: 404 });
    }

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: 'API_ERROR' }, { status: 500 });
  }
}
