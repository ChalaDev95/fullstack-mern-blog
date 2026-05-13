import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import api from '../../utils/api';
import { handleApiError } from '../../utils/errorHandler';
import './AdminResource.css';

const Comments = () => {
  const [comments, setComments] = useState([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchComments();
  }, [statusFilter]);

  const fetchComments = async (searchTerm = search) => {
    try {
      const response = await api.get('/comments', {
        params: {
          limit: 100,
          ...(statusFilter ? { status: statusFilter } : {}),
          ...(searchTerm ? { search: searchTerm } : {})
        }
      });
      setComments(response.data.data || []);
    } catch (error) {
      handleApiError(error);
    } finally {
      setLoading(false);
    }
  };

  const handleModerate = async (commentId, status) => {
    try {
      await api.put(`/comments/${commentId}/moderate`, { status });
      toast.success(`Comment marked as ${status}`);
      fetchComments();
    } catch (error) {
      handleApiError(error);
    }
  };

  const handleDelete = async (commentId) => {
    if (!window.confirm('Delete this comment?')) {
      return;
    }

    try {
      await api.delete(`/comments/${commentId}`);
      toast.success('Comment deleted');
      fetchComments();
    } catch (error) {
      handleApiError(error);
    }
  };

  const handleSearchSubmit = (event) => {
    event.preventDefault();
    setLoading(true);
    fetchComments(search);
  };

  return (
    <div className="admin-resource-page">
      <section className="admin-card">
        <div className="admin-toolbar">
          <h2>Comment Moderation</h2>
          <div className="admin-toolbar-group">
            <select className="form-select" value={statusFilter} onChange={(event) => { setLoading(true); setStatusFilter(event.target.value); }}>
              <option value="">All statuses</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="spam">Spam</option>
            </select>
            <form className="admin-toolbar-group" onSubmit={handleSearchSubmit}>
              <input className="form-control" placeholder="Search comment text" value={search} onChange={(event) => setSearch(event.target.value)} />
              <button className="btn btn-outline-primary" type="submit">Search</button>
            </form>
          </div>
        </div>
      </section>

      <section className="admin-card">
        {loading ? <p className="admin-empty">Loading comments...</p> : (
          <div className="admin-table-wrapper">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Comment</th>
                  <th>Author</th>
                  <th>Post</th>
                  <th>Status</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {comments.length === 0 ? (
                  <tr><td colSpan="6"><p className="admin-empty">No comments found.</p></td></tr>
                ) : comments.map((comment) => (
                  <tr key={comment._id}>
                    <td>{comment.content}</td>
                    <td>{comment.author?.username || 'Unknown'}</td>
                    <td>{comment.post?.title || 'Unknown post'}</td>
                    <td><span className={`admin-pill ${comment.status}`}>{comment.status}</span></td>
                    <td>{new Date(comment.createdAt).toLocaleString()}</td>
                    <td>
                      <div className="admin-actions">
                        {comment.status !== 'approved' && <button className="btn btn-sm btn-outline-success" onClick={() => handleModerate(comment._id, 'approved')}>Approve</button>}
                        {comment.status !== 'rejected' && <button className="btn btn-sm btn-outline-warning" onClick={() => handleModerate(comment._id, 'rejected')}>Reject</button>}
                        {comment.status !== 'spam' && <button className="btn btn-sm btn-outline-secondary" onClick={() => handleModerate(comment._id, 'spam')}>Spam</button>}
                        <button className="btn btn-sm btn-outline-danger" onClick={() => handleDelete(comment._id)}>Delete</button>
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

export default Comments;


