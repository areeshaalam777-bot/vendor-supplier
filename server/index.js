const express = require('express');
const session = require('express-session');
const connectMongo = require('connect-mongo');
const MongoStore = connectMongo.default || connectMongo.MongoStore || connectMongo;
const path = require('path');
require('dotenv').config();

const { connectDB } = require('./db');

const authRoutes = require('./routes/auth');
const suppliersRoutes = require('./routes/suppliers');
const transactionsRoutes = require('./routes/transactions');
const communityRoutes = require('./routes/community');
const aiRoutes = require('./routes/ai');

const app = express();
const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/supplier_scorecard';

// Middleware to ensure DB connection is ready on requests
app.use(async (req, res, next) => {
  try {
    await connectDB();
  } catch (err) {
    console.error('DB connect middleware error:', err);
  }
  next();
});

// Parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Always enable trust proxy so secure cookies work properly behind proxies & on Vercel
app.set('trust proxy', 1);

// Session configuration
const sessionConfig = {
  secret: process.env.SESSION_SECRET || 'zirium-vendor-scorecard-secret-2026',
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
    httpOnly: true,
    secure: 'auto',
    sameSite: 'lax'
  }
};

// Use MongoStore for persistent sessions if MongoDB URI is available
if (MONGODB_URI) {
  sessionConfig.store = MongoStore.create({
    mongoUrl: MONGODB_URI,
    collectionName: 'sessions',
    ttl: 7 * 24 * 60 * 60 // 7 days
  });
}

app.use(session(sessionConfig));

// Static files
app.use(express.static(path.join(__dirname, '../public')));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/suppliers', suppliersRoutes);
app.use('/api/transactions', transactionsRoutes);
app.use('/api/community', communityRoutes);
app.use('/api/ai', aiRoutes);

// Catch-all route to serve the app
app.use((req, res) => {
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ success: false, message: 'API endpoint not found' });
  }
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Start listening if not in Vercel serverless environment
if (process.env.NODE_ENV !== 'test' && !process.env.VERCEL) {
  connectDB().then(() => {
    app.listen(PORT, () => {
      console.log(`🚀 Scorecard Server running on http://localhost:${PORT}`);
    });
  });
}

module.exports = app;
