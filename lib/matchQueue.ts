import { Queue, Worker } from 'bullmq'
import { crawlShareCodes, markCodeProcessed } from './matchCrawler'
import { getDemoInfo, downloadDemo, initSteamBot, waitForBot, isBotReady } from './demoDownloader'
import { parseDemo } from './demoParser'
import { analyzeTickData } from './tickParser'
import { saveMatch, saveTickStats } from './matchSaver'
import fs from 'fs'
import path from 'path'
import 'dotenv/config'

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379'
console.log(`[Queue] 📡 Redis URL: ${REDIS_URL.substring(0, 15)}...`)

// Correctly parse the URL to bypass BullMQ's string evaluation issues
// and avoid IORedis version mismatch lint errors by using connection options object
const url = new URL(REDIS_URL)

const connectionOptions = {
  host: url.hostname,
  port: parseInt(url.port || '6379'),
  password: url.password || undefined,
  username: url.username || undefined,
  maxRetriesPerRequest: null,
  enableReadyCheck: false
}

export const crawlQueue = new Queue('crawl', { connection: connectionOptions })
export const demoQueue = new Queue('demos', { connection: connectionOptions })

// ── Error handling for queues ────────────────────────────────────────────────
crawlQueue.on('error', (err) => console.error('[Queue] 🚨 Crawl queue connection error:', err.message))
demoQueue.on('error', (err) => console.error('[Queue] 🚨 Demos queue connection error:', err.message))

// Bot init is now handled in server.ts for explicit startup sync

// Worker 1: Crawl share codes
new Worker('crawl', async (job) => {
  const { steamId, authCode, lastShareCode } = job.data
  console.log(`[CrawlWorker] Crawling for ${steamId}`)

  const newCodes = await crawlShareCodes(steamId, authCode, lastShareCode)
  console.log(`[CrawlWorker] Found ${newCodes.length} new codes`)

  for (const shareCode of newCodes) {
    await demoQueue.add('process-demo', { shareCode, steamId }, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 5000 }
    })
  }

  return { found: newCodes.length }
}, { connection: connectionOptions, concurrency: 1 })
  .on('failed', (job, err) => console.error(`[CrawlWorker] Failed:`, err?.message))

// Worker 2: Download + Event Parse + Tick Parse + Save
new Worker('demos', async (job) => {
  const { shareCode, steamId } = job.data
  console.log(`[DemoWorker] 🛠️ Processing ${shareCode}`)

  // Step 0: Ensure bot is ready
  if (!isBotReady()) {
    console.log(`[DemoWorker] ⏳ Waiting for Steam bot to be ready...`)
  }
  const isReady = await waitForBot(60000)
  if (!isReady) {
    throw new Error(`Steam bot not ready — skipping ${shareCode}`)
  }

  // Step 1: Get demo URL from GC
  console.log(`[DemoWorker] 📡 Requesting GC...`)
  const demoInfo = await getDemoInfo(shareCode)
  if (!demoInfo) throw new Error(`Could not get demo URL for ${shareCode}`)

  // No date filter for now to ensure all queued matches process

  // Step 2: Download demo
  console.log(`[DemoWorker] ⬇️ Downloading demo...`)
  const demoPathRaw = await downloadDemo(demoInfo.demoUrl, demoInfo.matchId)
  const demoPath = path.resolve(demoPathRaw)

  // Step 3: Event-based parse (kills, damage, clutches, KAST, rating...)
  console.log(`[DemoWorker] 🧠 Event parsing...`)
  const parsed = await parseDemo(demoPath)
  console.log(`[DemoWorker] ${parsed.map} | ${parsed.scoreTeam1}-${parsed.scoreTeam2} | ${parsed.players.length} players`)

  // Step 4: Save event stats to Supabase
  console.log(`[DemoWorker] 💾 Saving event stats...`)
  const officialScores = (demoInfo.scoreTeam1 > 0 || demoInfo.scoreTeam2 > 0)
  ? { team1: demoInfo.scoreTeam1, team2: demoInfo.scoreTeam2 }
  : undefined
  const matchId = await saveMatch(
    shareCode, 
    parsed, 
    demoInfo.demoUrl, 
    demoInfo.playedAt, 
    demoInfo.matchId, 
    demoInfo.premierRatings,
    officialScores,
    demoInfo.gameMode
  )
  await markCodeProcessed(shareCode)

  // Step 5: Tick-by-tick analysis
  console.log(`[DemoWorker] 🎯 Running tick-by-tick analysis...`)
  const tickStats = await Promise.race([
      analyzeTickData(demoPath),
      new Promise<null>((_, reject) => setTimeout(() => reject(new Error('Tick analysis timed out after 3 minutes')), 180000))
  ]).catch(err => {
      console.error(`[DemoWorker] ⚠️ Tick analysis failed/timed out: ${err.message}`)
      return null
  })

  if (tickStats && matchId) {
    console.log(`[DemoWorker] 💾 Saving tick stats for ${tickStats.players.length} players...`)
    await saveTickStats(matchId, tickStats.players)
  }

  // Step 6: Cleanup temp demo file
  if (fs.existsSync(demoPath)) {
    fs.unlinkSync(demoPath)
    console.log(`[DemoWorker] 🗑️ Cleaned up`)
  }

  console.log(`[DemoWorker] ✅ Complete: ${demoInfo.matchId} on ${parsed.map}`)
  return { map: parsed.map, players: parsed.players.length }

}, {
  connection: connectionOptions,
  concurrency: 1,
  lockDuration: 600000 // 10 min lock — tick parsing is slow
}).on('failed', (job, err) => {
  console.error(`[DemoWorker] Job ${job?.id} failed: ${err?.message}`)
})

export async function queueUserSync(
  steamId: string,
  authCode: string,
  lastShareCode: string
): Promise<void> {
  await crawlQueue.add('crawl-user', { steamId, authCode, lastShareCode }, {
    attempts: 3,
    backoff: { type: 'exponential', delay: 3000 }
  })
  console.log(`[Queue] Queued sync for ${steamId}`)
}