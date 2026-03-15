/**
 * Run once after deploying:  node seed.js
 * Seeds branches and risk_levels into MongoDB
 */
require('dotenv').config();
const mongoose  = require('mongoose');
const Branch    = require('./models/Branch');
const RiskLevel = require('./models/RiskLevel');

async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected');

  // Branches
  await Branch.deleteMany({});
  await Branch.insertMany([
    { code:'CSE',   name:'Computer Science & Engineering' },
    { code:'ECE',   name:'Electronics & Communication'   },
    { code:'MECH',  name:'Mechanical Engineering'        },
    { code:'CIVIL', name:'Civil Engineering'             },
    { code:'IT',    name:'Information Technology'        },
    { code:'AIDS',  name:'AI & Data Science'             },
  ]);
  console.log('Branches seeded');

  // Risk Levels
  await RiskLevel.deleteMany({});
  await RiskLevel.insertMany([
    { level_name:'High Risk',     color_code:'#dc2626' },
    { level_name:'Moderate Risk', color_code:'#d97706' },
    { level_name:'Safe',          color_code:'#059669' },
  ]);
  console.log('Risk levels seeded');

  await mongoose.disconnect();
  console.log('Done — seed complete');
}

seed().catch(e => { console.error(e); process.exit(1); });
