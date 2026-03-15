import SteamUser from 'steam-user'
import GlobalOffensive from 'globaloffensive'
import { createWriteStream, mkdirSync, existsSync, unlinkSync, promises as fsPromises } from 'fs'
import fs from 'fs'
import path from 'path'
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
import https from 'https'
import http from 'http'
import unbzip2 from 'unbzip2-stream' // Modern import since it's in package.json
import { decodeMatchShareCode } from 'csgo-sharecode'
import SteamID from 'steamid'
import { exec } from 'child_process'
import { promisify } from 'util'
const execAsync = promisify(exec)

export interface DemoInfo {
  demoUrl: string
  matchId: string
  map: string
  playedAt: Date
  scoreTeam1: number
  scoreTeam2: number
  premierRatings?: Record<string, number>
  gameMode?: string
}

let client: any = null
let csgo: any = null
let botReady = false
let botInitPromise: Promise<void> | null = null

export function isBotReady(): boolean {
  return botReady
}

export async function waitForBot(timeoutMs: number = 60000): Promise<boolean> {
  if (botReady) return true
  
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    if (botReady) return true
    await new Promise(r => setTimeout(r, 2000))
  }
  return botReady
}

export async function initSteamBot(): Promise<void> {
  if (botReady) return
  if (botInitPromise) return botInitPromise

  botInitPromise = new Promise<void>((resolve, reject) => {
    const username = process.env.STEAM_BOT_USERNAME
    const password = process.env.STEAM_BOT_PASSWORD

    if (!username || !password) {
      console.warn('[Bot] ⚠️ Bot credentials not set — demo downloads disabled')
      botInitPromise = null
      resolve()
      return
    }

    client = new SteamUser()
    csgo = new GlobalOffensive(client)

    console.log(`[Bot] Logging in as ${username}...`)
    client.logOn({ accountName: username, password })

    client.on('loggedOn', () => {
      console.log('[Bot] ✅ Logged into Steam')
      client.setPersona(SteamUser.EPersonaState.Online)
      setTimeout(() => {
        if (client.gamesPlayed) client.gamesPlayed([730])
      }, 2000)
    })

    client.on('error', (err: any) => {
      console.error('[Bot] ❌ Login error:', err.message)
      if (err.message === 'LoggedInElsewhere') {
        console.warn('[Bot] 🔄 Retrying login in 30s...')
        setTimeout(() => client.logOn({ accountName: username, password }), 30000)
      } else {
        botInitPromise = null
        reject(err)
      }
    })

    client.on('disconnected', (eresult: number, msg: string) => {
      console.warn(`[Bot] 🔌 Disconnected: ${eresult} (${msg}) - reconnecting...`)
      botReady = false
    })

    csgo.on('connectedToGC', () => {
      console.log('[Bot] ✅ Connected to CS2 GC — stabilizing...')
      // Give it a 3s grace period to stabilize GC session
      setTimeout(() => {
        console.log('[Bot] 🚀 System ready for demo requests')
        botReady = true
        resolve()
      }, 3000)
    })

    setTimeout(() => {
      if (!botReady) {
        console.warn('[Bot] ⚠️ GC Connection timeout')
        botInitPromise = null
        reject(new Error('GC Timeout'))
      }
    }, 45000)
  })

  return botInitPromise
}

export async function getDemoInfo(shareCode: string): Promise<DemoInfo | null> {
  if (!botReady || !csgo) {
    console.error('[Bot] Not ready')
    return null
  }

  if (!shareCode.toUpperCase().startsWith('CSGO-')) {
    console.error(`[Bot] ❌ Invalid share code format: ${shareCode}`)
    return null
  }

  return new Promise((resolve) => {
    try {
      const decoded = decodeMatchShareCode(shareCode)
      const matchIdStr = decoded.matchId.toString()
      console.log(`[Bot] 📡 Requesting matchId=${matchIdStr} token=${decoded.tvPort}`)

      // Use internal _send because the library's requestGame has a strict check that prevents requestType
      const Language = require('globaloffensive/language.js');
      const Protos = require('globaloffensive/protobufs/generated/_load.js');
      
      // Patch the encoder at runtime to support request_type (field id 4)
      const ProtoClass = Protos.CMsgGCCStrike15_v2_MatchListRequestFullGameInfo;
      const originalEncode = ProtoClass.encode;
      ProtoClass.encode = function(message: any, writer: any) {
        const w = originalEncode.call(this, message, writer);
        if (message.request_type !== undefined) {
          w.uint32(32).uint32(message.request_type); // Field 4, wire type 0
        }
        return w;
      };

      csgo._send(Language.MatchListRequestFullGameInfo, ProtoClass, {
        matchid: matchIdStr,
        outcomeid: decoded.reservationId.toString(),
        token: decoded.tvPort.toString(),
        request_type: 3
      });

      const timeout = setTimeout(() => {
        console.warn(`[Bot] Timeout for ${shareCode}`)
        csgo.removeListener('matchList', handler)
        resolve(null)
      }, 45000)

      async function handler(matches: any[]) {
        const match = matches?.find(m => m.matchid?.toString() === matchIdStr)
        if (match) {
          csgo.removeListener('matchList', handler)
          clearTimeout(timeout)
          
          // DEBUG: Dump full match structure to inspect where rankings are
          try {
            fs.writeFileSync(path.join(process.cwd(), 'debug_gc_match.json'), JSON.stringify(match, (key, value) =>
              typeof value === 'bigint' ? value.toString() : value, 2));
          } catch(e) {}

          console.log(`[Bot] FULL MATCH info received for ${matchIdStr}`)
          if (match.roundstats_legacy) {
            console.log(`[Bot] roundstats_legacy info:`, JSON.stringify(match.roundstats_legacy, null, 2));
          }

          const rounds = match.roundstatsall || []
          const lastRound = rounds[rounds.length - 1]

          if (!lastRound?.map) {
            console.warn(`[Bot] No demo URL in response for ${matchIdStr}`)
            return resolve(null)
          }

          const demoUrl = lastRound?.map || ''
          const rawScores = match.team_scores || lastRound?.team_scores || lastRound?.teamScores || match.roundstats_legacy?.team_scores || []
          const scoreTeam1 = Number(rawScores[0] || 0)
          const scoreTeam2 = Number(rawScores[1] || 0)
          
          const mapName = match.watchablematchinfo?.map || demoUrl.match(/de_[a-z0-9_]+/)?.[0] || 'unknown'

          // Game Mode Detection via game_type bit flags
          // bit 3 (8) + bit 9 (512) = 520 = Premier
          // bit 23 (8388608) = Wingman
          // bit 1 (2) = Competitive
          const gameTypeRaw = lastRound.reservation?.game_type || 0
          const numPlayers = (match.player_stats || []).length
          const maxRounds = match.max_rounds || 0
          
          let gameMode = 'competitive'
          const isPremier = (gameTypeRaw & 8) !== 0 && (gameTypeRaw & 512) !== 0
          const isWingman = (gameTypeRaw & 8388608) !== 0
          if (isWingman) gameMode = 'wingman'
          else if (isPremier) gameMode = 'premier'
          
          console.log(`[Bot] game_type: ${gameTypeRaw} -> ${gameMode}`)
          console.log(`[Bot] Results from GC: ${scoreTeam1}-${scoreTeam2} Mode: ${gameMode}`)

          // Extract Premier ratings for ALL 10 players
          const premierRatings: Record<string, number> = {}
          const playerStats = match.player_stats || []
          
          // 1. Try extracting from player_stats
          playerStats.forEach((ps: any, index: number) => {
            const accountId = ps.accountid
            const rank = Number(ps.rank || ps.premier_rating || 0)
            if (accountId && rank > 0) {
              const sid = (BigInt(accountId) + 76561197960265728n).toString()
              if (rank > 100) premierRatings[sid] = rank
            }
          })
          
          // 2. Try extracting from RICH rankings in reservation (Best for CS2)
          if (lastRound?.reservation?.rankings) {
            console.log(`[Bot] Found RICH rankings in reservation: ${lastRound.reservation.rankings.length} entries`);
            lastRound.reservation.rankings.forEach((r: any) => {
              if (r.account_id && r.rank_type_id === 11 && r.rank_id > 0) {
                const sid = (BigInt(r.account_id) + 76561197960265728n).toString()
                premierRatings[sid] = r.rank_id
              }
            });
          }
          
          if (Object.keys(premierRatings).length > 0) {
            console.log(`[Bot] 📊 Captured Premier ratings for ${Object.keys(premierRatings).length} players in match ${matchIdStr}`)
          }

          // Try requestPlayersProfile (GC Probe) if bot is prime/friend it might work
          const reservationAccountIds = lastRound.reservation?.account_ids || []
          if (reservationAccountIds.length > 0) {
            reservationAccountIds.forEach((id: any) => {
              const steamId64 = (BigInt(id) + 76561197960265728n).toString()
              if (premierRatings[steamId64]) return;

              const sid = new SteamID(steamId64)
              csgo.requestPlayersProfile(sid, (data: any) => {
                if (data?.rankings) {
                    const premier = data.rankings.find((r: any) => r.rank_type_id === 11);
                    if (premier && premier.rank_id > 0) {
                      premierRatings[steamId64] = premier.rank_id;
                    }
                }
              });
            });
            // Brief wait for probes
            await new Promise(r => setTimeout(r, 2000));
          }

          console.log(`[Bot] ✅ Found Demo: ${mapName} ${scoreTeam1}-${scoreTeam2} (Ratings: ${Object.keys(premierRatings).length})`)
          return resolve({
            demoUrl,
            matchId: matchIdStr,
            map: mapName,
            playedAt: new Date((match.matchtime || 0) * 1000), 
            scoreTeam1,
            scoreTeam2,
            premierRatings,
            gameMode
          })
        }
      }

      csgo.on('matchList', handler)
    } catch (e: any) {
      console.error('[Bot] Error:', e.message)
      resolve(null)
    }
  })
}

/**
 * Fetch Live Premier Rating for a player
 * Uses requestPlayersProfile to get data directly from CS2 GC
 */
export async function getPlayerRating(steamId64: string): Promise<{ rating: number, rank: number } | null> {
  if (!botReady || !csgo) {
    console.log('[Bot] ❌ Bot not ready for rating fetch');
    return null;
  }

  return new Promise((resolve) => {
    let resolved = false;

    const timeout = setTimeout(() => {
      if (!resolved) {
        console.log(`[Bot] ⏳ Timeout fetching rating for ${steamId64} (GC usually ignores non-friends)`);
        resolved = true;
        resolve(null);
      }
    }, 8000);

    try {
      // Use requestPlayersProfile - it handles SteamID64 strings directly
      const sid = new SteamID(steamId64)
      csgo.requestPlayersProfile(sid, (data: any) => {
        if (resolved) return;
        
        console.log(`[Bot] 📡 Received Profile Data for ${steamId64}:`, JSON.stringify(data, null, 2));
        
        // Detailed check for CS2 rankings
        let rating = 0;
        let rank = 0;

        if (data?.rankings && Array.isArray(data.rankings)) {
          // CS2 Premier is type 11. Type 6 was CS:GO.
          const premier = data.rankings.find((r: any) => r.rank_type_id === 11 || r.rank_type_id === 6);
          if (premier) {
            rating = premier.rank_id || 0;
            rank = premier.world_rank || 0;
          }
        } else if (data?.ranking) {
          rating = data.ranking.rank_id || 0;
          rank = data.ranking.world_rank || 0;
        }

        if (rating > 0) {
          resolved = true;
          clearTimeout(timeout);
          console.log(`[Bot] ✅ Found Rating: ${rating} (#${rank})`);
          resolve({ rating, rank });
        } else {
          // If the profile returned but no rating, resolve null
          resolved = true;
          clearTimeout(timeout);
          console.log(`[Bot] ℹ️ Profile fetched but no Premier rating found for ${steamId64}`);
          resolve(null);
        }
      });
    } catch (e: any) {
      console.error(`[Bot] ❌ Error in requestPlayersProfile:`, e.message);
      if (!resolved) {
        resolved = true;
        clearTimeout(timeout);
        resolve(null);
      }
    }
  });
}

export async function downloadDemo(demoUrl: string, matchId: string): Promise<string> {
  const tempDir = path.resolve(process.cwd(), 'temp-demos')
  if (!existsSync(tempDir)) mkdirSync(tempDir, { recursive: true })
  const outputPath = path.join(tempDir, `${matchId}.dem`)

  // If file exists, check if it's potentially corrupted (very small size)
  if (existsSync(outputPath)) {
    const stats = await fsPromises.stat(outputPath).catch(() => null)
    if (stats && stats.size > 1000000) { // > 1MB usually
      console.log(`[Downloader] Already exists and seems valid: ${outputPath}`)
      return outputPath
    }
    console.log(`[Downloader] Existing file is too small or invalid, redownloading...`)
    try { unlinkSync(outputPath) } catch {}
  }

  console.log(`[Downloader] Downloading: ${demoUrl.substring(0, 50)}...`)

  // Internal retry counter logic
  const currentAttempt = (arguments[2] || 0) + 1;

  return new Promise((resolve, reject) => {
    const file = createWriteStream(outputPath)
    const protocol = demoUrl.startsWith('https') ? https : http

    const req = protocol.get(demoUrl, (response) => {
      if (response.statusCode === 301 || response.statusCode === 302) {
        const loc = response.headers.location
        if (!loc) return reject(new Error('Redirect with no location'))
        file.close()
        try { unlinkSync(outputPath) } catch {}
        return downloadDemo(loc, matchId).then(resolve).catch(reject)
      }

      if (response.statusCode && [502, 503, 504].includes(response.statusCode)) {
        file.close()
        try { unlinkSync(outputPath) } catch {}
        
        if (currentAttempt < 3) {
          console.warn(`[Downloader] Valve returned ${response.statusCode}. Internal retry ${currentAttempt}/3 in 5s...`)
          return new Promise(r => setTimeout(r, 5000))
            .then(() => (downloadDemo as any)(demoUrl, matchId, currentAttempt))
            .then(resolve)
            .catch(reject)
        } else {
          return reject(new Error(`Valve persistent error ${response.statusCode} after ${currentAttempt} internal tries`))
        }
      }

      if (response.statusCode !== 200) {
        file.close()
        try { unlinkSync(outputPath) } catch {}
        return reject(new Error(`HTTP ${response.statusCode} for ${demoUrl}`))
      }

      const isCompressed = demoUrl.toLowerCase().endsWith('.bz2')
      let downloadedBytes = 0
      let lastLog = 0

      response.on('data', (chunk) => {
        downloadedBytes += chunk.length
        // Log every 10MB
        if (downloadedBytes - lastLog > 10 * 1024 * 1024) {
          console.log(`[Downloader] Progress: ${(downloadedBytes / (1024 * 1024)).toFixed(1)} MB...`)
          lastLog = downloadedBytes
        }
      })

      // Pipe chain with error propagation
      let pipeline: any = response
      if (isCompressed) {
        console.log(`[Downloader] Decompressing BZ2 stream...`)
        const decompressor = unbzip2()
        decompressor.on('error', (err: any) => {
          console.error('[Downloader] ❌ Decompression error:', err.message)
          file.destroy()
          reject(err)
        })
        pipeline = response.pipe(decompressor)
      }

      const expectedSize = parseInt(response.headers['content-length'] || '0')
      
      pipeline.pipe(file)

      file.on('finish', () => {
        file.close()
        
        // Final verification
        if (expectedSize > 0 && downloadedBytes < expectedSize) {
           console.error(`[Downloader] ❌ Incomplete download: ${downloadedBytes}/${expectedSize} bytes`)
           try { unlinkSync(outputPath) } catch {}
           return reject(new Error('Incomplete download — connection closed early'))
        }

        console.log(`[Downloader] ✅ Completed download: ${matchId}.dem (${(downloadedBytes / (1024 * 1024)).toFixed(1)} MB)`)
        resolve(outputPath)
      })

      file.on('error', (err) => {
        file.destroy()
        try { unlinkSync(outputPath) } catch {}
        reject(err)
      })

      response.on('error', (err) => {
        file.destroy()
        try { unlinkSync(outputPath) } catch {}
        reject(err)
      })
    })

    req.on('error', (err) => {
      file.destroy()
      try { unlinkSync(outputPath) } catch {}
      reject(err)
    })
    
    req.setTimeout(600000, () => { // 10 min timeout for download
      req.destroy()
      reject(new Error('Download timed out'))
    })
  })
}

export async function disconnectBot(): Promise<void> {
  if (client) {
    client.logOff()
    botReady = false
    console.log('[Bot] Disconnected')
  }
}