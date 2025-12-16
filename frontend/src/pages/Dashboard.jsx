import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FaWallet, FaArrowUp, FaArrowDown, FaPaperPlane, FaHistory, FaPlus } from 'react-icons/fa';
import { walletAPI, transactionAPI } from '../services/api';
import { toast } from 'react-toastify';
import { format } from 'date-fns';
import Layout from '../components/Layout';
import './Dashboard.css';

const Dashboard = () => {
  const [balance, setBalance] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [balanceRes, transactionsRes, statsRes] = await Promise.all([
        walletAPI.getBalance(),
        transactionAPI.getHistory({ limit: 5 }),
        transactionAPI.getStats()
      ]);

      setBalance(balanceRes.data.balance);
      setTransactions(transactionsRes.data.transactions);
      setStats(statsRes.data);
    } catch (error) {
      toast.error('Failed to load dashboard data');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddFunds = async () => {
    const amount = prompt('Enter amount to add (max $10,000):');
    if (amount && !isNaN(amount) && amount > 0 && amount <= 10000) {
      try {
        await walletAPI.addFunds(parseFloat(amount));
        toast.success(`Successfully added $${amount}`);
        fetchDashboardData();
      } catch (error) {
        toast.error(error.response?.data?.message || 'Failed to add funds');
      }
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="spinner"></div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="dashboard">
        <div className="dashboard-header">
          <h1>Dashboard</h1>
          <p>Welcome back! Here's your financial overview</p>
        </div>

        <div className="dashboard-grid">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="balance-card card"
          >
            <div className="balance-header">
              <div>
                <p className="balance-label">Total Balance</p>
                <h2 className="balance-amount">${balance?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h2>
              </div>
              <div className="balance-icon">
                <FaWallet />
              </div>
            </div>
            <div className="balance-actions">
              <Link to="/transfer" className="btn btn-primary">
                <FaPaperPlane /> Send Money
              </Link>
              <button onClick={handleAddFunds} className="btn btn-secondary">
                <FaPlus /> Add Funds
              </button>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="stat-card card"
          >
            <div className="stat-icon sent">
              <FaArrowUp />
            </div>
            <div className="stat-content">
              <p className="stat-label">Total Sent</p>
              <p className="stat-value">${stats?.sent?.total_amount?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
              <p className="stat-count">{stats?.sent?.count} transactions</p>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="stat-card card"
          >
            <div className="stat-icon received">
              <FaArrowDown />
            </div>
            <div className="stat-content">
              <p className="stat-label">Total Received</p>
              <p className="stat-value">${stats?.received?.total_amount?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
              <p className="stat-count">{stats?.received?.count} transactions</p>
            </div>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="recent-transactions card"
        >
          <div className="section-header">
            <h3>
              <FaHistory /> Recent Transactions
            </h3>
            <Link to="/transactions" className="view-all-link">View All</Link>
          </div>

          {transactions.length === 0 ? (
            <div className="empty-state">
              <p>No transactions yet</p>
              <Link to="/transfer" className="btn btn-primary">Make your first transfer</Link>
            </div>
          ) : (
            <div className="transactions-list">
              {transactions.map((txn) => (
                <div key={txn.id} className="transaction-item">
                  <div className={`transaction-icon ${txn.type}`}>
                    {txn.type === 'sent' ? <FaArrowUp /> : <FaArrowDown />}
                  </div>
                  <div className="transaction-details">
                    <p className="transaction-counterparty">{txn.counterparty.name}</p>
                    <p className="transaction-date">{format(new Date(txn.created_at), 'MMM dd, yyyy · HH:mm')}</p>
                  </div>
                  <div className={`transaction-amount ${txn.type}`}>
                    {txn.type === 'sent' ? '-' : '+'}${txn.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </Layout>
  );
};

export default Dashboard;
