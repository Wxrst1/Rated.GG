import 'dotenv/config';
import { demoQueue } from './lib/matchQueue';

const shareCode = 'CSGO-y9hpw-54t7J-N4o67-HEDcO-qHBxH';
const steamId = '76561199225914225';

async function run() {
  console.log(`[Script] Queuing forensic analysis for ${shareCode}...`);
  await demoQueue.add('process-manual', { shareCode, steamId });
  console.log(`[Script] ✅ Successfully queued!`);
  process.exit(0);
}

run().catch(console.error);
