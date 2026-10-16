// src/services/influencer/apifyScraper.js
// ======================================================
// Apify-based social media profile scraper.
// Supports: INSTAGRAM, TIKTOK, YOUTUBE
// Uses 2-layer cache: in-memory (1h) + Postgres (24h)
// ======================================================

const { ApifyClient } = require('apify-client');
const prisma = require('../../config/prisma');

const ACTORS = {
  INSTAGRAM: 'apify/instagram-scraper',
  TIKTOK:    'clockworks/tiktok-scraper',
  YOUTUBE:   'streamers/youtube-scraper',
};

const WAIT_SECS = 90;
const DB_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const MEM_TTL_MS = 60 * 60 * 1000;      // 1 hour in-memory

// In-memory cache (fastest — cleared on server restart)
const MEM_CACHE = new Map();

function memCacheGet(platform, handle) {
  const key = `${platform}:${handle}`;
  const hit = MEM_CACHE.get(key);
  if (!hit) return null;
  if (hit.expiresAt < Date.now()) {
    MEM_CACHE.delete(key);
    return null;
  }
  return hit.data;
}

function memCacheSet(platform, handle, data) {
  const key = `${platform}:${handle}`;
  MEM_CACHE.set(key, { data, expiresAt: Date.now() + MEM_TTL_MS });
}

function getClient() {
  const token = process.env.APIFY_API_TOKEN;
  if (!token) throw new Error('APIFY_API_TOKEN is not set in environment');
  return new ApifyClient({ token });
}

// ======================================================
// Handle / URL normalizer
// ======================================================
function normalizeHandle(raw = '') {
  let h = String(raw).trim().replace(/\/$/, '');

  const urlMatch = h.match(
    /(?:instagram\.com|tiktok\.com|youtube\.com\/(?:@|c\/|user\/)?)\/([^/?&#]+)/i
  );
  if (urlMatch) h = urlMatch[1];

  h = h.replace(/^@/, '').toLowerCase().trim();

  if (!h || h.length < 2) return null;
  return h;
}

// ======================================================
// INSTAGRAM
// ======================================================
async function scrapeInstagram(client, handle) {
  const input = {
    directUrls:   [`https://www.instagram.com/${handle}/`],
    resultsType:  'details',
    resultsLimit: 1,
  };

  const run = await client.actor(ACTORS.INSTAGRAM).call(input, { waitSecs: WAIT_SECS });
  const { items } = await client.dataset(run.defaultDatasetId).listItems({ limit: 1 });

  if (!items.length) return { found: false, reason: 'Account not found or private' };

  const p = items[0];
  if (p.error || p.isError) return { found: false, reason: 'Account not found or private' };

  return {
    found:          true,
    platform:       'INSTAGRAM',
    handle,
    profileUrl:     `https://www.instagram.com/${handle}/`,
    displayName:    p.fullName   || p.username  || handle,
    bio:            p.biography  || null,
    avatarUrl:      p.profilePicUrlHD || p.profilePicUrl || null,
    followerCount:  Number(p.followersCount  || 0),
    followingCount: Number(p.followsCount    || 0),
    engagementRate: typeof p.engagementRate === 'number' ? p.engagementRate : 0,
    avgLikes:       Number(p.avgLikes    || 0),
    avgComments:    Number(p.avgComments || 0),
    isVerified:     !!p.verified,
  };
}

// ======================================================
// TIKTOK
// ======================================================
async function scrapeTikTok(client, handle) {
  const input = {
    profiles:                [`https://www.tiktok.com/@${handle}`],
    resultsPerPage:          1,
    maxFollowersPerProfile:  0,
    maxFollowingPerProfile:  0,
    commentsPerPost:         0,
    topLevelCommentsPerPost: 0,
    maxRepliesPerComment:    0,
  };

  const run = await client.actor(ACTORS.TIKTOK).call(input, { waitSecs: WAIT_SECS });
  const { items } = await client.dataset(run.defaultDatasetId).listItems({ limit: 1 });

  if (!items.length) return { found: false, reason: 'Account not found or private' };

  const p = items[0];
  const a = p.authorMeta || p.author || {};

  if (!a.name && !a.nickName && !p.authorMeta) {
    return { found: false, reason: 'Account not found or private' };
  }

  const followers = Number(a.fans      ?? p.fans      ?? 0);
  const following = Number(a.following ?? p.following ?? 0);
  const hearts    = Number(a.heart     ?? p.heart     ?? 0);
  const videos    = Number(a.video     ?? p.video     ?? 0);

  const engagementRate =
    followers > 0 && videos > 0
      ? Math.min((hearts / videos) / followers, 1)
      : 0;

  return {
    found:          true,
    platform:       'TIKTOK',
    handle:         a.name || handle,
    profileUrl:     `https://www.tiktok.com/@${a.name || handle}`,
    displayName:    a.nickName || a.name || handle,
    bio:            a.signature || null,
    avatarUrl:      a.avatar || a.avatarLarger || a.avatarMedium || null,
    followerCount:  followers,
    followingCount: following,
    engagementRate,
    avgLikes:       videos > 0 ? Math.round(hearts / videos) : 0,
    avgComments:    0,
    isVerified:     !!(a.verified || p.verified),
  };
}

// ======================================================
// YOUTUBE
// ======================================================
async function scrapeYouTube(client, handle) {
  const input = {
    startUrls: [
      { url: `https://www.youtube.com/@${handle}/about` },
    ],
    maxResults:       1,
    maxResultsShorts: 0,
    maxResultStreams: 0,
  };

  const run = await client.actor(ACTORS.YOUTUBE).call(input, { waitSecs: WAIT_SECS });
  const { items } = await client.dataset(run.defaultDatasetId).listItems({ limit: 10 });

  if (!items.length) return { found: false, reason: 'Channel not found' };

  const withSubs = items.find((it) => Number(it.numberOfSubscribers) > 0);
  const p = withSubs || items[0];
  const about = p.aboutChannelInfo || {};

  const followers = Number(
    p.numberOfSubscribers ??
    about.numberOfSubscribers ??
    0
  );

  const avatar =
    p.channelAvatarUrl ||
    about.channelAvatarUrl ||
    null;

  const bio =
    p.channelDescription ||
    about.channelDescription ||
    null;

  const verified =
    p.isChannelVerified ||
    about.isChannelVerified ||
    false;

  const channelName =
    p.channelName ||
    about.channelName ||
    handle;

  const channelUrl =
    p.channelUrl ||
    about.channelUrl ||
    `https://www.youtube.com/@${handle}`;

  return {
    found:          true,
    platform:       'YOUTUBE',
    handle,
    profileUrl:     channelUrl,
    displayName:    channelName,
    bio,
    avatarUrl:      avatar,
    followerCount:  followers,
    followingCount: 0,
    engagementRate: 0,
    avgLikes:       Number(p.likes    ?? 0),
    avgComments:    Number(p.comments ?? 0),
    isVerified:     verified,
  };
}

// ======================================================
// DB cache helpers
// ======================================================
async function dbCacheGet(platform, handle) {
  try {
    const row = await prisma.socialScrapeCache.findUnique({
      where: { platform_handle: { platform, handle } },
    });
    if (!row) return null;

    // Expired — clean up
    if (row.expiresAt < new Date()) {
      prisma.socialScrapeCache
        .delete({ where: { id: row.id } })
        .catch(() => {});
      return null;
    }
    return row.data;
  } catch (e) {
    console.warn('[apifyScraper] DB cache read failed:', e.message);
    return null;
  }
}

async function dbCacheSet(platform, handle, data) {
  if (!data || !data.found) return; // don't poison with not-found

  try {
    const expiresAt = new Date(Date.now() + DB_TTL_MS);
    await prisma.socialScrapeCache.upsert({
      where: { platform_handle: { platform, handle } },
      create: {
        platform,
        handle,
        data,
        found: true,
        expiresAt,
      },
      update: {
        data,
        found: true,
        expiresAt,
        updatedAt: new Date(),
      },
    });
  } catch (e) {
    console.warn('[apifyScraper] DB cache write failed:', e.message);
  }
}

// ======================================================
// Main export
// ======================================================
async function scrapeSocialProfile(platform, handleOrUrl) {
  const handle = normalizeHandle(handleOrUrl);
  if (!handle) {
    return { found: false, reason: 'Invalid handle or URL provided' };
  }

  const p = (platform || '').toUpperCase();

  // ---- 1. Memory cache ----
  const memHit = memCacheGet(p, handle);
  if (memHit) return memHit;

  // ---- 2. DB cache ----
  const dbHit = await dbCacheGet(p, handle);
  if (dbHit) {
    memCacheSet(p, handle, dbHit);
    return dbHit;
  }

  // ---- 3. Cache miss → call Apify ----
  const client = getClient();

  let result;
  try {
    switch (p) {
      case 'INSTAGRAM':
        result = await scrapeInstagram(client, handle);
        break;
      case 'TIKTOK':
        result = await scrapeTikTok(client, handle);
        break;
      case 'YOUTUBE':
        result = await scrapeYouTube(client, handle);
        break;
      default:
        return { found: false, reason: `Auto-fetch not supported for ${platform}` };
    }
  } catch (err) {
    const msg = (err.message || '').toLowerCase();
    if (
      msg.includes('404')       ||
      msg.includes('not found') ||
      msg.includes('private')   ||
      msg.includes('blocked')
    ) {
      result = { found: false, reason: 'Account not found, private, or blocked' };
    } else {
      throw err;
    }
  }

  // ---- 4. Store both caches ----
  memCacheSet(p, handle, result);
  await dbCacheSet(p, handle, result);

  return result;
}

module.exports = { scrapeSocialProfile, normalizeHandle };