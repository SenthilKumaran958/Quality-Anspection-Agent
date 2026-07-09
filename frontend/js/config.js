/**
 * config.js — Environment-specific configuration.
 *
 * Since the Node.js server serves the frontend as static files,
 * the frontend and backend are on the SAME domain in production.
 * We set BACKEND_URL to empty string so api.js uses the same origin.
 *
 * Only override this if your frontend is hosted on a DIFFERENT domain
 * than your backend.
 */
window.BACKEND_URL = '';
