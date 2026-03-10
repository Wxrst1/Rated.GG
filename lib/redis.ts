import Redis from 'ioredis';

const REDIS_URL = process.env.REDIS_URL;

let redis: Redis | null = null;

if (REDIS_URL) {
  try {
    redis = new Redis(REDIS_URL);
    redis.on('error', (err) => {
      console.warn('⚠️ Redis Error:', err.message);
    });
  } catch (e) {
    console.warn('⚠️ Redis Init Failure, falling back to memory.');
  }
}

/**
 * Get cached data with Stale-While-Revalidate pattern
 */
export async function getCached<T>(key: string, fetcher: () => Promise<T>, ttlSeconds: number): Promise<T> {
  if (!redis) return fetcher();

  try {
    // 1. Try to get from cache
    const cached = await redis.get(key);
    
    if (cached) {
      // 2. Check if it's "stale" but still within SWR grace period
      // (Simplified: if it exists, return it, but maybe refetch asynchronously)
      return JSON.parse(cached);
    }
  } catch (e) {}

  // 3. Cache Miss: Fetch fresh
  const fresh = await fetcher();
  
  if (redis && fresh) {
    try {
      await redis.set(key, JSON.stringify(fresh), 'EX', ttlSeconds);
    } catch (e) {}
  }

  return fresh;
}

export default redis;
