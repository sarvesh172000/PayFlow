import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FaEnvelope, FaLock, FaUser, FaPhone, FaWallet } from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';
import './Auth.css';

const Register = () => {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    full_name: '',
    phone: ''
  });
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const result = await register(formData);

    if (result.success) {
      navigate('/dashboard');
    }

    setLoading(false);
  };

  return (
    <div className="auth-page">
      <div className="auth-container">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="auth-card"
        >
          <div className="auth-header">
            <div className="auth-logo">
              <FaWallet />
            </div>
            <h1>Create Account</h1>
            <p>Start your digital payment journey with PayFlow</p>
          </div>

          <form onSubmit={handleSubmit} className="auth-form">
            <div className="input-group">
              <label htmlFor="full_name">
                <FaUser /> Full Name
              </label>
              <input
                type="text"
                id="full_name"
                name="full_name"
                value={formData.full_name}
                onChange={handleChange}
                placeholder="John Doe"
                required
              />
            </div>

            <div className="input-group">
              <label htmlFor="email">
                <FaEnvelope /> Email Address
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="your@email.com"
                required
              />
            </div>

            <div className="input-group">
              <label htmlFor="phone">
                <FaPhone /> Phone Number (Optional)
              </label>
              <input
                type="tel"
                id="phone"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                placeholder="+1234567890"
              />
            </div>

            <div className="input-group">
              <label htmlFor="password">
                <FaLock /> Password (min 8 characters)
              </label>
              <input
                type="password"
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="••••••••"
                required
                minLength={8}
              />
            </div>

            <div className="bonus-notice">
              🎉 Get $1,000 bonus on signup!
            </div>

            <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
              {loading ? 'Creating Account...' : 'Create Account'}
            </button>
          </form>

          <div className="auth-footer">
            <p>
              Already have an account?{' '}
              <Link to="/login" className="auth-link">Sign in</Link>
            </p>
            <Link to="/" className="auth-link">← Back to Home</Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Register;
