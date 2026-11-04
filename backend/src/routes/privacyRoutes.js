// backend/routes/privacyRoutes.js
const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <title>Privacy Policy — StyleAI</title>
      <style>
        body { font-family: sans-serif; line-height: 1.6; max-width: 800px; margin: 0 auto; padding: 40px 20px; color: #333; }
        h1 { color: #111; } h2 { margin-top: 30px; border-bottom: 1px solid #eee; padding-bottom: 5px; }
        p, li { color: #555; }
      </style>
    </head>
    <body>
      <h1>Privacy Policy</h1>
      <p><strong>Last updated:</strong> January 15, 2026</p>
      <p>This Privacy Policy explains how StyleAI collects, uses, and protects your personal information when you use our platform.</p>
      <h2>1. Information We Collect</h2>
      <ul>
        <li><strong>Account Info:</strong> Name, email, phone, organization details.</li>
        <li><strong>Ad Account Data:</strong> Tokens, ad IDs, and performance data when you connect Meta, Google, or TikTok.</li>
        <li><strong>Usage Data:</strong> IP address, browser type, interactions.</li>
      </ul>
      <h2>2. How We Use Your Information</h2>
      <ul>
        <li>To manage your account and connect to ad platforms.</li>
        <li>To match brands with creators and run campaigns.</li>
        <li>To improve our services and detect fraud.</li>
      </ul>
      <h2>3. Contact Us</h2>
      <p>For any privacy concerns, email us at <a href="mailto:privacy@styleai.com">privacy@styleai.com</a>.</p>
    </body>
    </html>
  `);
});

module.exports = router;