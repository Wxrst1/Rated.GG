const { createClient } = require('@supabase/supabase-js')
require('dotenv').config()

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY)

async function check() {
  try {
    const { data, error } = await supabase
      .from('player_match_stats')
      .select('team_number, match_id')
      .limit(50)
    
    if (error) {
      console.error('Error:', error)
    } else if (!data || data.length === 0) {
      console.log('No stats found in table player_match_stats')
    } else {
      const counts = {}
      data.forEach(d => {
        counts[d.team_number] = (counts[d.team_number] || 0) + 1
      })
      console.log('Team number counts:', JSON.stringify(counts))
      console.log('Sample match_id:', data[0].match_id)
    }
  } catch (e) {
    console.error('Fatal:', e.message)
  }
}

check()
