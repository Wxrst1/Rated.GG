-- ==========================================
-- RATED.GG MASTER SCHEMA
-- VERSION 5.1 - Forensic Analytics Ready
-- ==========================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. PLAYERS TABLE (Registered Users)
CREATE TABLE IF NOT EXISTS players (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  steam_id TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  avatar TEXT,
  kd FLOAT DEFAULT 0,
  win_rate FLOAT DEFAULT 0,
  total_hours INTEGER DEFAULT 0,
  hs_percentage FLOAT DEFAULT 0,
  level INTEGER DEFAULT 0,
  aim_score INTEGER DEFAULT 0,
  utility_score INTEGER DEFAULT 0,
  positioning_score INTEGER DEFAULT 0,
  opening_score INTEGER DEFAULT 0,
  clutch_score INTEGER DEFAULT 0,
  leetify_rating FLOAT DEFAULT 0,
  faceit_elo INTEGER DEFAULT 0,
  auth_code TEXT,
  auth_code_valid BOOLEAN DEFAULT TRUE,
  latest_match_id TEXT,
  wins INTEGER DEFAULT 0,
  losses INTEGER DEFAULT 0,
  ties INTEGER DEFAULT 0,
  total_matches INTEGER DEFAULT 0,
  waiting_matches INTEGER DEFAULT 0,
  avg_kd FLOAT DEFAULT 0,
  avg_adr FLOAT DEFAULT 0,
  avg_hs FLOAT DEFAULT 0,
  avg_kast FLOAT DEFAULT 0,
  avg_accuracy FLOAT DEFAULT 0,
  avg_ttd FLOAT DEFAULT 0,
  avg_rating FLOAT DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. MATCHES TABLE (Demo Records)
CREATE TABLE IF NOT EXISTS matches (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  share_code    TEXT UNIQUE NOT NULL,
  match_id      TEXT,
  map           TEXT NOT NULL,
  played_at     TIMESTAMPTZ NOT NULL,
  score_team1   INT NOT NULL,
  score_team2   INT NOT NULL,
  game_mode     TEXT,
  demo_url      TEXT,
  round_history JSONB, -- Stores KillLog, Clutches, HitStats, WeaponData
  parsed_at     TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- 4. PLAYER MATCH STATS (Performance data for every player in every match)
CREATE TABLE IF NOT EXISTS player_match_stats (
  id                    UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  match_id              UUID REFERENCES matches(id) ON DELETE CASCADE,
  steam_id              TEXT NOT NULL,
  team_number           INT NOT NULL,
  result                TEXT CHECK (result IN ('WIN','LOSS','TIE')),
  kills                 INT DEFAULT 0,
  deaths                INT DEFAULT 0,
  assists               INT DEFAULT 0,
  headshots             INT DEFAULT 0,
  hs_percent            FLOAT DEFAULT 0,
  damage                INT DEFAULT 0,
  adr                   FLOAT DEFAULT 0,
  rating                FLOAT DEFAULT 0,
  kd                    FLOAT DEFAULT 0,
  plus_minus            INT DEFAULT 0,
  mvps                  INT DEFAULT 0,
  clutch_1v1            INT DEFAULT 0,
  clutch_1v2            INT DEFAULT 0,
  clutch_1v3            INT DEFAULT 0,
  clutch_1v4            INT DEFAULT 0,
  clutch_1v5            INT DEFAULT 0,
  kills_3               INT DEFAULT 0,
  kills_4               INT DEFAULT 0,
  kills_5               INT DEFAULT 0,
  premier_rating_before INT,
  premier_rating_after  INT,
  premier_delta         INT,
  kast                  FLOAT DEFAULT 0,
  shots_fired           INT DEFAULT 0,
  shots_hit             INT DEFAULT 0,
  accuracy              FLOAT DEFAULT 0,
  wallbang_kills        INT DEFAULT 0,
  smoke_kills           INT DEFAULT 0,
  avg_time_to_damage    FLOAT DEFAULT 0,
  avg_reaction_time     FLOAT DEFAULT 0,
  avg_crosshair_dist    FLOAT DEFAULT 0,
  preaim_percent        FLOAT DEFAULT 0,
  UNIQUE(match_id, steam_id)
);

-- 5. REVIEWS & REPUTATION
CREATE TABLE IF NOT EXISTS reviews (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  author_id TEXT,
  target_id TEXT,
  rating TEXT NOT NULL,
  comment TEXT,
  badges TEXT, 
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  CONSTRAINT reviews_author_id_fkey FOREIGN KEY (author_id) REFERENCES players(steam_id),
  CONSTRAINT reviews_target_id_fkey FOREIGN KEY (target_id) REFERENCES players(steam_id)
);

CREATE TABLE IF NOT EXISTS reputation_scores (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT UNIQUE,
  score FLOAT DEFAULT 0,
  total_votes INTEGER DEFAULT 0,
  positive_votes INTEGER DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  CONSTRAINT reputation_scores_user_id_fkey FOREIGN KEY (user_id) REFERENCES players(steam_id)
);

-- 6. GHOST PROFILES (Players found in matches but not registered)
CREATE TABLE IF NOT EXISTS ghost_profiles (
  steam_id       TEXT PRIMARY KEY,
  name           TEXT,
  avatar         TEXT,
  total_matches  INT DEFAULT 0,
  first_seen     TIMESTAMPTZ DEFAULT NOW(),
  last_seen      TIMESTAMPTZ DEFAULT NOW(),
  claimed_at     TIMESTAMPTZ,
  claimed_by     UUID  -- references players.id after they register
);

-- 7. SHARE CODES (Tracking queue)
CREATE TABLE IF NOT EXISTS user_share_codes (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  steam_id      TEXT NOT NULL,
  share_code    TEXT UNIQUE NOT NULL,
  processed     BOOLEAN DEFAULT FALSE,
  processed_at  TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- 8. LEADERBOARD (Global rankings)
CREATE TABLE IF NOT EXISTS leaderboard_entries (
  id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  region TEXT NOT NULL,
  rank INTEGER NOT NULL,
  cs_rating INTEGER NOT NULL,
  name TEXT NOT NULL,
  time_achieved TIMESTAMP WITH TIME ZONE,
  last_seen TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  CONSTRAINT leaderboard_entries_region_rank_key UNIQUE (region, rank)
);

-- 9. PERFORMANCE INDEXES
CREATE INDEX IF NOT EXISTS idx_player_match_stats_steam_id ON player_match_stats(steam_id);
CREATE INDEX IF NOT EXISTS idx_player_match_stats_match_id ON player_match_stats(match_id);
CREATE INDEX IF NOT EXISTS idx_user_share_codes_steam_id ON user_share_codes(steam_id);
CREATE INDEX IF NOT EXISTS idx_user_share_codes_processed ON user_share_codes(processed);
CREATE INDEX IF NOT EXISTS idx_ghost_profiles_steam_id ON ghost_profiles(steam_id);
CREATE INDEX IF NOT EXISTS idx_players_steam_id ON players(steam_id);

-- 10. DATABASE FUNCTIONS

-- Calculate aggregate stats for player profile
CREATE OR REPLACE FUNCTION get_player_stats(p_steam_id TEXT)
RETURNS TABLE (
  total_matches BIGINT,
  avg_kd FLOAT,
  avg_rating FLOAT,
  avg_adr FLOAT,
  avg_hs FLOAT,
  avg_kast FLOAT,
  avg_accuracy FLOAT,
  avg_ttd FLOAT,
  avg_reaction FLOAT,
  avg_crosshair FLOAT,
  avg_preaim FLOAT,
  wins BIGINT,
  losses BIGINT,
  ties BIGINT,
  current_premier_rating INT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
     COUNT(*) as total_matches,
     AVG(kd)::FLOAT as avg_kd,
     AVG(rating)::FLOAT as avg_rating,
     AVG(adr)::FLOAT as avg_adr,
     AVG(hs_percent)::FLOAT as avg_hs,
     AVG(kast)::FLOAT as avg_kast,
     AVG(accuracy)::FLOAT as avg_accuracy,
     AVG(avg_time_to_damage)::FLOAT as avg_ttd,
     AVG(avg_reaction_time)::FLOAT as avg_reaction,
     AVG(avg_crosshair_dist)::FLOAT as avg_crosshair,
     AVG(preaim_percent)::FLOAT as avg_preaim,
     COUNT(*) FILTER (WHERE result = 'WIN') as wins,
     COUNT(*) FILTER (WHERE result = 'LOSS') as losses,
     COUNT(*) FILTER (WHERE result = 'TIE') as ties,
     MAX(premier_rating_after) as current_premier_rating
   FROM player_match_stats
   WHERE steam_id = p_steam_id;
END;
$$ LANGUAGE plpgsql;

-- Ghost profile tracker
CREATE OR REPLACE FUNCTION increment_ghost_matches(p_steam_id TEXT)
RETURNS void AS $$
  UPDATE ghost_profiles 
  SET total_matches = total_matches + 1
  WHERE steam_id = p_steam_id
  AND claimed_at IS NULL;
$$ LANGUAGE SQL;
