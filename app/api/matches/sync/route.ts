import { NextRequest, NextResponse } from 'next/server'
import { crawlQueue, demoQueue } from '@/lib/matchQueue'
import supabase from '@/lib/supabase'

export async function POST(req: NextRequest) {
  try {
    const { steamId, authCode, shareCode } = await req.json()

    if (!steamId || !authCode || !shareCode) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 })
    }

    // 1. Save or update user credentials in Supabase
    const { error } = await supabase
      .from('players') // we are using players table for users
      .update({ 
        auth_code: authCode, 
        latest_match_id: shareCode
      } as any)
      .eq('steam_id', steamId)

    if (error) {
       console.error("DB update error:", error)
    }

    // 2. Add the INITIAL code to analysis immediately so it's not skipped
    await demoQueue.add('process-initial', { shareCode, steamId })

    // 3. Start crawling for any matches played AFTER this one
    const job = await crawlQueue.add('crawl-user', {
      steamId,
      authCode,
      lastShareCode: shareCode
    })

    return NextResponse.json({ message: "Sync started", jobId: job.id })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
