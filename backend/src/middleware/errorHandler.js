function notFound(req, res) {
  res.status(404).json({
    message: 'Route not found',
    path: req.originalUrl,
    method: req.method,
  });
}

function errorHandler(err, req, res, next) {
  // Prisma — duplicate / not found
  if (err.code === 'P2002') {
    return res.status(409).json({
      message: 'Duplicate entry — this record already exists',
      fields: err.meta?.target,
    });
  }
  if (err.code === 'P2025') {
    return res.status(404).json({ message: 'Record not found' });
  }

  // Prisma — validation
  if (err.name === 'PrismaClientValidationError') {
    return res.status(400).json({
      message: 'Invalid input data. Please check your values.',
      code: 'VALIDATION_ERROR',
    });
  }

  // Prisma — runtime query errors
  if (
    err.name === 'PrismaClientKnownRequestError' ||
    err.name === 'PrismaClientUnknownRequestError'
  ) {
    const msg = String(err.message || '');
    if (msg.includes('Unable to fit integer value')) {
      return res.status(400).json({
        message:
          'One of the numeric fields is too large. Please check follower count, views, likes, or comments.',
        code: 'VALUE_TOO_LARGE',
      });
    }
    if (msg.includes('invalid input syntax')) {
      return res.status(400).json({
        message: 'Invalid data format. Please check your input values.',
        code: 'INVALID_INPUT',
      });
    }
    if (msg.includes('value too long')) {
      return res.status(400).json({
        message: 'One of the text fields is too long.',
        code: 'VALUE_TOO_LONG',
      });
    }
    return res.status(400).json({
      message: 'Database error. Please check your input and try again.',
      code: 'DB_ERROR',
    });
  }

  // JWT
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({ message: 'Invalid token' });
  }
  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({ message: 'Token expired' });
  }

  // Multer
  if (err.name === 'MulterError') {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ message: 'File is too large.' });
    }
    return res.status(400).json({ message: 'File upload error.' });
  }

  const status = err.status || err.statusCode || 500;

  if (process.env.NODE_ENV !== 'test') {
    console.error(`[${status}] ${req.method} ${req.originalUrl}`, err.message);
    if (status >= 500) console.error(err.stack);
  }

  res.status(status).json({
    message: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
}

module.exports = { notFound, errorHandler };





// error handler 
// 23-09 2:05

function notFound(req, res) {
  res.status(404).json({
    message: 'Route not found',
    path: req.originalUrl,
    method: req.method,
  });
}

function errorHandler(err, req, res, next) {
  // ======================================================
  // PRISMA — DUPLICATE / NOT FOUND
  // ======================================================
  if (err.code === 'P2002') {
    return res.status(409).json({
      message: 'Duplicate entry — this record already exists',
      fields: err.meta?.target,
    });
  }
  if (err.code === 'P2025') {
    return res.status(404).json({ message: 'Record not found' });
  }

  // ======================================================
  // PRISMA — VALIDATION ERROR (raw, e.g. wrong type)
  // ======================================================
  if (err.name === 'PrismaClientValidationError') {
    return res.status(400).json({
      message: 'Invalid input data. Please check your values.',
      code: 'VALIDATION_ERROR',
    });
  }

  // ======================================================
  // PRISMA — RUNTIME QUERY ERRORS
  // (e.g. int overflow, invalid syntax)
  // ======================================================
  if (
    err.name === 'PrismaClientKnownRequestError' ||
    err.name === 'PrismaClientUnknownRequestError'
  ) {
    const msg = String(err.message || '');

    if (msg.includes('Unable to fit integer value')) {
      return res.status(400).json({
        message:
          'One of the numeric fields is too large. ' +
          'Please check follower count, following count, views, likes, or comments.',
        code: 'VALUE_TOO_LARGE',
      });
    }

    if (msg.includes('invalid input syntax')) {
      return res.status(400).json({
        message: 'Invalid data format. Please check your input values.',
        code: 'INVALID_INPUT',
      });
    }

    if (msg.includes('value too long')) {
      return res.status(400).json({
        message: 'One of the text fields is too long.',
        code: 'VALUE_TOO_LONG',
      });
    }

    return res.status(400).json({
      message: 'Database error. Please check your input and try again.',
      code: 'DB_ERROR',
    });
  }

  // ======================================================
  // JWT ERRORS
  // ======================================================
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({ message: 'Invalid token' });
  }
  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({ message: 'Token expired' });
  }

  // ======================================================
  // MULTER / FILE UPLOAD ERRORS (if you use multer)
  // ======================================================
  if (err.name === 'MulterError') {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ message: 'File is too large.' });
    }
    return res.status(400).json({ message: 'File upload error.' });
  }

  // ======================================================
  // FALLBACK — generic
  // ======================================================
  const status = err.status || err.statusCode || 500;

  if (process.env.NODE_ENV !== 'test') {
    console.error(`[${status}] ${req.method} ${req.originalUrl}`, err.message);
    if (status >= 500) console.error(err.stack);
  }

  res.status(status).json({
    message: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
}

module.exports = { notFound, errorHandler };