// server.js
require('dotenv').config();
require('./config/fetchTimeout');

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');


const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const roleRoutes = require('./routes/roleRoutes');
const aiRoutes = require('./routes/aiRoutes');
const cartRoutes = require('./routes/cartRoutes');
const orderRoutes = require('./routes/orderRoutes');
const brandRoutes = require('./routes/brandRoutes');
const teamRoutes = require('./routes/teamRoutes');
const productRoutes = require('./routes/productRoutes');
const joinRequestRoutes = require('./routes/joinRequestRoutes');
const invitationRoutes = require('./routes/invitationRoutes');
const brandTeamRoutes = require('./routes/brandTeamRoutes');
const influencerRoutes = require('./routes/influencerRoutes');
const adminRoutes = require('./routes/adminRoutes');
const offerRoutes = require('./routes/offerRoutes');
const catalogRoutes = require('./routes/catalogRoutes');
const walletRoutes = require('./routes/walletRoutes');
const listingRoutes = require('./routes/listingRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const campaignRoutes = require('./routes/campaignRoutes');
const agencyRoutes = require('./routes/agencyRoutes');
const uploadRoutes = require('./routes/uploadRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');
const matchingRoutes = require('./routes/matchingRoutes');
const assistantRoutes = require('./routes/assistantRoutes');
const chatRoutes = require('./routes/chatRoutes');
const knowledgeRoutes = require('./routes/knowledgeRoutes');
const billingRoutes = require('./routes/billingRoutes');
const recommendationsRoutes = require('./routes/recommendationsRoutes');
const healthRoutes = require('./routes/healthRoutes');

const paymentRoutes = require('./routes/paymentRoutes');
const webhookRoutes = require('./routes/webhookRoutes');

const storefrontRoutes = require('./routes/storefrontRoutes');

// const checkoutRoutes = require('./routes/checkoutRoutes');

// MIDDLEWARE

const { notFound, errorHandler } = require('./middleware/errorHandler');
const { requestId } = require('./middleware/requestId');
const { trialGate } = require('./middleware/trialGate');

const prisma = require('./config/prisma');
const { globalLimiter, authUmbrellaLimiter } = require('./config/rateLimit');

const app = express();


// PROCESS SAFETY NETS

process.on('unhandledRejection', (reason) =>
  console.error('[fatal] Unhandled Rejection:', reason)
);
process.on('uncaughtException', (err) =>
  console.error('[fatal] Uncaught Exception:', err)
);


// SECURITY + PERF

app.set('trust proxy', 1);
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(
  compression({
    filter: (req, res) => {
      if (req.headers.accept?.includes('text/event-stream')) return false;
      if (res.getHeader('Content-Type') === 'text/event-stream') return false;
      return compression.filter(req, res);
    },
  })
);


// CORS

const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:3000')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      return callback(new Error(`CORS blocked: ${origin}`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Acting-Brand',
      'X-Request-Id',
    ],
    exposedHeaders: ['X-Request-Id', 'Retry-After', 'RateLimit-Reset'],
  })
);

app.use(requestId);


// WEBHOOKS — before express.json()

app.use('/api/webhooks', webhookRoutes);


// BODY PARSERS

app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));


// RATE LIMITING

app.use('/api', globalLimiter);
app.use('/api/auth', authUmbrellaLimiter);


// TRIAL ENFORCEMENT

app.use(trialGate);


// LOGGING

if (process.env.NODE_ENV !== 'test') {
  morgan.token('reqId', (req) => req.id || '-');
  app.use(
    morgan(
      process.env.NODE_ENV === 'production'
        ? ':reqId :remote-addr :method :url :status :response-time ms'
        : ':reqId :method :url :status :response-time ms'
    )
  );
}


// HEALTH + ROUTES

app.use('/api/health', healthRoutes);
app.use('/api/storefront', storefrontRoutes);

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/roles', roleRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/brands', brandRoutes);
app.use('/api/teams', teamRoutes);
app.use('/api/products', productRoutes);
app.use('/api/join-requests', joinRequestRoutes);
app.use('/api/invitations', invitationRoutes);
app.use('/api/brand-team', brandTeamRoutes);
app.use('/api/influencers', influencerRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/offers', offerRoutes);
app.use('/api/catalog', catalogRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/listings', listingRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/campaigns', campaignRoutes);
app.use('/api/agency', agencyRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/matching', matchingRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/billing', billingRoutes);
app.use('/api/recommendations', recommendationsRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/knowledge', knowledgeRoutes);
app.use('/api/assistant', assistantRoutes);
// app.use('/api/checkout', checkoutRoutes);
app.use(notFound);
app.use(errorHandler);


// SERVER + PRISMA WARMUP + QUEUE

const PORT = process.env.PORT || 4000;
const DB_RETRY_INTERVAL_MS = 30_000;

(async () => {
  let dbHealthy = false;
  let queuesInitialized = false;
  let workersStarted = false;
  let retryTimer = null;

  //       
  // 1. Prisma warmup
  //       
  try {
    await prisma.$connect();
    await prisma.$queryRaw`SELECT 1`;
    dbHealthy = true;
    console.log(' Prisma connected & warmed');
  } catch (err) {
    console.error('⚠️  Prisma warmup failed:', err.message);
    console.error(
      '[startup] DB unreachable — HTTP will run, background workers will NOT start.'
    );
    console.error(
      '[startup] Verify DATABASE_URL and that the DB server is running.'
    );
  }

  //       
  // 2. Init queues (Redis-backed — no DB needed)
  //    Routes can enqueue; only workers need DB.
  //       
  try {
    const { initQueues, QUEUE_ENABLED } = require('./services/queue');
    if (QUEUE_ENABLED) {
      initQueues();
      queuesInitialized = true;
      console.log('[queue] Queues initialized');
    } else {
      console.log('[queue] QUEUE_ENABLED=false — skipping queue init');
    }
  } catch (err) {
    console.warn('[server] queue init failed (non-fatal):', err.message);
  }

  //       
  // 3. Start workers — GATED on DB health
  //    Prevents infinite worker-error loop when DB is down.
  //       
  async function tryStartWorkers() {
    if (workersStarted || !queuesInitialized) return;
    try {
      const { startWorkers, QUEUE_ENABLED } = require('./services/queue');
      if (!QUEUE_ENABLED) {
        workersStarted = true;
        return;
      }
      startWorkers();
      workersStarted = true;
      console.log('[queue] Workers started');
      if (retryTimer) {
        clearInterval(retryTimer);
        retryTimer = null;
        console.log('[queue]  DB online — worker retry loop stopped');
      }
    } catch (err) {
      console.warn('[server] worker start failed:', err.message);
    }
  }

  if (dbHealthy) {
    await tryStartWorkers();
  } else {
    console.warn(
      `[queue] DB unreachable — workers will retry every ${DB_RETRY_INTERVAL_MS / 1000}s`
    );
    retryTimer = setInterval(async () => {
      try {
        await prisma.$queryRaw`SELECT 1`;
        if (!dbHealthy) {
          console.log('[queue]  DB is online — starting workers now');
          dbHealthy = true;
        }
        await tryStartWorkers();
      } catch {
        // DB still down — silent wait
      }
    }, DB_RETRY_INTERVAL_MS);
    retryTimer.unref();
  }

  //       
  // 4. HTTP server
  //       
  const server = app.listen(PORT, () => {
    console.log(`🚀 Backend running on http://localhost:${PORT}`);
    console.log(`🌍 Env: ${process.env.NODE_ENV || 'development'}`);
    if (!dbHealthy) {
      console.warn(
        '⚠️  Started in DEGRADED mode — DB is down. HTTP works, workers paused.'
      );
    }
  });

  //       
  // 5. WebSocket
  //       
  try {
    const { initWebSocket } = require('./services/websocket');
    initWebSocket(server, allowedOrigins);
    console.log('🔌 WebSocket server attached');
  } catch (err) {
    console.error('⚠️  WebSocket init failed:', err.message);
  }

  //       
  // 6. Cron
  //       
  let stopCronFn = null;
  try {
    const { startCron, stopCron } = require('./services/billing/cron');
    startCron();
    stopCronFn = stopCron;
  } catch (err) {
    console.warn('[server] cron init failed:', err.message);
  }

  //       
  // 7. Graceful shutdown
  //       
  let shuttingDown = false;

  async function shutdown(signal) {
    if (shuttingDown) return;
    shuttingDown = true;

    console.log(`\n[shutdown] ${signal} received — closing gracefully...`);

    if (retryTimer) {
      clearInterval(retryTimer);
      retryTimer = null;
    }

    const forceTimer = setTimeout(() => {
      console.error('[shutdown] ⚠️  Forced exit after 10s timeout');
      process.exit(1);
    }, 10_000);
    forceTimer.unref();

    try {
      if (stopCronFn) {
        stopCronFn();
        console.log('[shutdown] cron stopped');
      }
    } catch (e) {
      console.error('[shutdown] cron stop failed:', e.message);
    }

    try {
      if (workersStarted) {
        const { stopWorkers, closeQueues, closeConnection } = require('./services/queue');
        await stopWorkers();
        await closeQueues();
        await closeConnection();
        console.log('[shutdown] queue closed');
      }
    } catch (e) {
      console.error('[shutdown] queue close failed:', e.message);
    }

    await new Promise((resolve) => {
      server.close((err) => {
        if (err) console.error('[shutdown] server.close error:', err.message);
        else console.log('[shutdown] HTTP server closed');
        resolve();
      });
    });

    try {
      await prisma.$disconnect();
      console.log('[shutdown] Prisma disconnected');
    } catch (e) {
      console.error('[shutdown] Prisma disconnect failed:', e.message);
    }

    clearTimeout(forceTimer);
    console.log('[shutdown] bye 👋');
    process.exit(0);
  }

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
})();

module.exports = app;