/**
 * server.js — Main entry point for the Node.js Express gateway.
 *
 * Responsibilities:
 *  - Serve static frontend files
 *  - Handle image uploads via Multer
 *  - Proxy authenticated API requests to the Java Spring Boot backend
 *  - JWT-based session management
 */

require('dotenv').config();
const express  = require('express');
const cors     = require('cors');
const morgan   = require('morgan');
const path     = require('path');
const fs       = require('fs');

const authRoutes       = require('./routes/auth');
const inspectionRoutes = require('./routes/inspection');
const chatbotRoutes    = require('./routes/chatbot');
const proxyRoutes      = require('./routes/proxy');
const { connectDB }    = require('./utils/db');

const app  = express();
const PORT = process.env.PORT || 3000;

// ── Ensure upload directory exists ──────────────────────────
const uploadDir = path.join(__dirname, process.env.UPLOAD_DIR || 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

// ── Middleware ───────────────────────────────────────────────
app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (mobile apps, curl, server-to-server)
    // Allow localhost for development
    // Allow all Render/onrender.com domains for production
    if (!origin ||
        origin.includes('localhost') ||
        origin.includes('127.0.0.1') ||
        origin.includes('onrender.com') ||
        (process.env.FRONTEND_URL && origin === process.env.FRONTEND_URL)) {
      callback(null, true);
    } else {
      callback(null, true); // Allow all origins (JWT protects endpoints)
    }
  },
  credentials: true
}));

app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));
app.use(morgan('dev'));

// ── Static files ─────────────────────────────────────────────
// Serve the frontend — path goes one level up from node-server/ to frontend/
const frontendPath = process.env.FRONTEND_PATH || path.join(__dirname, '..', 'frontend');
console.log(`   Frontend served from: ${frontendPath}`);
app.use(express.static(frontendPath));

// Serve uploaded images
app.use('/uploads', express.static(uploadDir));

// ── API Routes ────────────────────────────────────────────────
app.use('/api/auth',        authRoutes);
app.use('/api/inspections', inspectionRoutes);
app.use('/api/chatbot',     chatbotRoutes);
app.use('/api',             proxyRoutes);      // all other /api/* → Java backend

// ── Root redirect ─────────────────────────────────────────────
app.get('/', (req, res) => {
  res.redirect('/login.html');
});

// ── 404 handler ───────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found: ' + req.path });
});

// ── Global error handler ──────────────────────────────────────
  app.use((err, req, res, next) => {
    console.error('[ERROR] Full stack:', err);
    res.status(err.status || 500).json({
      success: false,
      message: err.message || 'Internal Server Error'
    });
  });

// ── Start server ──────────────────────────────────────────────
connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`\n🚀 Quality Inspection Agent running on http://localhost:${PORT}`);
    console.log(`   Frontend : http://localhost:${PORT}/login.html`);
    console.log(`   Java API : ${process.env.JAVA_API_URL}`);
    console.log(`   Uploads  : ${uploadDir}\n`);
  });
});
