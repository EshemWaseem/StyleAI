// middleware/authSSE.js
// ======================================================
// SSE auth wrapper — EventSource cannot send Authorization headers,
// so we accept ?token= from the query string and rewrite it into the
// Authorization header, then delegate to the normal authenticate().
// ======================================================

const { authenticate } = require('./auth');

function authenticateSSE(req, res, next) {
  if (!req.headers.authorization && req.query.token) {
    req.headers.authorization = `Bearer ${req.query.token}`;
  }
  return authenticate(req, res, next);
}

module.exports = { authenticateSSE };