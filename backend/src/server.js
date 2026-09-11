

require('dotenv').config();
const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/authRoutes');
const { notFound, errorHandler } = require('./middleware/errorHandler');

const app = express();

app.use(
  cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'styleai-backend',
    timestamp: new Date().toISOString(),
  });
});

app.use('/api/auth', authRoutes);

app.get('/api/products/analyze', async (req, res) => {
  try {
    const response = await fetch('http://127.0.0.1:8000/analyze');
    const data = await response.json();
    res.json({
      source: 'Node.js',
      aiAnalysis: data,
    });
  } catch (error) {
    res.status(500).json({
      error: 'Could not connect to FastAPI',
      details: error.message,
    });
  }
});

app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`🚀 Backend running on http://localhost:${PORT}`);
});


// require('dotenv').config();
// const express = require('express');
// const cors = require('cors');

// const authRoutes = require('./routes/authRoutes');
// const { notFound, errorHandler } = require('./middleware/errorHandler');

// const app = express();

// app.use(cors({ origin: process.env.FRONTEND_URL || '*' }));
// app.use(express.json());

// app.get('/health', (req, res) => {
//   res.json({ status: 'ok', service: 'styleai-backend' });
// });

// app.use('/api/auth', authRoutes);

// app.use(notFound);
// app.use(errorHandler);


// const PORT = process.env.PORT || 5000;
// app.listen(PORT, () => {
//   console.log(`🚀 Backend running on http://localhost:${PORT}`);
// });