const { AppError } = require("../../lib");

class ErrorUtils {
  destructureError(err) {
    let error = { ...err };

    error.stack = err.stack;
    error.status = err.status || "error";
    error.statusCode = err.statusCode || 500;
    error.message = err.message || "Server Error";
    error.name = err.name;

    return error;
  }

  // _id error
  handleDBCastError(error) {
    const message = `Invalid ${error.path}:${error.value}`;
    return new AppError(400, message);
  }

  handleDBValidationError(error) {
    const errors = error.errors;

    const invalidInputs = Object.values(errors).map((err) => err.message);

    const message = `Invalid input data. ${invalidInputs.join(". ")}`;

    return new AppError(400, message);
  }

  handleDBDuplicateFieldError(error) {
    const keyValue = error?.keyValue;
    const [key, value] = Object.entries(keyValue)?.[0];

    const message = `Duplicate ${key} field value:${value}. Please use another ${key}.`;

    return new AppError(400, message);
  }

  sendDevelopmentError(res, error) {
    res.status(error.statusCode).json({
      status: error.status,
      message: error.message,
      error,
      stack: error.stack,
    });
  }

  sendProductionError(res, error) {
    if (error.isOperational)
      res.status(error.statusCode).json({
        status: error.status,
        message: error.message,
      });
    else {
      console.error("error 💥", error);
      res.status(500).json({
        status: "error",
        message: error.message || "something went very wrong !",
      });
    }
  }
}

module.exports = new ErrorUtils();
