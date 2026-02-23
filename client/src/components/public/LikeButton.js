import React, { useState, useEffect } from 'react';
import api from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import './LikeButton.css';

const LikeButton = ({ postId, commentId, initialLikesCount = 0, initialLiked = false }) => {
  const { user } = useAuth();
  const [liked, setLiked] = useState(initialLiked);
  const [likesCount, setLikesCount] = useState(initialLikesCount);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user && (postId || commentId)) {
      checkLikeStatus();
    }
  }, [user, postId, commentId]);

  const checkLikeStatus = async () => {
    try {
      const res = await api.get('/likes/check', {
        params: postId ? { post: postId } : { comment: commentId }
      });
      setLiked(res.data.liked);
    } catch (error) {
      // Silently fail - not critical
    }
  };

  const handleLike = async () => {
    if (!user) {
      toast.error('Please login to like');
      return;
    }

    setLoading(true);
    try {
      const res = await api.post('/likes', {
        post: postId,
        comment: commentId,
        type: 'like'
      });
      setLiked(res.data.liked);
      setLikesCount(res.data.likesCount);
    } catch (error) {
      toast.error('Failed to like');
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      className={`like-button ${liked ? 'liked' : ''}`}
      onClick={handleLike}
      disabled={loading || !user}
      aria-label={liked ? 'Unlike' : 'Like'}
    >
      <span className="like-icon">❤️</span>
      <span className="like-count">{likesCount}</span>
    </button>
  );
};

export default LikeButton;

