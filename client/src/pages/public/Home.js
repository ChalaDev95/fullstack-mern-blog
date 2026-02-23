import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../utils/api';
import { handleApiError } from '../../utils/errorHandler';
import Navbar from '../../components/public/Navbar';
import Footer from '../../components/public/Footer';
import SEO from '../../components/SEO';

const Home = () => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPosts();
  }, []);

  const fetchPosts = async () => {
    try {
      const res = await api.get('/posts', {
        params: { limit: 6, status: 'published' }
      });
      setPosts(res.data.data || []);
    } catch (error) {
      handleApiError(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <SEO
        title="Home"
        description="Welcome to CMS Blog - Read the latest articles and posts"
      />
      <Navbar />
      {/* Hero Section */}
      <div className="hero-section">
        <div className="container">
          <div className="row">
            <div className="col-12 text-center">
              <h1 className="display-4 mb-3">Welcome to CMS Blog</h1>
              <p className="lead">
                Discover the latest articles, insights, and stories
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container my-5">

        {loading ? (
          <div className="text-center py-5">
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
          </div>
        ) : posts.length === 0 ? (
          <div className="alert alert-info text-center" role="alert">
            No posts available at the moment. Check back soon!
          </div>
        ) : (
          <div className="row g-4">
            {posts.map((post) => (
              <div key={post._id} className="col-md-6 col-lg-4">
                <div className="card h-100 shadow-sm">
                  {post.featuredImage?.url && (
                    <img
                      src={post.featuredImage.url}
                      className="card-img-top"
                      alt={post.featuredImage.alt || post.title}
                      style={{ height: '200px', objectFit: 'cover' }}
                    />
                  )}
                  <div className="card-body d-flex flex-column">
                    <h5 className="card-title">{post.title}</h5>
                    <p className="card-text text-muted flex-grow-1">
                      {post.excerpt || post.body?.substring(0, 150) + '...'}
                    </p>
                    <div className="mt-auto">
                      <Link
                        to={`/posts/${post.slug}`}
                        className="btn btn-primary"
                      >
                        Read More
                      </Link>
                    </div>
                    <div className="mt-2">
                      <small className="text-muted">
                        {new Date(post.publishDate).toLocaleDateString()} • {post.readingTime || 0} min read
                      </small>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && posts.length > 0 && (
          <div className="row mt-5">
            <div className="col-12 text-center">
              <Link to="/posts" className="btn btn-outline-primary btn-lg">
                View All Posts
              </Link>
            </div>
          </div>
        )}
      </div>
      <Footer />
    </>
  );
};

export default Home;
