import React, { useEffect, useState } from 'react';
import api from '../../utils/api';
import './Dashboard.css';

const Dashboard = () => {
  const [stats, setStats] = useState({
    posts: { total: 0, published: 0, drafts: 0 },
    comments: { total: 0, pending: 0 },
    users: 0,
    media: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      // Fetch posts
      const postsRes = await api.get('/posts?limit=1');
      const postsTotal = postsRes.data.total;
      
      // Fetch published posts
      const publishedRes = await api.get('/posts?status=published&limit=1');
      const publishedTotal = publishedRes.data.total;
      
      // Fetch drafts
      const draftsRes = await api.get('/posts?status=draft&limit=1');
      const draftsTotal = draftsRes.data.total;

      // Fetch comments
      // Note: You'd need to add a stats endpoint or count manually
      
      // Fetch users
      const usersRes = await api.get('/users');
      const usersTotal = usersRes.data.count;

      // Fetch media
      const mediaRes = await api.get('/media?limit=1');
      const mediaTotal = mediaRes.data.total;

      setStats({
        posts: {
          total: postsTotal,
          published: publishedTotal,
          drafts: draftsTotal
        },
        comments: { total: 0, pending: 0 },
        users: usersTotal,
        media: mediaTotal
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div>Loading dashboard...</div>;
  }

  if (loading) {
    return (
      <div className="text-center py-5">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading dashboard...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <h2 className="mb-4">Dashboard Overview</h2>
      <div className="row g-4">
        <div className="col-md-6 col-lg-3">
          <div className="stat-card card h-100">
            <div className="card-body">
              <h5 className="card-title text-muted mb-3">Total Posts</h5>
              <p className="stat-number">{stats.posts.total}</p>
              <div className="stat-details mt-3">
                <small className="text-muted d-block">Published: {stats.posts.published}</small>
                <small className="text-muted d-block">Drafts: {stats.posts.drafts}</small>
              </div>
            </div>
          </div>
        </div>
        <div className="col-md-6 col-lg-3">
          <div className="stat-card card h-100">
            <div className="card-body">
              <h5 className="card-title text-muted mb-3">Comments</h5>
              <p className="stat-number">{stats.comments.total}</p>
              <div className="stat-details mt-3">
                <small className="text-muted d-block">Pending: {stats.comments.pending}</small>
              </div>
            </div>
          </div>
        </div>
        <div className="col-md-6 col-lg-3">
          <div className="stat-card card h-100">
            <div className="card-body">
              <h5 className="card-title text-muted mb-3">Users</h5>
              <p className="stat-number">{stats.users}</p>
            </div>
          </div>
        </div>
        <div className="col-md-6 col-lg-3">
          <div className="stat-card card h-100">
            <div className="card-body">
              <h5 className="card-title text-muted mb-3">Media Files</h5>
              <p className="stat-number">{stats.media}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;


