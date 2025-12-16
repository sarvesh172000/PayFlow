import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FaEnvelope, FaLock, FaWallet } from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';
import './Auth.css';

const Login = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [formData, setFormData] = useState({
    email: '',
    password: ''
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

    const result = await login(formData.email, formData.password);

    if (result.success) {
      navigate('/dashboard');
    }

    setLoading(false);
  };

  const demoLogin = async (email) => {
    setFormData({ email, password: 'demo1234' });
    setLoading(true);
    const result = await login(email, 'demo1234');
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
            <h1>Welcome Back</h1>
            <p>Sign in to continue to PayFlow</p>
          </div>

          <form onSubmit={handleSubmit} className="auth-form">
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
              <label htmlFor="password">
                <FaLock /> Password
              </label>
              <input
                type="password"
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="••••••••"
                required
              />
            </div>

            <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
              {loading ? 'Signing In...' : 'Sign In'}
            </button>
          </form>

          <div className="demo-accounts">
            <p className="demo-title">Quick Demo Login:</p>
            <div className="demo-buttons">
              <button
                onClick={() => demoLogin('alice@payflow.com')}
                className="btn-demo"
                disabled={loading}
              >
                Alice
              </button>
              <button
                onClick={() => demoLogin('bob@payflow.com')}
                className="btn-demo"
                disabled={loading}
              >
                Bob
              </button>
              <button
                onClick={() => demoLogin('charlie@payflow.com')}
                className="btn-demo"
                disabled={loading}
              >
                Charlie
              </button>
            </div>
            <p className="demo-note">Password: demo1234</p>
          </div>

          <div className="auth-footer">
            <p>
              Don't have an account?{' '}
              <Link to="/register" className="auth-link">Sign up</Link>
            </p>
            <Link to="/" className="auth-link">← Back to Home</Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Login;
