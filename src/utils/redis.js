/**
 * Redis client singleton.
 * Lazily connects on first use so dotenv has already loaded.
 */
const Redis = require('ioredis');

let client = null;
let connectError = null;

const getRedis = () => {
  if (client) return client;
  if (connectError) throw connectError;

  const url = process.env.REDIS_URL || 'redis://localhost:6379';
  client = new Redis(url, {
    maxRetriesPerRequest: 1,
    retryStrategy(times) {
      if (times > 3) return null; // give up after 3 retries
      return Math.min(times * 200, 2000);
    },
    lazyConnect: false,
  });

  client.on('error', (err) => {
    console.error('[redis] connection error:', err.message);
  });

  client.on('connect', () => {
    console.log('[redis] connected');
  });

  return client;
};

const isConnected = async () => {
  try {
    const r = getRedis();
    await r.ping();
    return true;
  } catch {
    return false;
  }
};

module.exports = { getRedis, isConnected };