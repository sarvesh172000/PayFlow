import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { FaWallet, FaHome, FaExchangeAlt, FaHistory, FaUser, FaSignOutAlt } from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';
import './Layout.css';

const Layout = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const navItems = [
    { path: '/dashboard', icon: <FaHome />, label: 'Dashboard' },
    { path: '/transfer', icon: <FaExchangeAlt />, label: 'Transfer' },
    { path: '/transactions', icon: <FaHistory />, label: 'History' },
    { path: '/profile', icon: <FaUser />, label: 'Profile' },
  ];

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="sidebar-header">
          <FaWallet className="sidebar-logo" />
          <h2>PayFlow</h2>
        </div>

        <nav className="sidebar-nav">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`nav-item ${location.pathname === item.path ? 'active' : ''}`}
            >
              {item.icon}
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="user-info">
            <div className="user-avatar">
              {user?.full_name?.charAt(0).toUpperCase() || 'U'}
            </div>
            <div className="user-details">
              <p className="user-name">{user?.full_name}</p>
              <p className="user-email">{user?.email}</p>
            </div>
          </div>
          <button onClick={handleLogout} className="btn-logout">
            <FaSignOutAlt /> Logout
          </button>
        </div>
      </aside>

      <main className="main-content">
        <div className="content-wrapper">
          {children}
        </div>
      </main>
    </div>
  );
};

export default Layout;
