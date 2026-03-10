import { resolveVanityUrl, getPlayerProfile } from './steam';
import { findFaceitByName } from './faceit';

export async function searchPlayer(query: string) {
  let steamId: string | null = null;
  const input = query.trim();

  // 1. Check for SteamID64 direct (17 digits)
  if (/^\d{17}$/.test(input)) {
    steamId = input;
  } 
  
  // 2. Handle Steam URLs (Profiles)
  else if (input.includes('steamcommunity.com/profiles/')) {
    const parts = input.split('/').filter(Boolean);
    steamId = parts.pop() || null;
  }
  
  // 3. Handle Steam URLs (ID/Vanity)
  else if (input.includes('steamcommunity.com/id/')) {
    const parts = input.split('/').filter(Boolean);
    const vanity = parts.pop();
    if (vanity) steamId = await resolveVanityUrl(vanity);
  }
  
  // 4. Default to vanity resolution
  else {
    steamId = await resolveVanityUrl(input);
  }
  
  if (!steamId) return null;

  // 5. Build initial player summary
  const steamProfile = await getPlayerProfile(steamId);
  if (!steamProfile) return null;

  // 6. Try to find Faceit by the Steam nickname automatically
  const faceitProfile = await findFaceitByName(steamProfile.name);

  return {
    steamId,
    steamProfile,
    faceitProfile,
    isPublic: steamProfile.visibility === 3
  };
}
