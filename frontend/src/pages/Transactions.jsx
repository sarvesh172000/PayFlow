import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FaHistory, FaArrowUp, FaArrowDown, FaFilter } from 'react-icons/fa';
import { transactionAPI } from '../services/api';
import { toast } from 'react-toastify';
import { format } from 'date-fns';
import Layout from '../components/Layout';
import './Transactions.css';

const Transactions = () => {
  const [transactions, setTransactions] = useState([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ total: 0, limit: 20, offset: 0 });

  useEffect(() => {
    fetchTransactions();
  }, [filter, pagination.offset]);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const params = {
        limit: pagination.limit,
        offset: pagination.offset
      };

      if (filter !== 'all') {
        params.type = filter;
      }

      const response = await transactionAPI.getHistory(params);
      setTransactions(response.data.transactions);
      setPagination((prev) => ({ ...prev, total: response.data.pagination.total }));
    } catch (error) {
      toast.error('Failed to load transactions');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (newFilter) => {
    setFilter(newFilter);
    setPagination((prev) => ({ ...prev, offset: 0 }));
  };

  const loadMore = () => {
    setPagination((prev) => ({
      ...prev,
      offset: prev.offset + prev.limit
    }));
  };

  const hasMore = pagination.offset + pagination.limit < pagination.total;

  return (
    <Layout>
      <div className="transactions-page">
        <div className="transactions-header">
          <div>
            <h1>
              <FaHistory /> Transaction History
            </h1>
            <p>View all your payment activities</p>
          </div>

          <div className="filter-buttons">
            <button
              className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
              onClick={() => handleFilterChange('all')}
            >
              All
            </button>
            <button
              className={`filter-btn ${filter === 'sent' ? 'active' : ''}`}
              onClick={() => handleFilterChange('sent')}
            >
              <FaArrowUp /> Sent
            </button>
            <button
              className={`filter-btn ${filter === 'received' ? 'active' : ''}`}
              onClick={() => handleFilterChange('received')}
            >
              <FaArrowDown /> Received
            </button>
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="transactions-container card"
        >
          {loading && transactions.length === 0 ? (
            <div className="spinner"></div>
          ) : transactions.length === 0 ? (
            <div className="empty-state">
              <FaHistory className="empty-icon" />
              <h3>No transactions yet</h3>
              <p>Your transaction history will appear here</p>
            </div>
          ) : (
            <>
              <div className="transactions-table">
                <div className="table-header">
                  <div className="th-type">Type</div>
                  <div className="th-counterparty">Counterparty</div>
                  <div className="th-description">Description</div>
                  <div className="th-date">Date</div>
                  <div className="th-amount">Amount</div>
                  <div className="th-status">Status</div>
                </div>

                <div className="table-body">
                  {transactions.map((txn, index) => (
                    <motion.div
                      key={txn.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="table-row"
                    >
                      <div className="td-type">
                        <div className={`type-badge ${txn.type}`}>
                          {txn.type === 'sent' ? <FaArrowUp /> : <FaArrowDown />}
                          <span>{txn.type}</span>
                        </div>
                      </div>
                      <div className="td-counterparty">
                        <div className="counterparty-avatar">
                          {txn.counterparty.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="counterparty-info">
                          <p className="counterparty-name">{txn.counterparty.name}</p>
                          <p className="counterparty-email">{txn.counterparty.email}</p>
                        </div>
                      </div>
                      <div className="td-description">
                        {txn.description || <span className="no-description">No description</span>}
                      </div>
                      <div className="td-date">
                        {format(new Date(txn.created_at), 'MMM dd, yyyy')}
                        <span className="time">{format(new Date(txn.created_at), 'HH:mm')}</span>
                      </div>
                      <div className={`td-amount ${txn.type}`}>
                        {txn.type === 'sent' ? '-' : '+'}${txn.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                      <div className="td-status">
                        <span className={`badge badge-${txn.status}`}>{txn.status}</span>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>

              {hasMore && (
                <div className="load-more-container">
                  <button onClick={loadMore} className="btn btn-outline" disabled={loading}>
                    {loading ? 'Loading...' : 'Load More'}
                  </button>
                </div>
              )}

              <div className="transactions-summary">
                Showing {transactions.length} of {pagination.total} transactions
              </div>
            </>
          )}
        </motion.div>
      </div>
    </Layout>
  );
};

export default Transactions;
