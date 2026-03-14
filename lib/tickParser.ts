import { parseEvent, parseTicks } from '@laihoe/demoparser2'

// ─── Types ────────────────────────────────────────────────────────────────────
export interface TickStats {
  steamId: string
  // Neuro-Timing
  avgTimeToFirstDamage: number   // ms — from weapon_fire to player_hurt
  avgReactionTime: number        // ms — from enemy spotted to weapon_fire
  // Crosshair
  avgCrosshairDistance: number   // degrees off enemy head when firing
  preaim: number                 // % of shots where crosshair was already close before firing
}

export interface FullTickAnalysis {
  players: TickStats[]
  map: string
  totalRounds: number
}

// ─── Constants ────────────────────────────────────────────────────────────────
const TICK_RATE = 64               // CS2 tick rate
const MS_PER_TICK = 1000 / TICK_RATE  // ~15.625ms per tick
const PREAIM_THRESHOLD_DEG = 10    // crosshair within 10° of head = pre-aimed
const MAX_REACTION_TICKS = 60      // max 60 ticks (~937ms) for valid reaction
const MAX_TTD_TICKS = 45           // max 45 ticks (~703ms) for valid TTD

// ─── Main tick analysis function ──────────────────────────────────────────────
export async function analyzeTickData(demoPath: string): Promise<FullTickAnalysis | null> {
  try {
    console.log(`[TickParser] Analyzing ${demoPath}...`)
    const start = Date.now()

    // ── 1. Parse all events we need ───────────────────────────────────────────
    const deaths = parseEvent(demoPath, 'player_death', 
      ['X', 'Y', 'Z', 'pitch', 'yaw'],
      ['total_rounds_played']
    )

    const hurts = parseEvent(demoPath, 'player_hurt',
      ['X', 'Y', 'Z'],
      ['total_rounds_played']
    )

    const fires = parseEvent(demoPath, 'weapon_fire',
      ['X', 'Y', 'Z', 'pitch', 'yaw'],
      ['total_rounds_played']
    )

    // ── 2. Parse tick-by-tick positions and angles ────────────────────────────
    // Only request what we need — keeps memory manageable
    const ticks = parseTicks(demoPath, [
      'X', 'Y', 'Z',
      'pitch', 'yaw',
      'is_alive',
      'team_num',
      'steamid'
    ])

    console.log(`[TickParser] Parsed ${ticks.length} ticks, ${fires.length} shots, ${hurts.length} hurts`)

    // ── 3. Build player map from ticks ────────────────────────────────────────
    // Group ticks by steamid for fast lookup: steamid -> tick -> {x,y,z,pitch,yaw}
    const playerTickMap = new Map<string, Map<number, {
      x: number, y: number, z: number,
      pitch: number, yaw: number,
      isAlive: boolean, team: number
    }>>()

    for (const tick of ticks) {
      const sid = tick.steamid?.toString()
      if (!sid) continue

      if (!playerTickMap.has(sid)) playerTickMap.set(sid, new Map())
      playerTickMap.get(sid)!.set(tick.tick, {
        x: tick.X || 0,
        y: tick.Y || 0,
        z: tick.Z || 0,
        pitch: tick.pitch || 0,
        yaw: tick.yaw || 0,
        isAlive: tick.is_alive || false,
        team: tick.team_num || 0
      })
    }

    // ── 4. Calculate Time To Damage (TTD) ─────────────────────────────────────
    // For each weapon_fire → find the next player_hurt by same attacker in ~45 ticks
    const ttdByPlayer = new Map<string, number[]>()

    // Index hurts by attacker for fast lookup
    const hurtsByAttacker = new Map<string, typeof hurts>()
    for (const hurt of hurts) {
      const sid = hurt.attacker_steamid?.toString()
      if (!sid) continue
      if (!hurtsByAttacker.has(sid)) hurtsByAttacker.set(sid, [])
      hurtsByAttacker.get(sid)!.push(hurt)
    }

    for (const fire of fires) {
      const sid = fire.user_steamid?.toString()
      if (!sid || isUtility(fire.weapon || '')) continue

      const fireTick = fire.tick
      const attackerHurts = hurtsByAttacker.get(sid) || []

      // Optimization: binary search or limited slice search
      for (const h of attackerHurts) {
          if (h.tick >= fireTick && h.tick <= fireTick + MAX_TTD_TICKS) {
              const ttdMs = (h.tick - fireTick) * MS_PER_TICK
              if (!ttdByPlayer.has(sid)) ttdByPlayer.set(sid, [])
              ttdByPlayer.get(sid)!.push(ttdMs)
              break
          }
          if (h.tick > fireTick + MAX_TTD_TICKS) break
      }
    }

    // ── 5. Calculate Reaction Time ────────────────────────────────────────────
    // Reaction = ticks between enemy becoming visible and player firing
    // Approximate: find when an enemy first enters player's FOV before a kill
    const reactionByPlayer = new Map<string, number[]>()

    for (const death of deaths) {
      const killerSid = death.attacker_steamid?.toString()
      const victimSid = death.user_steamid?.toString()
      if (!killerSid || !victimSid || killerSid === victimSid) continue

      const deathTick = death.tick

      // Walk backwards to find when killer first had LOS on victim
      const killerTicks = playerTickMap.get(killerSid)
      const victimTicks = playerTickMap.get(victimSid)
      if (!killerTicks || !victimTicks) continue

      let firstSpottedTick: number | null = null

      // Check up to MAX_REACTION_TICKS before the kill
      for (let t = deathTick - MAX_REACTION_TICKS; t <= deathTick; t++) {
        const killer = killerTicks.get(t)
        const victim = victimTicks.get(t)
        if (!killer || !victim) continue

        const angleDiff = getAngleDiff(
          killer.pitch, killer.yaw,
          killer.x, killer.y, killer.z,
          victim.x, victim.y, victim.z
        )

        // If victim was within 90° FOV of killer
        if (angleDiff < 90) {
          if (firstSpottedTick === null) firstSpottedTick = t
        } else {
          firstSpottedTick = null // reset if they lost sight
        }
      }

      // Find when killer fired after spotting
      if (firstSpottedTick !== null) {
        const firstFireAfterSpot = fires.find(f =>
          f.user_steamid?.toString() === killerSid &&
          f.tick >= firstSpottedTick! &&
          f.tick <= deathTick &&
          !isUtility(f.weapon || '')
        )

        if (firstFireAfterSpot) {
          const reactionMs = (firstFireAfterSpot.tick - firstSpottedTick) * MS_PER_TICK
          if (reactionMs > 0 && reactionMs < MAX_REACTION_TICKS * MS_PER_TICK) {
            if (!reactionByPlayer.has(killerSid)) reactionByPlayer.set(killerSid, [])
            reactionByPlayer.get(killerSid)!.push(reactionMs)
          }
        }
      }
    }

    // ── 6. Calculate Crosshair Placement + Preaim ─────────────────────────────
    const crosshairByPlayer = new Map<string, number[]>()
    const preaim = new Map<string, { preAimed: number, total: number }>()

    for (const fire of fires) {
      const sid = fire.user_steamid?.toString()
      if (!sid || isUtility(fire.weapon || '')) continue

      const fireTick = fire.tick
      const killerPos = playerTickMap.get(sid)?.get(fireTick)
      if (!killerPos) continue

      // Find nearest enemy at this tick
      let minAngle = Infinity
      let wasPreAimed = false

      for (const [enemySid, enemyTicks] of playerTickMap.entries()) {
        if (enemySid === sid) continue

        const enemyPos = enemyTicks.get(fireTick)
        if (!enemyPos || !enemyPos.isAlive) continue

        // Check they're on opposite teams
        const killerTeam = killerPos.team
        if (enemyPos.team === killerTeam || enemyPos.team === 0) continue

        // Angle between crosshair and enemy head
        const angleDiff = getAngleDiff(
          killerPos.pitch, killerPos.yaw,
          killerPos.x, killerPos.y, killerPos.z,
          enemyPos.x, enemyPos.y, enemyPos.z + 64 // +64 = head height approx
        )

        if (angleDiff < minAngle) {
          minAngle = angleDiff

          // Preaim: check if crosshair was already close 3 ticks BEFORE firing
          const preTick = fireTick - 3
          const preKillerPos = playerTickMap.get(sid)?.get(preTick)
          const preEnemyPos = enemyTicks.get(preTick)

          if (preKillerPos && preEnemyPos) {
            const preAngle = getAngleDiff(
              preKillerPos.pitch, preKillerPos.yaw,
              preKillerPos.x, preKillerPos.y, preKillerPos.z,
              preEnemyPos.x, preEnemyPos.y, preEnemyPos.z + 64
            )
            wasPreAimed = preAngle < PREAIM_THRESHOLD_DEG
          }
        }
      }

      if (minAngle < 180) {
        if (!crosshairByPlayer.has(sid)) crosshairByPlayer.set(sid, [])
        crosshairByPlayer.get(sid)!.push(minAngle)

        if (!preaim.has(sid)) preaim.set(sid, { preAimed: 0, total: 0 })
        const p = preaim.get(sid)!
        p.total++
        if (wasPreAimed) p.preAimed++
      }
    }

    // ── 7. Aggregate results per player ───────────────────────────────────────
    const allSteamIds = new Set<string>([
      ...ttdByPlayer.keys(),
      ...reactionByPlayer.keys(),
      ...crosshairByPlayer.keys()
    ])

    const playerStats: TickStats[] = []

    for (const steamId of allSteamIds) {
      const ttds = ttdByPlayer.get(steamId) || []
      const reactions = reactionByPlayer.get(steamId) || []
      const crosshairs = crosshairByPlayer.get(steamId) || []
      const preaims = preaim.get(steamId) || { preAimed: 0, total: 0 }

      // Use median instead of mean — more robust against outliers
      const avgTTD = ttds.length > 0 ? median(ttds) : 0
      const avgReaction = reactions.length > 0 ? median(reactions) : 0
      const avgCrosshair = crosshairs.length > 0 ? median(crosshairs) : 0
      const preaiming = preaims.total > 0
        ? (preaims.preAimed / preaims.total) * 100
        : 0

      playerStats.push({
        steamId,
        avgTimeToFirstDamage: Math.round(avgTTD),
        avgReactionTime: Math.round(avgReaction),
        avgCrosshairDistance: Math.round(avgCrosshair * 10) / 10,
        preaim: Math.round(preaiming * 10) / 10
      })
    }

    const elapsed = Date.now() - start
    console.log(`[TickParser] ✅ Done in ${elapsed}ms — ${playerStats.length} players analyzed`)

    return {
      players: playerStats,
      map: 'unknown',
      totalRounds: deaths.length > 0 ? Math.max(...deaths.map((d: any) => d.total_rounds_played || 0)) : 0
    }

  } catch (e: any) {
    console.error('[TickParser] ❌ Error:', e.message)
    return null
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Calculate angle difference between where a player is aiming
 * and where a target actually is.
 * Returns degrees (0° = perfect aim)
 */
function getAngleDiff(
  pitch: number, yaw: number,           // shooter's view angles
  sx: number, sy: number, sz: number,   // shooter position
  tx: number, ty: number, tz: number    // target position
): number {
  // Vector from shooter to target
  const dx = tx - sx
  const dy = ty - sy
  const dz = tz - sz

  const dist = Math.sqrt(dx * dx + dy * dy + dz * dz)
  if (dist === 0) return 180

  // Target angles
  const targetYaw = Math.atan2(dy, dx) * (180 / Math.PI)
  const targetPitch = -Math.atan2(dz, Math.sqrt(dx * dx + dy * dy)) * (180 / Math.PI)

  // Normalize angle difference
  let yawDiff = Math.abs(normalizeAngle(yaw - targetYaw))
  let pitchDiff = Math.abs(normalizeAngle(pitch - targetPitch))

  // Combined angle difference
  return Math.sqrt(yawDiff * yawDiff + pitchDiff * pitchDiff)
}

function normalizeAngle(angle: number): number {
  while (angle > 180) angle -= 360
  while (angle < -180) angle += 360
  return angle
}

function median(values: number[]): number {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 !== 0
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2
}

function isUtility(weapon: string): boolean {
  return weapon.includes('grenade') ||
    weapon.includes('flash') ||
    weapon.includes('smoke') ||
    weapon.includes('molotov') ||
    weapon.includes('decoy') ||
    weapon.includes('knife') ||
    weapon.includes('incendiary') ||
    weapon === 'weapon_c4'
}