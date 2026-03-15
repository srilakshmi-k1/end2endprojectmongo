# EduSafeGuard — Complete Setup Guide

## PART 1 — RUN ON LOCALHOST
=================================

### Step 1 — Get MongoDB URI (Free)
1. Go to https://cloud.mongodb.com
2. Sign up free → Create a cluster (free tier M0)
3. Database Access → Add user → username + password
4. Network Access → Add IP → 0.0.0.0/0 (allow all)
5. Clusters → Connect → Drivers → copy the URI
   Looks like: mongodb+srv://user:pass@cluster0.xxxx.mongodb.net/edusafeguard

### Step 2 — Setup Backend
Open PowerShell → navigate to the backend folder:

  cd edusafeguard_final\backend

Edit the .env file — paste your MongoDB URI:

  MONGO_URI  = mongodb+srv://user:pass@cluster0.xxxx.mongodb.net/edusafeguard
  JWT_SECRET = edusafeguard_secret_2026
  PORT       = 5000
  NODE_ENV   = development

Install dependencies:

  npm install

Seed the database (run once only):

  node seed.js

Start the backend:

  npm start

✅ Backend running at: http://localhost:5000
✅ Test: http://localhost:5000/api/health

### Step 3 — Setup Frontend
Open a NEW PowerShell window → navigate to frontend:

  cd edusafeguard_final\frontend

Install dependencies:

  npm install

Start the frontend:

  npm start

✅ Frontend running at: http://localhost:3000

### Step 4 — Register & Login
1. Open http://localhost:3000
2. Click Register → fill institution name, email, password
3. Login as Admin
4. Upload students via CSV (use sample_students.csv)

---

## PART 2 — DEPLOY ON RENDER
=================================

### Step 1 — Push to GitHub
  git init
  git add .
  git commit -m "EduSafeGuard final"
  git branch -M main
  git remote add origin https://github.com/YOUR_USERNAME/edusafeguard.git
  git push -u origin main

### Step 2 — Deploy Backend on Render
1. render.com → New → Web Service
2. Connect your GitHub repo
3. Settings:
   - Root Directory:  edusafeguard_final/backend
   - Build Command:   npm install
   - Start Command:   node server.js
4. Environment Variables → Add:
   MONGO_URI    = mongodb+srv://user:pass@cluster.mongodb.net/edusafeguard
   JWT_SECRET   = edusafeguard_secret_2026
   NODE_ENV     = production
   PORT         = 5000
5. Click Create Web Service
6. Copy the backend URL: https://edusafeguard-backend.onrender.com

### Step 3 — Run Seed on Render
After backend deploys:
Render → backend → Shell tab → run:
  node seed.js

### Step 4 — Deploy Frontend on Render
1. render.com → New → Static Site
2. Connect your GitHub repo
3. Settings:
   - Root Directory:    edusafeguard_final/frontend
   - Build Command:     npm install && npm run build
   - Publish Directory: build
4. Environment Variables → Add:
   REACT_APP_API_URL = https://edusafeguard-backend.onrender.com
5. Click Create Static Site
6. Copy frontend URL: https://edusafeguard-frontend.onrender.com

### Step 5 — Update Backend CORS
Render → backend → Environment → Add:
  FRONTEND_URL = https://edusafeguard-frontend.onrender.com
Click Save → backend auto-restarts

### Step 6 — Test
Open https://edusafeguard-frontend.onrender.com → Register → Login ✅
