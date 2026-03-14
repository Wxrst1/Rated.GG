import { parseEvent, parseHeader } from '@laihoe/demoparser2'
import fs from 'fs'
import path from 'path'

export interface ParsedPlayerStats {
  steamId: string
  name: string
  teamNumber: number
  result: 'WIN' | 'LOSS' | 'TIE'
  kills: number
  deaths: number
  assists: number
  headshots: number
  hsPercent: number
  damage: number
  adr: number
  kd: number
  plusMinus: number
  mvps: number
  kills3: number
  kills4: number
  kills5: number
  clutch1v1: number
  clutch1v2: number
  clutch1v3: number
  clutch1v4: number
  clutch1v5: number
  wallbangKills: number
  smokeKills: number
  shotsFired: number
  shotsHit: number
  accuracy: number
  kast: number
  rating: number
  premierRatingBefore?: number
  premierRatingAfter?: number
  premierDelta?: number
  group: number
  weaponStats: Record<string, { kills: number, damage: number, headshots: number }>
  hitStats: {
    head: number
    chest: number
    stomach: number
    leftArm: number
    rightArm: number
    leftLeg: number
    rightLeg: number
    neck: number
  }
}

export interface RoundHistory {
  winnerGroup: number
  winningTeam: number // 2 for T, 3 for CT
  scoreTeam1: number
  scoreTeam2: number
  kills?: KillEvent[]
}

export interface KillEvent {
  round: number
  killerSid: string
  victimSid: string
  assisterSid?: string
  weapon: string
  headshot: boolean
  wallbang: boolean
  smoke: boolean
  killerTeam: number
  victimTeam: number
}

export interface ClutchEvent {
  round: number
  steamId: string
  situation: string // e.g. "1v1", "1v2"
  won: boolean
  survived: boolean
  kills: number
}

export interface ParsedMatch {
  map: string
  playedAt: Date
  scoreTeam1: number
  scoreTeam2: number
  totalRounds: number
  players: ParsedPlayerStats[]
  roundHistory: RoundHistory[]
  killLog: KillEvent[]
  clutches: ClutchEvent[]
}

interface PlayerData {
  steamId: string
  name: string
  teamNumber: number
  kills: number
  deaths: number
  assists: number
  headshots: number
  damage: number
  mvps: number
  kills3: number
  kills4: number
  kills5: number
  clutch1v1: number
  clutch1v2: number
  clutch1v3: number
  clutch1v4: number
  clutch1v5: number
  wallbangKills: number
  smokeKills: number
  shotsFired: number
  shotsHit: number
  kastRounds: Set<number>
  roundKills: number,
  isAlive: boolean,
  roundWins: number,
  clutchSituation?: number
  weaponStats: Map<string, { kills: number, damage: number, headshots: number }>
  hitStats: {
    head: number
    chest: number
    stomach: number
    leftArm: number
    rightArm: number
    leftLeg: number
    rightLeg: number
    neck: number
  }
}

function isUtility(weapon: string): boolean {
  const w = (weapon || '').toLowerCase()
  return w.includes('grenade') || w.includes('knife') || w.includes('flashbang') ||
    w.includes('smoke') || w.includes('molotov') || w.includes('decoy') ||
    w.includes('inferno') || w === 'weapon_c4' || w.includes('bayonet') || w.includes('taser')
}

export async function parseDemo(demoPath: string): Promise<ParsedMatch> {
  console.log(`[Parser] Starting CS2 Parse for: ${demoPath}`)

  try {
    const header = parseHeader(demoPath)
    const map = header.map_name || 'unknown'
    console.log(`[Parser] Match on ${map}`)
    console.log('[Parser] Header keys:', Object.keys(header))
    console.log('[Parser] Header full:', JSON.stringify(header, null, 2))
    console.log(`[Parser] Extracting death events...`)
    const deaths = parseEvent(demoPath, 'player_death', [], ['penetrated', 'thru_smoke', 'headshot', 'is_warmup_period'])

    console.log(`[Parser] Extracting damage events...`)
    const hurts = parseEvent(demoPath, 'player_hurt', [], ['dmg_health', 'is_warmup_period', 'hitgroup'])

    console.log(`[Parser] Extracting weapon fire events...`)
    const fires = parseEvent(demoPath, 'weapon_fire', [], ['weapon', 'is_warmup_period'])

    console.log(`[Parser] Extracting MVP events...`)
    const mvps = parseEvent(demoPath, 'round_mvp', [], ['is_warmup_period'])

    console.log(`[Parser] Extracting team events...`)
    const teamChanges = parseEvent(demoPath, 'player_team', [], ['is_warmup_period'])

    console.log(`[Parser] Extracting round events...`)
    const roundEnds = parseEvent(demoPath, 'round_end', [], ['is_warmup_period', 'winner', 'reason'])
    const roundStarts = parseEvent(demoPath, 'round_start', [], ['is_warmup_period'])
    const matchStarts = parseEvent(demoPath, 'round_announce_match_start')

    const players = new Map<string, PlayerData>()

    function getOrInitPlayer(steamId: string, name = 'Unknown', team = 0): PlayerData {
      if (!steamId || steamId === '0') return { steamId: '0' } as any;

      if (!players.has(steamId)) {
        players.set(steamId, {
          steamId, 
          name: (name && name !== 'Unknown' && name !== '0') ? name : `Player_${steamId.substring(13)}`, 
          teamNumber: Number(team) || 0,
          kills: 0, deaths: 0, assists: 0, headshots: 0, damage: 0, mvps: 0,
          kills3: 0, kills4: 0, kills5: 0,
          clutch1v1: 0, clutch1v2: 0, clutch1v3: 0, clutch1v4: 0, clutch1v5: 0,
          wallbangKills: 0, smokeKills: 0, shotsFired: 0, shotsHit: 0,
          kastRounds: new Set(), roundKills: 0, isAlive: true, roundWins: 0,
          weaponStats: new Map(),
          hitStats: {
            head: 0,
            chest: 0,
            stomach: 0,
            leftArm: 0,
            rightArm: 0,
            leftLeg: 0,
            rightLeg: 0,
            neck: 0
          }
        })
      }
      
      const p = players.get(steamId)!
      
      // Aggressively update name if we find a real one
      if (name && name !== 'Unknown' && name !== '0' && name !== '') {
        if (p.name === 'Unknown' || p.name.startsWith('Player_') || (name.length > p.name.length && p.name.startsWith('Player_'))) {
          p.name = name
          console.log(`[Parser] Found name for ${steamId}: ${name}`)
        }
      }
      
      const t = Number(team)
      if (t === 2 || t === 3) {
          p.teamNumber = t
          if (!playerGroup.has(steamId)) {
              playerGroup.set(steamId, t === 2 ? 0 : 1)
          }
      }
      
      return p
    }

    // Check clutch: after each death, see if someone is now last alive vs enemies
    function checkClutch() {
      for (const [, p] of players.entries()) {
        if (!p.isAlive || p.clutchSituation) continue

        let aliveTeammates = 0
        let aliveEnemies = 0
        for (const [, other] of players.entries()) {
          if (other.steamId === p.steamId || !other.isAlive) continue
          if (other.teamNumber === p.teamNumber) aliveTeammates++
          else aliveEnemies++
        }

        if (aliveTeammates === 0 && aliveEnemies >= 1) {
          p.clutchSituation = aliveEnemies
        }
      }
    }





    const allEvents = [
      ...deaths.map((e: any) => ({ ...e, _type: 'death' })),
      ...hurts.map((e: any) => ({ ...e, _type: 'hurt' })),
      ...fires.map((e: any) => ({ ...e, _type: 'fire' })),
      ...mvps.map((e: any) => ({ ...e, _type: 'mvp' })),
      ...teamChanges.map((e: any) => ({ ...e, _type: 'team_change' })),
      ...roundEnds.map((e: any) => ({ ...e, _type: 'round_end' })),
      ...roundStarts.map((e: any) => ({ ...e, _type: 'round_start' })),
      ...matchStarts.map((e: any) => ({ ...e, _type: 'match_start' }))
    ].sort((a: any, b: any) => a.tick - b.tick)

    let currentRound = 1
    let scoreGroupA = 0 
    let scoreGroupB = 0 
    
    // Track which group each player belongs to (0 or 1)
    const playerGroup = new Map<string, number>()
    const roundHistory: RoundHistory[] = []
    const killLog: KillEvent[] = []
    const clutches: ClutchEvent[] = []
    
    const recentDeaths = new Map<string, { killer: string, tick: number }>()

    let eventsLogged = 0
    for (const e of allEvents) {
      // Rely on match_start reset rather than event-level warmup flags
      // some demos have broken warmup flags on events
      
      if (e._type === 'match_start') {
          console.log(`[Parser] 🏳️ Match Start! Current Tick: ${e.tick}`)
          scoreGroupA = 0; scoreGroupB = 0; currentRound = 1;
          playerGroup.clear()
          for (const [sid, p] of players.entries()) {
            if (p.teamNumber === 2) playerGroup.set(sid, 0)
            else if (p.teamNumber === 3) playerGroup.set(sid, 1)
            p.kills = 0; p.deaths = 0; p.assists = 0; p.damage = 0; p.headshots = 0;
            p.roundWins = 0; p.mvps = 0; p.kastRounds.clear(); p.roundKills = 0;
          }
          continue
      }
      if (e._type === 'team_change') {
          const sid = e.user_steamid?.toString() || e.steamid?.toString()
          const team = Number(e.team || e.user_team_num || 0)
          if (sid && sid !== '0' && (team === 2 || team === 3)) {
              getOrInitPlayer(sid, e.user_name || e.name, team)
              // Assign group based on their first team after match start
              if (!playerGroup.has(sid)) {
                  // If they join team 2, they are Group 0. If team 3, Group 1.
                  playerGroup.set(sid, team === 2 ? 0 : 1)
              }
          }
      }
      else if (e._type === 'round_start') {
          if (e.is_warmup_period) continue
          for (const p of players.values()) {
            p.isAlive = true
            p.roundKills = 0
            p.clutchSituation = undefined
          }
          recentDeaths.clear()
      } 
      else if (e._type === 'death') {
          const victimSid = e.user_steamid?.toString() || e.steamid?.toString() || e.victim_steamid?.toString()
          const attackerSid = e.attacker_steamid?.toString() || e.externalid?.toString()
          const assisterSid = e.assister_steamid?.toString()

          const vTeam = Number(e.user_team_num || e.team_num || e.team || e.victim_team || 0)
          const aTeam = Number(e.attacker_team_num || e.attacker_team || e.team || 0)
          const asTeam = Number(e.assister_team_num || e.assister_team || 0)

          if (victimSid && victimSid !== '0') {
            const vp = getOrInitPlayer(victimSid, e.user_name || e.name || e.victim_name, vTeam)
            vp.deaths++
            vp.isAlive = false

            if (attackerSid && attackerSid !== '0' && attackerSid !== victimSid) {
              const ap = getOrInitPlayer(attackerSid, e.attacker_name || e.attacker || e.name, aTeam)
              
              // If teams are missing, deduce they are on opposite sides
              if (ap.teamNumber > 1 && vp.teamNumber <= 1) vp.teamNumber = ap.teamNumber === 2 ? 3 : 2
              else if (vp.teamNumber > 1 && ap.teamNumber <= 1) ap.teamNumber = vp.teamNumber === 2 ? 3 : 2
              
            if (eventsLogged < 15) {
                console.log(`[Parser] Death Event Sample:`, JSON.stringify(e))
                eventsLogged++
            }
            recentDeaths.set(victimSid, { killer: attackerSid, tick: e.tick })
              const prevDeath = recentDeaths.get(attackerSid)
              if (prevDeath && (e.tick - prevDeath.tick) < 128) {
                vp.kastRounds.add(currentRound)
              }
            }

            checkClutch()
          }

          if (attackerSid && attackerSid !== '0' && attackerSid !== victimSid) {
            const ap = getOrInitPlayer(attackerSid, e.attacker_name || e.attacker || e.name, aTeam)
            const victimTeamRaw = Number(e.user_team_num || e.team_num || e.team || e.victim_team || 0)

            // If we have an attacker and it's not a suicide
            if (attackerSid !== victimSid) {
              // Count as kill if teams are different OR if one team is unknown (0)
              if (ap.teamNumber !== victimTeamRaw || ap.teamNumber === 0 || victimTeamRaw === 0) {
                ap.kills++
                ap.roundKills++
                ap.kastRounds.add(currentRound)
                if (e.headshot) ap.headshots++

                if ((e.penetrated ?? 0) > 0) ap.wallbangKills++
                if (e.thru_smoke || e.thrusmoke) ap.smokeKills++

                // Weapon Stats
                let w = (e.weapon || 'unknown').toLowerCase()
                if (w === 'm4a1_s') w = 'm4a1_silencer'
                if (w === 'usp_s') w = 'usp_silencer'
                
                const ws = ap.weaponStats.get(w) || { kills: 0, damage: 0, headshots: 0 }
                ws.kills++
                if (e.headshot) ws.headshots++
                ap.weaponStats.set(w, ws)

                // Kill Log
                killLog.push({
                  round: currentRound,
                  killerSid: attackerSid,
                  victimSid: victimSid,
                  assisterSid: assisterSid || undefined,
                  weapon: w,
                  headshot: !!e.headshot,
                  wallbang: (e.penetrated ?? 0) > 0,
                  smoke: !!(e.thru_smoke || e.thrusmoke),
                  killerTeam: ap.teamNumber,
                  victimTeam: victimTeamRaw
                })
              } else {
                console.log(`[Parser] Teamkill skipped: attacker=${ap.teamNumber} victim=${victimTeamRaw} (sid: ${ap.steamId})`)
              }
            }
          }

          if (assisterSid && assisterSid !== '0' && assisterSid !== victimSid) {
            const asp = getOrInitPlayer(assisterSid, e.assister_name || e.assister, asTeam)
            asp.assists++
            asp.kastRounds.add(currentRound)
          }
      } 
      else if (e._type === 'hurt') {
          const attackerSid = e.attacker_steamid?.toString()
          const victimSid = e.user_steamid?.toString()
          const aTeam = Number(e.attacker_team_num || e.attacker_team || 0)
          const vTeam = Number(e.user_team_num || e.team_num || 0)

          if (attackerSid && victimSid && attackerSid !== victimSid && attackerSid !== '0') {
            const ap = getOrInitPlayer(attackerSid, e.attacker_name, aTeam)
            if (ap.teamNumber !== vTeam) {
              const dmg = Math.min(e.dmg_health || 0, 100)
              ap.damage += dmg
              ap.shotsHit++

              // Hit Group Tracking
              const hg = Number(e.hitgroup || 0)
              if (hg === 1) ap.hitStats.head++
              else if (hg === 2) ap.hitStats.chest++
              else if (hg === 3) ap.hitStats.stomach++
              else if (hg === 4) ap.hitStats.leftArm++
              else if (hg === 5) ap.hitStats.rightArm++
              else if (hg === 6) ap.hitStats.leftLeg++
              else if (hg === 7) ap.hitStats.rightLeg++
              else if (hg === 8) ap.hitStats.neck++

              // Weapon Damage Stats
              let w = (e.weapon || 'unknown').toLowerCase()
              if (w === 'm4a1_s') w = 'm4a1_silencer'
              if (w === 'usp_s') w = 'usp_silencer'
              
              const ws = ap.weaponStats.get(w) || { kills: 0, damage: 0, headshots: 0 }
              ws.damage += dmg
              ap.weaponStats.set(w, ws)
            }
          }
      } 
      else if (e._type === 'fire') {
          const sid = e.user_steamid?.toString()
          const fTeam = Number(e.user_team_num || e.team_num || 0)
          if (sid && sid !== '0' && !isUtility(e.weapon || '')) {
            getOrInitPlayer(sid, e.user_name, fTeam).shotsFired++
          }
      } 
      else if (e._type === 'mvp') {
          const sid = e.user_steamid?.toString()
          const mTeam = Number(e.user_team_num || e.team_num || 0)
          if (sid && sid !== '0') {
            getOrInitPlayer(sid, e.user_name, mTeam).mvps++
          }
      } 
      else if (e._type === 'round_end') {
          if (e.is_warmup_period === true) continue
          
          const rawWinner = e.winner ?? e.winner_team ?? e.winning_team
          let winner = Number(rawWinner)
          
          if (rawWinner === 'CT') winner = 3
          else if (rawWinner === 'T') winner = 2
          
          if (!winner || winner <= 1) {
            const r = Number(e.reason)
            // T reasons: target_bombed, terrorists_escaped, ct_killed, target_saved (old)
            if ([1, 7, 12, 17].includes(r)) winner = 2
            // CT reasons: bomb_defused, terrorists_killed, round_draw (pick CT usually), ct_survived, etc.
            else if ([8, 9, 10, 11, 13, 14].includes(r)) winner = 3
          }

          const eventRound = Number(e.round || currentRound)
          // Avoid double counting same round or processing rounds out of order
          if (eventRound < currentRound) {
            continue
          }

          if (winner === 2 || winner === 3) {
            console.log(`[Parser] Round ${currentRound} (Event R:${eventRound}) End. RawWinner: ${e.winner}, Reason: ${e.reason} -> FinalWinner: ${winner === 2 ? 'T' : 'CT'}`)
            
            // Find a player who is currently on the winning side to see which group they belong to
            let winningGroup: number | null = null
            const playersArr = Array.from(players.values())
            
            // Try to find a human player in a group on the winning side
            for (const p of playersArr) {
                if (p.teamNumber === winner && playerGroup.has(p.steamId)) {
                    winningGroup = playerGroup.get(p.steamId)!
                    break
                }
            }
            
            let roundWinnerGroup = -1
            if (winningGroup === 0) {
                scoreGroupA++
                roundWinnerGroup = 0
            } else if (winningGroup === 1) {
                scoreGroupB++
                roundWinnerGroup = 1
            } else {
                // Fallback: the side that won is likely the group that was on that side at start
                if (winner === 2) {
                    scoreGroupA++
                    roundWinnerGroup = 0
                } else {
                    scoreGroupB++
                    roundWinnerGroup = 1
                }
            }

            roundHistory.push({
                winnerGroup: roundWinnerGroup,
                winningTeam: winner,
                scoreTeam1: scoreGroupA,
                scoreTeam2: scoreGroupB,
                kills: killLog.filter(k => k.round === currentRound)
            })
            
            console.log(`[Parser] Round ${currentRound} (Event R:${eventRound}) End. Winner: ${winner === 2 ? 'T' : 'CT'}. Match Score: ${scoreGroupA}-${scoreGroupB}`)
            
            for (const p of playersArr) {
              if (p.roundKills === 3) p.kills3++
              else if (p.roundKills === 4) p.kills4++
              else if (p.roundKills >= 5) p.kills5++

              if (p.isAlive) p.kastRounds.add(currentRound)

              if (p.clutchSituation && p.isAlive) {
                if (winner === p.teamNumber) {
                  if (p.clutchSituation === 1) p.clutch1v1++
                  else if (p.clutchSituation === 2) p.clutch1v2++
                  else if (p.clutchSituation === 3) p.clutch1v3++
                  else if (p.clutchSituation === 4) p.clutch1v4++
                  else if (p.clutchSituation >= 5) p.clutch1v5++
                }

                clutches.push({
                  round: currentRound,
                  steamId: p.steamId,
                  situation: `1v${p.clutchSituation}`,
                  won: winner === p.teamNumber,
                  survived: p.isAlive,
                  kills: p.roundKills // approx kills in clutch
                })
              }

              // Track individual round wins
              if (p.teamNumber === winner) {
                p.roundWins++
              }

              p.roundKills = 0
              p.clutchSituation = undefined
            }
          }
          currentRound = eventRound + 1
      }
    }

    const totalRoundsPlayed = Math.max(currentRound - 1, 1)
    
    // Safety Fallback: If no one has a team, assign teams based on player instances
    const playersArr = Array.from(players.values())
    const teamless = playersArr.filter(p => p.teamNumber <= 1)
    if (teamless.length > 0) {
        console.log(`[Parser] ⚠️ ${teamless.length} players missing teams. Assigning default groups...`)
        playersArr.forEach((p, idx) => {
            if (p.teamNumber <= 1) p.teamNumber = idx < 5 ? 2 : 3
            // Also try to set original team if not already set
            if (p.steamId && p.steamId !== '0' && p.teamNumber > 1 && !playerGroup.has(p.steamId)) {
              playerGroup.set(p.steamId, p.teamNumber === 2 ? 0 : 1)
            }
        })
    }

    console.log(`[Parser] Summary: ${totalRoundsPlayed} rounds. Final Score: ${scoreGroupA}-${scoreGroupB} (Team A - Team B)`)

    const parsedPlayers: ParsedPlayerStats[] = []

    for (const p of players.values()) {
      if (!p.steamId || p.steamId === '0') continue

      const kd = p.deaths > 0 ? p.kills / p.deaths : p.kills
      const hsPercent = p.kills > 0 ? (p.headshots / p.kills) * 100 : 0
      const adr = p.damage / totalRoundsPlayed
      const accuracy = p.shotsFired > 0 ? (p.shotsHit / p.shotsFired) * 100 : 0
      const kast = (p.kastRounds.size / totalRoundsPlayed) * 100

      const kpr = p.kills / totalRoundsPlayed
      const dpr = p.deaths / totalRoundsPlayed
      const impact = (2.13 * kpr) + (0.42 * (p.assists / totalRoundsPlayed)) - 0.41
      const rating = Math.max(0,
        (0.0073 * 50) + (0.3591 * kpr) + (-0.5329 * dpr) +
        (0.2372 * impact) + (0.0032 * adr) + 0.1587
      )

      const group = playerGroup.get(p.steamId)
      // Force teamNumber to match group for UI/DB consistency (2 = Group 0 / Team 1, 3 = Group 1 / Team 2)
      const uiTeam = group === 0 ? 2 : (group === 1 ? 3 : p.teamNumber)

      const result: 'WIN' | 'LOSS' | 'TIE' =
        group === 0
            ? (scoreGroupA > scoreGroupB ? 'WIN' : (scoreGroupA < scoreGroupB ? 'LOSS' : 'TIE'))
            : (scoreGroupB > scoreGroupA ? 'WIN' : (scoreGroupB < scoreGroupA ? 'LOSS' : 'TIE'))

      parsedPlayers.push({
        steamId: p.steamId, name: p.name, teamNumber: uiTeam, result,
        group: group ?? (uiTeam === 2 ? 0 : 1),
        kills: p.kills, deaths: p.deaths, assists: p.assists,
        headshots: p.headshots, hsPercent: Math.round(hsPercent * 10) / 10,
        damage: p.damage, adr: Math.round(adr * 10) / 10,
        kd: Math.round(kd * 100) / 100, plusMinus: p.kills - p.deaths,
        mvps: p.mvps,
        kills3: p.kills3, kills4: p.kills4, kills5: p.kills5,
        clutch1v1: p.clutch1v1, clutch1v2: p.clutch1v2, clutch1v3: p.clutch1v3,
        clutch1v4: p.clutch1v4, clutch1v5: p.clutch1v5,
        wallbangKills: p.wallbangKills, smokeKills: p.smokeKills,
        shotsFired: p.shotsFired, shotsHit: p.shotsHit,
        accuracy: Math.round(accuracy * 10) / 10,
        kast: Math.round(kast * 10) / 10,
        rating: Math.round(rating * 1000) / 1000,
        weaponStats: Object.fromEntries(p.weaponStats.entries()),
        hitStats: p.hitStats
      })
    }

    return {
      map, playedAt: new Date((header.client_name === 'Source' ? 0 : 0) || Date.now()), // Placeholder if header lacks date, though usually handled by saver
      scoreTeam1: scoreGroupA, scoreTeam2: scoreGroupB,
      totalRounds: totalRoundsPlayed, players: parsedPlayers,
      roundHistory,
      killLog,
      clutches
    }

  } catch (error: any) {
    console.error(`[Parser] Fatal error:`, error.message)
    throw error
  }
}