import { createClient } from '@supabase/supabase-js'
import 'dotenv/config'

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!)

async function check() {
  const { data, error } = await supabase
    .from('player_match_stats')
    .select('team_number, match_id')
    .limit(20)
  
  if (error) console.error(error)
  else console.log(JSON.stringify(data, null, 2))
}

check()
