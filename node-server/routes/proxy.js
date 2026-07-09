/**
 * routes/proxy.js — Generic proxy router for all /api/* paths.
 *
 * Transparently proxies authenticated requests to the Java Spring Boot backend.
 * This handles: /dashboard, /reports, /admin, /products endpoints.
 */

const express = require('express');
const axios   = require('axios');
const router  = express.Router();

const { requireAuth } = require('../middleware/auth');

const JAVA_API = process.env.JAVA_API_URL;

/**
 * Universal proxy handler.
 * Forwards method, path, headers, query params, and body to Java backend.
 */
async function proxyToJava(req, res) {
  try {
    const token  = req.headers['authorization'];
    const url    = `${JAVA_API}${req.path}`;
    const method = req.method.toLowerCase();

    const config = {
      method,
      url,
      headers: { Authorization: token, 'Content-Type': 'application/json' },
      params:  req.query,
      ...(method !== 'get' && method !== 'delete' ? { data: req.body } : {})
    };

    const { data, headers } = await axios(config);

    // Forward PDF content-type if Java returns a PDF
    if (headers['content-type']?.includes('pdf')) {
      res.set('Content-Type', 'application/pdf');
      res.set('Content-Disposition', headers['content-disposition']);
      res.send(data);
    } else {
      res.json(data);
    }
  } catch (err) {
    const status  = err.response?.status  || 500;
    const message = err.response?.data?.message || err.message;
    console.error(`[Proxy Error] ${req.method} ${req.path}: ${message}`);
    res.status(status).json({ success: false, message });
  }
}

// Apply auth middleware then proxy everything
router.use(requireAuth, proxyToJava);

module.exports = router;
