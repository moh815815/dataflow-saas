const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const app = express();

// ── Security ──
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  credentials: true
}));
app.use(express.json({ limit: '10mb' })); // for base64 images

// ── Global rate limit ──
app.use(rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 100,
  message: { error: 'طلبات كثيرة، انتظر قليلاً' }
}));

// ── Routes ──
app.use('/api/auth',    require('./routes/auth'));
app.use('/api/billing', require('./routes/billing'));
app.use('/api/convert', require('./routes/convert'));
app.use('/api/tables',  require('./routes/tables'));

// ── Health check ──
app.get('/health', (_, res) => res.json({ status: 'ok', time: new Date() }));

// ── Error handler ──
app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || 'خطأ في الخادم' });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`DataFlow API running on port ${PORT}`));
