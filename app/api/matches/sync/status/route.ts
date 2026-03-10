import { NextRequest, NextResponse } from 'next/server'
import supabase from '@/lib/supabase'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const steamId = searchParams.get('steamId')

  if (!steamId) {
    return NextResponse.json({ error: 'Missing steamId' }, { status: 400 })
  }

  try {
    // Count all codes
    const { count: codesFound } = await supabase
      .from('user_share_codes')
      .select('id', { count: 'exact', head: true })
      .eq('steam_id', steamId)

    // Count processed codes
    const { count: demosParsed } = await supabase
      .from('user_share_codes')
      .select('id', { count: 'exact', head: true })
      .eq('steam_id', steamId)
      .eq('processed', true)

    // Get matches where player played
    const { data: matchIds } = await supabase
      .from('player_match_stats')
      .select('match_id')
      .eq('steam_id', steamId)

    let ghostsCreated = 0
    if (matchIds && matchIds.length > 0) {
      const { count } = await supabase
        .from('player_match_stats')
        .select('id', { count: 'exact', head: true })
        .in('match_id', matchIds.map(m => m.match_id))
        .neq('steam_id', steamId)
      ghostsCreated = count || 0
    }

    const total = codesFound || 0
    const parsed = demosParsed || 0
    const status = total === 0 ? 'idle' : parsed < total ? 'processing' : 'done'

    return NextResponse.json({
      status,
      codesFound: total,
      demosParsed: parsed,
      ghostsCreated
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
