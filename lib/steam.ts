const STEAM_API_KEY = process.env.STEAM_API_KEY;

export async function resolveVanityUrl(vanityUrl: string): Promise<string | null> {
  if (!STEAM_API_KEY) throw new Error("STEAM_API_KEY not found in environment");
  
  const res = await fetch(`https://api.steampowered.com/ISteamUser/ResolveVanityURL/v1/?key=${STEAM_API_KEY}&vanityurl=${vanityUrl}`);
  const data = await res.json();
  
  return data.response?.steamid || null;
}

export async function getPlayerProfile(steamId: string) {
  if (!STEAM_API_KEY) throw new Error("STEAM_API_KEY not found in environment");
  
  const res = await fetch(`https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2/?key=${STEAM_API_KEY}&steamids=${steamId}`);
  const data = await res.json();
  const player = data.response?.players?.[0];
  
  if (!player) return null;
  
  return {
    steamId: player.steamid,
    name: player.personaname,
    avatar: player.avatarfull,
    country: player.loccountrycode,
    profileUrl: player.profileurl,
    visibility: player.communityvisibilitystate
  };
}

export async function getPlayerStats(steamId: string) {
  if (!STEAM_API_KEY) throw new Error("STEAM_API_KEY not found in environment");
  
  try {
    const res = await fetch(`https://api.steampowered.com/ISteamUserStats/GetUserStatsForGame/v2/?key=${STEAM_API_KEY}&steamid=${steamId}&appid=730`);
    if (!res.ok) return null;
    
    const data = await res.json();
    const stats: any = {};
    
    data.playerstats?.stats?.forEach((s: any) => {
      stats[s.name] = s.value;
    });

    const kills = stats.total_kills || 0;
    const deaths = stats.total_deaths || 0;
    const wins = stats.total_wins || 0;
    const shotsFired = stats.total_shots_fired || 1; // Prevent div by zero
    const shotsHit = stats.total_shots_hit || 0;
    const headshots = stats.total_kills_headshot || 0;
    const rounds = stats.total_rounds_played || 1;

    return {
      kd: deaths > 0 ? kills / deaths : kills,
      kills,
      deaths,
      totalWins: wins,
      totalMatches: Math.round(rounds / 20), // Rough estimate for matches
      hsPercent: kills > 0 ? (headshots / kills) * 100 : 0,
      winRate: (wins / rounds) * 100, // This is rounds winrate, Steam doesn't expose match winrate easily
      accuracy: (shotsHit / shotsFired) * 100,
      hoursPlayed: Math.round((stats.total_time_played || 0) / 3600)
    };
  } catch (e) {
    return null;
  }
}

export async function getFriendList(steamId: string) {
  if (!STEAM_API_KEY) return [];
  const res = await fetch(`https://api.steampowered.com/ISteamUser/GetFriendList/v1/?key=${STEAM_API_KEY}&steamid=${steamId}&relationship=friend`);
  const data = await res.json();
  return data.friendslist?.friends || [];
}
