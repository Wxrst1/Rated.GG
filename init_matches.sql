-- Matches table
CREATE TABLE matches (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  share_code    TEXT UNIQUE NOT NULL,
  match_id      TEXT,
  map           TEXT NOT NULL,
  played_at     TIMESTAMPTZ NOT NULL,
  score_team1   INT NOT NULL,
  score_team2   INT NOT NULL,
  demo_url      TEXT,
  parsed_at     TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Stats for every player in every match (all 10 players)
CREATE TABLE player_match_stats (
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

-- Ghost profiles: players found in demos who never registered
CREATE TABLE ghost_profiles (
  steam_id       TEXT PRIMARY KEY,
  name           TEXT,
  avatar         TEXT,
  total_matches  INT DEFAULT 0,
  first_seen     TIMESTAMPTZ DEFAULT NOW(),
  last_seen      TIMESTAMPTZ DEFAULT NOW(),
  claimed_at     TIMESTAMPTZ,
  claimed_by     UUID  -- references players.id after they register
);

-- All share codes found per user
CREATE TABLE user_share_codes (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  steam_id      TEXT NOT NULL,
  share_code    TEXT UNIQUE NOT NULL,
  processed     BOOLEAN DEFAULT FALSE,
  processed_at  TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_player_match_stats_steam_id 
  ON player_match_stats(steam_id);
CREATE INDEX idx_player_match_stats_match_id 
  ON player_match_stats(match_id);
CREATE INDEX idx_user_share_codes_steam_id 
  ON user_share_codes(steam_id);
CREATE INDEX idx_user_share_codes_processed 
  ON user_share_codes(processed);
CREATE INDEX idx_ghost_profiles_steam_id 
  ON ghost_profiles(steam_id);

-- Function to get player stats
DROP FUNCTION IF EXISTS get_player_stats(TEXT);
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
     COUNT(*) FILTER (WHERE result = 'WIN') as wins,
     COUNT(*) FILTER (WHERE result = 'LOSS') as losses,
     COUNT(*) FILTER (WHERE result = 'TIE') as ties,
     MAX(premier_rating_after) as current_premier_rating
   FROM player_match_stats
   WHERE steam_id = p_steam_id;
END;
$$ LANGUAGE plpgsql;

-- Function to increment ghost matches
CREATE OR REPLACE FUNCTION increment_ghost_matches(p_steam_id TEXT)
RETURNS void AS $$
  UPDATE ghost_profiles 
  SET total_matches = total_matches + 1
  WHERE steam_id = p_steam_id
  AND claimed_at IS NULL; -- only if not yet claimed
$$ LANGUAGE SQL;
