const rateLimiter = require("express-rate-limit");

const limiter = (message, limit = 4) =>
  rateLimiter({
    max: limit,
    windowMs: 1000 * 60 * 60,
    message: { message: `${message}. Please try again after an hour.` },
    standardHeaders: true,
  });

module.exports = limiter;
