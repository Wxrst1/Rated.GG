import supabase from './supabase';
import { crawlQueue } from './matchQueue';
import { enrichGhostProfiles } from './matchSaver';
import cron from 'node-cron';

// Every 30 minutes: Sync new matches for registered users
cron.schedule('*/30 * * * *', async () => {
  console.log('Running periodic match sync for all users...');
  
  try {
    const { data: users, error } = await supabase
      .from('players')
      .select('steam_id, auth_code, latest_match_id')
      .not('auth_code', 'is', null)
      .not('latest_match_id', 'is', null);

    if (error) throw error;

    for (const user of users || []) {
      await crawlQueue.add('crawl-user', {
        steamId: user.steam_id,
        authCode: user.auth_code,
        lastShareCode: user.latest_match_id
      });
    }
    
    console.log(`Queued sync for ${users?.length || 0} users`);
  } catch (error) {
    console.error('Periodic sync failed:', error);
  }
});

// Every 24 hours: Re-enrich ghost profiles
cron.schedule('0 0 * * *', async () => {
  console.log('Running daily ghost profile enrichment...');
  
  try {
    const { data: ghostProfiles, error } = await supabase
        .from('ghost_profiles')
        .select('steam_id');
        
    if (error) throw error;
    
    const steamIds = (ghostProfiles || []).map(p => p.steam_id);
    
    // Process in batches of 100 via the matchSaver function
    for (let i = 0; i < steamIds.length; i += 100) {
        const chunk = steamIds.slice(i, i + 100);
        await enrichGhostProfiles(chunk);
    }
    
    console.log(`Enrichment completed for ${ghostProfiles?.length || 0} ghost profiles`);
  } catch (error) {
    console.error('Daily enrichment failed:', error);
  }
});
