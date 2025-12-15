const rateLimit = require('express-rate-limit');

// General API rate limiter
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    error: 'RATE_LIMIT_EXCEEDED',
    message: 'Too many requests from this IP, please try again later'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Strict rate limiter for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 login requests per windowMs
  skipSuccessfulRequests: true,
  message: {
    error: 'RATE_LIMIT_EXCEEDED',
    message: 'Too many authentication attempts, please try again later'
  }
});

// Transfer rate limiter
const transferLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // Limit each IP to 10 transfers per minute
  message: {
    error: 'RATE_LIMIT_EXCEEDED',
    message: 'Too many transfer requests, please try again later'
  }
});

module.exports = {
  apiLimiter,
  authLimiter,
  transferLimiter
};
