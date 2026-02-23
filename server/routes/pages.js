const express = require('express');
const { body, validationResult } = require('express-validator');
const Page = require('../models/Page');
const { protect, authorize, optionalAuth } = require('../middleware/auth');
const { sanitizeHTML } = require('../utils/sanitize');

const router = express.Router();

// @route   GET /api/pages
// @desc    Get all pages
// @access  Public
router.get('/', optionalAuth, async (req, res, next) => {
  try {
    const query = {};
    if (!req.user || !['admin', 'editor'].includes(req.user.role)) {
      query.isPublished = true;
    }

    const pages = await Page.find(query)
      .populate('author', 'username')
      .sort({ order: 1, createdAt: -1 });

    res.json({
      success: true,
      count: pages.length,
      data: pages
    });
  } catch (error) {
    next(error);
  }
});

// @route   GET /api/pages/:slug
// @desc    Get single page
// @access  Public
router.get('/:slug', optionalAuth, async (req, res, next) => {
  try {
    const query = { slug: req.params.slug };
    if (!req.user || !['admin', 'editor'].includes(req.user.role)) {
      query.isPublished = true;
    }

    const page = await Page.findOne(query)
      .populate('author', 'username avatar');

    if (!page) {
      return res.status(404).json({
        success: false,
        message: 'Page not found'
      });
    }

    res.json({
      success: true,
      data: page
    });
  } catch (error) {
    next(error);
  }
});

// @route   POST /api/pages
// @desc    Create page
// @access  Private (Admin, Editor)
router.post('/', protect, authorize('admin', 'editor'), [
  body('title').trim().notEmpty(),
  body('content').notEmpty()
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const pageData = {
      ...req.body,
      author: req.user.id,
      content: sanitizeHTML(req.body.content)
    };

    const page = await Page.create(pageData);

    res.status(201).json({
      success: true,
      data: page
    });
  } catch (error) {
    next(error);
  }
});

// @route   PUT /api/pages/:id
// @desc    Update page
// @access  Private (Admin, Editor)
router.put('/:id', protect, authorize('admin', 'editor'), async (req, res, next) => {
  try {
    const page = await Page.findById(req.params.id);
    if (!page) {
      return res.status(404).json({
        success: false,
        message: 'Page not found'
      });
    }

    if (req.body.content) {
      req.body.content = sanitizeHTML(req.body.content);
    }

    Object.keys(req.body).forEach(key => {
      if (key !== '_id' && key !== 'author') {
        page[key] = req.body[key];
      }
    });

    await page.save();

    res.json({
      success: true,
      data: page
    });
  } catch (error) {
    next(error);
  }
});

// @route   DELETE /api/pages/:id
// @desc    Delete page
// @access  Private (Admin, Editor)
router.delete('/:id', protect, authorize('admin', 'editor'), async (req, res, next) => {
  try {
    const page = await Page.findById(req.params.id);
    if (!page) {
      return res.status(404).json({
        success: false,
        message: 'Page not found'
      });
    }

    await page.deleteOne();

    res.json({
      success: true,
      message: 'Page deleted'
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;


