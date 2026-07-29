const errorHandler = (err, req, res, next) => {
  console.error('[UNHANDLED ERROR]', {
    message: err.message,
    stack: process.env.NODE_ENV === 'development'
      ? err.stack : undefined,
    method: req.method,
    path: req.path,
    user: req.user?.user_id || 'unauthenticated',
    timestamp: new Date().toISOString(),
  });

  if (err.code === '23505') {
    return res.status(409).json({
      error: 'This record already exists.',
      field: err.detail,
    });
  }

  if (err.code === '23503') {
    return res.status(400).json({
      error: 'Referenced record does not exist.',
      detail: err.detail,
    });
  }

  if (err.code === '23502') {
    return res.status(400).json({
      error: 'A required field is missing.',
      field: err.column,
    });
  }

  if (err.code === 'ECONNRESET' ||
      err.code === 'ECONNREFUSED') {
    return res.status(503).json({
      error: 'Database temporarily unavailable. Retry shortly.',
    });
  }

  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      error: 'Invalid authentication token.',
    });
  }
  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      error: 'Authentication token has expired.',
    });
  }

  if (res.headersSent) {
    return next(err);
  }

  return res.status(err.status || 500).json({
    error: process.env.NODE_ENV === 'production'
      ? 'An internal server error occurred.'
      : err.message,
  });
};

module.exports = { errorHandler };
