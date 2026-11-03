'use strict';

require('dotenv').config();

const express = require('express');
const db      = require('./db');
const { cacheGet, cacheSet, cacheDel } = require('./cache');

const app = express();
app.use(express.json());

const FEED_KEY = 'feed:trending';
const FEED_TTL = 60;   // seconds

app.get('/health', (req, res) => res.json({ ok: true }));

// GET /feed — cache-aside pattern
app.get('/feed', async (req, res) => {
  try {
    // 1. Check Redis cache
    const cachedPosts = await cacheGet(FEED_KEY);

    if (cachedPosts !== null) {
      res.set('X-Cache', 'HIT');
      console.log('[feed] CACHE HIT');
      return res.json(cachedPosts);
    }

    // 2. Cache miss — query database
    const t0 = Date.now();
    const posts = await db.getTrendingPosts();

    console.log(`[feed] DB MISS ${Date.now() - t0}ms`);

    // 3. Store result in Redis for 60 seconds
    await cacheSet(FEED_KEY, posts, FEED_TTL);

    // 4. Return response
    res.set('X-Cache', 'MISS');
    return res.json(posts);

  } catch (err) {
    console.error('[feed] error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /posts — creates a new post and invalidates cache
app.post('/posts', async (req, res) => {
  try {
    const post = await db.createPost(req.body);

    // Invalidate feed cache after creating a post
    await cacheDel(FEED_KEY);

    res.status(201).json(post);

  } catch (err) {
    console.error('[posts] error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

const PORT = process.env.PORT || 3000;

if (require.main === module) {
  app.listen(PORT, () => console.log(`Server on http://localhost:${PORT}`));
}

module.exports = { app };