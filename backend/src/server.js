require('dotenv').config();
require('./config/fetchTimeout');

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

// ======================================================
// ROUTE IMPORTS
// ======================================================
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
const influencerRoutes = require('./routes/influencerRoutes');   // ← ADDED

const { notFound, errorHandler } = require('./middleware/errorHandler');
const prisma = require('./config/prisma');

const app = express();
app.set('trust proxy', 1);

// ======================================================
// SECURITY
// ======================================================
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);
app.use(compression());

// ======================================================
// CORS — BEFORE route mounts
// ======================================================
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
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// ======================================================
// RATE LIMITING
// ======================================================
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many requests, please try again later' },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'production' ? 20 : 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many auth attempts, please try again later' },
});

app.use('/api', globalLimiter);
app.use('/api/auth', authLimiter);

// ======================================================
// BODY PARSERS + LOGGING
// ======================================================
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));

if (process.env.NODE_ENV !== 'test') {
  app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
}

// ======================================================
// HEALTH
// ======================================================
app.get('/api/health', async (req, res) => {
  let db = 'unknown';
  try {
    await prisma.$queryRaw`SELECT 1`;
    db = 'connected';
  } catch {
    db = 'disconnected';
  }
  res.json({
    status: 'ok',
    service: 'styleai-backend',
    env: process.env.NODE_ENV || 'development',
    db,
    uptime: Math.round(process.uptime()),
    timestamp: new Date().toISOString(),
  });
});

// ======================================================
// ROUTES
// ======================================================
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
app.use('/api/influencers', influencerRoutes);   // ← ADDED

// ======================================================
// 404 + ERROR
// ======================================================
app.use(notFound);
app.use(errorHandler);

// ======================================================
// SERVER
// ======================================================
const PORT = process.env.PORT || 4000;
const server = app.listen(PORT, () => {
  console.log(`🚀 Backend running on http://localhost:${PORT}`);
  console.log(`🌍 Env: ${process.env.NODE_ENV || 'development'}`);
});

// ======================================================
// GRACEFUL SHUTDOWN
// ======================================================
async function shutdown(signal) {
  console.log(`\n${signal} received. Shutting down gracefully...`);
  server.close(async () => {
    try {
      await prisma.$disconnect();
      console.log('✅ Prisma disconnected');
      process.exit(0);
    } catch (err) {
      console.error('❌ Error during shutdown:', err);
      process.exit(1);
    }
  });
  setTimeout(() => {
    console.error('⚠️  Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('unhandledRejection', (reason) =>
  console.error('Unhandled Rejection:', reason)
);
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  process.exit(1);
});

module.exports = app;