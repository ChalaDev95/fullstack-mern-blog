const express = require('express');
const { body, validationResult } = require('express-validator');
const Tag = require('../models/Tag');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// Helper to escape regex characters
const escapeRegex = (text) => {
  return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
};

// @route   GET /api/tags
// @desc    Get all tags
// @access  Public
router.get('/', async (req, res, next) => {
  try {
    const tags = await Tag.find()
      .sort({ postsCount: -1, name: 1 })
      .limit(parseInt(req.query.limit) || 100);

    res.json({
      success: true,
      count: tags.length,
      data: tags
    });
  } catch (error) {
    next(error);
  }
});

// @route   GET /api/tags/search
// @desc    Search tags (for autocomplete)
// @access  Public
router.get('/search', async (req, res, next) => {
  try {
    const query = req.query.q || '';
    const safeQuery = escapeRegex(query);
    const tags = await Tag.find({
      name: { $regex: safeQuery, $options: 'i' }
    })
      .limit(10)
      .select('name slug');

    res.json({
      success: true,
      data: tags
    });
  } catch (error) {
    next(error);
  }
});

// @route   POST /api/tags
// @desc    Create tag
// @access  Private (Admin, Editor, Author)
router.post('/', protect, authorize('admin', 'editor', 'author'), [
  body('name').trim().notEmpty().isLength({ max: 30 })
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const tag = await Tag.create({
      name: req.body.name.toLowerCase()
    });

    res.status(201).json({
      success: true,
      data: tag
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Tag already exists'
      });
    }
    next(error);
  }
});

module.exports = router;
