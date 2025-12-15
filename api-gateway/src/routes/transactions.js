const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const { pool } = require('../config/database');
const logger = require('../utils/logger');

const router = express.Router();

// Get user's transaction history
router.get('/history', authenticateToken, async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const { limit = 50, offset = 0, type } = req.query;

    let query = `
      SELECT 
        t.id,
        t.sender_id,
        t.receiver_id,
        t.amount,
        t.currency,
        t.status,
        t.description,
        t.created_at,
        sender.email as sender_email,
        sender.full_name as sender_name,
        receiver.email as receiver_email,
        receiver.full_name as receiver_name,
        CASE 
          WHEN t.sender_id = $1 THEN 'sent'
          WHEN t.receiver_id = $1 THEN 'received'
        END as transaction_type
      FROM transactions t
      JOIN users sender ON t.sender_id = sender.id
      JOIN users receiver ON t.receiver_id = receiver.id
      WHERE (t.sender_id = $1 OR t.receiver_id = $1)
    `;

    const params = [userId];

    // Filter by type (sent/received)
    if (type === 'sent') {
      query += ' AND t.sender_id = $1';
    } else if (type === 'received') {
      query += ' AND t.receiver_id = $1';
    }

    query += ' ORDER BY t.created_at DESC LIMIT $2 OFFSET $3';
    params.push(parseInt(limit), parseInt(offset));

    const result = await pool.query(query, params);

    // Get total count
    const countResult = await pool.query(
      `SELECT COUNT(*) FROM transactions 
       WHERE sender_id = $1 OR receiver_id = $1`,
      [userId]
    );

    res.json({
      transactions: result.rows.map(tx => ({
        id: tx.id,
        type: tx.transaction_type,
        amount: parseFloat(tx.amount),
        currency: tx.currency,
        status: tx.status,
        description: tx.description,
        created_at: tx.created_at,
        counterparty: {
          email: tx.transaction_type === 'sent' ? tx.receiver_email : tx.sender_email,
          name: tx.transaction_type === 'sent' ? tx.receiver_name : tx.sender_name
        }
      })),
      pagination: {
        total: parseInt(countResult.rows[0].count),
        limit: parseInt(limit),
        offset: parseInt(offset)
      }
    });

  } catch (error) {
    next(error);
  }
});

// Get specific transaction details
router.get('/:transactionId', authenticateToken, async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const { transactionId } = req.params;

    const result = await pool.query(
      `SELECT 
        t.*,
        sender.email as sender_email,
        sender.full_name as sender_name,
        receiver.email as receiver_email,
        receiver.full_name as receiver_name
      FROM transactions t
      JOIN users sender ON t.sender_id = sender.id
      JOIN users receiver ON t.receiver_id = receiver.id
      WHERE t.id = $1 AND (t.sender_id = $2 OR t.receiver_id = $2)`,
      [transactionId, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'TRANSACTION_NOT_FOUND',
        message: 'Transaction not found or you do not have access'
      });
    }

    const tx = result.rows[0];

    res.json({
      id: tx.id,
      sender: {
        id: tx.sender_id,
        email: tx.sender_email,
        name: tx.sender_name
      },
      receiver: {
        id: tx.receiver_id,
        email: tx.receiver_email,
        name: tx.receiver_name
      },
      amount: parseFloat(tx.amount),
      currency: tx.currency,
      status: tx.status,
      description: tx.description,
      created_at: tx.created_at,
      completed_at: tx.completed_at
    });

  } catch (error) {
    next(error);
  }
});

// Get transaction statistics
router.get('/stats/summary', authenticateToken, async (req, res, next) => {
  try {
    const userId = req.user.userId;

    const result = await pool.query(
      `SELECT 
        COUNT(*) FILTER (WHERE sender_id = $1) as total_sent_count,
        COUNT(*) FILTER (WHERE receiver_id = $1) as total_received_count,
        COALESCE(SUM(amount) FILTER (WHERE sender_id = $1), 0) as total_sent_amount,
        COALESCE(SUM(amount) FILTER (WHERE receiver_id = $1), 0) as total_received_amount
      FROM transactions
      WHERE (sender_id = $1 OR receiver_id = $1) AND status = 'completed'`,
      [userId]
    );

    const stats = result.rows[0];

    res.json({
      sent: {
        count: parseInt(stats.total_sent_count),
        total_amount: parseFloat(stats.total_sent_amount)
      },
      received: {
        count: parseInt(stats.total_received_count),
        total_amount: parseFloat(stats.total_received_amount)
      }
    });

  } catch (error) {
    next(error);
  }
});

module.exports = router;
