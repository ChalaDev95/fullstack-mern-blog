import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import api from '../../utils/api';
import { handleApiError } from '../../utils/errorHandler';
import SEO from '../../components/SEO';
import LikeButton from '../../components/public/LikeButton';
import { marked } from 'marked';
import toast from 'react-hot-toast';
import './PostDetail.css';

const PostDetail = () => {
  const { slug } = useParams();
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [isPasswordProtected, setIsPasswordProtected] = useState(false);

  useEffect(() => {
    fetchPost();
  }, [slug]);

  const fetchPost = async () => {
    try {
      const res = await api.get(`/posts/${slug}`);
      const postData = res.data.data;
      setPost(postData);
      setIsPasswordProtected(postData.passwordProtected?.enabled && !postData.body);
    } catch (error) {
      handleApiError(error);
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setPasswordError('');

    try {
      await api.post(`/posts/${slug}/verify-password`, { password });
      toast.success('Password verified');
      // Reload post to get full content
      await fetchPost();
    } catch (error) {
      setPasswordError(error.response?.data?.message || 'Incorrect password');
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!post) {
    return <div>Post not found</div>;
  }

  // Password protection form
  if (isPasswordProtected) {
    return (
      <div className="post-detail">
        <div className="password-protection">
          <h2>This post is password protected</h2>
          <p>Please enter the password to view this content.</p>
          <form onSubmit={handlePasswordSubmit}>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              required
            />
            {passwordError && <div className="error-message">{passwordError}</div>}
            <button type="submit">Submit</button>
          </form>
        </div>
      </div>
    );
  }

  // Generate structured data
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description: post.excerpt || post.seo?.metaDescription,
    image: post.featuredImage?.url || post.seo?.ogImage,
    datePublished: post.publishDate,
    dateModified: post.lastModified,
    author: {
      '@type': 'Person',
      name: post.author?.username
    },
    publisher: {
      '@type': 'Organization',
      name: 'CMS Blog Platform'
    }
  };

  // Convert markdown to HTML
  const htmlContent = post.body ? marked(post.body) : '';

  return (
    <>
      <SEO
        title={post.seo?.metaTitle || post.title}
        description={post.seo?.metaDescription || post.excerpt}
        canonical={post.seo?.canonicalUrl || `${window.location.origin}/posts/${post.slug}`}
        ogImage={post.seo?.ogImage || post.featuredImage?.url}
        ogType={post.seo?.ogType || 'article'}
        structuredData={structuredData}
      />
      <article className="post-detail">
        <header className="post-header">
          {post.featuredImage && (
            <img
              src={post.featuredImage.url}
              alt={post.featuredImage.alt || post.title}
              className="featured-image"
            />
          )}
          <h1>{post.title}</h1>
          <div className="post-meta">
            <span>By {post.author?.username}</span>
            <span>{new Date(post.publishDate).toLocaleDateString()}</span>
            {post.readingTime && <span>{post.readingTime} min read</span>}
          </div>
          {post.categories && post.categories.length > 0 && (
            <div className="post-categories">
              {post.categories.map(cat => (
                <span key={cat._id} className="category-tag">
                  {cat.name}
                </span>
              ))}
            </div>
          )}
          <div className="post-actions">
            <LikeButton 
              postId={post._id} 
              initialLikesCount={post.likesCount || 0}
            />
          </div>
        </header>
        <div
          className="post-content"
          dangerouslySetInnerHTML={{ __html: htmlContent }}
        />
        {post.tags && post.tags.length > 0 && (
          <footer className="post-footer">
            <div className="post-tags">
              {post.tags.map(tag => (
                <span key={tag._id} className="tag">
                  #{tag.name}
                </span>
              ))}
            </div>
            <SocialShareButtons post={post} />
          </footer>
        )}
      </article>
    </>
  );
};

// Social Share Buttons Component
const SocialShareButtons = ({ post }) => {
  const shareUrl = `${window.location.origin}/posts/${post.slug}`;
  const shareTitle = encodeURIComponent(post.title);
  const shareText = encodeURIComponent(post.excerpt || post.title);

  const shareLinks = {
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`,
    twitter: `https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${shareTitle}`,
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`,
    whatsapp: `https://wa.me/?text=${shareTitle}%20${encodeURIComponent(shareUrl)}`,
    reddit: `https://reddit.com/submit?url=${encodeURIComponent(shareUrl)}&title=${shareTitle}`
  };

  const handleShare = (platform) => {
    window.open(shareLinks[platform], '_blank', 'width=600,height=400');
  };

  return (
    <div className="social-share">
      <span>Share:</span>
      <button onClick={() => handleShare('facebook')} className="share-btn facebook" aria-label="Share on Facebook">
        Facebook
      </button>
      <button onClick={() => handleShare('twitter')} className="share-btn twitter" aria-label="Share on Twitter">
        Twitter
      </button>
      <button onClick={() => handleShare('linkedin')} className="share-btn linkedin" aria-label="Share on LinkedIn">
        LinkedIn
      </button>
      <button onClick={() => handleShare('whatsapp')} className="share-btn whatsapp" aria-label="Share on WhatsApp">
        WhatsApp
      </button>
      <button onClick={() => handleShare('reddit')} className="share-btn reddit" aria-label="Share on Reddit">
        Reddit
      </button>
    </div>
  );
};

export default PostDetail;
