import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FaWallet, FaExchangeAlt, FaShieldAlt, FaBolt, FaChartLine, FaLock } from 'react-icons/fa';
import './Landing.css';

const Landing = () => {
  const features = [
    {
      icon: <FaWallet />,
      title: 'Digital Wallet',
      description: 'Store and manage your money securely in your personal digital wallet'
    },
    {
      icon: <FaExchangeAlt />,
      title: 'Instant Transfers',
      description: 'Send money to anyone instantly with just their email address'
    },
    {
      icon: <FaShieldAlt />,
      title: 'Bank-Level Security',
      description: 'Your money and data are protected with enterprise-grade encryption'
    },
    {
      icon: <FaBolt />,
      title: 'Lightning Fast',
      description: 'Experience sub-second transaction processing with our optimized system'
    },
    {
      icon: <FaChartLine />,
      title: 'Transaction History',
      description: 'Track all your transactions with detailed history and analytics'
    },
    {
      icon: <FaLock />,
      title: 'ACID Compliant',
      description: 'Money correctness guaranteed with atomic database transactions'
    }
  ];

  return (
    <div className="landing">
      <nav className="landing-nav">
        <div className="container nav-content">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="logo"
          >
            <FaWallet className="logo-icon" />
            <span>PayFlow</span>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="nav-links"
          >
            <Link to="/login" className="btn btn-outline">Login</Link>
            <Link to="/register" className="btn btn-primary">Get Started</Link>
          </motion.div>
        </div>
      </nav>

      <section className="hero">
        <div className="container">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="hero-content"
          >
            <h1 className="hero-title">
              The Future of
              <span className="gradient-text"> Digital Payments</span>
            </h1>
            <p className="hero-subtitle">
              Send, receive, and manage money instantly with PayFlow's modern digital wallet platform
            </p>
            <div className="hero-buttons">
              <Link to="/register" className="btn btn-primary btn-large">
                Create Free Account
              </Link>
              <Link to="/login" className="btn btn-outline btn-large">
                Sign In
              </Link>
            </div>
            <div className="hero-stats">
              <div className="stat">
                <div className="stat-value">10k+</div>
                <div className="stat-label">Transactions</div>
              </div>
              <div className="stat">
                <div className="stat-value">99.9%</div>
                <div className="stat-label">Uptime</div>
              </div>
              <div className="stat">
                <div className="stat-value">&lt;100ms</div>
                <div className="stat-label">Latency</div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      <section className="features">
        <div className="container">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="section-header"
          >
            <h2>Why Choose PayFlow?</h2>
            <p>Built with modern technology for a seamless payment experience</p>
          </motion.div>
          <div className="features-grid">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="feature-card"
              >
                <div className="feature-icon">{feature.icon}</div>
                <h3>{feature.title}</h3>
                <p>{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="tech-stack">
        <div className="container">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="section-header"
          >
            <h2>Built with Modern Technology</h2>
            <p>Powered by industry-leading tools and frameworks</p>
          </motion.div>
          <div className="tech-badges">
            <span className="tech-badge">React</span>
            <span className="tech-badge">Node.js</span>
            <span className="tech-badge">Go</span>
            <span className="tech-badge">PostgreSQL</span>
            <span className="tech-badge">Redis</span>
            <span className="tech-badge">JWT</span>
            <span className="tech-badge">Docker</span>
          </div>
        </div>
      </section>

      <section className="cta">
        <div className="container">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="cta-content"
          >
            <h2>Ready to Get Started?</h2>
            <p>Join thousands of users who trust PayFlow for their digital payments</p>
            <Link to="/register" className="btn btn-primary btn-large">
              Create Your Account
            </Link>
          </motion.div>
        </div>
      </section>

      <footer className="landing-footer">
        <div className="container">
          <p>&copy; 2026 PayFlow. Built for demonstrating modern payment systems.</p>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
