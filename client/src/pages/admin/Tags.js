import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import api from '../../utils/api';
import { handleApiError } from '../../utils/errorHandler';
import './AdminResource.css';

const initialForm = {
  name: '',
  description: ''
};

const Tags = () => {
  const [tags, setTags] = useState([]);
  const [formData, setFormData] = useState(initialForm);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchTags();
  }, []);

  const fetchTags = async () => {
    try {
      const response = await api.get('/tags?limit=200');
      setTags(response.data.data || []);
    } catch (error) {
      handleApiError(error);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData(initialForm);
    setEditingId(null);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);

    try {
      if (editingId) {
        await api.put(`/tags/${editingId}`, formData);
        toast.success('Tag updated');
      } else {
        await api.post('/tags', formData);
        toast.success('Tag created');
      }

      resetForm();
      fetchTags();
    } catch (error) {
      handleApiError(error);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (tagId) => {
    if (!window.confirm('Delete this tag?')) {
      return;
    }

    try {
      await api.delete(`/tags/${tagId}`);
      toast.success('Tag deleted');
      fetchTags();
      if (editingId === tagId) {
        resetForm();
      }
    } catch (error) {
      handleApiError(error);
    }
  };

  const handleEdit = (tag) => {
    setEditingId(tag._id);
    setFormData({
      name: tag.name,
      description: tag.description || ''
    });
  };

  return (
    <div className="admin-resource-page">
      <section className="admin-card">
        <div className="admin-toolbar">
          <h2>{editingId ? 'Edit Tag' : 'Create Tag'}</h2>
          {editingId && <button className="btn btn-outline-secondary" onClick={resetForm}>Cancel</button>}
        </div>
        <form onSubmit={handleSubmit} className="admin-form-grid">
          <div>
            <label className="form-label">Name</label>
            <input className="form-control" value={formData.name} onChange={(event) => setFormData({ ...formData, name: event.target.value })} required maxLength="30" />
          </div>
          <div className="admin-span-full">
            <label className="form-label">Description</label>
            <textarea className="form-control" rows="4" value={formData.description} onChange={(event) => setFormData({ ...formData, description: event.target.value })} maxLength="300" />
          </div>
          <div className="admin-span-full">
            <button className="btn btn-primary" type="submit" disabled={saving}>{saving ? 'Saving...' : editingId ? 'Update Tag' : 'Create Tag'}</button>
          </div>
        </form>
      </section>

      <section className="admin-card">
        <h3>All Tags</h3>
        {loading ? <p className="admin-empty">Loading tags...</p> : (
          <div className="admin-table-wrapper">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Slug</th>
                  <th>Posts</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {tags.length === 0 ? (
                  <tr><td colSpan="4"><p className="admin-empty">No tags yet.</p></td></tr>
                ) : tags.map((tag) => (
                  <tr key={tag._id}>
                    <td>
                      <div className="admin-stack">
                        <strong>{tag.name}</strong>
                        {tag.description && <span className="admin-muted">{tag.description}</span>}
                      </div>
                    </td>
                    <td>{tag.slug}</td>
                    <td>{tag.postsCount || 0}</td>
                    <td>
                      <div className="admin-actions">
                        <button className="btn btn-sm btn-outline-primary" onClick={() => handleEdit(tag)}>Edit</button>
                        <button className="btn btn-sm btn-outline-danger" onClick={() => handleDelete(tag._id)}>Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
};

export default Tags;


