import { DemoFile, Player } from 'demofile'
import { readFileSync } from 'fs'

export interface ParsedPlayerStats {
  steamId: string
  name: string
  teamNumber: number
  result: 'WIN' | 'LOSS' | 'TIE'
  // Core stats
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
  // Multikills
  kills3: number
  kills4: number
  kills5: number
  // Clutches
  clutch1v1: number
  clutch1v2: number
  clutch1v3: number
  clutch1v4: number
  clutch1v5: number
  // Special kills
  wallbangKills: number
  smokeKills: number
  // Shooting
  shotsFired: number
  shotsHit: number
  accuracy: number
  // KAST
  kast: number  // % of rounds with Kill/Assist/Survived/Traded
  // Rating
  rating: number
  // Premier
  premierRatingBefore?: number
  premierRatingAfter?: number
  premierDelta?: number
}

export interface ParsedMatch {
  map: string
  playedAt: Date
  scoreTeam1: number
  scoreTeam2: number
  totalRounds: number
  players: ParsedPlayerStats[]
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
  // KAST tracking
  kastRounds: Set<number>      // rounds where player got K/A/S/T
  // Per-round tracking
  roundKills: number           // kills this round
  roundKillsHistory: number[]  // kills per round
  isAlive: boolean
  premierRatingBefore?: number
  premierRatingAfter?: number
}

export async function parseDemo(demoPath: string): Promise<ParsedMatch> {
  return new Promise((resolve, reject) => {
    const demo = new DemoFile()
    let buffer: Buffer

    try {
      buffer = readFileSync(demoPath)
    } catch (e) {
      return reject(new Error(`Could not read demo file: ${demoPath}`))
    }

    const players = new Map<string, PlayerData>()
    let map = 'unknown'
    let totalRounds = 0
    let scoreTeam2 = 0  // team 2 score
    let scoreTeam3 = 0  // team 3 score
    let currentRound = 0

    // Track who killed who for trade detection
    const recentDeaths = new Map<string, { killer: string, tick: number }>()

    function getOrInitPlayer(steamId: string, entity: any): PlayerData {
      if (!players.has(steamId)) {
        players.set(steamId, {
          steamId,
          name: entity?.name || 'Unknown',
          teamNumber: entity?.teamNumber || 0,
          kills: 0,
          deaths: 0,
          assists: 0,
          headshots: 0,
          damage: 0,
          mvps: 0,
          kills3: 0,
          kills4: 0,
          kills5: 0,
          clutch1v1: 0,
          clutch1v2: 0,
          clutch1v3: 0,
          clutch1v4: 0,
          clutch1v5: 0,
          wallbangKills: 0,
          smokeKills: 0,
          shotsFired: 0,
          shotsHit: 0,
          kastRounds: new Set(),
          roundKills: 0,
          roundKillsHistory: [],
          isAlive: true
        })
      }
      return players.get(steamId)!
    }

    demo.on('start', () => {
      map = demo.header.mapName || 'unknown'
      console.log(`[Parser] Parsing demo: ${map}`)
    })

    // ── Track kills ─────────────────────────────────────────────────────────
    demo.gameEvents.on('player_death', (e: any) => {
      const attacker = demo.entities.getByUserId(e.attackerId)
      const victim = demo.entities.getByUserId(e.userid)
      const assister = e.assistedflash ? null : demo.entities.getByUserId(e.assistId)

      const attackerSteamId = attacker?.steam64Id?.toString()
      const victimSteamId = victim?.steam64Id?.toString()
      const assisterSteamId = assister?.steam64Id?.toString()

      // Victim death
      if (victimSteamId && victim) {
        const vp = getOrInitPlayer(victimSteamId, victim)
        vp.deaths++
        vp.isAlive = false

        // Record death for trade detection
        if (attackerSteamId) {
          recentDeaths.set(victimSteamId, {
            killer: attackerSteamId,
            tick: demo.currentTick
          })
        }

        // KAST - traded: if victim killed attacker recently (within ~128 ticks = 2s)
        if (attackerSteamId) {
          const prevDeath = recentDeaths.get(attackerSteamId)
          if (prevDeath && (demo.currentTick - prevDeath.tick) < 128) {
            // Victim was traded — counts for KAST
            vp.kastRounds.add(currentRound)
          }
        }
      }

      // Skip team kills and suicides
      if (!attackerSteamId || attackerSteamId === victimSteamId) return
      if (attacker?.teamNumber === victim?.teamNumber) return

      // Attacker kill
      if (attacker) {
        const ap = getOrInitPlayer(attackerSteamId!, attacker)
        ap.kills++
        ap.roundKills++
        ap.kastRounds.add(currentRound)

        if (e.headshot) ap.headshots++
        if (e.penetratedObjects > 0) ap.wallbangKills++
        if (e.throughSmoke) ap.smokeKills++
      }

      // Assister
      if (assisterSteamId && assister) {
        const asp = getOrInitPlayer(assisterSteamId, assister)
        asp.assists++
        asp.kastRounds.add(currentRound)
      }
    })

    // ── Track damage ─────────────────────────────────────────────────────────
    demo.gameEvents.on('player_hurt', (e: any) => {
      const attacker = demo.entities.getByUserId(e.attackerId)
      const victim = demo.entities.getByUserId(e.userid)
      const attackerSteamId = attacker?.steam64Id?.toString()

      if (!attackerSteamId || !attacker) return
      if (attacker?.teamNumber === victim?.teamNumber) return

      const p = getOrInitPlayer(attackerSteamId, attacker)
      p.damage += Math.min(e.dmgHealth, 100) // cap at 100 (can't deal more than 100 hp)
      p.shotsHit++
    })

    // ── Track shots fired ────────────────────────────────────────────────────
    demo.gameEvents.on('weapon_fire', (e: any) => {
      const player = demo.entities.getByUserId(e.userid)
      const steamId = player?.steam64Id?.toString()
      if (!steamId || !player) return

      // Skip grenades, knives
      const weapon = e.weapon || ''
      if (weapon.includes('grenade') || weapon.includes('knife') || 
          weapon.includes('hegrenade') || weapon.includes('flashbang') ||
          weapon.includes('smokegrenade') || weapon.includes('molotov') ||
          weapon.includes('decoy')) return

      const p = getOrInitPlayer(steamId, player)
      p.shotsFired++
    })

    // ── Track MVPs ───────────────────────────────────────────────────────────
    demo.gameEvents.on('round_mvp', (e: any) => {
      const player = demo.entities.getByUserId(e.userid)
      const steamId = player?.steam64Id?.toString()
      if (!steamId || !player) return

      const p = getOrInitPlayer(steamId, player)
      p.mvps++
    })

    // ── Track round end ──────────────────────────────────────────────────────
    demo.gameEvents.on('round_end', (e: any) => {
      totalRounds++
      currentRound = totalRounds

      if (e.winner === 2) scoreTeam2++
      if (e.winner === 3) scoreTeam3++

      // Process multikills and clutches for this round
      for (const [steamId, p] of players.entries()) {
        // Multikills
        if (p.roundKills === 3) p.kills3++
        if (p.roundKills === 4) p.kills4++
        if (p.roundKills === 5) p.kills5++

        // KAST - Survived
        if (p.isAlive) {
          p.kastRounds.add(totalRounds)
        }

        // Clutch detection: was this player last alive on their team?
        // Count alive enemies
        let aliveEnemies = 0
        let aliveTeammates = 0
        for (const [otherId, other] of players.entries()) {
          if (otherId === steamId) continue
          if (!other.isAlive) continue
          if (other.teamNumber === p.teamNumber) aliveTeammates++
          else aliveEnemies++
        }

        if (aliveTeammates === 0 && p.isAlive && p.roundKills > 0) {
          // Player was in a clutch situation this round
          const clutchType = aliveEnemies + 1 // +1 because they killed the last one
          if (clutchType === 2) p.clutch1v1++
          else if (clutchType === 3) p.clutch1v2++
          else if (clutchType === 4) p.clutch1v3++
          else if (clutchType === 5) p.clutch1v4++
          else if (clutchType === 6) p.clutch1v5++
        }

        // Store round kills history and reset
        p.roundKillsHistory.push(p.roundKills)
        p.roundKills = 0
        p.isAlive = true // reset for next round
      }

      recentDeaths.clear()
    })

    // ── Round start reset ────────────────────────────────────────────────────
    demo.gameEvents.on('round_start', () => {
      for (const p of players.values()) {
        p.isAlive = true
        p.roundKills = 0
      }
    })

    // ── End of demo ──────────────────────────────────────────────────────────
    demo.on('end', (e: any) => {
      if (e.error) {
        console.error('[Parser] Demo parse error:', e.error)
        return reject(e.error)
      }

      console.log(`[Parser] Parsed ${totalRounds} rounds, ${players.size} players`)
      console.log(`[Parser] Score: ${scoreTeam2} - ${scoreTeam3}`)

      const rounds = totalRounds || 1
      const parsedPlayers: ParsedPlayerStats[] = []

      for (const [steamId, p] of players.entries()) {
        // Skip bots (no steam ID)
        if (!steamId || steamId === '0') continue

        const kd = p.deaths > 0 ? p.kills / p.deaths : p.kills
        const hsPercent = p.kills > 0 ? (p.headshots / p.kills) * 100 : 0
        const adr = p.damage / rounds
        const accuracy = p.shotsFired > 0 ? (p.shotsHit / p.shotsFired) * 100 : 0
        const kast = (p.kastRounds.size / rounds) * 100

        // HLTV Rating 2.0 formula
        const kpr = p.kills / rounds
        const dpr = p.deaths / rounds
        const impact = (2.13 * kpr) + (0.42 * (p.assists / rounds)) - 0.41
        const rating = Math.max(0,
          (0.0073 * 50) +
          (0.3591 * kpr) +
          (-0.5329 * dpr) +
          (0.2372 * impact) +
          (0.0032 * adr) +
          0.1587
        )

        // Determine result
        const teamScore = p.teamNumber === 2 ? scoreTeam2 : scoreTeam3
        const otherScore = p.teamNumber === 2 ? scoreTeam3 : scoreTeam2
        const result: 'WIN' | 'LOSS' | 'TIE' =
          teamScore > otherScore ? 'WIN' :
          teamScore < otherScore ? 'LOSS' : 'TIE'

        parsedPlayers.push({
          steamId,
          name: p.name,
          teamNumber: p.teamNumber,
          result,
          kills: p.kills,
          deaths: p.deaths,
          assists: p.assists,
          headshots: p.headshots,
          hsPercent: Math.round(hsPercent * 10) / 10,
          damage: p.damage,
          adr: Math.round(adr * 10) / 10,
          kd: Math.round(kd * 100) / 100,
          plusMinus: p.kills - p.deaths,
          mvps: p.mvps,
          kills3: p.kills3,
          kills4: p.kills4,
          kills5: p.kills5,
          clutch1v1: p.clutch1v1,
          clutch1v2: p.clutch1v2,
          clutch1v3: p.clutch1v3,
          clutch1v4: p.clutch1v4,
          clutch1v5: p.clutch1v5,
          wallbangKills: p.wallbangKills,
          smokeKills: p.smokeKills,
          shotsFired: p.shotsFired,
          shotsHit: p.shotsHit,
          accuracy: Math.round(accuracy * 10) / 10,
          kast: Math.round(kast * 10) / 10,
          rating: Math.round(rating * 1000) / 1000,
          premierRatingBefore: p.premierRatingBefore,
          premierRatingAfter: p.premierRatingAfter,
          premierDelta: p.premierRatingBefore && p.premierRatingAfter
            ? p.premierRatingAfter - p.premierRatingBefore
            : undefined
        })
      }

      resolve({
        map,
        playedAt: new Date(),
        scoreTeam1: scoreTeam2,
        scoreTeam2: scoreTeam3,
        totalRounds,
        players: parsedPlayers
      })
    })

    try {
      demo.parse(buffer)
    } catch (e) {
      reject(e)
    }
  })
}