import SteamUser from 'steam-user'
import GlobalOffensive from 'globaloffensive'
import { createWriteStream, mkdirSync, existsSync } from 'fs'
import { promisify } from 'util'
import { pipeline } from 'stream'
import path from 'path'
import https from 'https'

const streamPipeline = promisify(pipeline)

// ─── Share Code Decoder ───────────────────────────────────────────────────────
// Based on Valve's share code algorithm
const DICTIONARY = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefhijkmnpqrstuvwxyz23456789'

function decodeShareCode(shareCode: string): {
  matchId: bigint
  outcomeid: bigint
  token: number
} {
  const clean = shareCode.replace('CSGO-', '').replace(/-/g, '')
  
  let num = BigInt(0)
  for (let i = clean.length - 1; i >= 0; i--) {
    const idx = DICTIONARY.indexOf(clean[i])
    if (idx === -1) throw new Error(`Invalid character: ${clean[i]}`)
    num = num * BigInt(DICTIONARY.length) + BigInt(idx)
  }

  // Extract the three components
  const bytes = []
  for (let i = 0; i < 18; i++) {
    bytes.push(Number(num & BigInt(0xff)))
    num >>= BigInt(8)
  }

  const matchId = BigInt(0)
  let mId = BigInt(0)
  for (let i = 7; i >= 0; i--) {
    mId = (mId << BigInt(8)) | BigInt(bytes[i])
  }

  let oId = BigInt(0)
  for (let i = 15; i >= 8; i--) {
    oId = (oId << BigInt(8)) | BigInt(bytes[i])
  }

  const token = (bytes[17] << 8) | bytes[16]

  return { matchId: mId, outcomeid: oId, token }
}

// ─── Steam Bot ────────────────────────────────────────────────────────────────
export interface DemoInfo {
  demoUrl: string
  matchId: string
  map: string
  playedAt: Date
  scoreTeam1: number
  scoreTeam2: number
}

let client: SteamUser | null = null
let csgo: GlobalOffensive | null = null
let botReady = false
let botInitializing = false

export async function initSteamBot(): Promise<void> {
  if (botReady) return
  if (botInitializing) {
    // Wait for existing init to complete
    while (botInitializing) {
      await new Promise(r => setTimeout(r, 500))
    }
    return
  }

  botInitializing = true

  return new Promise((resolve, reject) => {
    client = new SteamUser()
    csgo = new GlobalOffensive(client)

    client.logOn({
      accountName: process.env.STEAM_BOT_USERNAME!,
      password: process.env.STEAM_BOT_PASSWORD!
    })

    client.on('loggedOn', () => {
      console.log('[Bot] Logged into Steam')
      client!.setPersona(SteamUser.EPersonaState.Online)
      client!.gamesPlayed([730])
    })

    client.on('error', (err) => {
      console.error('[Bot] Steam error:', err)
      botInitializing = false
      reject(err)
    })

    csgo!.on('connectedToGC', () => {
      console.log('[Bot] Connected to CS2 Game Coordinator')
      botReady = true
      botInitializing = false
      resolve()
    })

    // Timeout after 30s
    setTimeout(() => {
      if (!botReady) {
        botInitializing = false
        reject(new Error('Steam bot connection timed out'))
      }
    }, 30000)
  })
}

export async function getDemoInfo(shareCode: string): Promise<DemoInfo | null> {
  if (!botReady || !csgo) {
    throw new Error('Steam bot not initialized. Call initSteamBot() first.')
  }

  return new Promise((resolve) => {
    try {
      const decoded = decodeShareCode(shareCode)

      csgo!.requestGame({
        matchid: decoded.matchId,
        outcomeid: decoded.outcomeid,
        token: decoded.token
      })

      const timeout = setTimeout(() => {
        console.warn(`[Bot] Timeout getting demo info for ${shareCode}`)
        resolve(null)
      }, 15000)

      csgo!.once('matchList', (matches: any[]) => {
        clearTimeout(timeout)

        const match = matches?.[0]
        if (!match) {
          console.warn('[Bot] No match data returned')
          return resolve(null)
        }

        // Get the last round stats (has final scores)
        const lastRound = match.roundstatsall?.[match.roundstatsall.length - 1]
        if (!lastRound) return resolve(null)

        const demoUrl = lastRound.map
        const matchId = match.matchid?.toString()
        const playedAt = new Date((match.matchtime || 0) * 1000)

        // Scores from the final round
        const scoreTeam1 = lastRound.teamScores?.[0] || 0
        const scoreTeam2 = lastRound.teamScores?.[1] || 0

        // Map name from reservation
        const mapName = match.roundstatsall?.[0]?.reservation?.gameType?.toString() || 'unknown'

        resolve({
          demoUrl,
          matchId,
          map: mapName,
          playedAt,
          scoreTeam1,
          scoreTeam2
        })
      })
    } catch (e) {
      console.error('[Bot] Error requesting match:', e)
      resolve(null)
    }
  })
}

export async function downloadDemo(demoUrl: string, matchId: string): Promise<string> {
  const tmpDir = '/tmp/rated-demos'
  if (!existsSync(tmpDir)) {
    mkdirSync(tmpDir, { recursive: true })
  }

  const outputPath = path.join(tmpDir, `${matchId}.dem`)

  // If already downloaded, skip
  if (existsSync(outputPath)) {
    console.log(`[Downloader] Demo already exists: ${outputPath}`)
    return outputPath
  }

  console.log(`[Downloader] Downloading demo from ${demoUrl}`)

  return new Promise((resolve, reject) => {
    const file = createWriteStream(outputPath)

    https.get(demoUrl, (response) => {
      // Handle bzip2 decompression if needed
      if (demoUrl.endsWith('.bz2')) {
        // For bzip2, we need to decompress
        // npm install unbzip2-stream
        try {
          const unbzip2 = require('unbzip2-stream')
          response.pipe(unbzip2()).pipe(file)
        } catch {
          // Fallback: save as-is and handle later
          response.pipe(file)
        }
      } else {
        response.pipe(file)
      }

      file.on('finish', () => {
        file.close()
        console.log(`[Downloader] Demo saved to ${outputPath}`)
        resolve(outputPath)
      })
    }).on('error', (err) => {
      console.error('[Downloader] Download error:', err)
      reject(err)
    })
  })
}

export async function disconnectBot(): Promise<void> {
  if (client) {
    client.logOff()
    botReady = false
    console.log('[Bot] Disconnected from Steam')
  }
}