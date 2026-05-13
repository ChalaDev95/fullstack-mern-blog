import React, { useState, useEffect } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import './AdminLayout.css';

const menuItems = [
  { path: '/admin/dashboard', label: 'Dashboard', icon: '📊' },
  { path: '/admin/posts',     label: 'Posts',     icon: '📝' },
  { path: '/admin/pages',     label: 'Pages',     icon: '📄' },
  { path: '/admin/comments',  label: 'Comments',  icon: '💬' },
  { path: '/admin/media',     label: 'Media',     icon: '🖼️' },
  { path: '/admin/categories',label: 'Categories',icon: '📁' },
  { path: '/admin/tags',      label: 'Tags',      icon: '🏷️' },
  { path: '/admin/users',     label: 'Users',     icon: '👥' },
  { path: '/admin/settings',  label: 'Settings',  icon: '⚙️' },
];

const HamburgerIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <line x1="3" y1="6"  x2="21" y2="6"  />
    <line x1="3" y1="12" x2="21" y2="12" />
    <line x1="3" y1="18" x2="21" y2="18" />
  </svg>
);

const CollapseIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <polyline points="15 18 9 12 15 6" />
  </svg>
);

const ExpandIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <polyline points="9 18 15 12 9 6" />
  </svg>
);

const AdminLayout = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const isMobile = () => window.innerWidth <= 768;

  // Close mobile sidebar on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  // Close mobile sidebar on resize to desktop
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 768) setMobileOpen(false);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const currentPage = menuItems.find(item => item.path === location.pathname)?.label || 'Admin';
  const userInitials = user?.username?.slice(0, 2).toUpperCase() || 'AD';

  const sidebarClasses = [
    'admin-sidebar',
    !sidebarOpen ? 'closed' : 'open',
    mobileOpen ? 'mobile-open' : '',
  ].filter(Boolean).join(' ');

  return (
    <div className="admin-layout">
      {/* Mobile overlay */}
      <div
        className={`sidebar-overlay ${mobileOpen ? 'visible' : ''}`}
        onClick={() => setMobileOpen(false)}
        aria-hidden="true"
      />

      {/* Sidebar */}
      <aside className={sidebarClasses} aria-label="Sidebar navigation">
        <div className="sidebar-header">
          <div className="sidebar-brand">
            <div className="sidebar-brand-icon">✦</div>
            {sidebarOpen && <h2>CMS Admin</h2>}
          </div>
          <button
            className="sidebar-toggle"
            onClick={() => setSidebarOpen(prev => !prev)}
            aria-label={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
          >
            {sidebarOpen ? <CollapseIcon /> : <ExpandIcon />}
          </button>
        </div>

        <nav className="sidebar-nav" role="navigation">
          {sidebarOpen && <span className="nav-section-label">Menu</span>}
          {menuItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`nav-item ${location.pathname === item.path ? 'active' : ''}`}
              title={!sidebarOpen ? item.label : undefined}
            >
              <span className="nav-icon" aria-hidden="true">{item.icon}</span>
              <span className="nav-label">{item.label}</span>
            </Link>
          ))}
        </nav>

        <div className="sidebar-footer">
          {sidebarOpen && <span className="nav-section-label">Account</span>}
          <Link
            to="/"
            className="nav-item"
            title={!sidebarOpen ? 'View Site' : undefined}
          >
            <span className="nav-icon" aria-hidden="true">🏠</span>
            <span className="nav-label">View Site</span>
          </Link>
          <button
            onClick={logout}
            className="nav-item logout-btn"
            title={!sidebarOpen ? 'Logout' : undefined}
          >
            <span className="nav-icon" aria-hidden="true">🚪</span>
            <span className="nav-label">Logout</span>
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="admin-main">
        <header className="admin-header">
          <div className="admin-header-left">
            <button
              className="mobile-menu-btn"
              onClick={() => setMobileOpen(prev => !prev)}
              aria-label="Open menu"
            >
              <HamburgerIcon />
            </button>
            <h1>{currentPage}</h1>
          </div>
          <div className="user-info">
            <div className="user-avatar" aria-hidden="true">{userInitials}</div>
            <span className="user-name">{user?.username}</span>
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
