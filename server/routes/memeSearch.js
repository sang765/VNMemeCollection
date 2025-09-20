// server/routes/memeSearch.js
// Express route: /api/memes?q=...&provider=tenor|giphy|both
// Includes simple in-memory caching and IP-based rate limiting

const express = require('express');
let fetch;
try {
  fetch = global.fetch || require('node-fetch');
} catch (e) {
  fetch = require('node-fetch');
}
const router = express.Router();

const TENOR_API_KEY = process.env.TENOR_API_KEY || '';
const GIPHY_API_KEY = process.env.GIPHY_API_KEY || '';

// Simple in-memory cache: key -> { ts, data }
const CACHE_TTL_MS = 30 * 1000; // 30s
const cache = new Map();

// Simple IP rate limiter: allow N requests per WINDOW_MS
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 60s
const RATE_LIMIT_MAX = 60; // max requests per window per IP
const clientStats = new Map();

function isRateLimited(ip) {
  const now = Date.now();
  const entry = clientStats.get(ip) || { ts: now, count: 0 };
  if (now - entry.ts > RATE_LIMIT_WINDOW_MS) {
    entry.ts = now;
    entry.count = 1;
    clientStats.set(ip, entry);
    return false;
  }
  entry.count += 1;
  clientStats.set(ip, entry);
  return entry.count > RATE_LIMIT_MAX;
}

async function fetchTenor(q, limit = 24) {
  if (!TENOR_API_KEY) return [];
  const url = `https://g.tenor.com/v1/search?q=${encodeURIComponent(q)}&key=${TENOR_API_KEY}&limit=${limit}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Tenor API error: ${res.status}`);
  const data = await res.json();
  return (data.results || []).map(item => {
    const media = (item.media && item.media[0]) || {};
    return {
      id: `tenor_${item.id}`,
      provider: 'tenor',
      title: item.title || q,
      url: media.mp4?.url || media.gif?.url || media.tinygif?.url || '',
      preview: media.nanomp4?.url || media.smallgif?.url || media.gif?.url || '',
    };
  });
}

async function fetchGiphy(q, limit = 24) {
  if (!GIPHY_API_KEY) return [];
  const url = `https://api.giphy.com/v1/gifs/search?api_key=${GIPHY_API_KEY}&q=${encodeURIComponent(q)}&limit=${limit}&rating=pg-13`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Giphy API error: ${res.status}`);
  const data = await res.json();
  return (data.data || []).map(item => ({
    id: `giphy_${item.id}`,
    provider: 'giphy',
    title: item.title || q,
    url: item.images?.original?.mp4 || item.images?.original?.url || '',
    preview: item.images?.fixed_width_small?.url || item.images?.preview_gif?.url || item.images?.original?.url || '',
  }));
}

// Helper to get cache key
function cacheKeyFor(q, provider, limit) {
  return `${q}|${provider}|${limit}`;
}

router.get('/memes', async (req, res) => {
  const q = (req.query.q || '').trim();
  const provider = (req.query.provider || 'both').toLowerCase();
  const limit = Math.max(1, Math.min(100, parseInt(req.query.limit || '24', 10)));

  if (!q) return res.status(400).json({ error: 'Missing query parameter q' });

  const ip = req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress || 'unknown';
  if (isRateLimited(ip)) return res.status(429).json({ error: 'Rate limit exceeded' });

  const key = cacheKeyFor(q, provider, limit);
  const now = Date.now();
  const cached = cache.get(key);
  if (cached && (now - cached.ts) < CACHE_TTL_MS) {
    return res.json({ results: cached.data, cached: true });
  }

  try {
    const tasks = [];
    if (provider === 'tenor' || provider === 'both') tasks.push(fetchTenor(q, limit));
    if (provider === 'giphy' || provider === 'both') tasks.push(fetchGiphy(q, limit));

    const resultsArr = await Promise.all(tasks);
    const results = resultsArr.flat().slice(0, limit);

    cache.set(key, { ts: now, data: results });
    res.json({ results, cached: false });
  } catch (err) {
    console.error('Error in /api/memes:', err);
    res.status(500).json({ error: 'Internal server error', details: String(err.message || err) });
  }
});

module.exports = router;