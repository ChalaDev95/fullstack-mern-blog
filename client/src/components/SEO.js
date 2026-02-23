import { useEffect } from 'react';
import { Helmet } from 'react-helmet-async';

const SEO = ({
  title,
  description,
  canonical,
  ogImage,
  ogType = 'article',
  twitterCard = 'summary_large_image',
  structuredData
}) => {
  const siteTitle = 'CMS Blog Platform';
  const siteUrl = process.env.REACT_APP_FRONTEND_URL || 'http://localhost:3000';
  const fullTitle = title ? `${title} | ${siteTitle}` : siteTitle;
  const fullImage = ogImage ? (ogImage.startsWith('http') ? ogImage : `${siteUrl}${ogImage}`) : null;

  useEffect(() => {
    // Add structured data to page
    if (structuredData) {
      const script = document.createElement('script');
      script.type = 'application/ld+json';
      script.text = JSON.stringify(structuredData);
      document.head.appendChild(script);

      return () => {
        document.head.removeChild(script);
      };
    }
  }, [structuredData]);

  return (
    <Helmet>
      {/* Basic Meta Tags */}
      <title>{fullTitle}</title>
      {description && <meta name="description" content={description} />}
      {canonical && <link rel="canonical" href={canonical} />}

      {/* Open Graph / Facebook */}
      <meta property="og:type" content={ogType} />
      <meta property="og:title" content={title || siteTitle} />
      {description && <meta property="og:description" content={description} />}
      {fullImage && <meta property="og:image" content={fullImage} />}
      {canonical && <meta property="og:url" content={canonical} />}
      <meta property="og:site_name" content={siteTitle} />

      {/* Twitter */}
      <meta name="twitter:card" content={twitterCard} />
      <meta name="twitter:title" content={title || siteTitle} />
      {description && <meta name="twitter:description" content={description} />}
      {fullImage && <meta name="twitter:image" content={fullImage} />}
    </Helmet>
  );
};

export default SEO;


