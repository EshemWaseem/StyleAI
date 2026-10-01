const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

(async () => {
  try {
    const u = await p.user.findFirst({ where: { email: 'admin@styleai.com' } });
    if (!u) { console.error('Admin user not found'); process.exit(1); }
    const n = await require('./src/services/notifications').notifyUser(u.id, {
      type: 'SYSTEM',
      title: 'SSE Test',
      body: 'Real-time works!',
    });
    console.log('Sent:', n?.id || 'failed');
  } catch (e) {
    console.error(e);
  } finally {
    await p.$disconnect();
    process.exit(0);
  }
})();