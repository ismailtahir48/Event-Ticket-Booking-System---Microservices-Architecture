import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import Redis from 'ioredis';

// Get the directory of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env.local first, then .env
dotenv.config({ path: join(__dirname, '../.env.local') });
dotenv.config({ path: join(__dirname, '../.env') });

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
const redis = new Redis(redisUrl);

redis.on('error', (err) => {
  console.error('Redis connection error:', err);
});

redis.on('connect', () => {
  console.log('✅ Inventory Service - Redis connected');
});

// Distributed lock with SET NX PX (atomic operation)
export async function acquireLock(key: string, ttl: number = 60): Promise<boolean> {
  try {
    // SET key value EX ttl NX - atomic operation
    const result = await redis.set(key, 'locked', 'EX', ttl, 'NX');
    return result === 'OK';
  } catch (error) {
    console.error('Lock acquisition error:', error);
    return false;
  }
}

export async function releaseLock(key: string): Promise<void> {
  try {
    await redis.del(key);
  } catch (error) {
    console.error('Lock release error:', error);
  }
}

// Check if lock exists (for debugging)
export async function isLocked(key: string): Promise<boolean> {
  try {
    const result = await redis.exists(key);
    return result === 1;
  } catch (error) {
    console.error('Lock check error:', error);
    return false;
  }
}

export { redis };

