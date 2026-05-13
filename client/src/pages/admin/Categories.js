import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import api from '../../utils/api';
import { handleApiError } from '../../utils/errorHandler';
import './AdminResource.css';

const initialForm = {
  name: '',
  description: '',
  parent: ''
};

const Categories = () => {
  const [categories, setCategories] = useState([]);
  const [formData, setFormData] = useState(initialForm);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const response = await api.get('/categories');
      setCategories(response.data.data || []);
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

    const payload = {
      ...formData,
      parent: formData.parent || null
    };

    try {
      if (editingId) {
        await api.put(`/categories/${editingId}`, payload);
        toast.success('Category updated');
      } else {
        await api.post('/categories', payload);
        toast.success('Category created');
      }

      resetForm();
      fetchCategories();
    } catch (error) {
      handleApiError(error);
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (category) => {
    setEditingId(category._id);
    setFormData({
      name: category.name,
      description: category.description || '',
      parent: category.parent?._id || ''
    });
  };

  const handleDelete = async (categoryId) => {
    if (!window.confirm('Delete this category?')) {
      return;
    }

    try {
      await api.delete(`/categories/${categoryId}`);
      toast.success('Category deleted');
      fetchCategories();
      if (editingId === categoryId) {
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
          <h2>{editingId ? 'Edit Category' : 'Create Category'}</h2>
          {editingId && <button className="btn btn-outline-secondary" onClick={resetForm}>Cancel</button>}
        </div>
        <form onSubmit={handleSubmit} className="admin-form-grid">
          <div>
            <label className="form-label">Name</label>
            <input className="form-control" value={formData.name} onChange={(event) => setFormData({ ...formData, name: event.target.value })} required maxLength="50" />
          </div>
          <div>
            <label className="form-label">Parent</label>
            <select className="form-select" value={formData.parent} onChange={(event) => setFormData({ ...formData, parent: event.target.value })}>
              <option value="">No parent</option>
              {categories.filter((category) => category._id !== editingId).map((category) => (
                <option key={category._id} value={category._id}>{category.name}</option>
              ))}
            </select>
          </div>
          <div className="admin-span-full">
            <label className="form-label">Description</label>
            <textarea className="form-control" rows="4" value={formData.description} onChange={(event) => setFormData({ ...formData, description: event.target.value })} />
          </div>
          <div className="admin-span-full">
            <button className="btn btn-primary" type="submit" disabled={saving}>{saving ? 'Saving...' : editingId ? 'Update Category' : 'Create Category'}</button>
          </div>
        </form>
      </section>

      <section className="admin-card">
        <h3>All Categories</h3>
        {loading ? <p className="admin-empty">Loading categories...</p> : (
          <div className="admin-table-wrapper">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Slug</th>
                  <th>Parent</th>
                  <th>Posts</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {categories.length === 0 ? (
                  <tr><td colSpan="5"><p className="admin-empty">No categories yet.</p></td></tr>
                ) : categories.map((category) => (
                  <tr key={category._id}>
                    <td>
                      <div className="admin-stack">
                        <strong>{category.name}</strong>
                        {category.description && <span className="admin-muted">{category.description}</span>}
                      </div>
                    </td>
                    <td>{category.slug}</td>
                    <td>{category.parent?.name || '-'}</td>
                    <td>{category.postsCount || 0}</td>
                    <td>
                      <div className="admin-actions">
                        <button className="btn btn-sm btn-outline-primary" onClick={() => handleEdit(category)}>Edit</button>
                        <button className="btn btn-sm btn-outline-danger" onClick={() => handleDelete(category._id)}>Delete</button>
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

export default Categories;


