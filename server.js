/**
 * Express Server for Local Development
 * Runs all API routes locally instead of using Vercel serverless functions
 */

import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Trust proxy for accurate IP addresses (if behind a proxy)
app.set('trust proxy', true);

// Helper to convert Vercel handler to Express route
async function handleVercelRoute(handler, req, res) {
  // Create a mock request/response that matches Vercel's format
  const vercelReq = {
    method: req.method,
    query: req.query,
    body: req.body,
    headers: req.headers,
    connection: {
      remoteAddress: req.ip || req.socket?.remoteAddress || req.connection?.remoteAddress,
    },
  };

  const vercelRes = {
    statusCode: 200,
    headers: {},
    setHeader(name, value) {
      this.headers[name] = value;
      res.setHeader(name, value);
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(data) {
      // Ensure Content-Type is set for JSON responses
      this.setHeader('Content-Type', 'application/json');
      Object.keys(this.headers).forEach(key => {
        res.setHeader(key, this.headers[key]);
      });
      res.status(this.statusCode).json(data);
    },
    send(data) {
      // Handle binary data (like PDFs) or text
      Object.keys(this.headers).forEach(key => {
        res.setHeader(key, this.headers[key]);
      });
      res.status(this.statusCode).send(data);
    },
    end(data) {
      Object.keys(this.headers).forEach(key => {
        res.setHeader(key, this.headers[key]);
      });
      if (data) {
        res.status(this.statusCode).send(data);
      } else {
        res.status(this.statusCode).end();
      }
    },
  };

  try {
    await handler(vercelReq, vercelRes);
  } catch (error) {
    console.error(`[Server] Error in route handler:`, error);
    if (!res.headersSent) {
      res.status(500).json({
        status: 'error',
        error: 'Internal server error',
        message: error.message,
      });
    }
  }
}

// Load and register all API routes
async function loadRoutes() {
  try {
    // Seating API
    console.log('[Server] Loading seating API...');
    const seatingHandler = (await import('./api/seating.js')).default;
    app.all('/api/seating', async (req, res) => {
      await handleVercelRoute(seatingHandler, req, res);
    });

    // Data API (combined: subjects + student-data)
    console.log('[Server] Loading data API...');
    const dataHandler = (await import('./api/data.js')).default;
    app.all('/api/data', async (req, res) => {
      await handleVercelRoute(dataHandler, req, res);
    });
    // Legacy routes (redirect to combined endpoint)
    app.all('/api/subjects', async (req, res) => {
      req.query.action = 'subjects';
      await handleVercelRoute(dataHandler, req, res);
    });
    app.all('/api/student-data', async (req, res) => {
      req.query.action = 'student-data';
      await handleVercelRoute(dataHandler, req, res);
    });

    // Admin API
    console.log('[Server] Loading admin API...');
    const adminHandler = (await import('./api/admin.js')).default;
    app.all('/api/admin', async (req, res) => {
      await handleVercelRoute(adminHandler, req, res);
    });

    // Log API
    console.log('[Server] Loading log API...');
    const logHandler = (await import('./api/log.js')).default;
    app.all('/api/log', async (req, res) => {
      await handleVercelRoute(logHandler, req, res);
    });

    // VPS Proxy (combined login + timetable)
    console.log('[Server] Loading vps-proxy API...');
    const vpsProxyHandler = (await import('./api/vps-proxy.js')).default;
    app.all('/api/vps-proxy', async (req, res) => {
      await handleVercelRoute(vpsProxyHandler, req, res);
    });
    // Legacy routes (redirect to combined endpoint)
    app.all('/api/vps-login-proxy', async (req, res) => {
      req.query.action = 'login';
      await handleVercelRoute(vpsProxyHandler, req, res);
    });
    app.all('/api/vps-timetable-proxy', async (req, res) => {
      req.query.action = 'timetable';
      await handleVercelRoute(vpsProxyHandler, req, res);
    });

    // NOTE: SRM endpoints have been moved to separate Go backend
    // See: srm-backend/ directory
    // 
    // The Go backend handles:
    // - POST /api/srm/login (Zoho authentication)
    // - GET /api/srm/data (attendance, marks, courses, timetable)
    // - GET /api/srm/calendar (academic calendar)
    // - POST /api/srm/logout
    //
    // For local development, run the Go backend separately:
    // cd srm-backend && make run
    //
    // For production, deploy the Go backend to VPS:
    // cd srm-backend && make deploy

    // Timetable PDF Generation API
    console.log('[Server] Loading generate-timetable-pdf API...');
    const timetablePdfHandler = (await import('./api/generate-timetable-pdf.js')).default;
    app.all('/api/generate-timetable-pdf', async (req, res) => {
      await handleVercelRoute(timetablePdfHandler, req, res);
    });

    // GroupGrid API
    console.log('[Server] Loading groupgrid API...');
    const groupgridHandler = (await import('./api/groupgrid.js')).default;
    app.all('/api/groupgrid', async (req, res) => {
      await handleVercelRoute(groupgridHandler, req, res);
    });

    // Get name by last digits (via admin API with action parameter)
    console.log('[Server] Loading get-name-by-last-digits API...');
    app.get('/api/get-name-by-last-digits', async (req, res) => {
      // Forward to admin API with action parameter
      const adminHandler = (await import('./api/admin.js')).default;
      const modifiedReq = {
        ...req,
        query: { ...req.query, action: 'get-name-by-last-digits' },
      };
      await handleVercelRoute(adminHandler, modifiedReq, res);
    });

    // NOTE: Catch-all for unregistered API routes is handled at the end of the file
    // after all routes are registered, to ensure specific routes are matched first

    console.log('✅ All API routes loaded successfully');
  } catch (error) {
    console.error('❌ Error loading API routes:', error);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Serve static files from dist folder (Vite build output)
app.use(express.static(join(__dirname, 'dist')));

// Start server
async function startServer() {
  await loadRoutes();

  // Catch-all handler: send back React app's index.html for client-side routing
  // MUST be registered AFTER loadRoutes() to ensure specific API routes are matched first
  // BUT exclude API routes - they should return 404 if not handled
  app.all('*', (req, res, next) => {
    // Don't serve index.html for API routes
    if (req.path.startsWith('/api/')) {
      console.warn(`[Server] Unhandled API route: ${req.method} ${req.path}`);
      return res.status(404).json({
        status: 'error',
        error: 'API route not found',
        path: req.path,
        method: req.method,
        availableRoutes: [
          '/api/seating',
          '/api/data',
          '/api/subjects',
          '/api/student-data',
          '/api/admin',
          '/api/log',
          '/api/vps-proxy',
          '/api/vps-login-proxy',
          '/api/vps-timetable-proxy',
          '/api/groupgrid',
          '/api/get-name-by-last-digits',
          '/api/generate-timetable-pdf',
        ],
      });
    }
    // For all other routes, serve the React app
    res.sendFile(join(__dirname, 'dist', 'index.html'));
  });

  // NOTE: SRM attendance scraping has been moved to separate Go backend
  // The scheduler is now part of the Go application
  // See: srm-backend/README.md for details

  app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`📡 API endpoints available at http://localhost:${PORT}/api/*`);
    console.log(`💚 Health check: http://localhost:${PORT}/health`);
  });
}

startServer().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});

