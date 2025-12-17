import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FaPaperPlane, FaSearch, FaCheckCircle } from 'react-icons/fa';
import { walletAPI, userAPI } from '../services/api';
import { toast } from 'react-toastify';
import Layout from '../components/Layout';
import './Transfer.css';

const Transfer = () => {
  const navigate = useNavigate();
  const [balance, setBalance] = useState(null);
  const [formData, setFormData] = useState({
    receiver_email: '',
    amount: '',
    description: ''
  });
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    fetchBalance();
  }, []);

  const fetchBalance = async () => {
    try {
      const response = await walletAPI.getBalance();
      setBalance(response.data.balance);
    } catch (error) {
      toast.error('Failed to load balance');
    }
  };

  const handleSearch = async (email) => {
    if (email.length < 3) {
      setSearchResults([]);
      return;
    }

    setSearching(true);
    try {
      const response = await userAPI.searchUsers(email);
      setSearchResults(response.data.users);
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setSearching(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });

    if (name === 'receiver_email') {
      handleSearch(value);
    }
  };

  const selectUser = (user) => {
    setFormData({ ...formData, receiver_email: user.email });
    setSearchResults([]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (parseFloat(formData.amount) <= 0) {
      toast.error('Amount must be greater than 0');
      return;
    }

    if (parseFloat(formData.amount) > balance) {
      toast.error('Insufficient balance');
      return;
    }

    setLoading(true);

    try {
      await walletAPI.transfer(formData);
      setShowSuccess(true);
      setTimeout(() => {
        navigate('/dashboard');
      }, 2000);
    } catch (error) {
      const message = error.response?.data?.message || 'Transfer failed';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  if (showSuccess) {
    return (
      <Layout>
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="success-screen"
        >
          <div className="success-icon">
            <FaCheckCircle />
          </div>
          <h2>Transfer Successful!</h2>
          <p>Your money has been sent successfully</p>
          <div className="success-details">
            <div className="detail-row">
              <span>Amount:</span>
              <span className="detail-value">${parseFloat(formData.amount).toFixed(2)}</span>
            </div>
            <div className="detail-row">
              <span>To:</span>
              <span className="detail-value">{formData.receiver_email}</span>
            </div>
          </div>
        </motion.div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="transfer-page">
        <div className="transfer-header">
          <h1>Send Money</h1>
          <p>Transfer funds instantly to any PayFlow user</p>
        </div>

        <div className="transfer-container">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="transfer-card card"
          >
            <div className="balance-display">
              <p>Available Balance</p>
              <h3>${balance?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h3>
            </div>

            <form onSubmit={handleSubmit} className="transfer-form">
              <div className="input-group">
                <label htmlFor="receiver_email">
                  <FaSearch /> Recipient Email
                </label>
                <input
                  type="email"
                  id="receiver_email"
                  name="receiver_email"
                  value={formData.receiver_email}
                  onChange={handleChange}
                  placeholder="recipient@email.com"
                  required
                  autoComplete="off"
                />
                {searching && <p className="searching-text">Searching...</p>}
                {searchResults.length > 0 && (
                  <div className="search-results">
                    {searchResults.map((user) => (
                      <div
                        key={user.id}
                        className="search-result-item"
                        onClick={() => selectUser(user)}
                      >
                        <div className="result-avatar">
                          {user.full_name.charAt(0).toUpperCase()}
                        </div>
                        <div className="result-info">
                          <p className="result-name">{user.full_name}</p>
                          <p className="result-email">{user.email}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="input-group">
                <label htmlFor="amount">Amount ($)</label>
                <div className="amount-input">
                  <span className="currency-symbol">$</span>
                  <input
                    type="number"
                    id="amount"
                    name="amount"
                    value={formData.amount}
                    onChange={handleChange}
                    placeholder="0.00"
                    step="0.01"
                    min="0.01"
                    max={balance}
                    required
                  />
                </div>
                <div className="quick-amounts">
                  {[10, 25, 50, 100].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      className="quick-amount-btn"
                      onClick={() => setFormData({ ...formData, amount: amt.toString() })}
                    >
                      ${amt}
                    </button>
                  ))}
                </div>
              </div>

              <div className="input-group">
                <label htmlFor="description">Description (Optional)</label>
                <textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  placeholder="What's this for?"
                  rows="3"
                />
              </div>

              <button
                type="submit"
                className="btn btn-primary btn-full btn-large"
                disabled={loading}
              >
                {loading ? (
                  'Processing...'
                ) : (
                  <>
                    <FaPaperPlane /> Send ${formData.amount || '0.00'}
                  </>
                )}
              </button>
            </form>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="transfer-info card"
          >
            <h3>Transfer Information</h3>
            <div className="info-list">
              <div className="info-item">
                <span className="info-icon">⚡</span>
                <div>
                  <p className="info-title">Instant Transfer</p>
                  <p className="info-desc">Money arrives in seconds</p>
                </div>
              </div>
              <div className="info-item">
                <span className="info-icon">🔒</span>
                <div>
                  <p className="info-title">Secure & Encrypted</p>
                  <p className="info-desc">Bank-level security</p>
                </div>
              </div>
              <div className="info-item">
                <span className="info-icon">💰</span>
                <div>
                  <p className="info-title">No Hidden Fees</p>
                  <p className="info-desc">What you send is what they get</p>
                </div>
              </div>
              <div className="info-item">
                <span className="info-icon">✓</span>
                <div>
                  <p className="info-title">ACID Compliant</p>
                  <p className="info-desc">Guaranteed money correctness</p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </Layout>
  );
};

export default Transfer;
