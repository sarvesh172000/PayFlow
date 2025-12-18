const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const { pool } = require('../config/database');

const router = express.Router();

// Get user profile
router.get('/profile', authenticateToken, async (req, res, next) => {
  try {
    const userId = req.user.userId;

    const result = await pool.query(
      `SELECT 
        u.id, u.email, u.full_name, u.phone, u.created_at,
        w.balance, w.currency
      FROM users u
      LEFT JOIN wallets w ON u.id = w.user_id
      WHERE u.id = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'USER_NOT_FOUND',
        message: 'User not found'
      });
    }

    const user = result.rows[0];

    res.json({
      id: user.id,
      email: user.email,
      full_name: user.full_name,
      phone: user.phone,
      created_at: user.created_at,
      wallet: {
        balance: parseFloat(user.balance),
        currency: user.currency
      }
    });

  } catch (error) {
    next(error);
  }
});

// Search users by email (for transfer recipient selection)
router.get('/search', authenticateToken, async (req, res, next) => {
  try {
    const { email } = req.query;

    if (!email || email.length < 3) {
      return res.status(400).json({
        error: 'INVALID_QUERY',
        message: 'Email query must be at least 3 characters'
      });
    }

    const result = await pool.query(
      `SELECT id, email, full_name 
       FROM users 
       WHERE email ILIKE $1 AND is_active = true AND id != $2
       LIMIT 10`,
      [`%${email}%`, req.user.userId]
    );

    res.json({
      users: result.rows
    });

  } catch (error) {
    next(error);
  }
});

module.exports = router;
