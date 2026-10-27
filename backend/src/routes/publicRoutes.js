// backend/src/routes/publicRoutes.js
const express = require('express');
const router = express.Router();

router.get('/privacy', (req, res) => {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Privacy Policy — StyleAI</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #0d0f0e;
      color: #f2f2f0;
      line-height: 1.7;
      padding: 2rem 1rem;
    }
    .container {
      max-width: 800px;
      margin: 0 auto;
      background: #1a1d1c;
      border: 1px solid #2e3330;
      border-radius: 16px;
      padding: 3rem;
    }
    .badge {
      display: inline-block;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      color: #8b6f47;
      margin-bottom: 1rem;
    }
    h1 {
      font-family: Georgia, 'Times New Roman', serif;
      font-size: 2.2rem;
      font-weight: 500;
      margin-bottom: 0.5rem;
    }
    .updated {
      font-size: 0.85rem;
      color: #7a8580;
      margin-bottom: 2rem;
      padding-bottom: 1.5rem;
      border-bottom: 1px solid #2e3330;
    }
    h2 {
      font-size: 1.1rem;
      font-weight: 600;
      margin-top: 2rem;
      margin-bottom: 0.75rem;
      color: #e8e8e6;
    }
    p { color: #a8b0ad; margin-bottom: 1rem; }
    ul { padding-left: 1.5rem; margin-bottom: 1rem; }
    li { color: #a8b0ad; margin-bottom: 0.4rem; }
    strong { color: #e8e8e6; }
    a { color: #8b6f47; text-decoration: none; }
    a:hover { text-decoration: underline; }
    .footer {
      margin-top: 2.5rem;
      padding-top: 1.5rem;
      border-top: 1px solid #2e3330;
      font-size: 0.85rem;
      color: #7a8580;
      text-align: center;
    }
    @media (max-width: 600px) {
      .container { padding: 1.5rem; }
      h1 { font-size: 1.7rem; }
    }
  </style>
</head>
<body>
  <div class="container">
    <span class="badge">Legal</span>
    <h1>Privacy Policy</h1>
    <p class="updated">Last Updated: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>

    <h2>1. Introduction</h2>
    <p>Welcome to StyleAI ("we," "our," or "us"). This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our platform, including our website and services that help brands and agencies manage influencer campaigns and run advertisements on platforms like Meta (Facebook, Instagram) and Google.</p>

    <h2>2. Information We Collect</h2>
    <p>We may collect the following types of information:</p>
    <ul>
      <li><strong>Personal Information:</strong> Name, email address, phone number, and organization details provided during account registration.</li>
      <li><strong>Social Media & Ad Account Data:</strong> When you connect your Meta or Google Ad accounts, we collect access tokens, ad account IDs, and campaign performance data (impressions, clicks, spend) to operate the services you request.</li>
      <li><strong>Usage Data:</strong> Information about how you interact with our platform, such as IP address, browser type, and pages visited.</li>
    </ul>

    <h2>3. How We Use Your Information</h2>
    <p>We use the collected information for the following purposes:</p>
    <ul>
      <li>To create and manage your account.</li>
      <li>To facilitate the connection to your Meta and Google Ad accounts and to create, manage, and analyze advertising campaigns on your behalf.</li>
      <li>To communicate with you about your account, campaigns, and platform updates.</li>
      <li>To improve our services and develop new features.</li>
    </ul>

    <h2>4. How We Share Your Information</h2>
    <p>We do not sell your personal information. We may share your information with third-party service providers (such as Meta and Google) only to the extent necessary to provide the services you request, and as required by law.</p>

    <h2>5. Data Retention and Deletion</h2>
    <p>We retain your personal information for as long as your account is active or as needed to provide you services. If you wish to delete your account or request that we no longer use your information, please contact us at <strong>support@styleai.com</strong>.</p>

    <h2>6. Your Data Protection Rights</h2>
    <p>Depending on your location, you may have the right to access, correct, or delete your personal information. To exercise these rights, please contact us.</p>

    <h2>7. Changes to This Privacy Policy</h2>
    <p>We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new policy on this page.</p>

    <h2>8. Contact Us</h2>
    <p>If you have any questions about this Privacy Policy, please contact us at:<br><strong>Email:</strong> support@styleai.com</p>

    <div class="footer">
      © ${new Date().getFullYear()} StyleAI. All rights reserved.
    </div>
  </div>
</body>
</html>`);
});

module.exports = router;