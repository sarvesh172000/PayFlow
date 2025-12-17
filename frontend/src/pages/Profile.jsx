import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FaUser, FaEnvelope, FaPhone, FaCalendar, FaWallet } from 'react-icons/fa';
import { userAPI } from '../services/api';
import { toast } from 'react-toastify';
import { format } from 'date-fns';
import Layout from '../components/Layout';
import './Profile.css';

const Profile = () => {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const response = await userAPI.getProfile();
      setProfile(response.data);
    } catch (error) {
      toast.error('Failed to load profile');
      console.error(error);
    } finally {
      setLoading(false);
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
      <div className="profile-page">
        <div className="profile-header">
          <h1>Profile</h1>
          <p>Manage your account information</p>
        </div>

        <div className="profile-container">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="profile-card card"
          >
            <div className="profile-avatar-section">
              <div className="profile-avatar-large">
                {profile?.full_name?.charAt(0).toUpperCase()}
              </div>
              <h2>{profile?.full_name}</h2>
              <p className="profile-email">{profile?.email}</p>
            </div>

            <div className="profile-details">
              <div className="detail-item">
                <div className="detail-icon">
                  <FaUser />
                </div>
                <div className="detail-content">
                  <p className="detail-label">Full Name</p>
                  <p className="detail-value">{profile?.full_name}</p>
                </div>
              </div>

              <div className="detail-item">
                <div className="detail-icon">
                  <FaEnvelope />
                </div>
                <div className="detail-content">
                  <p className="detail-label">Email Address</p>
                  <p className="detail-value">{profile?.email}</p>
                </div>
              </div>

              <div className="detail-item">
                <div className="detail-icon">
                  <FaPhone />
                </div>
                <div className="detail-content">
                  <p className="detail-label">Phone Number</p>
                  <p className="detail-value">{profile?.phone || 'Not provided'}</p>
                </div>
              </div>

              <div className="detail-item">
                <div className="detail-icon">
                  <FaCalendar />
                </div>
                <div className="detail-content">
                  <p className="detail-label">Member Since</p>
                  <p className="detail-value">
                    {profile?.created_at ? format(new Date(profile.created_at), 'MMMM dd, yyyy') : 'N/A'}
                  </p>
                </div>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="wallet-card card"
          >
            <h3>
              <FaWallet /> Wallet Information
            </h3>
            <div className="wallet-balance-display">
              <p className="wallet-label">Current Balance</p>
              <h2 className="wallet-balance">
                ${profile?.wallet?.balance?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </h2>
              <p className="wallet-currency">{profile?.wallet?.currency}</p>
            </div>

            <div className="wallet-features">
              <div className="feature">
                <span className="feature-icon">🔒</span>
                <span className="feature-text">FDIC Insured</span>
              </div>
              <div className="feature">
                <span className="feature-icon">⚡</span>
                <span className="feature-text">Instant Transfers</span>
              </div>
              <div className="feature">
                <span className="feature-icon">🛡️</span>
                <span className="feature-text">Fraud Protection</span>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="security-card card"
          >
            <h3>Security & Privacy</h3>
            <div className="security-items">
              <div className="security-item">
                <div className="security-status enabled">
                  <span className="status-dot"></span>
                  Enabled
                </div>
                <p className="security-name">Two-Factor Authentication</p>
              </div>
              <div className="security-item">
                <div className="security-status enabled">
                  <span className="status-dot"></span>
                  Enabled
                </div>
                <p className="security-name">Email Notifications</p>
              </div>
              <div className="security-item">
                <div className="security-status enabled">
                  <span className="status-dot"></span>
                  Enabled
                </div>
                <p className="security-name">Transaction Alerts</p>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </Layout>
  );
};

export default Profile;
