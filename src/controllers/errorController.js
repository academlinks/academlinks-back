const { ErrorUtils } = require("../utils/error");

const errorController = (err, req, res, next) => {
  let error = ErrorUtils.destructureError(err);

  if (error.name === "CastError") error = ErrorUtils.handleDBCastError(error);
  if (error.name === "ValidationError")
    error = ErrorUtils.handleDBValidationError(error);
  if (error.code === 11000)
    error = ErrorUtils.handleDBDuplicateFieldError(error);

  if (process.env.NODE_MODE === "PROD") {
    ErrorUtils.sendProductionError(res, error);
  } else {
    ErrorUtils.sendDevelopmentError(res, error);
  }
};

module.exports = errorController;
