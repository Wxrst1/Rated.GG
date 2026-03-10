const FACEIT_API_KEY = process.env.FACEIT_API_KEY;
const BASE_URL = 'https://open.faceit.com/data/v4';

const headers = {
  'Authorization': `Bearer ${FACEIT_API_KEY}`,
  'Content-Type': 'application/json'
};

export async function findFaceitByName(nickname: string) {
  if (!FACEIT_API_KEY) throw new Error("FACEIT_API_KEY not found in environment");
  
  const res = await fetch(`${BASE_URL}/players?nickname=${nickname}&game=cs2`, { headers });
  if (!res.ok) return null;
  
  const data = await res.json();
  return {
    faceitId: data.player_id,
    nickname: data.nickname,
    country: data.country,
    elo: data.games?.cs2?.faceit_elo || data.games?.csgo?.faceit_elo || 0,
    level: data.games?.cs2?.skill_level || data.games?.csgo?.skill_level || 1,
    avatar: data.avatar
  };
}

export async function getFaceitStats(faceitId: string) {
  const res = await fetch(`${BASE_URL}/players/${faceitId}/stats/cs2`, { headers });
  if (!res.ok) return null;
  
  const data = await res.json();
  const lifetime = data.lifetime || {};
  
  return {
    kd: parseFloat(lifetime['Average K/D Ratio'] || "0"),
    winRate: parseFloat(lifetime['Win Rate %'] || "0"),
    hsPercent: parseFloat(lifetime['Average Headshots %'] || "0"),
    totalMatches: parseInt(lifetime['Matches'] || "0"),
    currentStreak: parseInt(lifetime['Current Win Streak'] || "0"),
    bestMap: lifetime['Longest Win Streak'] || "de_mirage" 
  };
}

export async function getMatchHistory(faceitId: string, limit: number = 20) {
  const res = await fetch(`${BASE_URL}/players/${faceitId}/history?game=cs2&limit=${limit}`, { headers });
  if (!res.ok) return [];
  
  const data = await res.json();
  const items = data.items || [];

  const matchPromises = items.map(async (item: any) => {
    const details = await getMatchDetails(item.match_id);
    const myStats = details?.rounds?.[0]?.teams?.flatMap((t: any) => t.players)?.find((p: any) => p.player_id === faceitId);

    return {
      matchId: item.match_id,
      map: details?.rounds?.[0]?.round_stats?.Map || 'Unknown',
      result: item.results?.winner === item.teams?.faction1?.faction_id ? 'WIN' : 'LOSS',
      kills: parseInt(myStats?.player_stats?.Kills || "0"),
      deaths: parseInt(myStats?.player_stats?.Deaths || "0"),
      assists: parseInt(myStats?.player_stats?.Assists || "0"),
      kd: parseFloat(myStats?.player_stats?.['K/D Ratio'] || "0"),
      hsPercent: parseFloat(myStats?.player_stats?.['Headshots %'] || "0"),
      date: new Date(item.finished_at * 1000).toISOString()
    };
  });

  return Promise.all(matchPromises);
}

export async function getMatchDetails(matchId: string) {
  const res = await fetch(`${BASE_URL}/matches/${matchId}/stats`, { headers });
  if (!res.ok) return null;
  return res.json();
}

export async function getPlayerEloHistory(faceitId: string) {
  // Simplificação: o ELO atual + a variação média das últimas 20 partidas
  // Para um sistema full, teríamos de usar um tracker específico de elo.
  const history = await getMatchHistory(faceitId, 20);
  return history.map((m, i) => ({
    matchId: m.matchId,
    eloChange: m.result === 'WIN' ? 25 : -25, // Estimativa Faceit standard
    date: m.date
  }));
}
