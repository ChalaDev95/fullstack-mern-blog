import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import api, { resolveAssetUrlsInHtml } from '../../utils/api';
import { handleApiError } from '../../utils/errorHandler';
import Navbar from '../../components/public/Navbar';
import Footer from '../../components/public/Footer';
import SEO from '../../components/SEO';

const PageDetail = () => {
  const { slug } = useParams();
  const [page, setPage] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPage = async () => {
      try {
        const res = await api.get(`/pages/${slug}`);
        setPage(res.data.data || null);
      } catch (error) {
        handleApiError(error);
      } finally {
        setLoading(false);
      }
    };

    fetchPage();
  }, [slug]);

  const content = page?.content ? resolveAssetUrlsInHtml(page.content) : '';

  return (
    <>
      <SEO
        title={page?.seo?.metaTitle || page?.title || 'Page'}
        description={page?.seo?.metaDescription || page?.title || 'Page content'}
        canonical={page ? `${window.location.origin}/pages/${page.slug}` : undefined}
        ogImage={page?.seo?.ogImage}
        ogType="website"
      />
      <Navbar />
      <div className="container my-5">
        {loading ? (
          <div className="text-center py-5">Loading...</div>
        ) : !page ? (
          <div className="alert alert-warning" role="alert">Page not found.</div>
        ) : (
          <article>
            <header className="mb-4">
              <h1 className="display-5">{page.title}</h1>
            </header>
            <div dangerouslySetInnerHTML={{ __html: content }} />
          </article>
        )}
      </div>
      <Footer />
    </>
  );
};

export default PageDetail;


