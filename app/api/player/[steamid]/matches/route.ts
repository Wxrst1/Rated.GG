import { NextRequest, NextResponse } from 'next/server';
import { getMatchHistory } from '@/lib/faceit';
import { getFullPlayerData } from '@/lib/player';

export async function GET(
  req: NextRequest,
  { params }: { params: { steamid: string } }
) {
  const steamid = params.steamid;

  try {
    const fullData = await getFullPlayerData(steamid);

    if (!fullData?.faceit?.profile?.faceitId) {
      return NextResponse.json(
        { error: 'NO_FACEIT_ACCOUNT', message: 'User not found in Faceit' },
        { status: 404 }
      );
    }

    const matches = await getMatchHistory(fullData.faceit.profile.faceitId, 20);

    return NextResponse.json(matches, {
      headers: {
        'Cache-Control': 's-maxage=1800, stale-while-revalidate=59'
      }
    });

  } catch (error) {
    return NextResponse.json(
      { error: 'STATS_UNAVAILABLE', message: 'Could not fetch matches' },
      { status: 500 }
    );
  }
}
