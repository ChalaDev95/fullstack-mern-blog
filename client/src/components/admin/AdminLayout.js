import React, { useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import './AdminLayout.css';

const AdminLayout = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const menuItems = [
    { path: '/admin/dashboard', label: 'Dashboard', icon: '📊' },
    { path: '/admin/posts', label: 'Posts', icon: '📝' },
    { path: '/admin/pages', label: 'Pages', icon: '📄' },
    { path: '/admin/comments', label: 'Comments', icon: '💬' },
    { path: '/admin/media', label: 'Media', icon: '🖼️' },
    { path: '/admin/categories', label: 'Categories', icon: '📁' },
    { path: '/admin/tags', label: 'Tags', icon: '🏷️' },
    { path: '/admin/users', label: 'Users', icon: '👥' },
    { path: '/admin/settings', label: 'Settings', icon: '⚙️' }
  ];

  return (
    <div className="admin-layout">
      <aside className={`admin-sidebar ${sidebarOpen ? 'open' : 'closed'}`}>
        <div className="sidebar-header">
          <h2>CMS Admin</h2>
          <button onClick={() => setSidebarOpen(!sidebarOpen)}>☰</button>
        </div>
        <nav className="sidebar-nav">
          {menuItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`nav-item ${location.pathname === item.path ? 'active' : ''}`}
            >
              <span className="nav-icon">{item.icon}</span>
              {sidebarOpen && <span className="nav-label">{item.label}</span>}
            </Link>
          ))}
        </nav>
        <div className="sidebar-footer">
          <Link to="/" className="nav-item">
            <span className="nav-icon">🏠</span>
            {sidebarOpen && <span className="nav-label">View Site</span>}
          </Link>
          <button onClick={logout} className="nav-item logout-btn">
            <span className="nav-icon">🚪</span>
            {sidebarOpen && <span className="nav-label">Logout</span>}
          </button>
        </div>
      </aside>
      <main className="admin-main">
        <header className="admin-header">
          <h1>{menuItems.find(item => item.path === location.pathname)?.label || 'Admin'}</h1>
          <div className="user-info">
            <span>{user?.username}</span>
            <span className="role-badge">{user?.role}</span>
          </div>
        </header>
        <div className="admin-content">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default AdminLayout;


