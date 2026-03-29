/**
 * REDIS CONFIGURATION
 * For distributed rate limiting and caching
 */

import Redis from 'ioredis';

// Redis connection configuration
const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD || undefined,
  db: parseInt(process.env.REDIS_DB || '0'),
  retryStrategy: (times: number) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
  maxRetriesPerRequest: 3,
  enableReadyCheck: true,
  enableOfflineQueue: true
};

// Create Redis client
export const redisClient = new Redis(redisConfig);

// Redis event handlers
redisClient.on('connect', () => {
  console.log('✅ Redis connected');
});

redisClient.on('ready', () => {
  console.log('✅ Redis ready');
});

redisClient.on('error', (err) => {
  console.error('❌ Redis error:', err);
});

redisClient.on('close', () => {
  console.warn('⚠️ Redis connection closed');
});

redisClient.on('reconnecting', () => {
  console.log('🔄 Redis reconnecting...');
});

// Graceful shutdown
process.on('SIGINT', async () => {
  await redisClient.quit();
  console.log('✅ Redis connection closed gracefully');
});

process.on('SIGTERM', async () => {
  await redisClient.quit();
  console.log('✅ Redis connection closed gracefully');
});

export default redisClient;
