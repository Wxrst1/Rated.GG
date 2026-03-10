import supabase from './supabase'

// Call this when user logs in via Steam for the first time
export async function claimGhostProfile(
  steamId: string, 
  userId: string
) {
  const { data: ghost } = await supabase
    .from('ghost_profiles')
    .select('total_matches')
    .eq('steam_id', steamId)
    .single()

  if (!ghost) return { claimed: false, matchCount: 0 }

  await supabase
    .from('players')
    .update({ waiting_matches: ghost.total_matches })
    .eq('steam_id', steamId);

  await supabase
    .from('ghost_profiles')
    .update({ 
      claimed_at: new Date().toISOString(),
      claimed_by: userId
    })
    .eq('steam_id', steamId);

  return { claimed: true, matchCount: ghost.total_matches }
}

export async function onUserRegister(profile: any) {
  const steamId = profile.id;
  
  // 1. Create or update user
  const { data: user, error } = await supabase
    .from('players')
    .upsert({
       steam_id: steamId,
       name: profile.displayName,
       avatar: profile.photos?.[0]?.value
    }, { onConflict: 'steam_id' })
    .select()
    .single()

  if (error || !user) {
     console.error("Error upserting player:", error);
     throw error;
  }
  
  // 2. Claim matches
  const claimStatus = await claimGhostProfile(steamId, user.id);
  
  return {
     user,
     claimStatus
  };
}
