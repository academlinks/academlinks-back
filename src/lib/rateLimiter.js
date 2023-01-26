const rateLimiter = require("express-rate-limit");

const limiter = (message) =>
  rateLimiter({
    max: 4,
    windowMs: 1000 * 60 * 60,
    message: `${message}. Please try again after an hour again.`,
    standardHeaders: true,
  });

module.exports = limiter;
