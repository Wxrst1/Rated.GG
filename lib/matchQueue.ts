import { Queue, Worker } from 'bullmq'
import { crawlShareCodes } from './matchCrawler'
import { getDemoUrl, downloadDemo } from './demoDownloader'
import { parseDemo } from './demoParser'
import { saveMatch } from './matchSaver'
import fs from 'fs'

const connection = { 
  url: process.env.REDIS_URL || 'redis://localhost:6379'
}

// Queues
export const crawlQueue = new Queue('crawl', { connection })
export const demoQueue = new Queue('demos', { connection })

// Worker 1: crawl share codes
new Worker('crawl', async (job) => {
  const { steamId, authCode, lastShareCode } = job.data
  const newCodes = await crawlShareCodes(steamId, authCode, lastShareCode)
  
  // Add each new code to demo queue
  for (const shareCode of newCodes) {
    await demoQueue.add('process-demo', { shareCode, steamId })
  }
  
  return { found: newCodes.length }
}, { connection, concurrency: 3 })

// Worker 2: download + parse + save demos
new Worker('demos', async (job) => {
  const { shareCode, steamId } = job.data
  console.log(`[DemoWorker] 🛠️ Processing ${shareCode} for ${steamId}...`);

  // Download
  console.log(`[DemoWorker] 📥 Requesting Valve URL...`);
  const demoInfo = await getDemoUrl(shareCode)
  if (!demoInfo) {
      console.error(`[DemoWorker] ❌ Failed to get demo URL for ${shareCode}. Is the share code still valid?`);
      throw new Error('Could not get demo URL');
  }
  
  console.log(`[DemoWorker] 📦 Downloading ${demoInfo.matchId}.dem...`);
  const demoPath = await downloadDemo(demoInfo.demoUrl, demoInfo.matchId)

  // Parse
  console.log(`[DemoWorker] 🧠 Analyzing game telemetry...`);
  const parsed = await parseDemo(demoPath)

  // Save (all 10 players + ghost profiles)
  console.log(`[DemoWorker] 💾 Persisting results to Dossier DB...`);
  await saveMatch(shareCode, parsed, demoInfo.demoUrl)

  // Cleanup
  console.log(`[DemoWorker] 🧹 Cleaning up temporary assets...`);
  if (fs.existsSync(demoPath)) {
      fs.unlinkSync(demoPath)
  }

  console.log(`[DemoWorker] ✅ Match ${demoInfo.matchId} on ${parsed.map} finalized for ${parsed.players.length} players.`);
  return { map: parsed.map, players: parsed.players.length }
}, { connection, concurrency: 2 })
