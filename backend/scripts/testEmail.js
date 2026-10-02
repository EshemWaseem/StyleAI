// backend/scripts/testEmail.js
// Usage: node scripts/testEmail.js you@example.com
require('dotenv').config();
const { sendEmail } = require('../src/services/email');

const to = process.argv[2];
if (!to) {
  console.error('Usage: node scripts/testEmail.js you@example.com');
  process.exit(1);
}

(async () => {
  console.log(`📧 Sending test email to ${to}...`);
  const res = await sendEmail('welcome', {
    to,
    data: { name: 'Test User', role: 'BRAND' },
  });
  console.log('Result:', res);
  process.exit(0);
})();