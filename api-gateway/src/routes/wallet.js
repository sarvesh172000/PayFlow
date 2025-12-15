const express = require('express');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const { body, validationResult } = require('express-validator');
const { authenticateToken } = require('../middleware/auth');
const { transferLimiter } = require('../middleware/rateLimiter');
const { pool } = require('../config/database');
const { getRedisClient } = require('../config/database');
const logger = require('../utils/logger');

const router = express.Router();
const LEDGER_SERVICE_URL = process.env.LEDGER_SERVICE_URL || 'http://localhost:8080';

// Get wallet balance
router.get('/balance', authenticateToken, async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const redisClient = getRedisClient();
    const cacheKey = `wallet:balance:${userId}`;

    // Try to get from cache
    if (redisClient) {
      try {
        const cachedBalance = await redisClient.get(cacheKey);
        if (cachedBalance) {
          logger.info('Balance retrieved from cache:', { userId });
          return res.json({
            balance: parseFloat(cachedBalance),
            currency: 'USD',
            cached: true
          });
        }
      } catch (cacheError) {
        logger.warn('Redis cache error:', cacheError);
      }
    }

    // Get from database
    const result = await pool.query(
      'SELECT balance, currency FROM wallets WHERE user_id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'WALLET_NOT_FOUND',
        message: 'Wallet not found for this user'
      });
    }

    const wallet = result.rows[0];

    // Cache the balance
    if (redisClient) {
      try {
        await redisClient.setEx(cacheKey, 300, wallet.balance.toString()); // Cache for 5 minutes
      } catch (cacheError) {
        logger.warn('Failed to cache balance:', cacheError);
      }
    }

    res.json({
      balance: parseFloat(wallet.balance),
      currency: wallet.currency,
      cached: false
    });

  } catch (error) {
    next(error);
  }
});

// Transfer money
router.post('/transfer',
  authenticateToken,
  transferLimiter,
  [
    body('receiver_email').isEmail().normalizeEmail(),
    body('amount').isFloat({ min: 0.01 }),
    body('description').optional().trim()
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'VALIDATION_ERROR',
          message: 'Invalid input data',
          details: errors.array()
        });
      }

      const senderId = req.user.userId;
      const { receiver_email, amount, description } = req.body;

      // Get receiver ID from email
      const receiverResult = await pool.query(
        'SELECT id FROM users WHERE email = $1 AND is_active = true',
        [receiver_email]
      );

      if (receiverResult.rows.length === 0) {
        return res.status(404).json({
          error: 'RECEIVER_NOT_FOUND',
          message: 'Receiver not found or account is inactive'
        });
      }

      const receiverId = receiverResult.rows[0].id;

      // Check if sending to self
      if (senderId === receiverId) {
        return res.status(400).json({
          error: 'INVALID_TRANSFER',
          message: 'Cannot transfer to your own account'
        });
      }

      // Generate idempotency key
      const idempotencyKey = uuidv4();

      // Call ledger service
      try {
        const ledgerResponse = await axios.post(
          `${LEDGER_SERVICE_URL}/transfer`,
          {
            sender_id: senderId,
            receiver_id: receiverId,
            amount: parseFloat(amount),
            description: description || '',
            idempotency_key: idempotencyKey
          },
          {
            timeout: 10000,
            headers: {
              'Content-Type': 'application/json'
            }
          }
        );

        logger.info('Transfer completed:', {
          transactionId: ledgerResponse.data.transaction_id,
          senderId,
          receiverId,
          amount
        });

        res.json({
          message: 'Transfer completed successfully',
          transaction: {
            id: ledgerResponse.data.transaction_id,
            amount: ledgerResponse.data.amount,
            status: ledgerResponse.data.status,
            sender_balance: ledgerResponse.data.sender_balance
          }
        });

      } catch (ledgerError) {
        if (ledgerError.response) {
          // Ledger service returned an error
          const status = ledgerError.response.status;
          const data = ledgerError.response.data;
          
          logger.error('Ledger service error:', {
            status,
            error: data.error,
            message: data.message
          });

          return res.status(status).json({
            error: data.error || 'TRANSFER_FAILED',
            message: data.message || 'Transfer failed'
          });
        }

        // Network or timeout error
        logger.error('Failed to connect to ledger service:', ledgerError.message);
        return res.status(503).json({
          error: 'SERVICE_UNAVAILABLE',
          message: 'Payment service is temporarily unavailable'
        });
      }

    } catch (error) {
      next(error);
    }
  }
);

// Add money (for testing/demo purposes)
router.post('/add-funds',
  authenticateToken,
  [
    body('amount').isFloat({ min: 1, max: 10000 })
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'VALIDATION_ERROR',
          message: 'Invalid amount'
        });
      }

      const userId = req.user.userId;
      const { amount } = req.body;

      const result = await pool.query(
        'UPDATE wallets SET balance = balance + $1, updated_at = CURRENT_TIMESTAMP WHERE user_id = $2 RETURNING balance',
        [amount, userId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          error: 'WALLET_NOT_FOUND',
          message: 'Wallet not found'
        });
      }

      // Invalidate cache
      const redisClient = getRedisClient();
      if (redisClient) {
        try {
          await redisClient.del(`wallet:balance:${userId}`);
        } catch (e) {
          logger.warn('Failed to invalidate cache:', e);
        }
      }

      logger.info('Funds added:', { userId, amount });

      res.json({
        message: 'Funds added successfully',
        new_balance: parseFloat(result.rows[0].balance)
      });

    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;
