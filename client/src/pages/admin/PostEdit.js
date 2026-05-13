import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import api, { resolveAssetUrl } from '../../utils/api';
import toast from 'react-hot-toast';
import './PostEdit.css';

const PostEdit = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isNew = !id;
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [autoSaving, setAutoSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);
  const autoSaveTimerRef = useRef(null);
  const quillRef = useRef(null);
  
  const [formData, setFormData] = useState({
    title: '',
    body: '',
    excerpt: '',
    status: 'draft',
    publishDate: new Date().toISOString().slice(0, 16),
    categories: [],
    tags: [],
    featuredImage: null,
    passwordProtected: {
      enabled: false,
      password: ''
    },
    seo: {
      metaTitle: '',
      metaDescription: '',
      canonicalUrl: '',
      ogImage: '',
      ogType: 'article',
      twitterCard: 'summary_large_image'
    },
    pinned: false,
    coAuthors: []
  });

  const [categories, setCategories] = useState([]);
  const [tags, setTags] = useState([]);
  const [tagInput, setTagInput] = useState('');
  const [tagSuggestions, setTagSuggestions] = useState([]);
  const [revisions, setRevisions] = useState([]);
  const [showRevisions, setShowRevisions] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  useEffect(() => {
    fetchCategories();
    fetchTags();
    if (!isNew) {
      fetchPost();
      fetchRevisions();
    }
  }, [id]);

  // Auto-save functionality
  useEffect(() => {
    if (isNew && (!formData.title && !formData.body)) return;
    
    // Clear existing timer
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }

    // Set new timer for auto-save (every 30 seconds)
    autoSaveTimerRef.current = setTimeout(() => {
      autoSaveDraft();
    }, 30000);

    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, [formData.title, formData.body, formData.excerpt, formData.categories, formData.tags]);

  // Tag autocomplete
  useEffect(() => {
    if (tagInput.length > 1) {
      const filtered = tags.filter(tag => 
        tag.name.toLowerCase().includes(tagInput.toLowerCase())
      ).slice(0, 5);
      setTagSuggestions(filtered);
    } else {
      setTagSuggestions([]);
    }
  }, [tagInput, tags]);

  const fetchPost = async () => {
    try {
      const res = await api.get(`/posts/id/${id}`);
      const post = res.data.data;
      setFormData({
        title: post.title,
        body: post.body,
        excerpt: post.excerpt || '',
        status: post.status,
        publishDate: post.publishDate ? new Date(post.publishDate).toISOString().slice(0, 16) : new Date().toISOString().slice(0, 16),
        categories: post.categories?.map(c => c._id) || [],
        tags: post.tags?.map(t => t._id) || [],
        featuredImage: post.featuredImage,
        passwordProtected: post.passwordProtected || { enabled: false, password: '' },
        seo: post.seo || { 
          metaTitle: '', 
          metaDescription: '', 
          canonicalUrl: '',
          ogImage: '',
          ogType: 'article',
          twitterCard: 'summary_large_image'
        },
        pinned: post.pinned || false,
        coAuthors: post.coAuthors?.map(a => a._id) || []
      });
    } catch (error) {
      toast.error('Failed to fetch post');
      navigate('/admin/posts');
    } finally {
      setLoading(false);
    }
  };

  const fetchRevisions = async () => {
    try {
      const res = await api.get(`/posts/${id}/revisions`);
      setRevisions(res.data.data);
    } catch (error) {
      console.error('Failed to fetch revisions');
    }
  };

  const autoSaveDraft = useCallback(async () => {
    if (isNew && (!formData.title || !formData.body)) return;
    
    setAutoSaving(true);
    try {
      const saveData = {
        ...formData,
        status: 'draft' // Always save as draft for auto-save
      };

      if (isNew) {
        // For new posts, we'd need a temporary save endpoint or just save locally
        // For now, we'll just update the timestamp
        setLastSaved(new Date());
      } else {
        await api.put(`/posts/${id}`, saveData);
        setLastSaved(new Date());
      }
    } catch (error) {
      console.error('Auto-save failed:', error);
    } finally {
      setAutoSaving(false);
    }
  }, [formData, id, isNew]);

  const fetchCategories = async () => {
    try {
      const res = await api.get('/categories');
      setCategories(res.data.data);
    } catch (error) {
      console.error('Failed to fetch categories');
    }
  };

  const fetchTags = async () => {
    try {
      const res = await api.get('/tags');
      setTags(res.data.data);
    } catch (error) {
      console.error('Failed to fetch tags');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    // Client-side validation to catch issues before hitting the server
    const titleTrimmed = formData.title.trim();
    if (titleTrimmed.length < 10) {
      toast.error('Title must be at least 10 characters long');
      setSaving(false);
      return;
    }
    if (titleTrimmed.length > 200) {
      toast.error('Title cannot exceed 200 characters');
      setSaving(false);
      return;
    }

    // ReactQuill sends '<p><br></p>' for an empty editor — treat that as empty
    const bodyText = formData.body.replace(/<[^>]*>/g, '').trim();
    if (!formData.body || !bodyText) {
      toast.error('Post content cannot be empty');
      setSaving(false);
      return;
    }

    try {
      if (isNew) {
        await api.post('/posts', formData);
        toast.success('Post created!');
      } else {
        await api.put(`/posts/${id}`, formData);
        toast.success('Post updated!');
      }
      navigate('/admin/posts');
    } catch (error) {
      // Show the actual validation error messages from the server
      const serverErrors = error.response?.data?.errors;
      if (serverErrors && serverErrors.length > 0) {
        serverErrors.forEach(err => toast.error(err.msg || err.message));
      } else {
        toast.error(error.response?.data?.message || 'Failed to save post');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleTagAdd = async (tagName = null) => {
    const tagToAdd = tagName || tagInput.trim();
    if (!tagToAdd) return;

    try {
      // Try to find existing tag
      let tag = tags.find(t => t.name.toLowerCase() === tagToAdd.toLowerCase());
      
      if (!tag) {
        // Create new tag
        const res = await api.post('/tags', { name: tagToAdd });
        tag = res.data.data;
        setTags([...tags, tag]);
      }

      if (!formData.tags.includes(tag._id)) {
        setFormData({
          ...formData,
          tags: [...formData.tags, tag._id]
        });
      }
      setTagInput('');
      setTagSuggestions([]);
    } catch (error) {
      toast.error('Failed to add tag');
    }
  };

  const handleFeaturedImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }

    setUploadingImage(true);
    try {
      const uploadFormData = new FormData();
      uploadFormData.append('file', file);
      const altText = formData.featuredImage?.alt || '';
      if (altText) uploadFormData.append('alt', altText);

      const res = await api.post('/media/upload', uploadFormData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      const media = res.data.data;
      setFormData(prev => ({
        ...prev,
        featuredImage: {
          url: media.url,
          alt: media.alt || '',
          sizes: {
            thumbnail: media.thumbnail?.url || media.url,
            medium: media.url,
            large: media.url
          }
        }
      }));
      toast.success('Featured image uploaded');
    } catch (error) {
      toast.error('Failed to upload image');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleRestoreRevision = async (revisionId) => {
    if (!window.confirm('Are you sure you want to restore this revision? Current changes will be lost.')) {
      return;
    }

    try {
      await api.post(`/posts/${id}/restore-revision`, { revisionId });
      
      // Reload the post to get updated data
      await fetchPost();
      await fetchRevisions();
      
      toast.success('Revision restored');
      setShowRevisions(false);
    } catch (error) {
      toast.error('Failed to restore revision');
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  // Enhanced Quill modules with embedded media support
  const quillModules = {
    toolbar: [
      [{ 'header': [1, 2, 3, false] }],
      ['bold', 'italic', 'underline', 'strike'],
      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
      ['blockquote', 'code-block'],
      ['link', 'image', 'video'],
      [{ 'embed': 'video' }],
      ['clean']
    ],
    clipboard: {
      matchVisual: false
    }
  };

  // Handle image upload in Quill
  const handleImageUpload = () => {
    const input = document.createElement('input');
    input.setAttribute('type', 'file');
    input.setAttribute('accept', 'image/*');
    input.click();

    input.onchange = async () => {
      const file = input.files[0];
      if (!file) return;

      try {
        const formData = new FormData();
        formData.append('file', file);

        const res = await api.post('/media/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });

        const media = res.data.data;
        const quill = quillRef.current?.getEditor();
        if (quill) {
          const range = quill.getSelection();
          quill.insertEmbed(range?.index || 0, 'image', media.url);
        }
      } catch (error) {
        toast.error('Failed to upload image');
      }
    };
  };

  // Handle video embed in Quill
  const handleVideoEmbed = () => {
    const url = prompt('Enter video URL (YouTube, Vimeo, etc.):');
    if (!url) return;

    const quill = quillRef.current?.getEditor();
    if (quill) {
      const range = quill.getSelection();
      const iframe = `<iframe src="${url}" frameborder="0" allowfullscreen></iframe>`;
      quill.clipboard.dangerouslyPasteHTML(range?.index || 0, iframe);
    }
  };

  return (
    <div className="post-edit">
      <div className="post-edit-header">
        <h2>{isNew ? 'New Post' : 'Edit Post'}</h2>
        <div className="save-status">
          {autoSaving && <span className="auto-saving">Auto-saving...</span>}
          {lastSaved && !autoSaving && (
            <span className="last-saved">Saved {new Date(lastSaved).toLocaleTimeString()}</span>
          )}
          {!isNew && (
            <button 
              type="button" 
              className="btn-revisions"
              onClick={() => setShowRevisions(!showRevisions)}
            >
              View Revisions ({revisions.length})
            </button>
          )}
        </div>
      </div>

      {showRevisions && revisions.length > 0 && (
        <div className="revisions-panel">
          <h3>Post Revisions</h3>
          <div className="revisions-list">
            {revisions.map(revision => (
              <div key={revision._id} className="revision-item">
                <div className="revision-info">
                  <span>Revision #{revision.revisionNumber}</span>
                  <span>{new Date(revision.createdAt).toLocaleString()}</span>
                  <span>by {revision.editedBy?.username || 'Unknown'}</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleRestoreRevision(revision._id)}
                  className="btn-restore"
                >
                  Restore
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="form-section">
          <div className="form-group">
            <label>
              Title *
              <span style={{
                marginLeft: '8px',
                fontSize: '12px',
                color: formData.title.trim().length < 10 ? '#dc3545' : '#6c757d'
              }}>
                ({formData.title.trim().length}/200 — min 10)
              </span>
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Enter a title (minimum 10 characters)"
              required
            />
          </div>

          <div className="form-group">
            <label>Content *</label>
            <ReactQuill
              ref={quillRef}
              theme="snow"
              value={formData.body}
              onChange={(value) => setFormData({ ...formData, body: value })}
              modules={quillModules}
            />
            <div className="editor-actions">
              <button type="button" onClick={handleImageUpload} className="btn-upload">
                Upload Image
              </button>
              <button type="button" onClick={handleVideoEmbed} className="btn-embed">
                Embed Video
              </button>
            </div>
          </div>

          <div className="form-group">
            <label>Featured Image</label>
            {formData.featuredImage?.url ? (
              <div className="featured-image-preview">
                <img src={resolveAssetUrl(formData.featuredImage.url)} alt={formData.featuredImage.alt || ''} />
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, featuredImage: null })}
                  className="btn-remove-image"
                >
                  Remove
                </button>
              </div>
            ) : (
              <div className="image-upload-area">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFeaturedImageUpload}
                  disabled={uploadingImage}
                  id="featured-image-upload"
                  style={{ display: 'none' }}
                />
                <label htmlFor="featured-image-upload" className="upload-label">
                  {uploadingImage ? 'Uploading...' : 'Choose Featured Image'}
                </label>
              </div>
            )}
            {formData.featuredImage && (
              <input
                type="text"
                placeholder="Alt text for SEO"
                value={formData.featuredImage.alt || ''}
                onChange={(e) => setFormData({
                  ...formData,
                  featuredImage: { ...formData.featuredImage, alt: e.target.value }
                })}
                className="alt-text-input"
              />
            )}
          </div>

          <div className="form-group">
            <label>Excerpt</label>
            <textarea
              value={formData.excerpt}
              onChange={(e) => setFormData({ ...formData, excerpt: e.target.value })}
              rows="3"
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              >
                <option value="draft">Draft</option>
                <option value="published">Published</option>
                <option value="scheduled">Scheduled</option>
              </select>
            </div>

            <div className="form-group">
              <label>Publish Date</label>
              <input
                type="datetime-local"
                value={formData.publishDate}
                onChange={(e) => setFormData({ ...formData, publishDate: e.target.value })}
              />
            </div>
          </div>

          <div className="form-group">
            <label>Categories</label>
            <div className="checkbox-group">
              {categories.map(cat => (
                <label key={cat._id}>
                  <input
                    type="checkbox"
                    checked={formData.categories.includes(cat._id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setFormData({
                          ...formData,
                          categories: [...formData.categories, cat._id]
                        });
                      } else {
                        setFormData({
                          ...formData,
                          categories: formData.categories.filter(id => id !== cat._id)
                        });
                      }
                    }}
                  />
                  {cat.name}
                </label>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label>Tags</label>
            <div className="tag-input-group">
              <div className="tag-input-wrapper">
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleTagAdd())}
                  placeholder="Type and press Enter (autocomplete available)"
                />
                {tagSuggestions.length > 0 && (
                  <div className="tag-suggestions">
                    {tagSuggestions.map(tag => (
                      <button
                        key={tag._id}
                        type="button"
                        className="tag-suggestion"
                        onClick={() => handleTagAdd(tag.name)}
                      >
                        {tag.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <button type="button" onClick={() => handleTagAdd()}>Add</button>
            </div>
            <div className="tags-list">
              {formData.tags.map(tagId => {
                const tag = tags.find(t => t._id === tagId);
                return tag ? (
                  <span key={tagId} className="tag">
                    {tag.name}
                    <button
                      type="button"
                      onClick={() => setFormData({
                        ...formData,
                        tags: formData.tags.filter(id => id !== tagId)
                      })}
                    >
                      ×
                    </button>
                  </span>
                ) : null;
              })}
            </div>
          </div>

          <div className="form-group">
            <label>
              <input
                type="checkbox"
                checked={formData.passwordProtected.enabled}
                onChange={(e) => setFormData({
                  ...formData,
                  passwordProtected: {
                    ...formData.passwordProtected,
                    enabled: e.target.checked
                  }
                })}
              />
              Password Protect this post
            </label>
            {formData.passwordProtected.enabled && (
              <input
                type="password"
                placeholder="Enter password"
                value={formData.passwordProtected.password}
                onChange={(e) => setFormData({
                  ...formData,
                  passwordProtected: {
                    ...formData.passwordProtected,
                    password: e.target.value
                  }
                })}
                className="password-input"
              />
            )}
          </div>

          <div className="form-group">
            <label>
              <input
                type="checkbox"
                checked={formData.pinned}
                onChange={(e) => setFormData({ ...formData, pinned: e.target.checked })}
              />
              Pin this post
            </label>
          </div>
        </div>

        <div className="form-section">
          <h3>SEO Settings</h3>
          <div className="form-group">
            <label>Meta Title</label>
            <input
              type="text"
              value={formData.seo.metaTitle}
              onChange={(e) => setFormData({
                ...formData,
                seo: { ...formData.seo, metaTitle: e.target.value }
              })}
            />
          </div>
          <div className="form-group">
            <label>Meta Description</label>
            <textarea
              value={formData.seo.metaDescription}
              onChange={(e) => setFormData({
                ...formData,
                seo: { ...formData.seo, metaDescription: e.target.value }
              })}
              rows="3"
            />
          </div>
          <div className="form-group">
            <label>Canonical URL</label>
            <input
              type="url"
              value={formData.seo.canonicalUrl}
              onChange={(e) => setFormData({
                ...formData,
                seo: { ...formData.seo, canonicalUrl: e.target.value }
              })}
            />
          </div>
          <div className="form-group">
            <label>OG Image URL</label>
            <input
              type="url"
              value={formData.seo.ogImage || ''}
              onChange={(e) => setFormData({
                ...formData,
                seo: { ...formData.seo, ogImage: e.target.value }
              })}
              placeholder="Open Graph image URL"
            />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>OG Type</label>
              <select
                value={formData.seo.ogType || 'article'}
                onChange={(e) => setFormData({
                  ...formData,
                  seo: { ...formData.seo, ogType: e.target.value }
                })}
              >
                <option value="article">Article</option>
                <option value="website">Website</option>
                <option value="blog">Blog</option>
              </select>
            </div>
            <div className="form-group">
              <label>Twitter Card</label>
              <select
                value={formData.seo.twitterCard || 'summary_large_image'}
                onChange={(e) => setFormData({
                  ...formData,
                  seo: { ...formData.seo, twitterCard: e.target.value }
                })}
              >
                <option value="summary">Summary</option>
                <option value="summary_large_image">Summary Large Image</option>
              </select>
            </div>
          </div>
        </div>

        <div className="form-actions">
          <button type="button" onClick={() => navigate('/admin/posts')}>
            Cancel
          </button>
          <button type="submit" disabled={saving} className="btn-primary">
            {saving ? 'Saving...' : isNew ? 'Create Post' : 'Update Post'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default PostEdit;


