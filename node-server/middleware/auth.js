/**
 * middleware/auth.js — JWT authentication middleware for Node.js.
 *
 * Verifies the Bearer token from the Authorization header.
 * Attaches decoded payload to req.user on success.
 */

const jwt = require('jsonwebtoken');

const JWT_SECRET = 'QualityInspectionAgentSuperSecretKey2024!@#$%^&*()';

/**
 * Middleware: requireAuth
 * Rejects requests without a valid JWT token.
 */
function requireAuth(req, res, next) {
  const header = req.headers['authorization'];

  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required. Please log in.'
    });
  }

  const token = header.substring(7);

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    console.error('[JWT Verification Failed]', err.message);
    return res.status(401).json({
      success: false,
      message: 'Token is invalid or expired. Please log in again.'
    });
  }
}

module.exports = { requireAuth };
