import Redis from 'ioredis';

const redisUrl = "redis://default:hyGIAYdfrnOU41bDVBe93qlVLPLpCDrj@redis-18187.c311.eu-central-1-1.ec2.cloud.redislabs.com:18187";

async function checkRedis() {
  const redis = new Redis(redisUrl);
  try {
    const memoryInfo = await redis.info('memory');
    console.log("Redis Memory Info snippet:");
    console.log(memoryInfo.split('\n').filter(l => l.includes('maxmemory')).join('\n'));
    process.exit(0);
  } catch (err: any) {
    console.error("Error:", err.message);
    process.exit(1);
  }
}

checkRedis();
