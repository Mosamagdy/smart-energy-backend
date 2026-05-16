function errorHandler(err, req, res, next) {
  const status = err.statusCode || err.status || 500;
  const message = err.message || 'Internal Server Error';

  if (status >= 500) {
    console.error(err);
  } else {
    console.warn(`${req.method} ${req.originalUrl} -> ${status}: ${message}`);
  }

  res.status(status).json({
    status: 'error',
    message
  });
}

module.exports = errorHandler;
