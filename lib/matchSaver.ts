import supabase from './supabase'
import type { ParsedMatch } from './demoParser'

const STEAM_API_KEY = process.env.STEAM_API_KEY!

export async function saveMatch(
  shareCode: string,
  parsed: ParsedMatch,
  demoUrl?: string,
  overridePlayedAt?: Date,
  externalMatchId?: string,
  premierRatings?: Record<string, number>,
  officialScores?: { team1: number, team2: number },
  gameMode?: string
): Promise<string | null> {
  console.log(`[Saver] Saving match ${shareCode} (${gameMode || 'competitive'}) — ${parsed.map}`)
    
      // Trust the parser's score for internal team consistency (Group 0 vs Group 1).
      // Official scores from GC can be swapped or have different team indexing.
      const s1 = parsed.scoreTeam1
      const s2 = parsed.scoreTeam2
      
      console.log(`[Saver] Match Result: ${s1}-${s2} (Group 0 - Group 1)`)
      
      const matchData: any = {
        share_code: shareCode,
        match_id: externalMatchId || null,
        map: parsed.map,
        played_at: (overridePlayedAt || parsed.playedAt).toISOString(),
        score_team1: s1,
        score_team2: s2,
        demo_url: demoUrl || null,
        parsed_at: new Date().toISOString(),
        round_history: {
          rounds: parsed.roundHistory,
          killLog: parsed.killLog,
          clutches: parsed.clutches,
          playerWeaponStats: parsed.players.reduce((acc, p) => ({ ...acc, [p.steamId]: p.weaponStats }), {}),
          playerHitStats: parsed.players.reduce((acc, p) => ({ ...acc, [p.steamId]: p.hitStats }), {})
        }
      }

      // Only add game_mode if it's available to avoid sync issues with Supabase cache
      if (gameMode) {
        matchData.game_mode = gameMode
      }
    
      // 1. Upsert match
      const { data: match, error: matchError } = await supabase
        .from('matches')
        .upsert(matchData, { onConflict: 'share_code' })
        .select('id')
        .single()

  if (matchError || !match) {
    console.error('[Saver] Error saving match:', matchError)
    return null
  }

  const matchId = match.id

  // 2. Save stats for ALL 10 players
  const statsToInsert = parsed.players.map(p => {
    // Robust result calculation based on the scores we just saved
    let finalResult: 'WIN' | 'LOSS' | 'TIE' = p.result

    if (s1 === s2) {
      finalResult = 'TIE'
    } else {
      const g0Won = s1 > s2
      if (p.group === 0) finalResult = g0Won ? 'WIN' : 'LOSS'
      else finalResult = g0Won ? 'LOSS' : 'WIN'
    }

    return {
      match_id: matchId,
      steam_id: p.steamId,
      team_number: p.teamNumber,
      result: finalResult,
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
      premier_rating_after: p.premierRatingAfter || premierRatings?.[p.steamId] || null,
      premier_delta: p.premierDelta || null,
      team_group: p.group
    }
  })

  const { error: statsError } = await supabase
    .from('player_match_stats')
    .upsert(statsToInsert, { onConflict: 'match_id,steam_id' })

  if (statsError) console.error('[Saver] Stats error:', statsError)
  else console.log(`[Saver] ✅ Saved stats for ${statsToInsert.length} players`)

  // 3. Update player name/avatar cache
  const steamIds = parsed.players.map(p => p.steamId).filter(Boolean)

  const { data: registeredPlayers } = await supabase
    .from('players')
    .select('steam_id')
    .in('steam_id', steamIds)

  const registeredIds = new Set(registeredPlayers?.map(p => p.steam_id) || [])
  const playersToEnrich: string[] = []
  
  for (const player of parsed.players) {
    if (!player.steamId || player.steamId === '0') continue

    if (registeredIds.has(player.steamId)) {
      // Registered — update their stats and check if they need avatar/name
      await updatePlayerSummary(player.steamId)
      
      // If registered player is missing basic info, add to enrichment list
      const { data: regProfile } = await supabase
        .from('players')
        .select('name, avatar')
        .eq('steam_id', player.steamId)
        .maybeSingle()
      
      if (!regProfile?.avatar || !regProfile?.name || regProfile.name === 'Unknown') {
        playersToEnrich.push(player.steamId)
      }
    } else {
      // Ghost — create or update
      const { data: existing } = await supabase
        .from('ghost_profiles')
        .select('steam_id, total_matches, name, avatar')
        .eq('steam_id', player.steamId)
        .maybeSingle()

      const currentRating = premierRatings?.[player.steamId] || null;

      if (existing) {
        await supabase
          .from('ghost_profiles')
          .update({
            name: player.name || existing.name,
            last_seen: parsed.playedAt.toISOString(),
            total_matches: (existing.total_matches || 0) + 1,
            current_premier_rating: currentRating || undefined
          })
          .eq('steam_id', player.steamId)
        
        if (!existing.avatar || !existing.name) {
          playersToEnrich.push(player.steamId)
        }
      } else {
        await supabase
          .from('ghost_profiles')
          .insert({
            steam_id: player.steamId,
            name: player.name,
            total_matches: 1,
            first_seen: parsed.playedAt.toISOString(),
            last_seen: parsed.playedAt.toISOString(),
            current_premier_rating: currentRating
          })
        playersToEnrich.push(player.steamId)
      }
    }
  }

  // Proactively enrich all profiles that need it
  if (playersToEnrich.length > 0) {
    console.log(`[Saver] Proactively enriching ${playersToEnrich.length} profiles...`)
    await enrichGhostProfiles(playersToEnrich)
  }

  return matchId
}

export async function enrichGhostProfiles(steamIds: string[]): Promise<void> {
  if (steamIds.length === 0) return

  const chunks = chunkArray(steamIds, 100)

  for (const chunk of chunks) {
    try {
      const res = await fetch(
        `https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2/` +
        `?key=${STEAM_API_KEY}&steamids=${chunk.join(',')}`
      )
      const data = await res.json()
      const players = data?.response?.players || []

      for (const sp of players) {
        const sid = sp.steamid
        
        // Update ghost profile if exists
        const { data: ghost } = await supabase.from('ghost_profiles').select('id').eq('steam_id', sid).maybeSingle()
        if (ghost) {
           await supabase
            .from('ghost_profiles')
            .update({ name: sp.personaname, avatar: sp.avatarfull })
            .eq('steam_id', sid)
            .is('claimed_at', null)
        }

        // Update registered profile if exists and missing avatar
        const { data: reg } = await supabase.from('players').select('id, avatar').eq('steam_id', sid).maybeSingle()
        if (reg && !reg.avatar) {
           await supabase
            .from('players')
            .update({ name: sp.personaname, avatar: sp.avatarfull })
            .eq('steam_id', sid)
        }
      }

      console.log(`[Saver] Enriched ${players.length} profiles from Steam API`)
    } catch (e) {
      console.error('[Saver] Enrichment error:', e)
    }
  }
}

async function updatePlayerSummary(steamId: string): Promise<void> {
  try {
    const { data: stats } = await supabase
      .rpc('get_player_stats', { p_steam_id: steamId })

    if (!stats || stats.length === 0) return

    const s = stats[0]
    const totalMatches = Number(s.total_matches) || 0
    const wins = Number(s.wins) || 0

    await supabase
      .from('players')
      .update({
        kd: s.avg_kd || 0,
        win_rate: totalMatches > 0 ? (wins / totalMatches) * 100 : 0,
        hs_percentage: s.avg_hs || 0,
        avg_kd: s.avg_kd || 0,
        avg_adr: s.avg_adr || 0,
        avg_hs: s.avg_hs || 0,
        avg_kast: s.avg_kast || 0,
        avg_accuracy: s.avg_accuracy || 0,
        avg_ttd: s.avg_ttd || 0,
        avg_reaction: s.avg_reaction || 0,
        avg_crosshair: s.avg_crosshair || 0,
        avg_preaim: s.avg_preaim || 0,
        avg_rating: s.avg_rating || 0,
        current_premier_rating: Number(s.latest_premier_rating) || 0,
        total_matches: totalMatches,
        wins: wins,
        losses: Number(s.losses) || 0,
        ties: Number(s.ties) || 0,
        updated_at: new Date().toISOString()
      })
      .eq('steam_id', steamId)
  } catch (e) {
    console.error(`[Saver] updatePlayerSummary error for ${steamId}:`, e)
  }
}

function chunkArray<T>(arr: T[], size: number): T[][] {
  return Array.from(
    { length: Math.ceil(arr.length / size) },
    (_, i) => arr.slice(i * size, i * size + size)
  )
}

/**
 * Save tick-by-tick stats (TTD, Reaction, Crosshair, Preaim)
 * Called after analyzeTickData() completes
 */
export async function saveTickStats(
  matchId: string,
  tickStats: import('./tickParser').TickStats[]
): Promise<void> {
  for (const ts of tickStats) {
    if (!ts.steamId || ts.steamId === '0') continue

    const { error } = await supabase
      .from('player_match_stats')
      .update({
        avg_time_to_damage: ts.avgTimeToFirstDamage || null,
        avg_reaction_time: ts.avgReactionTime || null,
        avg_crosshair_dist: ts.avgCrosshairDistance || null,
        preaim_percent: ts.preaim || null
      })
      .eq('match_id', matchId)
      .eq('steam_id', ts.steamId)

    if (error) {
      console.error(`[Saver] Error saving tick stats for ${ts.steamId}:`, error)
    }
  }

  console.log(`[Saver] ✅ Tick stats saved for ${tickStats.length} players`)
}