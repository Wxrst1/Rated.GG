import { NextRequest, NextResponse } from 'next/server';
import supabase from '@/lib/supabase';

export async function GET(
  req: NextRequest,
  { params }: { params: { steamid: string } }
) {
  // It might come as steamid or steamId depending on how Next.js routes it on Windows
  // It's safer to read both.
  const steamId = params.steamid || (params as any).steamId;

  try {
    // Check registered users first
    const { data: user } = await supabase
      .from('players')
      .select('steam_id, name, avatar, total_hours, level, kd, win_rate')
      .eq('steam_id', steamId)
      .single();

    if (user) {
      return NextResponse.json({
        type: 'user',
        steamId: user.steam_id,
        name: user.name,
        avatar: user.avatar,
        totalHours: user.total_hours,
        level: user.level,
        kd: user.kd,
        winRate: user.win_rate
      });
    }

    // Then check ghost profiles
    const { data: ghost } = await supabase
      .from('ghost_profiles')
      .select('*')
      .eq('steam_id', steamId)
      .single();

    if (ghost) {
      return NextResponse.json({
        type: 'ghost',
        steamId: ghost.steam_id,
        name: ghost.name,
        avatar: ghost.avatar,
        totalMatches: ghost.total_matches,
        firstSeen: ghost.first_seen,
        lastSeen: ghost.last_seen
      });
    }

    return NextResponse.json({ error: 'Player not found' }, { status: 404 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
