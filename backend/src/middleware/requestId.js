// middleware/requestId.js
// ======================================================
// Attaches a unique request ID to every request.
// ======================================================
const crypto = require('crypto');

function requestId(req, res, next) {
  const incoming = req.headers['x-request-id'];
  const id = (typeof incoming === 'string' && incoming.length <= 64 && incoming.length > 0)
    ? incoming
    : crypto.randomBytes(8).toString('hex');

  req.id = id;
  res.setHeader('X-Request-Id', id);
  next();
}

module.exports = { requestId };