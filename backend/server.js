const express   = require('express');
const cors      = require('cors');
require('dotenv').config();

const connectDB = require('./db');
const app       = express();
const PORT      = process.env.PORT || 5000;

// Connect MongoDB
connectDB();

const isProduction = process.env.NODE_ENV === 'production';

if (isProduction) {
  const allowedOrigins = [
    'http://localhost:3000',
    'http://localhost:3001',
    process.env.FRONTEND_URL,
  ].filter(Boolean);

  app.use(cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
      callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
  }));
} else {
  app.use(cors({ origin: true, credentials: true }));
}

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth',        require('./routes/auth'));
app.use('/api/students',    require('./routes/students'));
app.use('/api/assignments', require('./routes/assignments'));
app.use('/api/followups',   require('./routes/followups'));
app.use('/api/dashboard',   require('./routes/dashboard'));

// Root
app.get('/', (req, res) => res.json({ message: 'EduSafeGuard API v3 (MongoDB) Running ✓' }));

// Health check
app.get('/api/health', async (req, res) => {
  const mongoose = require('mongoose');
  const state    = mongoose.connection.readyState;
  if (state === 1) {
    res.json({ status: 'ok', db: 'connected', engine: 'MongoDB' });
  } else {
    res.status(500).json({ status: 'error', db: 'disconnected', state });
  }
});

// 404
app.use((req, res) => res.status(404).json({ error: 'Route not found.' }));

// Keepalive ping
setInterval(async () => {
  try {
    const mongoose = require('mongoose');
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.db.admin().ping();
      console.log(`[${new Date().toISOString()}] MongoDB keepalive OK`);
    }
  } catch (err) {
    console.error(`[${new Date().toISOString()}] MongoDB keepalive failed:`, err.message);
  }
}, 4 * 60 * 1000);

// Auto seed branches and risk levels if empty
const autoSeed = async () => {
  try {
    const Branch    = require('./models/Branch');
    const RiskLevel = require('./models/RiskLevel');

    const bCount = await Branch.countDocuments();
    const rCount = await RiskLevel.countDocuments();

    if (bCount === 0) {
      await Branch.insertMany([
        { code: 'CSE',   name: 'Computer Science & Engineering' },
        { code: 'ECE',   name: 'Electronics & Communication'   },
        { code: 'MECH',  name: 'Mechanical Engineering'        },
        { code: 'CIVIL', name: 'Civil Engineering'             },
        { code: 'IT',    name: 'Information Technology'        },
        { code: 'AIDS',  name: 'AI & Data Science'             },
      ]);
      console.log('✅ Branches seeded automatically');
    } else {
      console.log(`✅ Branches already exist (${bCount} found)`);
    }

    if (rCount === 0) {
      await RiskLevel.insertMany([
        { level_name: 'High Risk',     color_code: '#dc2626' },
        { level_name: 'Moderate Risk', color_code: '#d97706' },
        { level_name: 'Safe',          color_code: '#059669' },
      ]);
      console.log('✅ Risk levels seeded automatically');
    } else {
      console.log(`✅ Risk levels already exist (${rCount} found)`);
    }
  } catch (e) {
    console.error('❌ Auto seed error:', e.message);
  }
};

app.listen(PORT, async () => {
  console.log(`EduSafeGuard backend running on http://localhost:${PORT}`);
  console.log(`Mode: ${isProduction ? 'PRODUCTION' : 'DEVELOPMENT'}`);
  console.log(`Health check: http://localhost:${PORT}/api/health`);

  // Wait for MongoDB to connect then seed
  const mongoose = require('mongoose');
  const waitAndSeed = async (retries = 10) => {
    if (mongoose.connection.readyState === 1) {
      await autoSeed();
    } else if (retries > 0) {
      console.log('⏳ Waiting for MongoDB before seeding...');
      setTimeout(() => waitAndSeed(retries - 1), 2000);
    } else {
      console.error('❌ Could not seed — MongoDB not connected after retries');
    }
  };
  waitAndSeed();
});
