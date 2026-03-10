export interface SteamProfile {
  steamId: string;
  name: string;
  avatar: string;
  country?: string;
  profileUrl: string;
  visibility: number; // 3 = Public
}

export interface SteamStats {
  kd: number;
  kills: number;
  deaths: number;
  winRate: number;
  hsPercent: number;
  accuracy: number;
  totalWins: number;
  totalMatches: number;
  hoursPlayed: number;
}

export interface FaceitProfile {
  faceitId: string;
  nickname: string;
  elo: number;
  level: number;
  country: string;
  avatar: string;
}

export interface FaceitStats {
  kd: number;
  winRate: number;
  hsPercent: number;
  totalMatches: number;
  currentStreak: number;
  bestMap: string;
}

export interface Match {
  matchId: string;
  map: string;
  result: 'WIN' | 'LOSS';
  kills: number;
  deaths: number;
  assists: number;
  kd: number;
  hsPercent: number;
  date: string;
}

export interface FullPlayerData {
  steam: {
    profile: SteamProfile;
    stats: SteamStats | null;
  };
  faceit: {
    profile: FaceitProfile | null;
    stats: FaceitStats | null;
    recentMatches: Match[];
  } | null;
  combined: {
    bestKD: number;
    bestWinRate: number;
    dataSource: "steam" | "faceit" | "both";
  };
}

export type PlayerErrorType = 
  | "PROFILE_PRIVATE" 
  | "PLAYER_NOT_FOUND" 
  | "NO_FACEIT_ACCOUNT" 
  | "STATS_UNAVAILABLE" 
  | "API_ERROR";

export interface PlayerError {
  type: PlayerErrorType;
  message: string;
}
