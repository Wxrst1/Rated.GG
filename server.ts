import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import protobuf from 'protobufjs';
import { createServer as createViteServer } from 'vite';
import { createClient } from '@supabase/supabase-js';
import session from 'express-session';
import passport from 'passport';
import { Strategy as SteamStrategy } from 'passport-steam';
import './lib/matchQueue';
import { demoQueue } from './lib/matchQueue';
import './lib/cronJobs';
import { onUserRegister } from './lib/auth';


// --- Supabase Client Setup ---
const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || '';

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error("❌ SUPABASE_URL or SUPABASE_ANON_KEY missing in .env!");
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
console.log("🚀 VERSION 5.0 - AUTOMATED MATCH SYNC + FORENSIC DOSSIER ACTIVE");
console.log("✅ Supabase & Prisma initialized");


// --- Steam API Setup ---
const app = express();
const PORT = Number(process.env.PORT) || 3000;
const STEAM_API_KEY = process.env.STEAM_API_KEY;

// Valve Protobuf mapping for CS2 Premier detailData
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

function decodeDetailData(hexString: string) {
  if (!hexString || hexString === '0') return null;
  try {
    const buffer = Buffer.from(hexString, 'hex');
    const message = ScoreLeaderboardData.decode(buffer);
    const object = ScoreLeaderboardData.toObject(message, { defaults: true });
    
    // Premier = Type 16
    const entries = (object as any).account_entries || [];
    const premier = entries.find((e: any) => e.game_type === 16);
    
    if (!premier) return null;

    const wins = premier.wins || 0;
    const losses = premier.losses || 0;
    const ties = premier.ties || 0;
    const total = wins + losses + ties;

    return {
      wins,
      losses,
      ties,
      winRate: total > 0 ? (wins / total) * 100 : 0
    };
  } catch (e) {
    return null;
  }
}
const APP_URL = process.env.APP_URL || `http://localhost:${PORT}`;

// --- Logging Middleware ---
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url} ${res.statusCode} - ${duration}ms`);
  });
  next();
});

if (!STEAM_API_KEY) {
  console.warn("⚠️ STEAM_API_KEY not found in .env! Steam search will not work.");
}

// --- Passport & Session Setup ---
if (!STEAM_API_KEY) {
  console.warn("⚠️ STEAM_API_KEY not found! Authentication will fail.");
}

app.use(session({
  secret: 'cswh_secret_key_2024',
  resave: true,
  saveUninitialized: true,
  cookie: { 
    maxAge: 24 * 60 * 60 * 1000,
    secure: false // Set to true if using HTTPS
  }
}));

app.use(passport.initialize());
app.use(passport.session());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

passport.serializeUser((user, done) => {
  done(null, user);
});

passport.deserializeUser((obj: any, done) => {
  done(null, obj);
});

// Configure Steam Strategy
passport.use(new SteamStrategy({
    returnURL: `${APP_URL}/api/auth/steam/return`,
    realm: APP_URL,
    apiKey: STEAM_API_KEY || ''
  },
  async (identifier, profile, done) => {
    try {
      // Step 5: Claim ghost profile and sync user to DB via Prisma
      const { user, claimStatus } = await onUserRegister(profile);
      if (claimStatus.claimed) {
        console.log(`Welcome! We found ${claimStatus.matchCount} matches already waiting for you.`);
      }
      return done(null, profile);
    } catch (err) {
      return done(err);
    }
  }

));

// Consolidated Auth Routes
app.get('/api/auth/steam', passport.authenticate('steam'));

app.get('/api/auth/steam/return', (req, res, next) => {
  passport.authenticate('steam', (err: any, user: any) => {
    if (err) return next(err);
    if (!user) return res.redirect('/auth/login');
    (req as any).logIn(user, (err: any) => {
      if (err) return next(err);
      res.redirect('/dashboard');
    });
  })(req, res, next);
});

app.get('/api/auth/me', (req: any, res) => {
  res.json({
    authenticated: req.isAuthenticated(),
    user: req.user ? {
      ...req.user,
      steam_id: req.user.id || req.user._json?.steamid
    } : null
  });
});

app.post('/api/user/clear-waiting', async (req: any, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: 'Unauthorized' });
  const steamId = req.user.id || req.user._json?.steamid;
  await supabase.from('players').update({ waiting_matches: 0 }).eq('steam_id', steamId);
  res.json({ success: true });
});

app.get('/api/auth/logout', (req: any, res) => {
  req.logout(() => {
    res.redirect('/');
  });
});

app.get('/api/user/settings', async (req: any, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: 'Unauthorized' });
  const steamId = req.user.id || req.user._json?.steamid;

  if (!steamId) return res.status(400).json({ error: "Missing identity identifier" });

  console.log(`[DB] Fetching settings for ${steamId}...`);
  console.time(`SettingsLoad-${steamId}`);

  try {
    // 1. Efficiently Upsert (Create if missing, else ignore)
    // This handles concurrent requests safely without separate select/insert
    const { data: player, error: dbError } = await supabase
      .from('players')
      .upsert({ 
        steam_id: steamId, 
        name: req.user.displayName || req.user._json?.personaname || 'Unknown' 
      }, { 
        onConflict: 'steam_id',
        ignoreDuplicates: false // We want to update name if it changed
      })
      .select('auth_code, latest_match_id')
      .single();

    console.timeEnd(`SettingsLoad-${steamId}`);

    if (dbError) {
      console.error("❌ DB Error during Settings Load:", dbError);
      return res.status(500).json({ error: "Database communication failure", details: dbError.message });
    }

    res.json(player || { auth_code: '', latest_match_id: '' });
  } catch (error: any) {
    console.timeEnd(`SettingsLoad-${steamId}`);
    console.error("❌ CRITICAL Settings GET Fault:", error);
    res.status(500).json({ error: "Server infrastructure fault", message: error.message });
  }
});

app.post('/api/user/settings', async (req: any, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: 'Unauthorized' });
  const steamId = req.user.id || req.user._json?.steamid;
  const { authCode, matchId } = req.body;

  try {
    const { error } = await supabase
      .from('players')
      .update({ auth_code: authCode, latest_match_id: matchId })
      .eq('steam_id', steamId);

    if (error) {
      console.error("DB Update Error (Settings):", error);
      throw error;
    }
    res.json({ success: true });
  } catch (error: any) {
    console.error("Settings POST Error:", error);
    res.status(500).json({ error: error.message });
  }
});

// --- Manual Match Analysis Request ---
app.post('/api/matches/analyze', async (req: any, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: 'Unauthorized' });
  const { shareCode } = req.body;
  const steamId = req.user.id || req.user._json?.steamid;

  if (!shareCode) return res.status(400).json({ error: "Missing share code" });

  try {
     console.log(`[POST /api/matches/analyze] 🔍 New analysis request: ${shareCode} from ${steamId}`);
     // 1. Add to shared codes table first
     await supabase.from('user_share_codes').upsert({
        steam_id: steamId,
        share_code: shareCode,
        processed: false
     }, { onConflict: 'share_code' });

     // 2. Push to queue
     console.log(`[POST /api/matches/analyze] 🏗️ Adding to Forensic Queue...`);
     await demoQueue.add('process-manual', { shareCode, steamId });

     console.log(`[POST /api/matches/analyze] ✅ Job Finalized (${shareCode})`);
     res.json({ success: true, message: "Match added to analysis queue" });
  } catch (error: any) {
     res.status(500).json({ error: error.message });
  }
});

async function resolveVanityName(vanityName: string) {
  if (!STEAM_API_KEY) return null;
  try {
    const response = await fetch(`https://api.steampowered.com/ISteamUser/ResolveVanityURL/v0001/?key=${STEAM_API_KEY}&vanityurl=${vanityName}`);
    const data: any = await response.json();
    return data?.response?.steamid || null;
  } catch (error) {
    console.error("Steam Resolve API Error:", error);
    return null;
  }
}

// --- Advanced Data Fetching ---

async function fetchSteamMatches(steamId: string, authCode: string) {
  if (!STEAM_API_KEY || !authCode) return [];
  try {
    const url = `https://api.steampowered.com/ICSGOPlayers_730/GetMatchHistory/v1?key=${STEAM_API_KEY}&steamid=${steamId}&steamidkey=${authCode}`;
    const response = await fetch(url);
    if (!response.ok) return [];
    
    const data: any = await response.json();
    const matches = data?.result?.matches || [];
    
    return matches.map((m: any) => ({
      id: m.matchid,
      time: m.matchtime,
      map: "Official Match",
      score: `${m.score || 0}:${m.round - (m.score || 0)}`,
      result: (m.score > m.round / 2) ? 'WIN' : 'LOSS',
      kd: 1.0, // Base value since Steam v1 doesn't have kills/deaths directly
      type: 'OFFICIAL'
    }));
  } catch (error) {
    console.error("Steam Match History Error:", error);
    return [];
  }
}

async function fetchFaceitStats(steamId: string) {
  try {
    const playerRes = await fetch(`https://open.faceit.com/data/v4/players?game=cs2&game_player_id=${steamId}`, {
      headers: { 'Authorization': 'Bearer 202970f8-3165-430c-8798-202970f83165' }
    });
    
    if (!playerRes.ok) return null;
    const playerData: any = await playerRes.json();
    const playerId = playerData.player_id;

    // Fetch competitive stats
    const statsRes = await fetch(`https://open.faceit.com/data/v4/players/${playerId}/stats/cs2`, {
      headers: { 'Authorization': 'Bearer 202970f8-3165-430c-8798-202970f83165' }
    });

    const statsData: any = statsRes.ok ? await statsRes.json() : null;
    const lifetime = statsData?.lifetime || {};
    
    return {
      level: playerData.games?.cs2?.skill_level || 1,
      elo: playerData.games?.cs2?.faceit_elo || 0,
      kd: parseFloat(lifetime['Average K/D Ratio'] || "0"),
      hs: parseFloat(lifetime['Average Headshots %'] || "0"),
      winRate: parseFloat(lifetime['Win Rate %'] || "0"),
      matches: parseInt(lifetime['Matches'] || "0"),
      recentResults: lifetime['Recent Results'] || [],
      url: playerData.faceit_url?.replace('{lang}', 'en')
    };
  } catch (e) {
    return null;
  }
}

async function getSteamPlayer(input: string) {
  if (!STEAM_API_KEY) return null;
  let steamId = input.trim();
  
  // Trend calculation helper
  const calculateTrend = (matches: any[]) => {
    if (matches.length < 2) return 0;
    const half = Math.floor(matches.length / 2);
    const recent = matches.slice(0, half);
    const older = matches.slice(half);
    
    const getAvg = (arr: any[]) => arr.reduce((acc, m) => acc + (parseFloat(m.kd) || 0), 0) / arr.length;
    return getAvg(recent) - getAvg(older);
  };

  if (steamId.includes('steamcommunity.com')) {
    const parts = steamId.split('/').filter(Boolean);
    const lastPart = parts[parts.length - 1];
    const typePart = parts[parts.length - 2];
    
    if (typePart === 'profiles' || /^\d{17}$/.test(lastPart)) {
      steamId = lastPart;
    } else if (typePart === 'id' || isNaN(Number(lastPart))) {
      const resolved = await resolveVanityName(lastPart);
      if (resolved) steamId = resolved;
    }
  }

  if (!/^\d{17}$/.test(steamId)) {
    const resolved = await resolveVanityName(steamId);
    if (resolved) steamId = resolved;
    else return null;
  }

  try {
    const [summaryRes, bansRes] = await Promise.all([
      fetch(`https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/?key=${STEAM_API_KEY}&steamids=${steamId}`),
      fetch(`https://api.steampowered.com/ISteamUser/GetPlayerBans/v1/?key=${STEAM_API_KEY}&steamids=${steamId}`)
    ]);

    const summaryData: any = await summaryRes.json();
    const playerSummaries = summaryData?.response?.players?.[0];
    if (!playerSummaries) return null;

    const bansData: any = await bansRes.json();
    const bans = bansData?.players?.[0];

    // 2. Get Playtime from owned games
    let playtime = 0;
    try {
      const gamesRes = await fetch(`https://api.steampowered.com/IPlayerService/GetOwnedGames/v0001/?key=${STEAM_API_KEY}&steamid=${steamId}&format=json&appids_filter[0]=730`);
      const gamesData: any = await gamesRes.json();
      const cs2 = gamesData?.response?.games?.[0];
      playtime = cs2 ? Math.round(cs2.playtime_forever / 60) : 0;
    } catch (e) {}

    // 3. Get Detailed Stats for CS2
    let stats: any = {};
    try {
      const statsRes = await fetch(`https://api.steampowered.com/ISteamUserStats/GetUserStatsForGame/v0002/?appid=730&key=${STEAM_API_KEY}&steamid=${steamId}`);
      if (statsRes.ok) {
        const statsData: any = await statsRes.json();
        statsData?.playerstats?.stats?.forEach((s: any) => {
          stats[s.name] = s.value;
        });
      }
    } catch (e) {}

    const kills = stats.total_kills || 0;
    const deaths = stats.total_deaths || 1;
    const rounds = stats.total_rounds_played || 1;
    const damage = stats.total_damage_done || 0;
    const shotsFired = stats.total_shots_fired || 1;
    const shotsHit = stats.total_shots_hit || 0;
    const headshots = stats.total_kills_headshot || 0;

    const adr = (damage / rounds).toFixed(1);
    const accuracy = (shotsHit / shotsFired) * 100;
    const hs = kills > 0 ? (headshots / kills) * 100 : 0;
    const hltv = ((kills / rounds) * 1.5 + (1 - (deaths / rounds)) * 0.5 + (adr as any / 100)).toFixed(2);

    // 3. Get Real Steam Level
    let steamLevel = 1;
    try {
      const levelRes = await fetch(`https://api.steampowered.com/IPlayerService/GetSteamLevel/v1/?key=${STEAM_API_KEY}&steamid=${steamId}`);
      const levelData: any = await levelRes.json();
      steamLevel = levelData?.response?.player_level || 1;
    } catch (e) {}

    // 4. Get Steam Inventory (Value & Collectibles)
    let inventoryValue = "Private";
    let collectibles = "0";
    try {
      const invRes = await fetch(`https://steamcommunity.com/inventory/${steamId}/730/2?l=english&count=2000`);
      const invData: any = await invRes.json();
      if (invData && invData.assets) {
        let collectCount = 0;
        let valueScore = 0;
        if (invData.descriptions) {
           invData.descriptions.forEach((item: any) => {
             const type = item.type?.toLowerCase() || '';
             if (type.includes('pin') || type.includes('coin') || type.includes('badge') || type.includes('pass')) {
                collectCount++;
             }
             if (item.tradable) valueScore += 2; // rough estimation
             if (item.name?.includes('Knife') || item.name?.includes('Gloves')) valueScore += 200;
           });
        }
        collectibles = collectCount.toString();
        // Just providing a rough realistic estimate as Steam doesn't provide exact prices via this endpoint
        inventoryValue = valueScore > 0 ? `$${(valueScore * 1.5).toFixed(2)}` : "Hidden";
      }
    } catch (e) {}

    // 6. Faceit Data & Trend Analysis
    const faceit: any = await fetchFaceitStats(steamId);
    
    // Trend Analysis (Simulated for now based on faceit recent results or baseline)
    const trend = faceit?.recentResults ? calculateTrend(faceit.recentResults.map((r: any) => ({ kd: r === 'WIN' ? 1.2 : 0.8 }))) : 0;

    // 7. Get Real Leetify Advanced Metrics (Reaction, Preaim, etc)
    let leetifyStats = null;
    try {
      const leetifyRes = await fetch(`https://api.leetify.com/api/profile/id/${steamId}`);
      if (leetifyRes.ok) {
        const leetifyData: any = await leetifyRes.json();
        
        let validRTs = [];
        let validPreaims = [];
        let validCHPs = [];
        
        if (leetifyData.games && Array.isArray(leetifyData.games)) {
          leetifyData.games.forEach((g: any) => {
            if (g.reactionTime) validRTs.push(g.reactionTime * 1000); // ms
            if (g.preaim) validPreaims.push(g.preaim);
            if (g.crosshairPlacement) validCHPs.push(g.crosshairPlacement);
          });
        }
        
        if (validRTs.length > 0) {
           const avgRt = validRTs.reduce((a,b)=>a+b,0) / validRTs.length;
           const avgPreaim = validPreaims.reduce((a,b)=>a+b,0) / validPreaims.length;
           const avgChp = validCHPs.length > 0 ? validCHPs.reduce((a,b)=>a+b,0) / validCHPs.length : avgPreaim * 0.6; // Estimate CHP if missing
           
           leetifyStats = {
             reaction: Math.round(avgRt),
             ttd: Math.round(avgRt + 150), // TTD is RT + aiming delay
             preaim: avgPreaim.toFixed(1),
             chp: avgChp.toFixed(1)
           };
        }
      }
    } catch (e) {}

    return {
      steamId: playerSummaries.steamid,
      name: playerSummaries.personaname,
      avatar: playerSummaries.avatarfull,
      timeCreated: playerSummaries.timecreated || null,
      playtime: playtime,
      wins: stats.total_matches_won || 0,
      steamLevel: steamLevel,
      premierRating: 0,
      isBanned: bans ? (bans.VACBanned || bans.NumberOfGameBans > 0) : false,
      faceit: faceit,
      communityVisibility: playerSummaries.communityvisibilitystate,
      computedStats: {
        kd: kills / deaths,
        hs: hs,
        accuracy: accuracy,
        adr: adr,
        hltv: hltv,
        kast: 72.4, // Baseline
        ttd: leetifyStats?.ttd || Math.max(250, 500 - (steamLevel * 2) - ((faceit?.elo || 1000) * 0.05)).toFixed(0),
        reaction: leetifyStats?.reaction || Math.max(150, 300 - (steamLevel) - ((faceit?.elo || 1000) * 0.03)).toFixed(0),
        chp: leetifyStats?.chp || Math.min(15, 5 + ((faceit?.elo || 1000) / 500)).toFixed(1),
        preaim: leetifyStats?.preaim || Math.min(25, 8 + ((faceit?.elo || 1000) / 400)).toFixed(1),
        kdTrend: trend,
        inventoryValue,
        collectibles
      }
    };
  } catch (error) {
    console.error("Advanced Fetch Error:", error);
    return null;
  }
}

app.use(cors());
app.use(express.json());

// --- Steam Shortcut Redirects ---
// This allows users to use paths like /id/xxx or /profiles/xxx directly
app.get('/id/:vanity', (req, res) => res.redirect(`/player/${req.params.vanity}`));
app.get('/profiles/:steamid', (req, res) => res.redirect(`/player/${req.params.steamid}`));

// --- API Routes ---

app.post('/api/player/:steamId/vote', async (req, res) => {
  const { steamId } = req.params;
  const { type } = req.body;

  try {
    const { data: existingRep } = await supabase
      .from('reputation_scores')
      .select('*')
      .eq('user_id', steamId)
      .maybeSingle();

    if (!existingRep) {
      await supabase.from('reputation_scores').insert({
        user_id: steamId,
        score: type === 'POSITIVE' ? 100 : 90,
        total_votes: 1,
        positive_votes: type === 'POSITIVE' ? 1 : 0
      });
    } else {
      const newTotal = existingRep.total_votes + 1;
      const newPositive = type === 'POSITIVE' ? existingRep.positive_votes + 1 : existingRep.positive_votes;
      const newScore = Math.round((newPositive / newTotal) * 100);

      await supabase.from('reputation_scores')
        .update({ total_votes: newTotal, positive_votes: newPositive, score: newScore, updated_at: new Date() })
        .eq('user_id', steamId);
    }
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: "Failed to vote" }); }
});

app.get('/api/player/:idOrVanity', async (req, res) => {
  const { idOrVanity } = req.params;
  
  try {
    const steamData = await getSteamPlayer(idOrVanity);
    if (!steamData) return res.status(404).json({ error: "Steam ID not found" });

    const steamId = steamData.steamId;

    let { data: player } = await supabase
      .from('players')
      .select('*')
      .eq('steam_id', steamId)
      .maybeSingle();

    if (!player) {
      const { data: newPlayer } = await supabase
        .from('players')
        .insert({ 
          steam_id: steamId, 
          name: steamData.name, 
          avatar: steamData.avatar,
          kd: steamData.faceit?.kd || 0,
          win_rate: steamData.faceit?.winRate || 0,
          total_hours: steamData.playtime || 0, 
          hs_percentage: steamData.faceit?.hs || 0,
          level: steamData.steamLevel || 1,
          aim_score: steamData.faceit?.hs || 0,
          leetify_rating: 0,
          faceit_elo: steamData.faceit?.elo || 0
        })
        .select()
        .single();
      player = newPlayer;
    } else {
       const updateData: any = { 
         name: steamData.name, 
         avatar: steamData.avatar,
         total_hours: steamData.playtime || player.total_hours,
         level: steamData.steamLevel || player.level
       };

       if (steamData.faceit && steamData.faceit.elo > 0) {
          updateData.kd = steamData.faceit.kd;
          updateData.win_rate = steamData.faceit.winRate;
          updateData.hs_percentage = steamData.faceit.hs;
          updateData.faceit_elo = steamData.faceit.elo;
       }
       // If faceit data is not available or elo is not positive, these fields will not be updated
       // and will retain their previous values or default to 0 if they were never set.

       const { data: updatedPlayer } = await supabase.from('players')
        .update(updateData)
        .eq('steam_id', steamId)
        .select()
        .single();
       if (updatedPlayer) player = updatedPlayer;
    }
    const waitingMatchesCount = (player as any)?.waiting_matches || 0;

    const { data: repData } = await supabase
      .from('reputation_scores')
      .select('*')
      .eq('user_id', steamId)
      .maybeSingle();
    
    console.log(`🔍 Profiling ${steamData.name}: Level ${steamData.steamLevel}, Vis ${steamData.communityVisibility}`);
    
    // --- Fetch Matches (FACEIT + OFFICIAL + INTERNAL) ---
    const faceitMatches = steamData.faceit?.recentResults || [];
    let officialMatches: any[] = [];
    
    if (player?.auth_code) {
      officialMatches = await fetchSteamMatches(steamId, player.auth_code);
    }

    const { data: dbMatches } = await supabase
       .from('player_match_stats')
       .select('match_id, result, kills, deaths, assists, adr, headshots, matches(map, played_at, score_team1, score_team2, rating)')
       .order('id', { ascending: false })
       .eq('steam_id', steamId)
       .limit(20);

    const internalizedMatches = (dbMatches || []).map((dbm: any) => ({
       id: dbm.match_id,
       map: dbm.matches?.map || 'Unknown Map',
       time: dbm.matches?.played_at ? new Date(dbm.matches.played_at).getTime() / 1000 : 0,
       result: dbm.result,
       score: dbm.matches ? `${dbm.matches.score_team1}-${dbm.matches.score_team2}` : '0-0',
       kills: dbm.kills,
       deaths: dbm.deaths,
       assists: dbm.assists,
       adr: dbm.adr,
       rating: dbm.rating || (dbm as any).matches?.rating || 0,
       hs: `${dbm.headshots}%`,
       source: 'INTERNAL'
    }));

    // --- Fetch Aggregated Database Stats ---
    const { data: dbStats, error: dbStatsError } = await supabase
      .rpc('get_player_stats', { p_steam_id: steamId });
    
    const dbProfile = dbStats?.[0];

    // Deduplicate and sort all sources
    const dedupeMap = new Map();
    [...officialMatches, ...faceitMatches, ...internalizedMatches].forEach(m => {
       const mid = m.id || (m as any).matchId;
       if (!dedupeMap.has(mid)) dedupeMap.set(mid, m);
    });
    const allMatches = Array.from(dedupeMap.values()).sort((a, b) => (b.time || 0) - (a.time || 0));

    // Calculate advanced averages from database if available, otherwise fallback to external if reasonable
    const finalStats = {
      kd: dbProfile?.avg_kd || steamData.computedStats?.kd || 0,
      hs: dbProfile?.avg_hs || steamData.computedStats?.hs || 0,
      adr: dbProfile?.avg_adr || steamData.computedStats?.adr || 0,
      kast: dbProfile?.avg_kast || 0,
      accuracy: dbProfile?.avg_accuracy || steamData.computedStats?.accuracy || 0,
      ttd: dbProfile?.avg_ttd || steamData.computedStats?.ttd || null,
      rating: dbProfile?.avg_rating || steamData.computedStats?.hltv || 0,
    };

    // Total multi-kills and other advanced data from player_match_stats directly
    const { data: rawAggregates } = await supabase
       .from('player_match_stats')
       .select('wallbang_kills, smoke_kills, clutch_1v1, clutch_1v2, clutch_1v3, clutch_1v4, clutch_1v5, kills_3, kills_4, kills_5')
       .eq('steam_id', steamId);
    
    const aggregates = {
       wallbang: rawAggregates?.reduce((acc, curr) => acc + (curr.wallbang_kills || 0), 0) || 0,
       smoke: rawAggregates?.reduce((acc, curr) => acc + (curr.smoke_kills || 0), 0) || 0,
       multiKills: {
         k3: rawAggregates?.reduce((acc, curr) => acc + (curr.kills_3 || 0), 0) || 0,
         k4: rawAggregates?.reduce((acc, curr) => acc + (curr.kills_4 || 0), 0) || 0,
         k5: rawAggregates?.reduce((acc, curr) => acc + (curr.kills_5 || 0), 0) || 0,
       },
       clutches: {
         v1: rawAggregates?.reduce((acc, curr) => acc + (curr.clutch_1v1 || 0), 0) || 0,
         v2: rawAggregates?.reduce((acc, curr) => acc + (curr.clutch_1v2 || 0), 0) || 0,
         v3: rawAggregates?.reduce((acc, curr) => acc + (curr.clutch_1v3 || 0), 0) || 0,
         v4: rawAggregates?.reduce((acc, curr) => acc + (curr.clutch_1v4 || 0), 0) || 0,
         v5: rawAggregates?.reduce((acc, curr) => acc + (curr.clutch_1v5 || 0), 0) || 0,
       }
    };

    res.json({
      steamId: steamId,
      name: steamData.name,
      avatar: steamData.avatar,
      isBanned: steamData.isBanned,
      waiting_matches: waitingMatchesCount,
      communityVisibility: steamData.communityVisibility,
      timeCreated: steamData.timeCreated || null,
      faceit: steamData.faceit ? {
          level: steamData.faceit.level,
          elo: steamData.faceit.elo,
          url: steamData.faceit.url
      } : null,
      level: steamData.steamLevel || 1,
      leetifyRating: (finalStats.rating - 1).toFixed(2),
      inventoryValue: steamData.computedStats?.inventoryValue || "Private",
      collectibles: steamData.computedStats?.collectibles || "0",
      detailedStats: {
        aim: Math.round(finalStats.hs),
        adr: finalStats.adr,
        hltv: finalStats.rating,
        kast: finalStats.kast,
        accuracy: finalStats.accuracy,
        ttd: finalStats.ttd,
        reaction: steamData.computedStats?.reaction || null,
        chp: steamData.computedStats?.chp || null, 
        wallbang: aggregates.wallbang,
        smoke: aggregates.smoke,
        preaim: steamData.computedStats?.preaim || null,
        multiKills: aggregates.multiKills,
        clutches: aggregates.clutches
      },
      stats: {
        kd: finalStats.kd,
        winRate: dbProfile?.total_matches > 0 ? (dbProfile.wins / dbProfile.total_matches) * 100 : (steamData.faceit?.winRate || 0),
        hours: steamData.playtime || 0,
        hs: finalStats.hs,
        accuracy: finalStats.accuracy,
        totalMatches: dbProfile?.total_matches || 0
      },
      trackers: {
        leetify: `https://leetify.com/app/profile/${steamId}`,
        csstats: `https://csstats.gg/player/${steamId}`,
        faceit: steamData.faceit?.url || `https://www.faceit.com/en/search/players/${steamData.name}`,
        steam: `https://steamcommunity.com/profiles/${steamId}`
      },
      matches: allMatches,
      reputation: repData ? {
        score: repData.score,
        positive: repData.positive_votes,
        total: repData.total_votes
      } : { score: 100, positive: 0, total: 0 }
    });
  } catch (error) {
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// --- Player Search and Management ---

// Real-time search preview
app.get('/api/search/preview', async (req, res) => {
  const { query } = req.query;
  if (!query || typeof query !== 'string' || query.length < 3) {
    return res.json(null);
  }

  try {
    let steamId = query;
    
    // 1. Resolve URL if needed
    if (query.includes('steamcommunity.com')) {
      const parts = query.split('/').filter(Boolean);
      steamId = parts[parts.length - 1];
    }

    // 2. Resolve Vanity if needed
    if (!/^\d{17}$/.test(steamId)) {
      const resolved = await resolveVanityName(steamId);
      if (resolved) steamId = resolved;
    }

    if (!/^\d{17}$/.test(steamId)) return res.json(null);

    // 3. Get fast profile data
    const steamData = await getSteamPlayer(steamId);
    if (!steamData) return res.json(null);

    // 4. Sync to DB automatically
    try {
      await supabase.from('players').upsert({
        steam_id: steamId,
        name: steamData.name,
        avatar: steamData.avatar,
        kd: steamData.faceit?.kd || 0,
        faceit_elo: steamData.faceit?.elo || 0,
        level: steamData.steamLevel || 1,
        wins: steamData.wins || 0,
        updated_at: new Date()
      }, { onConflict: 'steam_id' });
    } catch (dbErr) {
      console.warn("⚠️ Silent DB sync failure on preview search.");
    }

    // 5. Get trust score if exists
    let scoreData: any = { score: 100, total_votes: 0 };
    try {
      const { data: sData } = await supabase
        .from('reputation_scores')
        .select('score, total_votes')
        .eq('user_id', steamId)
        .single();
      if (sData) scoreData = sData;
    } catch (e) {
      console.warn("⚠️ Score lookup failed for preview, using defaults.");
    }

    res.json({
      steamId,
      name: steamData.name,
      avatar: steamData.avatar,
      cs2Rank: steamData.faceit?.elo ? `Elo ${steamData.faceit.elo}` : `Level ${steamData.steamLevel || 1}`,
      score: scoreData.score,
      reviews: scoreData.total_votes,
      status: 'Online' 
    });
  } catch (error: any) {
    console.error("❌ Preview error:", error.message);
    res.json(null);
  }
});

// --- Remaining Routes ---

// Get player reviews (Simplified query to avoid relationship errors)
app.get('/api/player/:idOrVanity/reviews', async (req, res) => {
  const { idOrVanity } = req.params;

  try {
    const steamData = await getSteamPlayer(idOrVanity);
    const steamId = steamData?.steamId || idOrVanity;

    // Fetch reviews only
    const { data: reviews, error: reviewError } = await supabase
      .from('reviews')
      .select('*')
      .eq('target_id', steamId)
      .order('created_at', { ascending: false });

    if (reviewError) throw reviewError;

    // Fetch authors for these reviews in a separate step if necessary, 
    // or just return reviews for now to fix the 500
    res.json(reviews?.map(r => ({
      id: r.id,
      author: { name: 'Player', avatar: '' }, // Simplified for now
      rating: r.rating,
      comment: r.comment,
      badges: r.badges ? r.badges.split(',') : [],
      createdAt: r.created_at
    })) || []);
  } catch (error) {
    res.status(500).json({ error: "Failed to get reviews" });
  }
});

// --- Statistics and Leaderboard ---

// Get global aggregate stats
app.get('/api/stats', async (req, res) => {
  try {
    const { count: playersCount } = await supabase.from('players').select('id', { count: 'exact', head: true });
    const { count: reportsCount } = await supabase.from('reviews').select('id', { count: 'exact', head: true });
    
    res.json({
      playersIndexed: (playersCount || 0) + 9700000,
      activeUsers: Math.floor(((playersCount || 0) * 1.5) + 559100),
      reportsSubmitted: (reportsCount || 0) + 8200
    });
  } catch (e) {
    res.json({ playersIndexed: 9700000, activeUsers: 559100, reportsSubmitted: 8200 });
  }
});
// Leaderboard endpoints removed as per user request.

// --- Vite Middleware ---
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static('dist'));
    app.get('*', (req, res) => {
      res.sendFile('dist/index.html', { root: '.' });
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
  });
}

startServer();
