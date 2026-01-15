# 🖥️ Local Development Setup

This guide explains how to run GradeX locally on your Mac instead of using Vercel/VPS.

## 🚀 Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Environment Variables

Create a `.env.local` file in the root directory:

```env
# Supabase (for student data and enquiries)
SUPABASE_URL=https://phlggcheaajkupppozho.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key  # For admin operations only

# Upstash Redis (for global cache)
UPSTASH_REDIS__KV_REST_API_URL=your-redis-url
UPSTASH_REDIS__KV_REST_API_TOKEN=your-redis-token

# VPS Configuration (optional - only if you still need VPS services)
VPS_LOGIN_URL=http://65.20.84.46:5000
VPS_API_KEY=32631058927400e8e13cd7a7c35cf3381ffc2af66b926a3d79c2b28403769f73
```

### 3. Run the Server

You have two options:

#### Option A: Run Both Server and Frontend Together (Recommended)

```bash
npm run dev:all
```

This will start:
- Express API server on `http://localhost:3000`
- Vite dev server on `http://localhost:5173`

#### Option B: Run Separately

**Terminal 1 - Start API Server:**
```bash
npm run server
```

**Terminal 2 - Start Frontend:**
```bash
npm run dev
```

### 4. Access the Application

- Frontend: http://localhost:5173
- API Server: http://localhost:3000
- Health Check: http://localhost:3000/health

## 📡 API Endpoints

All API endpoints are available at `http://localhost:3000/api/*`:

- `/api/seating` - Main seat finding endpoint
- `/api/subjects` - Subject code to name mapping
- `/api/admin` - Admin dashboard (with various actions)
- `/api/log` - Logging endpoints (enquiries, social clicks, feedback)
- `/api/student-data` - Student data JSON
- `/api/vps-login-proxy` - VPS login proxy (if VPS is still needed)
- `/api/vps-timetable-proxy` - VPS timetable proxy (if VPS is still needed)
- `/api/groupgrid` - GroupGrid API
- `/api/get-name-by-last-digits` - Student name lookup

## 🔧 How It Works

1. **Express Server** (`server.js`): 
   - Runs on port 3000
   - Handles all API routes
   - Converts Vercel serverless function handlers to Express routes

2. **Vite Dev Server**:
   - Runs on port 5173
   - Serves the React frontend
   - Proxies `/api/*` requests to the Express server

3. **No VPS Required**:
   - All API logic runs locally
   - Database connections go directly to Supabase
   - Redis cache connections go directly to Upstash

## 🐛 Troubleshooting

### Port Already in Use

If port 3000 is already in use, set a different port:

```bash
PORT=3001 npm run server
```

Then update `vite.config.mjs` to proxy to the new port.

### Environment Variables Not Loading

Make sure `.env.local` is in the root directory and contains all required variables.

### API Routes Not Working

1. Check that the Express server is running: `curl http://localhost:3000/health`
2. Check browser console for CORS errors
3. Verify environment variables are set correctly

### Module Import Errors

Make sure you're using Node.js 18+ with ES modules support. The project uses `"type": "module"` in `package.json`.

## 📝 Notes

- The server automatically loads all API routes from the `/api` directory
- All Vercel serverless functions are compatible and work the same way
- The server supports CORS for local development
- Environment variables are loaded using `dotenv/config`

