import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useNotifications } from '../context/NotificationContext';

export default function Navbar() {
  const { totalItems } = useCart();
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { notifications, markAllAsRead } = useNotifications();
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);
  const navigate = useNavigate();

  const profile = JSON.parse(localStorage.getItem('foodhub_profile') || '{}');
  const unreadCount = notifications.filter(n => !n.read).length;

  const handleLogout = () => {
    logout();
  };

  const handleToggleNotifications = () => {
    setShowNotifDropdown(!showNotifDropdown);
    if (!showNotifDropdown && unreadCount > 0) {
      // Mark as read when opening
      markAllAsRead();
    }
  };

  return (
    <nav className="navbar">
      <div className="nav-container">
        <Link to="/" className="logo-link">
          <h2 className="logo">🍔 FoodHub</h2>
        </Link>
        
        <div className="search-bar-container">
          <input
            type="text"
            placeholder="Search restaurants, cuisines..."
            className="search-bar"
            onFocus={() => navigate('/')}
            readOnly
          />
        </div>

        <ul className="nav-links">
          <li><Link to="/">Home</Link></li>
          
          {user?.role === 'admin' && (
            <li>
              <Link to="/admin" className="admin-nav-badge">
                👑 Admin Dashboard
              </Link>
            </li>
          )}

          <li>
            <Link to="/profile" className="nav-profile-link">
              {user 
                ? <span className="nav-avatar" title={user.name}>{user.name[0].toUpperCase()}</span>
                : (profile.firstName ? <span className="nav-avatar" title={profile.firstName}>{profile.firstName[0].toUpperCase()}</span> : '👤 Profile')
              }
            </Link>
          </li>
          
          {/* Notification Icon */}
          <li className="notification-nav-item">
            <button 
              className="nav-icon-btn" 
              onClick={handleToggleNotifications}
              title="Notifications"
            >
              🔔
              {unreadCount > 0 && <span className="notif-badge">{unreadCount}</span>}
            </button>
            
            {showNotifDropdown && (
              <div className="notif-dropdown">
                <div className="notif-header">
                  <h4>Notifications</h4>
                  <button className="notif-clear-btn" onClick={markAllAsRead}>Mark read</button>
                </div>
                <div className="notif-list">
                  {notifications.length > 0 ? (
                    notifications.map(n => (
                      <div key={n.id} className={`notif-item ${!n.read ? 'unread' : ''}`}>
                        <p className="notif-text">{n.message}</p>
                        <span className="notif-time">
                          {new Date(n.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    ))
                  ) : (
                    <p className="notif-empty">No notifications yet</p>
                  )}
                </div>
              </div>
            )}
          </li>

          {/* Theme Toggler */}
          <li>
            <button className="nav-icon-btn theme-toggle-btn" onClick={toggleTheme} title="Toggle Theme">
              {theme === 'dark' ? '☀️' : '🌙'}
            </button>
          </li>

          {!user && (
            <li><Link to="/login" style={{ color: 'var(--text-muted)' }}>Login</Link></li>
          )}
          
          {user && (
            <li>
              <button 
                onClick={handleLogout} 
                style={{ 
                  background: 'none', 
                  border: 'none', 
                  color: 'var(--text-muted)', 
                  cursor: 'pointer', 
                  fontSize: '1rem', 
                  fontFamily: 'inherit' 
                }}
              >
                Logout
              </button>
            </li>
          )}
          
          <li>
            <Link to="/checkout" className="cart-icon">
              🛒
              {totalItems > 0 && <span className="cart-badge">{totalItems}</span>}
            </Link>
          </li>
        </ul>
      </div>
    </nav>
  );
}
