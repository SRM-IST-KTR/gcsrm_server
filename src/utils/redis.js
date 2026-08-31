/**
 * Redis client singleton.
 * Lazily connects on first use so dotenv has already loaded.
 */
let Redis;
try {
  Redis = require('ioredis');
} catch (e) {
  // handled gracefully
}

let client = null;

const getRedis = () => {
  if (client) return client;
  if (!Redis) {
    console.warn('[redis] ioredis module not available');
    return null;
  }

  const url = process.env.REDIS_URL || 'redis://localhost:6379';
  client = new Redis(url, {
    maxRetriesPerRequest: 1,
    enableOfflineQueue: false,
    retryStrategy(times) {
      if (times > 3) return null; // give up after 3 retries
      return Math.min(times * 200, 2000);
    },
    lazyConnect: true,
  });

  client.on('error', (err) => {
    // suppress unhandled error crash
  });

  client.on('connect', () => {
    console.log('[redis] connected');
  });

  return client;
};

const isConnected = async () => {
  try {
    const r = getRedis();
    if (!r) return false;
    await r.ping();
    return true;
  } catch {
    return false;
  }
};

module.exports = { getRedis, isConnected };
