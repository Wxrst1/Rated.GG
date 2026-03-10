/**
 * scripts/syncMatches.ts
 * 
 * Run locally to test the full pipeline:
 * npx tsx scripts/syncMatches.ts
 * 
 * This script:
 * 1. Crawls all share codes from Valve API
 * 2. Downloads each demo via Steam bot
 * 3. Parses each demo (all 10 players)
 * 4. Saves everything to Supabase
 */

import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

import { crawlShareCodes, getUnprocessedCodes, markCodeProcessed } from '../lib/matchCrawler'
import { initSteamBot, getDemoInfo, downloadDemo, disconnectBot } from '../lib/demoDownloader'
import { parseDemo } from '../lib/demoParser'
import { saveMatch } from '../lib/matchSaver'
import supabase from '../lib/supabase'
import { unlinkSync, existsSync } from 'fs'

// ── Config — change these for testing ────────────────────────────────────────
const TEST_STEAM_ID = process.env.TEST_STEAM_ID || ''
const SKIP_DEMO_DOWNLOAD = process.env.SKIP_DEMO_DOWNLOAD === 'true' // set to true to skip bot

async function main() {
  console.log('🚀 rated.gg — Match Sync Script')
  console.log('================================\n')

  if (!TEST_STEAM_ID) {
    console.error('❌ Set TEST_STEAM_ID in your .env.local')
    process.exit(1)
  }

  // ── Step 1: Get player from DB ─────────────────────────────────────────────
  console.log(`📋 Fetching player ${TEST_STEAM_ID} from Supabase...`)

  const { data: player, error } = await supabase
    .from('players')
    .select('steam_id, auth_code, latest_match_id, auth_code_valid')
    .eq('steam_id', TEST_STEAM_ID)
    .single()

  if (error || !player) {
    console.error('❌ Player not found in database:', error)
    process.exit(1)
  }

  if (!player.auth_code_valid) {
    console.error('❌ Auth code is marked as invalid. Player needs to refresh it.')
    process.exit(1)
  }

  if (!player.auth_code || !player.latest_match_id) {
    console.error('❌ Player has no auth_code or latest_match_id saved.')
    process.exit(1)
  }

  console.log(`✅ Found player: ${player.steam_id}`)
  console.log(`   Auth code: ${player.auth_code}`)
  console.log(`   Last share code: ${player.latest_match_id}\n`)

  // ── Step 2: Crawl new share codes ──────────────────────────────────────────
  console.log('🔍 Crawling share codes from Valve API...')
  const newCodes = await crawlShareCodes(
    player.steam_id,
    player.auth_code,
    player.latest_match_id
  )
  console.log(`✅ Found ${newCodes.length} new share codes\n`)

  // ── Step 3: Get all unprocessed codes ─────────────────────────────────────
  const unprocessed = await getUnprocessedCodes(player.steam_id)
  console.log(`📦 ${unprocessed.length} codes to process\n`)

  if (unprocessed.length === 0) {
    console.log('✅ No new matches to process. All up to date!')
    process.exit(0)
  }

  // ── Step 4: Init Steam bot ─────────────────────────────────────────────────
  if (!SKIP_DEMO_DOWNLOAD) {
    console.log('🤖 Connecting Steam bot...')
    try {
      await initSteamBot()
      console.log('✅ Steam bot connected\n')
    } catch (e) {
      console.error('❌ Steam bot failed to connect:', e)
      console.log('💡 Tip: Set SKIP_DEMO_DOWNLOAD=true to skip bot and use test data\n')
      process.exit(1)
    }
  } else {
    console.log('⏭️  Skipping Steam bot (SKIP_DEMO_DOWNLOAD=true)\n')
  }

  // ── Step 5: Process each share code ───────────────────────────────────────
  let processed = 0
  let failed = 0

  for (const shareCode of unprocessed) {
    console.log(`\n[${processed + 1}/${unprocessed.length}] Processing: ${shareCode}`)

    try {
      let demoPath: string | null = null
      let demoUrl: string | undefined
      let playedAt: Date | undefined

      if (!SKIP_DEMO_DOWNLOAD) {
        // Get demo info from Game Coordinator
        console.log('  📡 Requesting match info from GC...')
        const demoInfo = await getDemoInfo(shareCode)

        if (!demoInfo) {
          console.warn('  ⚠️  Could not get demo info, skipping')
          failed++
          continue
        }

        demoUrl = demoInfo.demoUrl
        playedAt = demoInfo.playedAt
        console.log(`  📍 Map: ${demoInfo.map}`)
        console.log(`  📅 Played: ${playedAt.toLocaleString()}`)
        console.log(`  🔗 Demo URL: ${demoUrl.substring(0, 60)}...`)

        // Download the demo
        console.log('  ⬇️  Downloading demo...')
        demoPath = await downloadDemo(demoUrl, demoInfo.matchId)
        console.log(`  ✅ Downloaded to ${demoPath}`)
      } else {
        // In skip mode, check if we have a local demo to test with
        const testDemo = process.env.TEST_DEMO_PATH
        if (testDemo && existsSync(testDemo)) {
          demoPath = testDemo
          console.log(`  🧪 Using test demo: ${demoPath}`)
        } else {
          console.warn('  ⚠️  No demo to parse (set TEST_DEMO_PATH for testing parser without bot)')
          await markCodeProcessed(shareCode)
          processed++
          continue
        }
      }

      // Parse the demo
      console.log('  🔄 Parsing demo...')
      const parsed = await parseDemo(demoPath)
      console.log(`  ✅ Parsed: ${parsed.map} | ${parsed.scoreTeam1}-${parsed.scoreTeam2} | ${parsed.players.length} players | ${parsed.totalRounds} rounds`)

      // Print player stats table
      console.log('\n  Player Stats:')
      console.log('  ' + '─'.repeat(90))
      console.log('  Name                     | K  | D  | A  | HS%  | ADR   | Rating | KAST  | Result')
      console.log('  ' + '─'.repeat(90))
      for (const p of parsed.players.sort((a, b) => b.rating - a.rating)) {
        const name = p.name.substring(0, 24).padEnd(24)
        const k = p.kills.toString().padStart(3)
        const d = p.deaths.toString().padStart(3)
        const a = p.assists.toString().padStart(3)
        const hs = `${p.hsPercent.toFixed(0)}%`.padStart(5)
        const adr = p.adr.toFixed(1).padStart(6)
        const rating = p.rating.toFixed(3).padStart(7)
        const kast = `${p.kast.toFixed(0)}%`.padStart(6)
        console.log(`  ${name} |${k} |${d} |${a} | ${hs} | ${adr} | ${rating} | ${kast} | ${p.result}`)
      }
      console.log('  ' + '─'.repeat(90))

      // Save to Supabase
      console.log('\n  💾 Saving to Supabase...')
      const matchId = await saveMatch(shareCode, parsed, demoUrl, playedAt)

      if (matchId) {
        console.log(`  ✅ Saved! Match ID: ${matchId}`)
        await markCodeProcessed(shareCode)
        processed++

        // Cleanup demo file
        if (demoPath && !SKIP_DEMO_DOWNLOAD && existsSync(demoPath)) {
          unlinkSync(demoPath)
          console.log('  🗑️  Demo file cleaned up')
        }
      } else {
        console.error('  ❌ Failed to save match')
        failed++
      }

    } catch (e) {
      console.error(`  ❌ Error processing ${shareCode}:`, e)
      failed++
    }

    // Small delay between matches
    await new Promise(r => setTimeout(r, 500))
  }

  // ── Done ───────────────────────────────────────────────────────────────────
  console.log('\n================================')
  console.log('✅ Sync complete!')
  console.log(`   Processed: ${processed}`)
  console.log(`   Failed: ${failed}`)
  console.log(`   Total: ${unprocessed.length}`)

  if (!SKIP_DEMO_DOWNLOAD) {
    await disconnectBot()
  }

  process.exit(0)
}

main().catch((e) => {
  console.error('Fatal error:', e)
  process.exit(1)
})