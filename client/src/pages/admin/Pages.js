import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import api from '../../utils/api';
import { handleApiError } from '../../utils/errorHandler';
import './AdminResource.css';

const initialForm = {
  title: '',
  content: '',
  template: 'default',
  order: 0,
  isPublished: false
};

const Pages = () => {
  const [pages, setPages] = useState([]);
  const [formData, setFormData] = useState(initialForm);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchPages();
  }, []);

  const fetchPages = async () => {
    try {
      const response = await api.get('/pages');
      setPages(response.data.data || []);
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
        await api.put(`/pages/${editingId}`, formData);
        toast.success('Page updated');
      } else {
        await api.post('/pages', formData);
        toast.success('Page created');
      }

      resetForm();
      fetchPages();
    } catch (error) {
      handleApiError(error);
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (pageItem) => {
    setEditingId(pageItem._id);
    setFormData({
      title: pageItem.title,
      content: pageItem.content,
      template: pageItem.template || 'default',
      order: pageItem.order || 0,
      isPublished: Boolean(pageItem.isPublished)
    });
  };

  const handleDelete = async (pageId) => {
    if (!window.confirm('Delete this page?')) {
      return;
    }

    try {
      await api.delete(`/pages/${pageId}`);
      toast.success('Page deleted');
      fetchPages();
      if (editingId === pageId) {
        resetForm();
      }
    } catch (error) {
      handleApiError(error);
    }
  };

  return (
    <div className="admin-resource-page">
      <section className="admin-card">
        <div className="admin-toolbar">
          <h2>{editingId ? 'Edit Page' : 'Create Page'}</h2>
          {editingId && <button className="btn btn-outline-secondary" onClick={resetForm}>Cancel</button>}
        </div>
        <form onSubmit={handleSubmit} className="admin-form-grid">
          <div>
            <label className="form-label">Title</label>
            <input className="form-control" value={formData.title} onChange={(event) => setFormData({ ...formData, title: event.target.value })} required />
          </div>
          <div>
            <label className="form-label">Template</label>
            <input className="form-control" value={formData.template} onChange={(event) => setFormData({ ...formData, template: event.target.value })} />
          </div>
          <div>
            <label className="form-label">Order</label>
            <input className="form-control" type="number" value={formData.order} onChange={(event) => setFormData({ ...formData, order: Number(event.target.value) })} />
          </div>
          <div className="d-flex align-items-end">
            <div className="form-check">
              <input className="form-check-input" id="page-published" type="checkbox" checked={formData.isPublished} onChange={(event) => setFormData({ ...formData, isPublished: event.target.checked })} />
              <label className="form-check-label" htmlFor="page-published">Published</label>
            </div>
          </div>
          <div className="admin-span-full">
            <label className="form-label">Content</label>
            <textarea className="form-control" rows="8" value={formData.content} onChange={(event) => setFormData({ ...formData, content: event.target.value })} required />
          </div>
          <div className="admin-span-full">
            <button className="btn btn-primary" type="submit" disabled={saving}>{saving ? 'Saving...' : editingId ? 'Update Page' : 'Create Page'}</button>
          </div>
        </form>
      </section>

      <section className="admin-card">
        <h3>All Pages</h3>
        {loading ? <p className="admin-empty">Loading pages...</p> : (
          <div className="admin-table-wrapper">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Slug</th>
                  <th>Status</th>
                  <th>Order</th>
                  <th>Author</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {pages.length === 0 ? (
                  <tr><td colSpan="6"><p className="admin-empty">No pages yet.</p></td></tr>
                ) : pages.map((pageItem) => (
                  <tr key={pageItem._id}>
                    <td>{pageItem.title}</td>
                    <td>{pageItem.slug}</td>
                    <td><span className={`admin-pill ${pageItem.isPublished ? 'published' : 'draft'}`}>{pageItem.isPublished ? 'published' : 'draft'}</span></td>
                    <td>{pageItem.order || 0}</td>
                    <td>{pageItem.author?.username || '-'}</td>
                    <td>
                      <div className="admin-actions">
                        <button className="btn btn-sm btn-outline-primary" onClick={() => handleEdit(pageItem)}>Edit</button>
                        <button className="btn btn-sm btn-outline-danger" onClick={() => handleDelete(pageItem._id)}>Delete</button>
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

export default Pages;


