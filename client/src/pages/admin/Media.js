import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import api, { resolveAssetUrl } from '../../utils/api';
import { handleApiError } from '../../utils/errorHandler';
import './AdminResource.css';

const formatBytes = (size) => {
  if (!size) {
    return '0 B';
  }

  const units = ['B', 'KB', 'MB', 'GB'];
  const unitIndex = Math.min(Math.floor(Math.log(size) / Math.log(1024)), units.length - 1);
  const value = size / (1024 ** unitIndex);
  return `${value.toFixed(value >= 10 || unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
};

const Media = () => {
  const [mediaItems, setMediaItems] = useState([]);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [file, setFile] = useState(null);
  const [title, setTitle] = useState('');
  const [alt, setAlt] = useState('');

  useEffect(() => {
    fetchMedia();
  }, [typeFilter]);

  const fetchMedia = async (searchTerm = search) => {
    try {
      const response = await api.get('/media', {
        params: {
          limit: 100,
          ...(typeFilter ? { type: typeFilter } : {}),
          ...(searchTerm ? { search: searchTerm } : {})
        }
      });
      setMediaItems(response.data.data || []);
    } catch (error) {
      handleApiError(error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (event) => {
    event.preventDefault();
    if (!file) {
      toast.error('Choose a file first');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);
    if (title) {
      formData.append('title', title);
    }
    if (alt) {
      formData.append('alt', alt);
    }

    setUploading(true);
    try {
      await api.post('/media/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      toast.success('Media uploaded');
      setFile(null);
      setTitle('');
      setAlt('');
      fetchMedia();
    } catch (error) {
      handleApiError(error);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (mediaId) => {
    if (!window.confirm('Delete this media item?')) {
      return;
    }

    try {
      await api.delete(`/media/${mediaId}`);
      toast.success('Media deleted');
      fetchMedia();
    } catch (error) {
      handleApiError(error);
    }
  };

  const handleSearchSubmit = (event) => {
    event.preventDefault();
    setLoading(true);
    fetchMedia(search);
  };

  return (
    <div className="admin-resource-page">
      <section className="admin-card">
        <h2>Upload Media</h2>
        <form onSubmit={handleUpload} className="admin-form-grid">
          <div>
            <label className="form-label">File</label>
            <input className="form-control" type="file" accept="image/*,.pdf,video/*,audio/*" onChange={(event) => setFile(event.target.files?.[0] || null)} required />
          </div>
          <div>
            <label className="form-label">Title</label>
            <input className="form-control" value={title} onChange={(event) => setTitle(event.target.value)} />
          </div>
          <div>
            <label className="form-label">Alt Text</label>
            <input className="form-control" value={alt} onChange={(event) => setAlt(event.target.value)} />
          </div>
          <div className="d-flex align-items-end">
            <button className="btn btn-primary" type="submit" disabled={uploading}>{uploading ? 'Uploading...' : 'Upload'}</button>
          </div>
        </form>
      </section>

      <section className="admin-card">
        <div className="admin-toolbar">
          <h3>Library</h3>
          <div className="admin-toolbar-group">
            <select className="form-select" value={typeFilter} onChange={(event) => { setLoading(true); setTypeFilter(event.target.value); }}>
              <option value="">All types</option>
              <option value="image">Images</option>
              <option value="pdf">PDFs</option>
              <option value="video">Videos</option>
              <option value="audio">Audio</option>
            </select>
            <form className="admin-toolbar-group" onSubmit={handleSearchSubmit}>
              <input className="form-control" placeholder="Search media" value={search} onChange={(event) => setSearch(event.target.value)} />
              <button className="btn btn-outline-primary" type="submit">Search</button>
            </form>
          </div>
        </div>

        {loading ? <p className="admin-empty">Loading media...</p> : mediaItems.length === 0 ? <p className="admin-empty">No media files found.</p> : (
          <div className="admin-media-grid">
            {mediaItems.map((mediaItem) => {
              const previewUrl = resolveAssetUrl(mediaItem.thumbnail?.url || mediaItem.url);
              const fileUrl = resolveAssetUrl(mediaItem.url);
              const isImage = mediaItem.mimeType?.startsWith('image/');
              const isPdf = mediaItem.mimeType === 'application/pdf';
              const isVideo = mediaItem.mimeType?.startsWith('video/');
              const isAudio = mediaItem.mimeType?.startsWith('audio/');

              const getFileIcon = () => {
                if (isPdf) return '📄 PDF';
                if (isVideo) return '🎬 Video';
                if (isAudio) return '🎵 Audio';
                return mediaItem.mimeType;
              };

              return (
                <article key={mediaItem._id} className="admin-media-card">
                  {isImage ? (
                    <img className="admin-media-preview" src={previewUrl} alt={mediaItem.alt || mediaItem.title || mediaItem.originalName} />
                  ) : (
                    <div className="admin-media-preview d-flex align-items-center justify-content-center">{getFileIcon()}</div>
                  )}
                  <div className="admin-media-meta">
                    <strong>{mediaItem.title || mediaItem.originalName}</strong>
                    <span className="admin-muted">{mediaItem.originalName}</span>
                    <span className="admin-muted">{formatBytes(mediaItem.size)}</span>
                    <span className="admin-muted">Uploaded by {mediaItem.uploadedBy?.username || 'Unknown'}</span>
                    <div className="admin-actions">
                      <a className="btn btn-sm btn-outline-primary" href={fileUrl} target="_blank" rel="noreferrer">Open</a>
                      {isPdf && (
                        <a className="btn btn-sm btn-outline-secondary" href={fileUrl} download={mediaItem.originalName}>Download</a>
                      )}
                      <button className="btn btn-sm btn-outline-danger" onClick={() => handleDelete(mediaItem._id)}>Delete</button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
};

export default Media;


