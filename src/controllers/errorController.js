const { AppError } = require("../lib");

const errorController = (err, req, res, next) => {
  let error = destructureError(err);

  if (error.name === "CastError") error = handleDBCastError(error);
  if (error.name === "ValidationError") error = handleDBValidationError(error);
  if (error.code === 11000) error = handleDBDuplicateFieldError(error);

  if (process.env.NODE_MODE === "PROD") {
    sendProductionError(res, error);
  } else {
    sendDevelopmentError(res, error);
  }
};

function destructureError(err) {
  let error = { ...err };

  error.stack = err.stack;
  error.status = err.status || "error";
  error.statusCode = err.statusCode || 500;
  error.message = err.message || "Server Error";
  error.name = err.name;

  return error;
}

// _id error
function handleDBCastError(error) {
  const message = `Invalid ${error.path}:${error.value}`;
  return new AppError(400, message);
}

function handleDBValidationError(error) {
  const errors = error.errors;

  const invalidInputs = Object.values(errors).map((err) => err.message);

  const message = `Invalid input data. ${invalidInputs.join(". ")}`;

  return new AppError(400, message);
}

function handleDBDuplicateFieldError(error) {
  const keyValue = error?.keyValue;
  const [key, value] = Object.entries(keyValue)?.[0];

  const message = `Duplicate ${key} field value:${value}. Please use another ${key}.`;

  return new AppError(400, message);
}

///////////////////////////////////////////
///////////////////////////////////////////
///////////////////////////////////////////

function sendDevelopmentError(res, error) {
  res.status(error.statusCode).json({
    status: error.status,
    message: error.message,
    error,
    stack: error.stack,
  });
}

function sendProductionError(res, error) {
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

module.exports = errorController;
