const logger = require('../utils/logger');

const errorHandler = (err, req, res, next) => {
  logger.error(err.stack);
  let error = { ...err };
  error.message = err.message;
  if (err.name === 'SequelizeUniqueConstraintError') {
    error.message = 'Duplicate field value entered';
    return res.status(400).json({ success: false, message: error.message });
  }
  if (err.name === 'SequelizeValidationError') {
    error.message = err.errors.map(e => e.message).join(', ');
    return res.status(400).json({ success: false, message: error.message });
  }
  res.status(err.statusCode || 500).json({
    success: false,
    message: error.message || 'Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};

module.exports = errorHandler;
