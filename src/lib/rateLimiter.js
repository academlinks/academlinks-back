import rateLimiter from "express-rate-limit";

export const limiter = (message) =>
  rateLimiter({
    max: 4,
    windowMs: 1000 * 60 * 60,
    message: `${message}. Please try again after an hour again.`,
    standardHeaders: true,
  });
