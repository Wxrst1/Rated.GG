import supabase from './supabase'

const STEAM_API_KEY = process.env.STEAM_API_KEY!

/**
 * Crawls all share codes from Valve API starting from the last known code.
 * Returns array of new share codes found.
 */
/**
 * Note: GetMatchList does not exist on the Steam Web API for CS2.
 * We rely on GetNextMatchSharingCode to find matches and the GC to fetch rankings.
 */
export async function syncMatchListWithRatings(steamId: string, authCode: string) {
  return []; // Returning empty list to avoid 404s
}

export async function crawlShareCodes(
  steamId: string,
  authCode: string,
  lastShareCode: string
): Promise<string[]> {
  const newCodes: string[] = []
  let currentCode = lastShareCode
  let attempts = 0
  const MAX_ATTEMPTS = 20 // limit to 20 per sync to avoid pulling years of history

  console.log(`[Crawler] Starting crawl for ${steamId} from ${lastShareCode}`)

  while (attempts < MAX_ATTEMPTS) {
    attempts++

    // Valve rate limit — wait 1.1s between requests
    await new Promise(r => setTimeout(r, 1100))

    const url = new URL('https://api.steampowered.com/ICSGOPlayers_730/GetNextMatchSharingCode/v1')
    url.searchParams.set('key', STEAM_API_KEY)
    url.searchParams.set('steamid', steamId)
    url.searchParams.set('steamidkey', authCode)
    url.searchParams.set('knowncode', currentCode)

    let res: Response
    try {
      res = await fetch(url.toString())
    } catch (e) {
      console.error('[Crawler] Network error:', e)
      break
    }

    // Auth code expired or invalid
    if (res.status === 412) {
      console.warn(`[Crawler] Auth code invalid for ${steamId}`)
      await supabase
        .from('players')
        .update({ auth_code_valid: false })
        .eq('steam_id', steamId)
      break
    }

    // Rate limited — wait 60s and retry
    if (res.status === 429) {
      console.warn('[Crawler] Rate limited, waiting 60s...')
      await new Promise(r => setTimeout(r, 60000))
      continue
    }

    if (!res.ok) {
      console.error(`[Crawler] HTTP ${res.status}`)
      break
    }

    const data = await res.json()
    const nextCode: string = data?.result?.nextcode

    // No more matches
    if (!nextCode || nextCode === 'n/a') {
      console.log(`[Crawler] Reached end of match history after ${newCodes.length} new codes`)
      break
    }

    console.log(`[Crawler] Found new code: ${nextCode}`)

    // Save share code to Supabase immediately
    const { error } = await supabase
      .from('user_share_codes')
      .upsert({
        steam_id: steamId,
        share_code: nextCode,
        processed: false
      }, { onConflict: 'share_code' })

    if (error) {
      console.error('[Crawler] Error saving share code:', error)
    }

    newCodes.push(nextCode)
    currentCode = nextCode
  }

  // Update lastShareCode in players table
  if (newCodes.length > 0) {
    const lastCode = newCodes[newCodes.length - 1]
    await supabase
      .from('players')
      .update({ latest_match_id: lastCode })
      .eq('steam_id', steamId)

    console.log(`[Crawler] Updated last share code to ${lastCode}`)
  }

  return newCodes
}

/**
 * Get all unprocessed share codes for a player from Supabase
 */
export async function getUnprocessedCodes(steamId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('user_share_codes')
    .select('share_code')
    .eq('steam_id', steamId)
    .eq('processed', false)
    .order('created_at', { ascending: true })

  if (error) {
    console.error('[Crawler] Error fetching unprocessed codes:', error)
    return []
  }

  return data?.map(d => d.share_code) || []
}

/**
 * Mark a share code as processed
 */
export async function markCodeProcessed(shareCode: string): Promise<void> {
  await supabase
    .from('user_share_codes')
    .update({
      processed: true,
      processed_at: new Date().toISOString()
    })
    .eq('share_code', shareCode)
}