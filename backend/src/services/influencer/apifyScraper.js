// src/services/influencer/apifyScraper.js

// Apify-based social media profile scraper.
// Supports: INSTAGRAM, TIKTOK, YOUTUBE
// Uses 2-layer cache: in-memory (1h) + Postgres (24h)
//
// NEW (v2):
//   - Fetches recent 12 posts per profile
//   - Returns real aggregated metrics (likes/comments/views/shares)
//   - Computes industry-standard engagement rate
//   - Detects fake followers via engagement benchmarks
//   - Returns per-post data for transparency


const { ApifyClient } = require('apify-client');
const prisma = require('../../config/prisma');

const ACTORS = {
  INSTAGRAM: 'apify/instagram-scraper',
  TIKTOK: 'clockworks/tiktok-scraper',
  YOUTUBE: 'streamers/youtube-scraper',
};

const WAIT_SECS = 90;
const DB_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const MEM_TTL_MS = 60 * 60 * 1000; // 1 hour in-memory
const POSTS_TO_ANALYZE = 12;

// Bump this when return shape changes → auto-invalidates old caches
const CACHE_SCHEMA_VERSION = 2;

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
  // Stale schema — treat as miss
  if (hit.data?.schemaVersion !== CACHE_SCHEMA_VERSION) {
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


// Handle / URL normalizer

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


// Engagement aggregation (shared by all platforms)

function aggregateEngagement(posts) {
  const valid = (posts || []).filter((p) => p && typeof p === 'object');
  const n = valid.length || 1;

  const totalLikes = valid.reduce((s, p) => s + (Number(p.likesCount) || 0), 0);
  const totalComments = valid.reduce(
    (s, p) => s + (Number(p.commentsCount) || 0),
    0
  );
  const totalViews = valid.reduce(
    (s, p) => s + (Number(p.videoViewCount) || 0),
    0
  );
  const totalShares = valid.reduce(
    (s, p) => s + (Number(p.sharesCount) || 0),
    0
  );

  // Most recent post timestamp
  const timestamps = valid
    .map((p) => p.timestamp)
    .filter(Boolean)
    .map((t) => {
      const d = new Date(t);
      return isNaN(d.getTime()) ? null : d.getTime();
    })
    .filter(Boolean);

  const lastPostAt = timestamps.length
    ? new Date(Math.max(...timestamps)).toISOString()
    : null;

  return {
    totalLikes,
    totalComments,
    totalViews,
    totalShares,
    avgLikes: totalLikes / n,
    avgComments: totalComments / n,
    avgViews: totalViews / n,
    avgShares: totalShares / n,
    lastPostAt,
  };
}


// Industry-standard engagement benchmarks
// Returns expected engagement rate as PERCENT (e.g. 2.0 = 2%)

function expectedEngagementRate(followers) {
  if (followers < 1000) return 8.0;
  if (followers < 10000) return 4.5;
  if (followers < 50000) return 3.0;
  if (followers < 500000) return 2.0;
  if (followers < 1000000) return 1.5;
  return 1.0;
}


// Fake-follower detection / authenticity scoring

function scoreAuthenticity({
  followers,
  following,
  totalPosts,
  postsAnalyzed,
  avgLikes,
  avgComments,
  engagementRate, // as decimal (e.g. 0.02 = 2%)
  lastPostAt,
}) {
  let score = 100;
  const flags = [];

  // 1. Follower-to-following ratio
  if (following > 0 && followers > 10000) {
    const ratio = following / followers;
    if (ratio > 0.5) {
      score -= 25;
      flags.push('HIGH_FOLLOW_RATIO');
    } else if (ratio > 0.3) {
      score -= 15;
      flags.push('ELEVATED_FOLLOW_RATIO');
    }
  }

  // 2. Engagement rate vs expected benchmark
  const expected = expectedEngagementRate(followers);
  if (expected > 0 && followers > 500) {
    const actualPct = engagementRate * 100;
    const ratio = actualPct / expected;
    if (ratio < 0.25) {
      score -= 40;
      flags.push('VERY_LOW_ENGAGEMENT');
    } else if (ratio < 0.5) {
      score -= 25;
      flags.push('LOW_ENGAGEMENT');
    } else if (ratio < 0.75) {
      score -= 10;
      flags.push('BELOW_AVERAGE_ENGAGEMENT');
    } else if (ratio > 1.5) {
      score += 5; // bonus for exceptional
      flags.push('HIGH_ENGAGEMENT');
    }
  }

  // 3. Post availability
  if (postsAnalyzed === 0) {
    score -= 20;
    flags.push('NO_POSTS_AVAILABLE');
  }

  // 4. Recency
  if (lastPostAt) {
    const days =
      (Date.now() - new Date(lastPostAt).getTime()) / (1000 * 60 * 60 * 24);
    if (days > 90) {
      score -= 20;
      flags.push('INACTIVE_90D');
    } else if (days > 30) {
      score -= 10;
      flags.push('INACTIVE_30D');
    }
  } else {
    score -= 15;
    flags.push('NO_POST_TIMESTAMPS');
  }

  // 5. Post count sanity
  if (totalPosts < 5 && followers > 10000) {
    score -= 15;
    flags.push('LOW_POST_COUNT');
  }

  score = Math.max(0, Math.min(100, score));

  let engagementHealth;
  if (score >= 80) engagementHealth = 'EXCELLENT';
  else if (score >= 60) engagementHealth = 'GOOD';
  else if (score >= 40) engagementHealth = 'SUSPICIOUS';
  else engagementHealth = 'FAKE';

  return {
    authenticityScore: score,
    engagementHealth,
    suspiciousFlags: flags,
    expectedEngagementRate: expected,
  };
}


// INSTAGRAM

async function scrapeInstagram(client, handle) {
  //  Step 1: Profile details 
  const profileRun = await client
    .actor(ACTORS.INSTAGRAM)
    .call(
      {
        directUrls: [`https://www.instagram.com/${handle}/`],
        resultsType: 'details',
        resultsLimit: 1,
      },
      { waitSecs: WAIT_SECS }
    );

  const profileList = await client
    .dataset(profileRun.defaultDatasetId)
    .listItems({ limit: 1 });

  const profileItems = profileList.items || [];
  if (!profileItems.length) {
    return { found: false, reason: 'Account not found or private' };
  }

  const p = profileItems[0];
  if (p.error || p.isError) {
    return { found: false, reason: 'Account not found or private' };
  }

  //  Step 2: Recent posts (from latestPosts, else separate call) 
  let rawPosts = Array.isArray(p.latestPosts) ? p.latestPosts : [];

  if (rawPosts.length < 3) {
    try {
      const postsRun = await client
        .actor(ACTORS.INSTAGRAM)
        .call(
          {
            directUrls: [`https://www.instagram.com/${handle}/`],
            resultsType: 'posts',
            resultsLimit: POSTS_TO_ANALYZE,
          },
          { waitSecs: WAIT_SECS }
        );

      const postsList = await client
        .dataset(postsRun.defaultDatasetId)
        .listItems({ limit: POSTS_TO_ANALYZE + 3 });

      const newPosts = (postsList.items || []).filter(
        (x) => !x.error && !x.isError && x.shortCode
      );
      if (newPosts.length > rawPosts.length) rawPosts = newPosts;
    } catch (e) {
      console.warn('[apifyScraper] instagram posts fallback failed:', e.message);
    }
  }

  //  Step 3: Normalize posts 
  const recentPosts = rawPosts.slice(0, POSTS_TO_ANALYZE).map((post) => ({
    id: post.id || post.pk || null,
    shortCode: post.shortCode || null,
    url: post.url || null,
    type: post.type || null,
    likesCount: Number(post.likesCount || 0),
    commentsCount: Number(post.commentsCount || 0),
    videoViewCount: Number(
      post.videoPlayCount || post.videoViewCount || 0
    ),
    sharesCount: Number(post.sharesCount || 0),
    timestamp: post.timestamp || null,
    isVideo: post.type === 'Video' || post.productType === 'clips',
  }));

  const agg = aggregateEngagement(recentPosts);

  const followers = Number(p.followersCount || 0);
  const following = Number(p.followsCount || 0);
  const totalPosts = Number(p.postsCount || 0);

  const engagementRate =
    followers > 0 ? (agg.avgLikes + agg.avgComments) / followers : 0;

  const authenticity = scoreAuthenticity({
    followers,
    following,
    totalPosts,
    postsAnalyzed: recentPosts.length,
    avgLikes: agg.avgLikes,
    avgComments: agg.avgComments,
    engagementRate,
    lastPostAt: agg.lastPostAt,
  });

  return {
    found: true,
    schemaVersion: CACHE_SCHEMA_VERSION,
    scrapedAt: new Date().toISOString(),

    platform: 'INSTAGRAM',
    handle,
    profileUrl: `https://www.instagram.com/${handle}/`,
    displayName: p.fullName || p.username || handle,
    bio: p.biography || null,
    avatarUrl: p.profilePicUrlHD || p.profilePicUrl || null,
    isVerified: !!p.verified,

    followerCount: followers,
    followingCount: following,
    totalPosts,

    postsAnalyzed: recentPosts.length,
    totalLikes: agg.totalLikes,
    totalComments: agg.totalComments,
    totalViews: agg.totalViews,
    totalShares: agg.totalShares,
    avgLikes: Math.round(agg.avgLikes),
    avgComments: Math.round(agg.avgComments),
    avgViews: Math.round(agg.avgViews),
    avgShares: Math.round(agg.avgShares),

    engagementRate: Number(engagementRate.toFixed(6)),
    lastPostAt: agg.lastPostAt,

    recentPosts,
    ...authenticity,
  };
}


// TIKTOK

async function scrapeTikTok(client, handle) {
  const input = {
    profiles: [`https://www.tiktok.com/@${handle}`],
    resultsPerPage: POSTS_TO_ANALYZE,
    shouldDownloadVideos: false,
    shouldDownloadCovers: false,
    shouldDownloadSubtitles: false,
    maxFollowersPerProfile: 0,
    maxFollowingPerProfile: 0,
    commentsPerPost: 0,
    topLevelCommentsPerPost: 0,
    maxRepliesPerComment: 0,
  };

  const run = await client
    .actor(ACTORS.TIKTOK)
    .call(input, { waitSecs: WAIT_SECS });

  const list = await client
    .dataset(run.defaultDatasetId)
    .listItems({ limit: POSTS_TO_ANALYZE + 10 });

  const items = list.items || [];
  if (!items.length) {
    return { found: false, reason: 'Account not found or private' };
  }

  const first = items[0];
  const a = first.authorMeta || first.author || {};

  if (!a.name && !a.nickName && !first.authorMeta) {
    return { found: false, reason: 'Account not found or private' };
  }

  //  Normalize posts 
  const recentPosts = items.slice(0, POSTS_TO_ANALYZE).map((v) => ({
    id: v.id || null,
    url: v.webVideoUrl || v.videoUrl || null,
    description: v.text || null,
    likesCount: Number(v.diggCount || 0),
    commentsCount: Number(v.commentCount || 0),
    videoViewCount: Number(v.playCount || 0),
    sharesCount: Number(v.shareCount || 0),
    timestamp: v.createTimeISO
      ? new Date(v.createTimeISO).toISOString()
      : null,
    isVideo: true,
  }));

  const agg = aggregateEngagement(recentPosts);

  const followers = Number(a.fans ?? first.fans ?? 0);
  const following = Number(a.following ?? first.following ?? 0);
  const hearts = Number(a.heart ?? first.heart ?? 0);
  const totalPosts = Number(a.video ?? first.video ?? 0);

  const engagementRate =
    followers > 0 ? (agg.avgLikes + agg.avgComments) / followers : 0;

  const authenticity = scoreAuthenticity({
    followers,
    following,
    totalPosts,
    postsAnalyzed: recentPosts.length,
    avgLikes: agg.avgLikes,
    avgComments: agg.avgComments,
    engagementRate,
    lastPostAt: agg.lastPostAt,
  });

  return {
    found: true,
    schemaVersion: CACHE_SCHEMA_VERSION,
    scrapedAt: new Date().toISOString(),

    platform: 'TIKTOK',
    handle: a.name || handle,
    profileUrl: `https://www.tiktok.com/@${a.name || handle}`,
    displayName: a.nickName || a.name || handle,
    bio: a.signature || null,
    avatarUrl: a.avatarLarger || a.avatar || a.avatarMedium || null,
    isVerified: !!(a.verified || first.verified),

    followerCount: followers,
    followingCount: following,
    totalPosts,
    totalHearts: hearts, // TikTok-specific: total likes across all videos

    postsAnalyzed: recentPosts.length,
    totalLikes: agg.totalLikes,
    totalComments: agg.totalComments,
    totalViews: agg.totalViews,
    totalShares: agg.totalShares,
    avgLikes: Math.round(agg.avgLikes),
    avgComments: Math.round(agg.avgComments),
    avgViews: Math.round(agg.avgViews),
    avgShares: Math.round(agg.avgShares),

    engagementRate: Number(engagementRate.toFixed(6)),
    lastPostAt: agg.lastPostAt,

    recentPosts,
    ...authenticity,
  };
}


// YOUTUBE

async function scrapeYouTube(client, handle) {
  const input = {
    startUrls: [{ url: `https://www.youtube.com/@${handle}/videos` }],
    maxResults: POSTS_TO_ANALYZE,
    maxResultsShorts: 0,
    maxResultStreams: 0,
  };

  const run = await client
    .actor(ACTORS.YOUTUBE)
    .call(input, { waitSecs: WAIT_SECS });

  const list = await client
    .dataset(run.defaultDatasetId)
    .listItems({ limit: POSTS_TO_ANALYZE + 20 });

  const items = list.items || [];
  if (!items.length) {
    return { found: false, reason: 'Channel not found' };
  }

  // Find an item with channel metadata
  const withChannel = items.find(
    (it) =>
      it.channelName ||
      it.numberOfSubscribers ||
      it.channelUrl ||
      it.aboutChannelInfo
  );
  const p = withChannel || items[0];
  const about = p.aboutChannelInfo || {};

  const followers = Number(
    p.numberOfSubscribers ?? about.numberOfSubscribers ?? 0
  );

  //  Normalize posts 
  const videoItems = items.filter(
    (v) => v.title || v.viewCount || v.likes || v.id
  );

  const recentPosts = videoItems.slice(0, POSTS_TO_ANALYZE).map((v) => ({
    id: v.id || null,
    url: v.url || null,
    title: v.title || null,
    description: v.description || null,
    likesCount: Number(v.likes || 0),
    commentsCount: Number(v.commentsCount || 0),
    videoViewCount: Number(v.viewCount || 0),
    sharesCount: 0,
    timestamp: v.date || v.publishedAt || null,
    isVideo: true,
  }));

  const agg = aggregateEngagement(recentPosts);

  const engagementRate =
    followers > 0 ? (agg.avgLikes + agg.avgComments) / followers : 0;

  const authenticity = scoreAuthenticity({
    followers,
    following: 0,
    totalPosts: videoItems.length,
    postsAnalyzed: recentPosts.length,
    avgLikes: agg.avgLikes,
    avgComments: agg.avgComments,
    engagementRate,
    lastPostAt: agg.lastPostAt,
  });

  return {
    found: true,
    schemaVersion: CACHE_SCHEMA_VERSION,
    scrapedAt: new Date().toISOString(),

    platform: 'YOUTUBE',
    handle,
    profileUrl: p.channelUrl || `https://www.youtube.com/@${handle}`,
    displayName: p.channelName || about.channelName || handle,
    bio: p.channelDescription || about.channelDescription || null,
    avatarUrl: p.channelAvatarUrl || about.channelAvatarUrl || null,
    isVerified: !!(p.isChannelVerified || about.isChannelVerified),

    followerCount: followers,
    followingCount: 0,
    totalPosts: videoItems.length,

    postsAnalyzed: recentPosts.length,
    totalLikes: agg.totalLikes,
    totalComments: agg.totalComments,
    totalViews: agg.totalViews,
    totalShares: 0,
    avgLikes: Math.round(agg.avgLikes),
    avgComments: Math.round(agg.avgComments),
    avgViews: Math.round(agg.avgViews),
    avgShares: 0,

    engagementRate: Number(engagementRate.toFixed(6)),
    lastPostAt: agg.lastPostAt,

    recentPosts,
    ...authenticity,
  };
}


// DB cache helpers

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

    // Stale schema — treat as miss
    if (row.data?.schemaVersion !== CACHE_SCHEMA_VERSION) {
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


// Main export
async function scrapeSocialProfile(platform, handleOrUrl) {
  const handle = normalizeHandle(handleOrUrl);
  if (!handle) {
    return { found: false, reason: 'Invalid handle or URL provided' };
  }

  const p = (platform || '').toUpperCase();

  //  1. Memory cache 
  const memHit = memCacheGet(p, handle);
  if (memHit) {
    return { ...memHit, cacheHit: 'memory' };
  }

  //  2. DB cache 
  const dbHit = await dbCacheGet(p, handle);
  if (dbHit) {
    memCacheSet(p, handle, dbHit);
    return { ...dbHit, cacheHit: 'db' };
  }

  //  3. Cache miss → call Apify 
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
        return {
          found: false,
          reason: `Auto-fetch not supported for ${platform}`,
        };
    }
  } catch (err) {
    const msg = (err.message || '').toLowerCase();
    if (
      msg.includes('404') ||
      msg.includes('not found') ||
      msg.includes('private') ||
      msg.includes('blocked')
    ) {
      result = { found: false, reason: 'Account not found, private, or blocked' };
    } else {
      throw err;
    }
  }

  //  4. Store both caches 
  if (result.found) {
    memCacheSet(p, handle, result);
    await dbCacheSet(p, handle, result);
  }

  return { ...result, cacheHit: 'miss' };
}

module.exports = { scrapeSocialProfile, normalizeHandle };