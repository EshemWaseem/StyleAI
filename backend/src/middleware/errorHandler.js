// middleware/errorHandler.js
// ======================================================
// Global error handler — every error that reaches the client
// is sanitized. Raw Prisma / DB / filesystem messages never leak.
// ======================================================

function notFound(req, res) {
  res.status(404).json({
    message: 'Route not found',
    path: req.originalUrl,
    method: req.method,
  });
}

// ------------------------------------------------------
// Helpers — detect infrastructure leaks
// ------------------------------------------------------
function isDbConnectionError(err) {
  const msg = String(err?.message || '').toLowerCase();
  const code = String(err?.code || '');
  return (
    msg.includes("can't reach database") ||
    msg.includes('cannot reach database') ||
    msg.includes('connection refused') ||
    msg.includes('econnrefused') ||
    msg.includes('connection pool') ||
    msg.includes('connection terminated') ||
    msg.includes('server closed the connection') ||
    msg.includes('timed out') ||
    code === 'P1001' || // Prisma: can't reach DB
    code === 'P1002' || // Prisma: timed out
    code === 'P1008' || // Prisma: timed out (older)
    code === 'P1017'    // Prisma: server closed
  );
}

function looksLikeInfraLeak(msg) {
  const m = String(msg || '').toLowerCase();
  return (
    m.includes('prisma.') ||
    m.includes('invocation in') ||
    m.includes('localhost:') ||
    m.includes('127.0.0.1') ||
    m.includes('::1') ||
    m.includes('node_modules') ||
    m.includes('at object.') ||
    m.includes('c:\\users\\') ||
    m.includes('/users/') ||
    m.includes('econnrefused') ||
    m.includes('enotfound') ||
    /\bselect .+ from /i.test(msg) ||
    /\binsert into /i.test(msg) ||
    /\bupdate .+ set /i.test(msg)
  );
}

function genericMessageFor(status) {
  if (status >= 500) return 'Something went wrong on our end. Please try again.';
  if (status === 404) return 'The item you requested could not be found.';
  if (status === 403) return "You don't have permission to do that.";
  if (status === 401) return 'Please sign in to continue.';
  if (status === 409) return 'This record already exists.';
  if (status === 429) return 'Too many requests. Please slow down and try again.';
  return 'Request could not be processed. Please check your input.';
}

// ======================================================
// MAIN HANDLER
// ======================================================
function errorHandler(err, req, res, next) {
  // ---- DB unreachable → 503 with friendly message ----
  if (isDbConnectionError(err)) {
    console.error(
      `[503] ${req.method} ${req.originalUrl} — DB unreachable:`,
      err.message
    );
    return res.status(503).json({
      message:
        'Service is temporarily unavailable. Please try again in a moment.',
      code: 'SERVICE_UNAVAILABLE',
    });
  }

  // ---- Prisma — duplicate ----
  if (err.code === 'P2002') {
    return res.status(409).json({
      message: 'This record already exists.',
      code: 'DUPLICATE',
    });
  }
  // ---- Prisma — record not found ----
  if (err.code === 'P2025') {
    return res.status(404).json({
      message: 'The item you requested could not be found.',
      code: 'NOT_FOUND',
    });
  }

  // ---- Prisma — validation ----
  if (err.name === 'PrismaClientValidationError') {
    return res.status(400).json({
      message: 'Invalid input. Please check the values you entered.',
      code: 'VALIDATION_ERROR',
    });
  }

  // ---- Prisma — runtime errors ----
  if (
    err.name === 'PrismaClientKnownRequestError' ||
    err.name === 'PrismaClientUnknownRequestError' ||
    err.name === 'PrismaClientRustPanicError' ||
    err.name === 'PrismaClientInitializationError'
  ) {
    const msg = String(err.message || '');
    if (msg.includes('Unable to fit integer value')) {
      return res.status(400).json({
        message:
          'One of the numbers you entered is too large. Please check follower counts, views, or likes.',
        code: 'VALUE_TOO_LARGE',
      });
    }
    if (msg.includes('invalid input syntax')) {
      return res.status(400).json({
        message: 'Invalid data format. Please check your input.',
        code: 'INVALID_INPUT',
      });
    }
    if (msg.includes('value too long')) {
      return res.status(400).json({
        message: 'One of the fields is too long.',
        code: 'VALUE_TOO_LONG',
      });
    }
    return res.status(400).json({
      message: 'Something went wrong with your request. Please try again.',
      code: 'DB_ERROR',
    });
  }

  // ---- JWT ----
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      message: 'Your session is invalid. Please sign in again.',
      code: 'INVALID_TOKEN',
    });
  }
  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      message: 'Your session has expired. Please sign in again.',
      code: 'TOKEN_EXPIRED',
    });
  }

  // ---- Multer ----
  if (err.name === 'MulterError') {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        message: 'That file is too large.',
        code: 'FILE_TOO_LARGE',
      });
    }
    return res.status(400).json({
      message: 'File upload failed. Please try a different file.',
      code: 'UPLOAD_ERROR',
    });
  }

  // ---- Fallback ----
  const status = err.status || err.statusCode || 500;

  if (process.env.NODE_ENV !== 'test') {
    console.error(`[${status}] ${req.method} ${req.originalUrl}`, err.message);
    if (status >= 500) console.error(err.stack);
  }

  // ---- Sanitize the outgoing message ----
  let raw = String(err.message || '').trim();

  // Detect infrastructure leaks OR empty messages → replace
  if (!raw || looksLikeInfraLeak(raw) || raw.length > 200) {
    raw = genericMessageFor(status);
  }

  res.status(status).json({
    message: raw,
    ...(err.code && { code: err.code }),
  });
}

module.exports = { notFound, errorHandler };