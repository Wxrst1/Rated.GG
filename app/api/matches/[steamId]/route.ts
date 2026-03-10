import { NextRequest, NextResponse } from 'next/server'
import supabase from '@/lib/supabase'

export async function GET(
  req: NextRequest,
  { params }: { params: { steamId: string } }
) {
  const { steamId } = params
  const { searchParams } = new URL(req.url)
  
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '20')
  const offset = (page - 1) * limit
  
  const mapFilter = searchParams.get('map')
  const resultFilter = searchParams.get('result')

  try {
    let query = supabase
      .from('player_match_stats')
      .select('*, match:matches(*)')
      .eq('steam_id', steamId)
      .order('matches(played_at)', { ascending: false })
      .range(offset, offset + limit - 1)

    // Note: Filtering on the joined table `matches` using eq isn't directly supported this way.
    // So if we need rigorous filtering by map, we should use a custom RPC or view.
    if (resultFilter) {
      query = query.eq('result', resultFilter)
    }

    const { data: matches, error } = await query

    if (error) throw error

    // Basic map filter client-side if needed since foreign key filtering is tricky in simple select
    const filteredMatches = mapFilter 
      ? matches.filter((m: any) => m.match && m.match.map === mapFilter)
      : matches

    return NextResponse.json(filteredMatches)
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
