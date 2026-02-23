const express = require('express');
const Post = require('../models/Post');
const Page = require('../models/Page');
const { optionalAuth } = require('../middleware/auth');

const router = express.Router();

// Helper to escape regex characters
const escapeRegex = (text) => {
  return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
};

// @route   GET /api/search
// @desc    Full-text search
// @access  Public
router.get('/', optionalAuth, async (req, res, next) => {
  try {
    const query = req.query.q || '';
    const type = req.query.type || 'all'; // all, posts, pages
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    if (!query) {
      return res.json({
        success: true,
        data: [],
        count: 0,
        total: 0
      });
    }

    const safeQuery = escapeRegex(query);

    const searchQuery = {
      $or: [
        { title: { $regex: safeQuery, $options: 'i' } },
        { body: { $regex: safeQuery, $options: 'i' } },
        { excerpt: { $regex: safeQuery, $options: 'i' } }
      ]
    };

    // Only show published content to non-admins
    if (!req.user || !['admin', 'editor'].includes(req.user.role)) {
      searchQuery.status = 'published';
      searchQuery.publishDate = { $lte: new Date() };
    }

    const results = {
      posts: [],
      pages: []
    };

    if (type === 'all' || type === 'posts') {
      const posts = await Post.find(searchQuery)
        .populate('author', 'username avatar')
        .populate('categories', 'name slug')
        .populate('tags', 'name slug')
        .select('-body')
        .sort({ publishDate: -1 })
        .skip(skip)
        .limit(limit);

      const postsTotal = await Post.countDocuments(searchQuery);
      results.posts = posts;
      results.postsTotal = postsTotal;
    }

    if (type === 'all' || type === 'pages') {
      const pageQuery = {
        $or: [
          { title: { $regex: safeQuery, $options: 'i' } },
          { content: { $regex: safeQuery, $options: 'i' } }
        ]
      };

      if (!req.user || !['admin', 'editor'].includes(req.user.role)) {
        pageQuery.isPublished = true;
      }

      const pages = await Page.find(pageQuery)
        .populate('author', 'username')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

      const pagesTotal = await Page.countDocuments(pageQuery);
      results.pages = pages;
      results.pagesTotal = pagesTotal;
    }

    res.json({
      success: true,
      query,
      data: results
    });
  } catch (error) {
    next(error);
  }
});

// @route   GET /api/search/autocomplete
// @desc    Autocomplete suggestions
// @access  Public
router.get('/autocomplete', optionalAuth, async (req, res, next) => {
  try {
    const query = req.query.q || '';
    const limit = parseInt(req.query.limit) || 5;

    if (!query || query.length < 2) {
      return res.json({
        success: true,
        data: []
      });
    }

    const safeQuery = escapeRegex(query);

    // NOTE: For production, using regex for full-text search is not performant.
    // Consider using MongoDB's text indexes for better performance.
    // Example: create index: Post.index({ title: 'text', body: 'text', excerpt: 'text' })
    // Example: query: { $text: { $search: query } }
    const searchQuery = {
      $or: [
        { title: { $regex: safeQuery, $options: 'i' } },
        { excerpt: { $regex: safeQuery, $options: 'i' } }
      ]
    };

    // Only show published content to non-admins
    if (!req.user || !['admin', 'editor'].includes(req.user.role)) {
      searchQuery.status = 'published';
      searchQuery.publishDate = { $lte: new Date() };
    }

    const posts = await Post.find(searchQuery)
      .select('title slug excerpt')
      .limit(limit)
      .sort({ publishDate: -1 });

    res.json({
      success: true,
      data: posts
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
