const express = require('express');
const { body, validationResult, query } = require('express-validator');
const Post = require('../models/Post');
const PostRevision = require('../models/PostRevision');
const Tag = require('../models/Tag');
const Category = require('../models/Category');
const { protect, authorize, optionalAuth } = require('../middleware/auth');
const { sanitizeHTML } = require('../utils/sanitize');
const { schedulePost, unschedulePost } = require('../utils/scheduler');
const { logActivity } = require('../utils/activityLogger');
const marked = require('marked');

const router = express.Router();

// @route   GET /api/posts
// @desc    Get all posts (public)
// @access  Public
router.get('/', [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('status').optional().isIn(['draft', 'published', 'scheduled', 'archived']),
  query('category').optional(),
  query('tag').optional(),
  query('author').optional(),
  query('search').optional()
], optionalAuth, async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Build query
    const queryObj = {};
    
    // If not admin/editor, only show published posts
    if (!req.user || !['admin', 'editor'].includes(req.user.role)) {
      queryObj.status = 'published';
      queryObj.publishDate = { $lte: new Date() };
    } else if (req.query.status) {
      queryObj.status = req.query.status;
    }

    if (req.query.category) {
      const category = await Category.findOne({ slug: req.query.category });
      if (category) queryObj.categories = category._id;
    }

    if (req.query.tag) {
      const tag = await Tag.findOne({ slug: req.query.tag });
      if (tag) queryObj.tags = tag._id;
    }

    if (req.query.author) {
      queryObj.author = req.query.author;
    }

    if (req.query.search) {
      queryObj.$or = [
        { title: { $regex: req.query.search, $options: 'i' } },
        { body: { $regex: req.query.search, $options: 'i' } },
        { excerpt: { $regex: req.query.search, $options: 'i' } }
      ];
    }

    // Sort: pinned first, then by publish date
    const sort = { pinned: -1, publishDate: -1 };

    const posts = await Post.find(queryObj)
      .populate('author', 'username avatar')
      .populate('categories', 'name slug')
      .populate('tags', 'name slug')
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .select('-body'); // Don't send full body in list

    const total = await Post.countDocuments(queryObj);

    res.json({
      success: true,
      count: posts.length,
      total,
      page,
      pages: Math.ceil(total / limit),
      data: posts
    });
  } catch (error) {
    next(error);
  }
});

// @route   GET /api/posts/:slug
// @desc    Get single post
// @access  Public
router.get('/:slug', optionalAuth, async (req, res, next) => {
  try {
    const post = await Post.findOne({ slug: req.params.slug })
      .populate('author', 'username avatar bio socialLinks')
      .populate('categories', 'name slug')
      .populate('tags', 'name slug')
      .populate('coAuthors', 'username avatar');

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }

    // Check if user can view (published or has permission)
    if (post.status !== 'published' || post.publishDate > new Date()) {
      if (!req.user || !['admin', 'editor'].includes(req.user.role)) {
        return res.status(404).json({
          success: false,
          message: 'Post not found'
        });
      }
    }

    // Check password protection
    if (post.passwordProtected?.enabled) {
      // Don't send body if password is required and not verified
      const passwordVerified = req.cookies?.[`post_${post._id}_verified`] === 'true';
      if (!passwordVerified && (!req.user || !['admin', 'editor'].includes(req.user.role))) {
        return res.json({
          success: true,
          data: {
            ...post.toObject(),
            body: null,
            passwordProtected: { enabled: true }
          }
        });
      }
    }

    // Increment views
    post.viewsCount += 1;
    await post.save();

    res.json({
      success: true,
      data: post
    });
  } catch (error) {
    next(error);
  }
});

// @route   POST /api/posts
// @desc    Create post
// @access  Private (Author, Editor, Admin)
router.post('/', protect, authorize('admin', 'editor', 'author', 'contributor'), [
  body('title').trim().isLength({ min: 10, max: 200 }),
  body('body').notEmpty()
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const postData = {
      ...req.body,
      author: req.user.id,
      body: sanitizeHTML(req.body.body)
    };

    // Calculate reading time
    const post = await Post.create(postData);
    post.calculateReadingTime();
    
    // Handle scheduled publishing
    if (post.status === 'scheduled' && post.publishDate) {
      await schedulePost(post._id, post.publishDate);
    } else if (post.status === 'published') {
      post.publishDate = new Date();
    }
    
    await post.save();

    // Create initial revision
    await PostRevision.create({
      post: post._id,
      title: post.title,
      body: post.body,
      excerpt: post.excerpt,
      featuredImage: post.featuredImage,
      tags: post.tags,
      categories: post.categories,
      seo: post.seo,
      editedBy: req.user.id,
      revisionNumber: 1
    });

    // Log activity
    await logActivity({
      userId: req.user.id,
      action: 'post.created',
      resourceType: 'post',
      resourceId: post._id,
      details: { title: post.title, status: post.status },
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });

    const populatedPost = await Post.findById(post._id)
      .populate('author', 'username avatar')
      .populate('categories', 'name slug')
      .populate('tags', 'name slug');

    res.status(201).json({
      success: true,
      data: populatedPost
    });
  } catch (error) {
    next(error);
  }
});

// @route   PUT /api/posts/:id
// @desc    Update post
// @access  Private
router.put('/:id', protect, async (req, res, next) => {
  try {
    let post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }

    // Check permissions
    if (post.author.toString() !== req.user.id && !['admin', 'editor'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this post'
      });
    }

    const oldStatus = post.status;

    // Update fields
    Object.keys(req.body).forEach(key => {
      if (key === 'body') {
        post[key] = sanitizeHTML(req.body[key]);
      } else if (key !== 'author' && key !== '_id') {
        post[key] = req.body[key];
      }
    });

    post.lastModified = new Date();
    post.calculateReadingTime();

    // Handle status transitions (Draft -> Scheduled, etc.)
    if (post.status === 'scheduled' && post.publishDate && (oldStatus !== 'scheduled' || post.isModified('publishDate'))) {
      await schedulePost(post._id, post.publishDate);
    } else if (post.status === 'published' && oldStatus !== 'published') {
      if (!post.publishDate || post.publishDate > new Date()) {
        post.publishDate = new Date();
      }
    } else if (oldStatus === 'scheduled' && post.status !== 'scheduled') {
      await unschedulePost(post._id);
    }

    await post.save();

    // Create revision
    const revisionCount = await PostRevision.countDocuments({ post: post._id });
    await PostRevision.create({
      post: post._id,
      title: post.title,
      body: post.body,
      excerpt: post.excerpt,
      featuredImage: post.featuredImage,
      tags: post.tags,
      categories: post.categories,
      seo: post.seo,
      editedBy: req.user.id,
      revisionNumber: revisionCount + 1
    });

    const populatedPost = await Post.findById(post._id)
      .populate('author', 'username avatar')
      .populate('categories', 'name slug')
      .populate('tags', 'name slug');

    res.json({
      success: true,
      data: populatedPost
    });
  } catch (error) {
    next(error);
  }
});

// @route   DELETE /api/posts/:id
// @desc    Delete post
// @access  Private
router.delete('/:id', protect, async (req, res, next) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }

    // Check permissions
    if (post.author.toString() !== req.user.id && !['admin', 'editor'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this post'
      });
    }

    await post.deleteOne();

    res.json({
      success: true,
      message: 'Post deleted'
    });
  } catch (error) {
    next(error);
  }
});

// @route   GET /api/posts/:id/revisions
// @desc    Get post revisions
// @access  Private
router.get('/:id/revisions', protect, async (req, res, next) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }

    // Check permissions
    if (post.author.toString() !== req.params.id && !['admin', 'editor'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized'
      });
    }

    const revisions = await PostRevision.find({ post: req.params.id })
      .populate('editedBy', 'username avatar')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: revisions
    });
  } catch (error) {
    next(error);
  }
});

// @route   POST /api/posts/:slug/verify-password
// @desc    Verify password for password-protected post
// @access  Public
router.post('/:slug/verify-password', [
  body('password').notEmpty()
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const post = await Post.findOne({ slug: req.params.slug }).select('+passwordProtected.password');
    
    if (!post || !post.passwordProtected?.enabled) {
      return res.status(404).json({
        success: false,
        message: 'Post not found or not password protected'
      });
    }

    if (post.passwordProtected.password !== req.body.password) {
      return res.status(401).json({
        success: false,
        message: 'Incorrect password'
      });
    }

    // Set cookie to remember verification (expires in 24 hours)
    res.cookie(`post_${post._id}_verified`, 'true', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    });

    res.json({
      success: true,
      message: 'Password verified'
    });
  } catch (error) {
    next(error);
  }
});

// @route   POST /api/posts/:id/duplicate
// @desc    Duplicate post
// @access  Private
router.post('/:id/duplicate', protect, authorize('admin', 'editor', 'author'), async (req, res, next) => {
  try {
    const originalPost = await Post.findById(req.params.id);
    if (!originalPost) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }

    const duplicateData = originalPost.toObject();
    delete duplicateData._id;
    delete duplicateData.slug;
    duplicateData.title = `${duplicateData.title} (Copy)`;
    duplicateData.status = 'draft';
    duplicateData.author = req.user.id;
    duplicateData.publishDate = new Date();
    duplicateData.viewsCount = 0;
    duplicateData.commentsCount = 0;
    duplicateData.likesCount = 0;

    const duplicate = await Post.create(duplicateData);
    duplicate.calculateReadingTime();
    await duplicate.save();

    res.status(201).json({
      success: true,
      data: duplicate
    });
  } catch (error) {
    next(error);
  }
});

// @route   POST /api/posts/:id/restore-revision
// @desc    Restore post from revision
// @access  Private
router.post('/:id/restore-revision', protect, async (req, res, next) => {
  try {
    const { revisionId } = req.body;
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }

    // Check permissions
    if (post.author.toString() !== req.user.id && !['admin', 'editor'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized'
      });
    }

    const revision = await PostRevision.findById(revisionId);
    if (!revision || revision.post.toString() !== req.params.id) {
      return res.status(404).json({
        success: false,
        message: 'Revision not found'
      });
    }

    // Restore from revision
    post.title = revision.title;
    post.body = sanitizeHTML(revision.body);
    post.excerpt = revision.excerpt;
    post.featuredImage = revision.featuredImage;
    post.tags = revision.tags;
    post.categories = revision.categories;
    post.seo = revision.seo;
    post.lastModified = new Date();
    post.calculateReadingTime();
    await post.save();

    // Create new revision for the restore action
    const revisionCount = await PostRevision.countDocuments({ post: post._id });
    await PostRevision.create({
      post: post._id,
      title: post.title,
      body: post.body,
      excerpt: post.excerpt,
      featuredImage: post.featuredImage,
      tags: post.tags,
      categories: post.categories,
      seo: post.seo,
      editedBy: req.user.id,
      revisionNumber: revisionCount + 1
    });

    await logActivity({
      userId: req.user.id,
      action: 'post.revision_restored',
      resourceType: 'post',
      resourceId: post._id,
      details: { revisionId: revision._id },
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });

    const populatedPost = await Post.findById(post._id)
      .populate('author', 'username avatar')
      .populate('categories', 'name slug')
      .populate('tags', 'name slug');

    res.json({
      success: true,
      data: populatedPost
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
