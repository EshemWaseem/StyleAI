// middleware/authSSE.js

// SSE auth wrapper — EventSource can't send Authorization headers,
// so we accept ?token= from query string and delegate to authenticate().


const { authenticate } = require('./auth');

function authenticateSSE(req, res, next) {
  if (!req.headers.authorization && req.query.token) {
    req.headers.authorization = `Bearer ${req.query.token}`;
  }
  return authenticate(req, res, next);
}

module.exports = { authenticateSSE };