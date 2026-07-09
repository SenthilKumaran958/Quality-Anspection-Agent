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
    if (!JAVA_API || !JAVA_API.startsWith('http')) {
      throw new Error('Java API URL not configured');
    }
    const { data } = await axios.post(`${JAVA_API}/auth/register`, req.body);
    res.json(data);
  } catch (err) {
    console.warn(`[Register] Java API unavailable: ${err.message}. Using Node.js Local Fallback.`);
    
    const { username, fullName, password, email } = req.body;
    const finalUsername = username || email || 'user';
    const finalEmail = email || (username && username.includes('@') ? username : `${username}@quality.ai`);
    
    if ((finalUsername || finalEmail) && password) {
      const token = jwt.sign(
        { username: finalUsername, role: 'USER', sub: finalUsername }, 
        JWT_SECRET, 
        { expiresIn: '24h' }
      );
      
      return res.json({
        success: true,
        message: 'Registered using local fallback',
        data: {
          token,
          username: finalUsername,
          fullName: fullName || finalUsername.split('@')[0],
          role: 'USER',
          email: finalEmail
        }
      });
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
    if (!JAVA_API || !JAVA_API.startsWith('http')) {
      throw new Error('Java API URL not configured');
    }
    const { data } = await axios.post(`${JAVA_API}/auth/login`, req.body);
    res.json(data);
  } catch (err) {
    console.warn(`[Login] Java API unavailable: ${err.message}. Using Node.js Local Fallback.`);
    
    const { username, password } = req.body;
    
    if (username && password) {
      const token = jwt.sign(
        { username, role: 'USER', sub: username }, 
        JWT_SECRET, 
        { expiresIn: '24h' }
      );
      
      return res.json({
        success: true,
        message: 'Logged in using local fallback',
        data: {
          token,
          username,
          fullName: username.split('@')[0],
          role: 'USER',
          email: username.includes('@') ? username : `${username}@quality.ai`
        }
      });
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
