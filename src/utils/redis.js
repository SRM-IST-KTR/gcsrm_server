/**
 * Redis client singleton (robust).
 * Connects lazily on first use, buffers commands while reconnecting,
 * and tolerates idle-socket drops on serverless runtimes.
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
    maxRetriesPerRequest: 3,
    enableOfflineQueue: true, // buffer commands while the socket reconnects
    connectTimeout: 10000,
    tls: url.startsWith('rediss://') ? { rejectUnauthorized: false } : undefined,
    retryStrategy(times) {
      return Math.min(times * 100, 3000);
    },
  });

  client.on('error', (err) => {
    console.error('[redis] error:', err.message);
  });

  client.on('connect', () => {
    console.log('[redis] connected');
  });

  return client;
};

const isConnected = async () => {
  const r = getRedis();
  if (!r) return false;
  return r.status === 'ready';
};

module.exports = { getRedis, isConnected };