import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import api from '../../utils/api';
import { handleApiError } from '../../utils/errorHandler';
import Navbar from '../../components/public/Navbar';
import Footer from '../../components/public/Footer';
import SEO from '../../components/SEO';

const PostsList = () => {
  const { slug } = useParams();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filterType, setFilterType] = useState('');

  useEffect(() => {
    fetchPosts();
  }, [currentPage, slug]);

  const fetchPosts = async () => {
    try {
      setLoading(true);
      const params = {
        page: currentPage,
        limit: 12,
        status: 'published'
      };

      if (slug) {
        // Determine if it's a category or tag from URL
        const path = window.location.pathname;
        if (path.includes('/categories/')) {
          params.category = slug;
          setFilterType('category');
        } else if (path.includes('/tags/')) {
          params.tag = slug;
          setFilterType('tag');
        }
      }

      const res = await api.get('/posts', { params });
      setPosts(res.data.data || []);
      setTotalPages(res.data.pages || 1);
    } catch (error) {
      handleApiError(error);
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <>
      <SEO
        title={slug ? `${filterType === 'category' ? 'Category' : 'Tag'}: ${slug}` : 'All Posts'}
        description="Browse all posts and articles"
      />
      <Navbar />
      <div className="container my-5">
        <div className="row mb-4">
          <div className="col-12">
            <h1 className="display-5 mb-3">
              {slug
                ? `${filterType === 'category' ? 'Category' : 'Tag'}: ${slug}`
                : 'All Posts'}
            </h1>
            <nav aria-label="breadcrumb">
              <ol className="breadcrumb">
                <li className="breadcrumb-item">
                  <Link to="/" className="text-decoration-none">Home</Link>
                </li>
                <li className="breadcrumb-item active" aria-current="page">
                  {slug ? (filterType === 'category' ? 'Category' : 'Tag') : 'Posts'}
                </li>
              </ol>
            </nav>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-5">
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
          </div>
        ) : posts.length === 0 ? (
          <div className="alert alert-info text-center" role="alert">
            No posts found.
          </div>
        ) : (
          <>
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
                          className="btn btn-primary btn-sm"
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

            {totalPages > 1 && (
              <nav aria-label="Page navigation" className="mt-5">
                <ul className="pagination justify-content-center">
                  <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                    <button
                      className="page-link"
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 1}
                    >
                      Previous
                    </button>
                  </li>
                  {[...Array(totalPages)].map((_, index) => {
                    const page = index + 1;
                    if (
                      page === 1 ||
                      page === totalPages ||
                      (page >= currentPage - 2 && page <= currentPage + 2)
                    ) {
                      return (
                        <li
                          key={page}
                          className={`page-item ${currentPage === page ? 'active' : ''}`}
                        >
                          <button
                            className="page-link"
                            onClick={() => handlePageChange(page)}
                          >
                            {page}
                          </button>
                        </li>
                      );
                    } else if (
                      page === currentPage - 3 ||
                      page === currentPage + 3
                    ) {
                      return (
                        <li key={page} className="page-item disabled">
                          <span className="page-link">...</span>
                        </li>
                      );
                    }
                    return null;
                  })}
                  <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
                    <button
                      className="page-link"
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage === totalPages}
                    >
                      Next
                    </button>
                  </li>
                </ul>
              </nav>
            )}
          </>
        )}
      </div>
      <Footer />
    </>
  );
};

export default PostsList;
