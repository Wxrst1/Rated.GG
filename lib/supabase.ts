import { createClient } from '@supabase/supabase-js'

export type Match = {
  id: string
  share_code: string
  match_id?: string
  map: string
  played_at: string
  score_team1: number
  score_team2: number
  demo_url?: string
  parsed_at?: string
}

export type PlayerMatchStats = {
  id: string
  match_id: string
  steam_id: string
  team_number: number
  result: 'WIN' | 'LOSS' | 'TIE'
  kills: number
  deaths: number
  assists: number
  headshots: number
  hs_percent: number
  damage: number
  adr: number
  rating: number
  kd: number
  plus_minus: number
  mvps: number
  clutch_1v1: number
  clutch_1v2: number
  clutch_1v3: number
  clutch_1v4: number
  clutch_1v5: number
  kills_3: number
  kills_4: number
  kills_5: number
  premier_rating_before?: number
  premier_rating_after?: number
  premier_delta?: number
}

export type GhostProfile = {
  steam_id: string
  name?: string
  avatar?: string
  total_matches: number
  first_seen: string
  last_seen: string
  claimed_at?: string
  claimed_by?: string
}

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || '';

const supabase = createClient(SUPABASE_URL, SUPABASE_ROLE_KEY)

export default supabase
