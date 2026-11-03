'use strict';

// ─── YOUR FILE — implement this ───────────────────────────────────────────────
// Implement three Redis helper functions using ioredis.
//
// cacheGet(key)
//   - redis.get(key) → string | null
//   - If string: JSON.parse and return the object
//   - If null: return null (cache miss)
//   - Wrap in try/catch: on error, log and return null (graceful degradation)
//
// cacheSet(key, data, ttlSeconds)
//   - redis.set(key, JSON.stringify(data), 'EX', ttlSeconds)
//   - Wrap in try/catch: on error, log (don't fail the request)
//
// cacheDel(key)
//   - redis.del(key)
//   - Wrap in try/catch: on error, log
//
// Redis connection:
//   host: process.env.REDIS_HOST || 'localhost'
//   port: parseInt(process.env.REDIS_PORT || '6379')
//   lazyConnect: true

const Redis = require('ioredis');

// TODO: create Redis instance

const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
  lazyConnect: true
});

// Get cached data
async function cacheGet(key) {
  try {
    const data = await redis.get(key);

    if (data === null) {
      return null;
    }

    return JSON.parse(data);
  } catch (error) {
    console.error('Redis cacheGet error:', error.message);
    return null;
  }
}

// Set cached data
async function cacheSet(key, data, ttlSeconds) {
  try {
    await redis.set(key, JSON.stringify(data), 'EX', ttlSeconds);
  } catch (error) {
    console.error('Redis cacheSet error:', error.message);
  }
}

// Delete cached data
async function cacheDel(key) {
  try {
    await redis.del(key);
  } catch (error) {
    console.error('Redis cacheDel error:', error.message);
  }
}

module.exports = { cacheGet, cacheSet, cacheDel };