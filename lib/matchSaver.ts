import supabase from './supabase'
import type { ParsedMatch } from './demoParser'

const STEAM_API_KEY = process.env.STEAM_API_KEY!

/**
 * Saves a parsed match and ALL 10 player stats to Supabase.
 * Also creates/updates ghost profiles for players who haven't registered.
 */
export async function saveMatch(
  shareCode: string,
  parsed: ParsedMatch,
  demoUrl?: string,
  overridePlayedAt?: Date
): Promise<string | null> {
  console.log(`[Saver] Saving match ${shareCode} — ${parsed.map} (${parsed.players.length} players)`)

  // ── 1. Upsert the match ────────────────────────────────────────────────────
  const { data: match, error: matchError } = await supabase
    .from('matches')
    .upsert({
      share_code: shareCode,
      map: parsed.map,
      played_at: (overridePlayedAt || parsed.playedAt).toISOString(),
      score_team1: parsed.scoreTeam1,
      score_team2: parsed.scoreTeam2,
      demo_url: demoUrl || null,
      parsed_at: new Date().toISOString()
    }, { onConflict: 'share_code' })
    .select('id')
    .single()

  if (matchError || !match) {
    console.error('[Saver] Error saving match:', matchError)
    return null
  }

  const matchId = match.id
  console.log(`[Saver] Match saved with ID: ${matchId}`)

  // ── 2. Save stats for ALL players ─────────────────────────────────────────
  const statsToInsert = parsed.players.map(p => ({
    match_id: matchId,
    steam_id: p.steamId,
    team_number: p.teamNumber,
    result: p.result,
    kills: p.kills,
    deaths: p.deaths,
    assists: p.assists,
    headshots: p.headshots,
    hs_percent: p.hsPercent,
    damage: p.damage,
    adr: p.adr,
    rating: p.rating,
    kd: p.kd,
    plus_minus: p.plusMinus,
    mvps: p.mvps,
    kills_3: p.kills3,
    kills_4: p.kills4,
    kills_5: p.kills5,
    clutch_1v1: p.clutch1v1,
    clutch_1v2: p.clutch1v2,
    clutch_1v3: p.clutch1v3,
    clutch_1v4: p.clutch1v4,
    clutch_1v5: p.clutch1v5,
    wallbang_kills: p.wallbangKills,
    smoke_kills: p.smokeKills,
    shots_fired: p.shotsFired,
    shots_hit: p.shotsHit,
    accuracy: p.accuracy,
    kast: p.kast,
    premier_rating_before: p.premierRatingBefore || null,
    premier_rating_after: p.premierRatingAfter || null,
    premier_delta: p.premierDelta || null
  }))

  const { error: statsError } = await supabase
    .from('player_match_stats')
    .upsert(statsToInsert, { onConflict: 'match_id,steam_id' })

  if (statsError) {
    console.error('[Saver] Error saving player stats:', statsError)
  } else {
    console.log(`[Saver] Saved stats for ${statsToInsert.length} players`)
  }

  // ── 3. Create/update ghost profiles for all players ───────────────────────
  const steamIds = parsed.players.map(p => p.steamId).filter(Boolean)

  for (const player of parsed.players) {
    if (!player.steamId || player.steamId === '0') continue

    // Check if this player is already a registered user
    const { data: existingUser } = await supabase
      .from('players')
      .select('steam_id')
      .eq('steam_id', player.steamId)
      .single()

    if (existingUser) {
      // Registered user — update their stats summary
      await updatePlayerSummary(player.steamId)
      continue
    }

    // Not registered — upsert ghost profile
    const { data: existingGhost } = await supabase
      .from('ghost_profiles')
      .select('steam_id, total_matches')
      .eq('steam_id', player.steamId)
      .single()

    if (existingGhost) {
      await supabase
        .from('ghost_profiles')
        .update({
          name: player.name,
          last_seen: parsed.playedAt.toISOString(),
          total_matches: existingGhost.total_matches + 1
        })
        .eq('steam_id', player.steamId)
    } else {
      await supabase
        .from('ghost_profiles')
        .insert({
          steam_id: player.steamId,
          name: player.name,
          total_matches: 1,
          first_seen: parsed.playedAt.toISOString(),
          last_seen: parsed.playedAt.toISOString()
        })
    }
  }

  console.log(`[Saver] Ghost profiles updated for ${steamIds.length} players`)

  // ── 4. Enrich ghost profiles with Steam avatars (batch) ───────────────────
  await enrichWithSteamAvatars(steamIds)

  return matchId
}

/**
 * Fetch Steam avatars/names for ghost profiles in batches of 100
 */
async function enrichWithSteamAvatars(steamIds: string[]): Promise<void> {
  if (steamIds.length === 0) return

  // Only enrich ghosts (not registered players)
  const { data: ghosts } = await supabase
    .from('ghost_profiles')
    .select('steam_id')
    .in('steam_id', steamIds)
    .is('avatar', null) // Only fetch those without avatars yet

  if (!ghosts || ghosts.length === 0) return

  const idsToFetch = ghosts.map(g => g.steam_id)
  const chunks = chunkArray(idsToFetch, 100)

  for (const chunk of chunks) {
    try {
      const res = await fetch(
        `https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2/` +
        `?key=${STEAM_API_KEY}&steamids=${chunk.join(',')}`
      )
      const data = await res.json()
      const steamPlayers = data?.response?.players || []

      for (const sp of steamPlayers) {
        await supabase
          .from('ghost_profiles')
          .update({
            name: sp.personaname,
            avatar: sp.avatarfull
          })
          .eq('steam_id', sp.steamid)
          .is('claimed_at', null)
      }

      console.log(`[Saver] Enriched ${steamPlayers.length} ghost profiles with Steam data`)
    } catch (e) {
      console.error('[Saver] Error enriching ghost profiles:', e)
    }
  }
}

/**
 * Update the players table summary stats for registered users
 */
async function updatePlayerSummary(steamId: string): Promise<void> {
  const { data: stats } = await supabase
    .rpc('get_player_stats', { p_steam_id: steamId })

  if (!stats || stats.length === 0) return

  const s = stats[0]
  await supabase
    .from('players')
    .update({
      kd: s.avg_kd || 0,
      win_rate: s.wins && s.total_matches ? (s.wins / s.total_matches) * 100 : 0,
      hs_percentage: s.avg_hs || 0,
    })
    .eq('steam_id', steamId)
}

/**
 * Claim a ghost profile when a player registers
 * Returns number of matches already waiting for them
 */
export async function claimGhostProfile(
  steamId: string,
  userId: string
): Promise<number> {
  const { data: ghost } = await supabase
    .from('ghost_profiles')
    .select('total_matches')
    .eq('steam_id', steamId)
    .is('claimed_at', null)
    .single()

  if (!ghost) return 0

  await supabase
    .from('ghost_profiles')
    .update({
      claimed_at: new Date().toISOString(),
      claimed_by: userId
    })
    .eq('steam_id', steamId)

  console.log(`[Saver] Ghost profile claimed for ${steamId} — ${ghost.total_matches} matches waiting`)
  return ghost.total_matches
}

function chunkArray<T>(arr: T[], size: number): T[][] {
  return Array.from(
    { length: Math.ceil(arr.length / size) },
    (_, i) => arr.slice(i * size, i * size + size)
  )
}