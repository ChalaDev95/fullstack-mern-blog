const express = require('express');
const { body, validationResult } = require('express-validator');
const Comment = require('../models/Comment');
const Post = require('../models/Post');
const { protect, optionalAuth } = require('../middleware/auth');
const { sanitizeHTML } = require('../utils/sanitize');

const router = express.Router();

// @route   GET /api/comments/post/:postId
// @desc    Get comments for a post
// @access  Public
router.get('/post/:postId', optionalAuth, async (req, res, next) => {
  try {
    const post = await Post.findById(req.params.postId);
    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }

    // Base query for all comments on this post
    const query = { post: req.params.postId };
    if (!req.user || !['admin', 'editor'].includes(req.user.role)) {
      query.status = 'approved';
    }

    const allComments = await Comment.find(query)
      .populate('author', 'username avatar')
      .sort({ createdAt: 1 }); // Sort ascending to build the tree correctly

    // Group comments by parent to create a nested structure
    const commentMap = {};
    const commentsWithReplies = [];

    allComments.forEach(comment => {
      const commentObj = { ...comment.toObject(), replies: [] };
      commentMap[comment._id] = commentObj;

      if (comment.parent) {
        if (commentMap[comment.parent]) {
          commentMap[comment.parent].replies.push(commentObj);
        }
      } else {
        commentsWithReplies.push(commentObj);
      }
    });

    // Sort top-level comments descending as per original logic
    commentsWithReplies.sort((a, b) => b.createdAt - a.createdAt);

    res.json({
      success: true,
      count: commentsWithReplies.length,
      data: commentsWithReplies
    });
  } catch (error) {
    next(error);
  }
});

// @route   POST /api/comments
// @desc    Create comment
// @access  Private (or public with moderation)
router.post('/', [
  body('post').notEmpty(),
  body('content').trim().isLength({ min: 1, max: 5000 })
], optionalAuth, async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const post = await Post.findById(req.body.post);
    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }

    // Check if post allows comments
    if (post.status !== 'published') {
      return res.status(400).json({
        success: false,
        message: 'Cannot comment on unpublished post'
      });
    }

    // Require auth for comments (or implement guest comments)
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required to comment'
      });
    }

    const commentData = {
      post: req.body.post,
      author: req.user.id,
      content: sanitizeHTML(req.body.content),
      parent: req.body.parent || null,
      status: req.user.role === 'admin' || req.user.role === 'editor' ? 'approved' : 'pending',
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    };

    const comment = await Comment.create(commentData);

    // Update post comments count
    post.commentsCount += 1;
    await post.save();

    const populatedComment = await Comment.findById(comment._id)
      .populate('author', 'username avatar');

    res.status(201).json({
      success: true,
      data: populatedComment
    });
  } catch (error) {
    next(error);
  }
});

// @route   PUT /api/comments/:id
// @desc    Update comment
// @access  Private
router.put('/:id', protect, [
  body('content').trim().isLength({ min: 1, max: 5000 })
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const comment = await Comment.findById(req.params.id);
    if (!comment) {
      return res.status(404).json({
        success: false,
        message: 'Comment not found'
      });
    }

    // Check permissions
    if (comment.author.toString() !== req.user.id && !['admin', 'editor'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this comment'
      });
    }

    comment.content = sanitizeHTML(req.body.content);
    comment.isEdited = true;
    comment.editedAt = new Date();
    await comment.save();

    const populatedComment = await Comment.findById(comment._id)
      .populate('author', 'username avatar');

    res.json({
      success: true,
      data: populatedComment
    });
  } catch (error) {
    next(error);
  }
});

// @route   DELETE /api/comments/:id
// @desc    Delete comment
// @access  Private
router.delete('/:id', protect, async (req, res, next) => {
  try {
    const comment = await Comment.findById(req.params.id);
    if (!comment) {
      return res.status(404).json({
        success: false,
        message: 'Comment not found'
      });
    }

    // Check permissions
    if (comment.author.toString() !== req.user.id && !['admin', 'editor'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this comment'
      });
    }

    // Update post comments count
    const post = await Post.findById(comment.post);
    if (post) {
      post.commentsCount = Math.max(0, post.commentsCount - 1);
      await post.save();
    }

    await comment.deleteOne();

    res.json({
      success: true,
      message: 'Comment deleted'
    });
  } catch (error) {
    next(error);
  }
});

// @route   PUT /api/comments/:id/moderate
// @desc    Moderate comment (approve/reject/spam)
// @access  Private (Editor, Admin)
router.put('/:id/moderate', protect, [
  body('status').isIn(['approved', 'rejected', 'spam'])
], async (req, res, next) => {
  try {
    if (!['admin', 'editor'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to moderate comments'
      });
    }

    const comment = await Comment.findById(req.params.id);
    if (!comment) {
      return res.status(404).json({
        success: false,
        message: 'Comment not found'
      });
    }

    const oldStatus = comment.status;
    comment.status = req.body.status;
    await comment.save();

    // Update post comments count if status changed
    if (oldStatus !== comment.status) {
      const post = await Post.findById(comment.post);
      if (post) {
        if (oldStatus === 'approved' && comment.status !== 'approved') {
          post.commentsCount = Math.max(0, post.commentsCount - 1);
        } else if (oldStatus !== 'approved' && comment.status === 'approved') {
          post.commentsCount += 1;
        }
        await post.save();
      }
    }

    res.json({
      success: true,
      data: comment
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
