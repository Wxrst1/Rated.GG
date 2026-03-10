import { NextRequest, NextResponse } from 'next/server'
import supabase from '@/lib/supabase'

export async function GET(
  req: NextRequest,
  { params }: { params: { steamId: string } }
) {
  const { steamId } = params

  try {
    const { data: stats, error } = await supabase.rpc('get_player_stats', { 
        p_steam_id: steamId 
    })

    if (error) {
       console.error("RPC Error:", error)
       throw error
    }

    if (!stats || stats.length === 0) {
      return NextResponse.json({ message: 'No matches found' }, { status: 404 })
    }

    // Now get the past 5 results for recent form
    const { data: recentFormRaw } = await supabase
       .from('player_match_stats')
       .select('result, matches(played_at)')
       .eq('steam_id', steamId)
       .order('matches(played_at)', { ascending: false })
       .limit(5)

    const recentForm = recentFormRaw?.map(m => m.result.charAt(0)) || []

    return NextResponse.json({
        totalMatches: stats[0].total_matches,
        wins: stats[0].wins,
        losses: stats[0].losses,
        ties: stats[0].ties,
        winRate: (stats[0].wins / Math.max(stats[0].total_matches, 1)) * 100,
        avgKD: stats[0].avg_kd,
        avgRating: stats[0].avg_rating,
        avgADR: stats[0].avg_adr,
        avgHS: stats[0].avg_hs,
        currentPremierRating: stats[0].current_premier_rating,
        recentForm: recentForm,
        // Detailed maps metrics can be fetched separately using another RPC or view
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
