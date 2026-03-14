import Redis from 'ioredis';
import 'dotenv/config';

const redisUrl = process.env.REDIS_URL;
console.log('Testing connection to:', redisUrl);

const redis = new Redis(redisUrl, {
  connectTimeout: 5000,
  maxRetriesPerRequest: 0
});

redis.on('connect', () => console.log('✅ Connected'));
redis.on('error', (err) => console.error('❌ Error:', err.message));

setTimeout(() => {
  console.log('Timeout reached');
  process.exit(0);
}, 6000);
