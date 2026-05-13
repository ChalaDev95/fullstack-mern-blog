import React, { useEffect, useState } from 'react';
import api from '../../utils/api';
import { handleApiError } from '../../utils/errorHandler';
import './AdminResource.css';

const Settings = () => {
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHealth();
  }, []);

  const fetchHealth = async () => {
    try {
      const response = await api.get('/health');
      setHealth(response.data);
    } catch (error) {
      handleApiError(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-resource-page">
      <section className="admin-card">
        <div className="admin-toolbar">
          <h2>System Diagnostics</h2>
          <button className="btn btn-outline-primary" onClick={fetchHealth}>Refresh</button>
        </div>
        {loading ? <p className="admin-empty">Loading health status...</p> : (
          <div className="admin-form-grid">
            <div>
              <label className="form-label">API Status</label>
              <div><span className="admin-pill approved">{health?.status || 'unknown'}</span></div>
            </div>
            <div>
              <label className="form-label">Database</label>
              <div><span className={`admin-pill ${health?.database === 'connected' ? 'approved' : 'rejected'}`}>{health?.database || 'unknown'}</span></div>
            </div>
            <div>
              <label className="form-label">API Base URL</label>
              <div className="admin-muted">{api.defaults.baseURL}</div>
            </div>
            <div>
              <label className="form-label">Browser Origin</label>
              <div className="admin-muted">{window.location.origin}</div>
            </div>
            <div className="admin-span-full">
              <label className="form-label">Last Health Timestamp</label>
              <div className="admin-muted">{health?.timestamp ? new Date(health.timestamp).toLocaleString() : 'Unavailable'}</div>
            </div>
          </div>
        )}
      </section>
    </div>
  );
};

export default Settings;


