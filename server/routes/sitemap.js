const express = require('express');
const Post = require('../models/Post');
const Page = require('../models/Page');
const Category = require('../models/Category');
const Tag = require('../models/Tag');

const router = express.Router();

// @route   GET /api/sitemap
// @desc    Generate sitemap
// @access  Public
router.get('/', async (req, res, next) => {
  try {
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

    const posts = await Post.find({ status: 'published', publishDate: { $lte: new Date() } })
      .select('slug updatedAt')
      .sort({ publishDate: -1 });

    const pages = await Page.find({ isPublished: true })
      .select('slug updatedAt');

    const categories = await Category.find()
      .select('slug updatedAt');

    const tags = await Tag.find()
      .select('slug updatedAt');

    const urls = [
      { loc: baseUrl, changefreq: 'daily', priority: 1.0 },
      { loc: `${baseUrl}/posts`, changefreq: 'daily', priority: 0.9 },
      ...posts.map(post => ({
        loc: `${baseUrl}/posts/${post.slug}`,
        lastmod: post.updatedAt.toISOString(),
        changefreq: 'weekly',
        priority: 0.8
      })),
      ...pages.map(page => ({
        loc: `${baseUrl}/pages/${page.slug}`,
        lastmod: page.updatedAt.toISOString(),
        changefreq: 'monthly',
        priority: 0.7
      })),
      ...categories.map(cat => ({
        loc: `${baseUrl}/categories/${cat.slug}`,
        lastmod: cat.updatedAt.toISOString(),
        changefreq: 'weekly',
        priority: 0.6
      })),
      ...tags.map(tag => ({
        loc: `${baseUrl}/tags/${tag.slug}`,
        lastmod: tag.updatedAt.toISOString(),
        changefreq: 'weekly',
        priority: 0.5
      }))
    ];

    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(url => `  <url>
    <loc>${url.loc}</loc>
    ${url.lastmod ? `<lastmod>${url.lastmod}</lastmod>` : ''}
    <changefreq>${url.changefreq}</changefreq>
    <priority>${url.priority}</priority>
  </url>`).join('\n')}
</urlset>`;

    res.set('Content-Type', 'application/xml');
    res.send(sitemap);
  } catch (error) {
    next(error);
  }
});

module.exports = router;


