const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

(async () => {
  const email = 'saram@influencer.com';   // ← YAHAN email badlo
  const newPass = '123456';          // ← YAHAN naya password

  // 1. Find user
  const user = await p.user.findUnique({
    where: { email },
    select: { id: true, email: true, name: true },
  });

  if (!user) {
    console.log('❌ User not found:', email);
    await p.$disconnect();
    return process.exit(1);
  }

  console.log('👤 Found:', user.name, '|', user.email);

  // 2. Hash new password
  const hash = await bcrypt.hash(newPass, 10);

  // 3. Update
  await p.user.update({
    where: { id: user.id },
    data: { password: hash },
  });

  console.log('✅ Password reset done');
  console.log('   Email:    ', email);
  console.log('   Password: ', newPass);
  console.log('   User ID:  ', user.id);

  await p.$disconnect();
  process.exit(0);
})().catch((e) => {
  console.error('❌ Error:', e.message);
  process.exit(1);
});