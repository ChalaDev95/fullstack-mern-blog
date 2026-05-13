import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import api from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import { handleApiError } from '../../utils/errorHandler';
import './AdminResource.css';

const emptyForm = {
  username: '',
  email: '',
  firstName: '',
  lastName: '',
  role: 'subscriber',
  isActive: true,
  bio: ''
};

const Users = () => {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [formData, setFormData] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await api.get('/users');
      setUsers(response.data.data || []);
    } catch (error) {
      handleApiError(error);
    } finally {
      setLoading(false);
    }
  };

  const selectUser = (userItem) => {
    setSelectedUserId(userItem._id);
    setFormData({
      username: userItem.username || '',
      email: userItem.email || '',
      firstName: userItem.firstName || '',
      lastName: userItem.lastName || '',
      role: userItem.role || 'subscriber',
      isActive: Boolean(userItem.isActive),
      bio: userItem.bio || ''
    });
  };

  const resetSelection = () => {
    setSelectedUserId(null);
    setFormData(emptyForm);
  };

  const canEditSelectedUser = user?.role === 'admin' || selectedUserId === user?._id;
  const selectedUser = users.find((userItem) => userItem._id === selectedUserId);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!selectedUserId) {
      return;
    }

    setSaving(true);
    try {
      await api.put(`/users/${selectedUserId}`, formData);
      toast.success('User updated');
      resetSelection();
      fetchUsers();
    } catch (error) {
      handleApiError(error);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (userId) => {
    if (!window.confirm('Delete this user?')) {
      return;
    }

    try {
      await api.delete(`/users/${userId}`);
      toast.success('User deleted');
      if (selectedUserId === userId) {
        resetSelection();
      }
      fetchUsers();
    } catch (error) {
      handleApiError(error);
    }
  };

  return (
    <div className="admin-resource-page">
      <section className="admin-card">
        <div className="admin-toolbar">
          <h2>User Directory</h2>
          {selectedUserId && <button className="btn btn-outline-secondary" onClick={resetSelection}>Cancel Edit</button>}
        </div>
        {selectedUserId ? (
          <form onSubmit={handleSubmit} className="admin-form-grid">
            <div>
              <label className="form-label">Username</label>
              <input className="form-control" value={formData.username} onChange={(event) => setFormData({ ...formData, username: event.target.value })} disabled={!canEditSelectedUser} />
            </div>
            <div>
              <label className="form-label">Email</label>
              <input className="form-control" type="email" value={formData.email} onChange={(event) => setFormData({ ...formData, email: event.target.value })} disabled={!canEditSelectedUser} />
            </div>
            <div>
              <label className="form-label">First Name</label>
              <input className="form-control" value={formData.firstName} onChange={(event) => setFormData({ ...formData, firstName: event.target.value })} disabled={!canEditSelectedUser} />
            </div>
            <div>
              <label className="form-label">Last Name</label>
              <input className="form-control" value={formData.lastName} onChange={(event) => setFormData({ ...formData, lastName: event.target.value })} disabled={!canEditSelectedUser} />
            </div>
            <div>
              <label className="form-label">Role</label>
              <select className="form-select" value={formData.role} onChange={(event) => setFormData({ ...formData, role: event.target.value })} disabled={user?.role !== 'admin'}>
                <option value="admin">Admin</option>
                <option value="editor">Editor</option>
                <option value="author">Author</option>
                <option value="contributor">Contributor</option>
                <option value="subscriber">Subscriber</option>
              </select>
            </div>
            <div className="d-flex align-items-end">
              <div className="form-check">
                <input className="form-check-input" id="user-active" type="checkbox" checked={formData.isActive} onChange={(event) => setFormData({ ...formData, isActive: event.target.checked })} disabled={user?.role !== 'admin'} />
                <label className="form-check-label" htmlFor="user-active">Active account</label>
              </div>
            </div>
            <div className="admin-span-full">
              <label className="form-label">Bio</label>
              <textarea className="form-control" rows="4" value={formData.bio} onChange={(event) => setFormData({ ...formData, bio: event.target.value })} disabled={!canEditSelectedUser} />
            </div>
            <div className="admin-span-full">
              <button className="btn btn-primary" type="submit" disabled={saving || !canEditSelectedUser}>{saving ? 'Saving...' : 'Save Changes'}</button>
            </div>
          </form>
        ) : (
          <p className="admin-empty">Select a user below to inspect or edit details.</p>
        )}
      </section>

      <section className="admin-card">
        <h3>All Users</h3>
        {loading ? <p className="admin-empty">Loading users...</p> : (
          <div className="admin-table-wrapper">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Joined</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.length === 0 ? (
                  <tr><td colSpan="5"><p className="admin-empty">No users found.</p></td></tr>
                ) : users.map((userItem) => (
                  <tr key={userItem._id}>
                    <td>
                      <div className="admin-stack">
                        <strong>{userItem.username}</strong>
                        <span className="admin-muted">{userItem.email}</span>
                      </div>
                    </td>
                    <td>{userItem.role}</td>
                    <td><span className={`admin-pill ${userItem.isActive ? 'active' : 'inactive'}`}>{userItem.isActive ? 'active' : 'inactive'}</span></td>
                    <td>{new Date(userItem.createdAt).toLocaleDateString()}</td>
                    <td>
                      <div className="admin-actions">
                        {(user?.role === 'admin' || userItem._id === user?._id) && <button className="btn btn-sm btn-outline-primary" onClick={() => selectUser(userItem)}>Edit</button>}
                        {user?.role === 'admin' && userItem._id !== user?._id && <button className="btn btn-sm btn-outline-danger" onClick={() => handleDelete(userItem._id)}>Delete</button>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {selectedUser && !canEditSelectedUser && <p className="admin-muted mt-3">You can view this user in the list, but your role cannot edit it.</p>}
      </section>
    </div>
  );
};

export default Users;


