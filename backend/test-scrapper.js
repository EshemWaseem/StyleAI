// backend/test-scraper.js
require('dotenv').config(); 
const { scrapeSocialProfile } = require('./src/services/influencer/apifyScraper');

// Test karne ke liye teen alag alag platforms aur accounts
const TEST_CASES = [
  { platform: 'INSTAGRAM', handle: 'nasa' },
  { platform: 'TIKTOK', handle: 'charlidamelio' }, // TikTok ki sabse famous creator
  { platform: 'YOUTUBE', handle: 'MrBeast' }       // YouTube ka sabse bara creator
];

async function runTest(platform, handle) {
  console.log(`\n🚀 Starting test for ${platform} @${handle}...`);
  console.log(`⏳ Apify run start ho gaya hai, isme 30-60 seconds lag sakte hain...\n`);

  const startTime = Date.now();

  try {
    const result = await scrapeSocialProfile(platform, handle);
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);

    console.log(`✅ Scraping complete in ${duration} seconds!\n`);
    
    if (!result.found) {
      console.log("❌ Account not found or error:", result.reason);
      return;
    }

    console.log(`👤 Handle:          @${result.handle}`);
    console.log(`👥 Followers:       ${result.followerCount?.toLocaleString()}`);
    console.log(`📝 Total Posts:     ${result.totalPosts?.toLocaleString()}`);
    console.log(`📸 Posts Analyzed:  ${result.postsAnalyzed}`);
    console.log(`❤️  Total Likes:     ${result.totalLikes?.toLocaleString()}`);
    console.log(`📈 Engagement Rate: ${(result.engagementRate * 100).toFixed(2)}%`);
    console.log(`🏆 Score:           ${result.authenticityScore} / 100`);
    console.log(`🚦 Health:          ${result.engagementHealth}`);
    console.log(`🚩 Flags:           ${result.suspiciousFlags.length > 0 ? result.suspiciousFlags.join(', ') : 'None'}`);

    console.log("     ");
    console.log("📸 RECENT POSTS SAMPLE (Top 1):");
    if (result.recentPosts && result.recentPosts.length > 0) {
      const post = result.recentPosts[0];
      console.log(`    ID: ${post.id || post.shortCode || 'N/A'}`);
      console.log(`    Likes: ${post.likesCount?.toLocaleString() || 0} | Comments: ${post.commentsCount?.toLocaleString() || 0} | Views: ${post.videoViewCount?.toLocaleString() || 0}`);
    } else {
      console.log("    No recent posts fetched.");
    }
    console.log("      =====\n");

  } catch (error) {
    console.error(`❌ Test Failed for ${platform}!`);
    console.error("Error Details:", error.message);
    if (error.message.includes("APIFY_API_TOKEN")) {
      console.error("👉 Check karein: Aapki .env file mein APIFY_API_TOKEN set hai?");
    }
    console.log("      =====\n");
  }
}

async function runAllTests() {
  for (const test of TEST_CASES) {
    await runTest(test.platform, test.handle);
  }
}

runAllTests();