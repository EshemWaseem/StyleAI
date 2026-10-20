// utils/jwt.js
//      ==
// JWT signing / verification.
// Payload MUST include `userId` and `tokenVersion`.
//   signToken({ userId, tokenVersion })
// `tokenVersion` enables global session revocation (D3).
//      ==
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN;

// Security Enforcement: App ko start hi nahi hone dena agar keys missing hain
if (!JWT_SECRET) {
  throw new Error(
    'FATAL ERROR: JWT_SECRET is not defined in environment variables.'
  );
}

if (!JWT_EXPIRES_IN) {
  throw new Error(
    "FATAL ERROR: JWT_EXPIRES_IN is not defined in environment variables (e.g., '1h' or '15m')."
  );
}

function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
    algorithm: 'HS256', // Strictly enforce algorithm
  });
}

function verifyToken(token) {
  return jwt.verify(token, JWT_SECRET, {
    algorithms: ['HS256'], // Prevent algorithm confusion attacks
  });
}

module.exports = { signToken, verifyToken };