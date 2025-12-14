const express = require('express');
const bcrypt = require('bcrypt');
const { body, validationResult } = require('express-validator');
const { pool } = require('../config/database');
const { generateAccessToken, generateRefreshToken, verifyRefreshToken } = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimiter');
const logger = require('../utils/logger');

const router = express.Router();

// Register new user
router.post('/register',
  authLimiter,
  [
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 8 }),
    body('full_name').trim().notEmpty(),
    body('phone').optional().isMobilePhone()
  ],
  async (req, res, next) => {
    try {
      // Validate input
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'VALIDATION_ERROR',
          message: 'Invalid input data',
          details: errors.array()
        });
      }

      const { email, password, full_name, phone } = req.body;

      // Check if user already exists
      const existingUser = await pool.query(
        'SELECT id FROM users WHERE email = $1',
        [email]
      );

      if (existingUser.rows.length > 0) {
        return res.status(400).json({
          error: 'USER_EXISTS',
          message: 'User with this email already exists'
        });
      }

      // Hash password
      const saltRounds = 10;
      const passwordHash = await bcrypt.hash(password, saltRounds);

      // Start transaction
      const client = await pool.connect();
      try {
        await client.query('BEGIN');

        // Create user
        const userResult = await client.query(
          `INSERT INTO users (email, password_hash, full_name, phone)
           VALUES ($1, $2, $3, $4)
           RETURNING id, email, full_name, created_at`,
          [email, passwordHash, full_name, phone]
        );

        const user = userResult.rows[0];

        // Create wallet for user with initial balance of 1000
        await client.query(
          'INSERT INTO wallets (user_id, balance) VALUES ($1, $2)',
          [user.id, 1000.00]
        );

        await client.query('COMMIT');

        // Generate tokens
        const accessToken = generateAccessToken(user);
        const refreshToken = generateRefreshToken(user);

        // Store refresh token
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
        await pool.query(
          'INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)',
          [user.id, refreshToken, expiresAt]
        );

        logger.info('New user registered:', { userId: user.id, email: user.email });

        res.status(201).json({
          message: 'User registered successfully',
          user: {
            id: user.id,
            email: user.email,
            full_name: user.full_name,
            created_at: user.created_at
          },
          accessToken,
          refreshToken
        });

      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }

    } catch (error) {
      next(error);
    }
  }
);

// Login
router.post('/login',
  authLimiter,
  [
    body('email').isEmail().normalizeEmail(),
    body('password').notEmpty()
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'VALIDATION_ERROR',
          message: 'Invalid input data'
        });
      }

      const { email, password } = req.body;

      // Get user
      const result = await pool.query(
        'SELECT id, email, password_hash, full_name, is_active FROM users WHERE email = $1',
        [email]
      );

      if (result.rows.length === 0) {
        return res.status(401).json({
          error: 'INVALID_CREDENTIALS',
          message: 'Invalid email or password'
        });
      }

      const user = result.rows[0];

      if (!user.is_active) {
        return res.status(403).json({
          error: 'ACCOUNT_DISABLED',
          message: 'Your account has been disabled'
        });
      }

      // Verify password
      const validPassword = await bcrypt.compare(password, user.password_hash);
      if (!validPassword) {
        return res.status(401).json({
          error: 'INVALID_CREDENTIALS',
          message: 'Invalid email or password'
        });
      }

      // Generate tokens
      const accessToken = generateAccessToken(user);
      const refreshToken = generateRefreshToken(user);

      // Store refresh token
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      await pool.query(
        'INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)',
        [user.id, refreshToken, expiresAt]
      );

      logger.info('User logged in:', { userId: user.id, email: user.email });

      res.json({
        message: 'Login successful',
        user: {
          id: user.id,
          email: user.email,
          full_name: user.full_name
        },
        accessToken,
        refreshToken
      });

    } catch (error) {
      next(error);
    }
  }
);

// Refresh token
router.post('/refresh',
  body('refreshToken').notEmpty(),
  async (req, res, next) => {
    try {
      const { refreshToken } = req.body;

      // Verify refresh token
      let decoded;
      try {
        decoded = verifyRefreshToken(refreshToken);
      } catch (error) {
        return res.status(401).json({
          error: 'INVALID_TOKEN',
          message: 'Invalid or expired refresh token'
        });
      }

      // Check if token exists and not revoked
      const result = await pool.query(
        `SELECT rt.*, u.email, u.full_name 
         FROM refresh_tokens rt
         JOIN users u ON rt.user_id = u.id
         WHERE rt.token = $1 AND rt.revoked = false AND rt.expires_at > NOW()`,
        [refreshToken]
      );

      if (result.rows.length === 0) {
        return res.status(401).json({
          error: 'INVALID_TOKEN',
          message: 'Refresh token not found or expired'
        });
      }

      const user = {
        id: decoded.userId,
        email: result.rows[0].email,
        full_name: result.rows[0].full_name
      };

      // Generate new access token
      const accessToken = generateAccessToken(user);

      res.json({
        accessToken
      });

    } catch (error) {
      next(error);
    }
  }
);

// Logout
router.post('/logout',
  body('refreshToken').notEmpty(),
  async (req, res, next) => {
    try {
      const { refreshToken } = req.body;

      // Revoke refresh token
      await pool.query(
        'UPDATE refresh_tokens SET revoked = true WHERE token = $1',
        [refreshToken]
      );

      res.json({ message: 'Logged out successfully' });

    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;
