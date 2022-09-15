export const errorController = (err, req, res, next) => {
  let error = { ...err };

  error.stack = err.stack;
  error.status = err.status || 'error';
  error.statusCode = err.statusCode || 500;
  error.message = err.message || 'Server Error';

  res.status(error.statusCode).json({
    status: error.status,
    statusCode: error.statusCode,
    message: error.message,
    stack: error.stack,
  });
};
