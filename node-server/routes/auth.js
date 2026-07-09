/**
 * routes/auth.js — Authentication routes (Login / Register / Logout).
 *
 * These routes proxy to the Java Spring Boot backend's /auth endpoints.
 * Node.js handles the JWT forwarding transparently.
 */

const express = require('express');
const axios   = require('axios');
const jwt     = require('jsonwebtoken');
const router  = express.Router();

const JWT_SECRET = 'QualityInspectionAgentSuperSecretKey2024!@#$%^&*()';

const JAVA_API = process.env.JAVA_API_URL;

/**
 * POST /api/auth/register
 * Forwards registration request to Java backend.
 */
router.post('/register', async (req, res) => {
  try {
    const { data } = await axios.post(`${JAVA_API}/auth/register`, req.body);
    res.json(data);
  } catch (err) {
    if (err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND' || err.response?.status >= 500) {
      console.warn('⚠️ Java API unreachable. Using Node.js Local Auth Fallback for registration.');
      
      const { username, fullName, password } = req.body;
      
      if (username && password) {
        const token = jwt.sign(
          { username, role: 'ADMIN', sub: username }, 
          JWT_SECRET, 
          { expiresIn: '24h' }
        );
        
        return res.json({
          success: true,
          message: 'Registered using local fallback',
          data: {
            token,
            username,
            fullName: fullName || username.charAt(0).toUpperCase() + username.slice(1),
            role: 'ADMIN'
          }
        });
      }
    }
    
    const status  = err.response?.status  || 500;
    const message = err.response?.data?.message || err.message;
    res.status(status).json({ success: false, message });
  }
});



/**
 * POST /api/auth/login
 * Forwards login request to Java backend and returns JWT.
 */
router.post('/login', async (req, res) => {
  try {
    const { data } = await axios.post(`${JAVA_API}/auth/login`, req.body);
    res.json(data);
  } catch (err) {
    if (err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND' || err.response?.status >= 500) {
      console.warn('⚠️ Java API unreachable. Using Node.js Local Auth Fallback.');
      
      const { username, password } = req.body;
      
      // Simple mock authentication for testing without Java backend
      if (username && password) {
        const token = jwt.sign(
          { username, role: 'ADMIN', sub: username }, 
          JWT_SECRET, 
          { expiresIn: '24h' }
        );
        
        return res.json({
          success: true,
          message: 'Logged in using local fallback',
          data: {
            token,
            username,
            fullName: username.charAt(0).toUpperCase() + username.slice(1),
            role: 'ADMIN'
          }
        });
      }
    }
    
    const status  = err.response?.status  || 500;
    const message = err.response?.data?.message || err.message;
    res.status(status).json({ success: false, message });
  }
});

/**
 * POST /api/auth/logout
 * Stateless — just returns success. Client discards the token.
 */
router.post('/logout', (req, res) => {
  res.json({ success: true, message: 'Logged out successfully' });
});

module.exports = router;
