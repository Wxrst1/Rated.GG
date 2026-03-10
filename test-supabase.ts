import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || '';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testConnection() {
  console.log("Testing Supabase connection...");
  console.log("URL:", SUPABASE_URL);
  
  const { data, error } = await supabase.from('players').select('*').limit(1);
  
  if (error) {
    if (error.code === '42P01') {
      console.error("❌ Table 'players' not found! Please run the SQL script in Supabase SQL Editor.");
    } else {
      console.error("❌ Connection failed:", error.message);
    }
  } else {
    console.log("✅ Connection successful! Found", data.length, "players.");
  }
}

testConnection();
