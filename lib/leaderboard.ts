import protobuf from 'protobufjs';
import { LeaderboardEntry, Region, FaceitLeaderboardEntry } from '../types/leaderboard';

const STEAM_API_KEY = process.env.STEAM_API_KEY;
const FACEIT_API_KEY = process.env.FACEIT_API_KEY;

// Valve Protobuf mapping
const root = protobuf.Root.fromJSON({
  nested: {
    ScoreLeaderboardData: {
      fields: {
        account_entries: {
          rule: "repeated",
          type: "AccountWinLoss",
          id: 5
        }
      },
      nested: {
        AccountWinLoss: {
          fields: {
            game_type: { type: "int32", id: 1 },
            wins: { type: "int32", id: 2 },
            ties: { type: "int32", id: 3 },
            losses: { type: "int32", id: 4 }
          }
        }
      }
    }
  }
});

const ScoreLeaderboardData = root.lookupType("ScoreLeaderboardData");

/**
 * Decode Official Valve Hex Detail Data
 */
export function decodeDetailData(hexString: string) {
  if (!hexString || hexString === '0') return null;
  
  try {
    const buffer = Buffer.from(hexString, 'hex');
    const message = ScoreLeaderboardData.decode(buffer);
    const object = ScoreLeaderboardData.toObject(message, { defaults: true });
    
    // Find Premier (Type 16) stats
    const premierStats = object.account_entries?.find((e: any) => e.game_type === 16);
    if (!premierStats) return null;

    const wins = premierStats.wins || 0;
    const losses = premierStats.losses || 0;
    const ties = premierStats.ties || 0;
    const total = wins + losses + ties;

    return {
      wins,
      losses,
      ties,
      winRate: total > 0 ? (wins / total) * 100 : 0
    };
  } catch (e) {
    console.error("Protobuf Decode Error:", e);
    return null;
  }
}

/**
 * Valve API Fetcher (Premier Global)
 */
export async function getGlobalLeaderboard(limit = 100) {
  const lbname = "official_leaderboard_premier_season1";
  return fetchLeaderboard(lbname, limit);
}

/**
 * Valve API Fetcher (Premier Regional)
 */
export async function getRegionalLeaderboard(region: Region, limit = 100) {
  const lbname = `official_leaderboard_premier_season1_${region.toLowerCase().replace('america', 'america').replace('north', 'north').replace('south', 'south')}`;
  // Note: Steam API names are specific, case-sensitive
  const actualRegionName = {
    "NorthAmerica": "northamerica",
    "SouthAmerica": "southamerica",
    "Europe": "europe",
    "Asia": "asia",
    "Australia": "australia",
    "Africa": "africa",
    "China": "china"
  }[region];

  return fetchLeaderboard(`official_leaderboard_premier_season1_${actualRegionName}`, limit);
}

async function fetchLeaderboard(lbname: string, limit: number) {
  try {
    const url = `https://api.steampowered.com/ICSGOServers_730/GetLeaderboardEntries/v1?format=json&lbname=${lbname}&rangestart=1&rangeend=${limit}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error("Valve API Failure");
    
    const data: any = await res.json();
    const entries = data?.result?.entries || [];

    return entries.map((e: any) => {
      const stats = decodeDetailData(e.detailData);
      return {
        rank: e.rank,
        score: e.score, // Score >> 15 logic handled by API usually, but if not we can bit-shift
        name: e.name,
        ...stats
      };
    });
  } catch (error) {
    console.error("Leaderboard Fetch Error:", error);
    return [];
  }
}

/**
 * Faceit API Fetcher
 */
export async function getFaceitLeaderboard(region = 'EU', limit = 100) {
  if (!FACEIT_API_KEY) return [];
  
  try {
    // Correct Faceit V4 Path
    const url = `https://open.faceit.com/data/v4/rankings/games/cs2/regions/${region}?limit=${limit}`;
    const res = await fetch(url, {
      headers: { 'Authorization': `Bearer ${FACEIT_API_KEY}` }
    });
    
    if (!res.ok) throw new Error("Faceit API Failure");
    const data: any = await res.json();
    
    return (data.items || []).map((p: any, i: number) => ({
      rank: i + 1,
      nickname: p.nickname,
      avatar: p.avatar,
      elo: p.faceit_elo,
      level: p.skill_level,
      country: p.country,
      faceitId: p.player_id
    }));
  } catch (e) {
    console.error("Faceit Fetch Error:", e);
    return [];
  }
}

/**
 * Avatar Enrichment (Best effort via Search)
 */
export async function enrichLeaderboardEntries(entries: LeaderboardEntry[]) {
  if (!STEAM_API_KEY) return entries;
  
  // This is expensive, we'd normally want to cache this in Redis/DB
  // For the Next.js implementation, we can do it row by row or in chunks
  return entries; // Simplified for now as it needs a batch search strategy
}
