import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../utils/api';
import './Dashboard.css';

const SkeletonCard = () => (
  <div className="skeleton-card">
    <div className="skeleton-line short" />
    <div className="skeleton-line tall" />
    <div className="skeleton-line thin" />
    <div className="skeleton-line thin" style={{ width: '50%' }} />
  </div>
);

const StatCard = ({ label, value, icon, details }) => (
  <div className="stat-card">
    <div className="stat-card-header">
      <span className="stat-card-label">{label}</span>
      <div className="stat-card-icon">{icon}</div>
    </div>
    <div className="stat-number">{value}</div>
    {details && (
      <div className="stat-details">
        {details.map((d, i) => (
          <span key={i} className="stat-detail-item">
            <span className={`stat-detail-dot ${d.color}`} />
            {d.label}: <strong>{d.value}</strong>
          </span>
        ))}
      </div>
    )}
  </div>
);

const Dashboard = () => {
  const [stats, setStats] = useState({
    posts: { total: 0, published: 0, drafts: 0 },
    comments: { total: 0, pending: 0 },
    users: 0,
    media: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const [postsRes, publishedRes, draftsRes, commentsRes, pendingRes, usersRes, mediaRes] =
        await Promise.all([
          api.get('/posts?limit=1'),
          api.get('/posts?status=published&limit=1'),
          api.get('/posts?status=draft&limit=1'),
          api.get('/comments?limit=1'),
          api.get('/comments?status=pending&limit=1'),
          api.get('/users'),
          api.get('/media?limit=1'),
        ]);

      setStats({
        posts: {
          total:     postsRes.data.total     || 0,
          published: publishedRes.data.total || 0,
          drafts:    draftsRes.data.total    || 0,
        },
        comments: {
          total:   commentsRes.data.total || 0,
          pending: pendingRes.data.total  || 0,
        },
        users: usersRes.data.count || 0,
        media: mediaRes.data.total || 0,
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="dashboard-loading">
        <div className="skeleton-grid">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <h2 className="dashboard-title">Overview</h2>

      <div className="stats-grid">
        <StatCard
          label="Total Posts"
          value={stats.posts.total}
          icon="📝"
          details={[
            { label: 'Published', value: stats.posts.published, color: 'green'  },
            { label: 'Drafts',    value: stats.posts.drafts,    color: 'yellow' },
          ]}
        />
        <StatCard
          label="Comments"
          value={stats.comments.total}
          icon="💬"
          details={[
            { label: 'Pending', value: stats.comments.pending, color: 'red' },
          ]}
        />
        <StatCard
          label="Users"
          value={stats.users}
          icon="👥"
        />
        <StatCard
          label="Media Files"
          value={stats.media}
          icon="🖼️"
        />
      </div>

      <div className="dashboard-actions">
        <h3>Quick Actions</h3>
        <div className="quick-actions-grid">
          <Link to="/admin/posts/new"  className="quick-action-btn">✏️ New Post</Link>
          <Link to="/admin/media"      className="quick-action-btn">📤 Upload Media</Link>
          <Link to="/admin/comments"   className="quick-action-btn">💬 Moderate Comments</Link>
          <Link to="/admin/categories" className="quick-action-btn">📁 Manage Categories</Link>
          <Link to="/admin/users"      className="quick-action-btn">👥 Manage Users</Link>
          <Link to="/admin/settings"   className="quick-action-btn">⚙️ Settings</Link>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
