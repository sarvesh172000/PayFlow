const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({
      error: 'UNAUTHORIZED',
      message: 'Access token is required'
    });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      logger.warn('Invalid token attempt:', { error: err.message });
      return res.status(403).json({
        error: 'FORBIDDEN',
        message: 'Invalid or expired token'
      });
    }

    req.user = user;
    next();
  });
}

function generateAccessToken(user) {
  return jwt.sign(
    { 
      userId: user.id, 
      email: user.email 
    },
    JWT_SECRET,
    { expiresIn: '1h' }
  );
}

function generateRefreshToken(user) {
  return jwt.sign(
    { 
      userId: user.id, 
      email: user.email,
      type: 'refresh'
    },
    process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-change-in-production',
    { expiresIn: '7d' }
  );
}

function verifyRefreshToken(token) {
  return jwt.verify(token, process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-change-in-production');
}

module.exports = {
  authenticateToken,
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken
};
