const express = require('express');
const Like = require('../models/Like');
const Post = require('../models/Post');
const Comment = require('../models/Comment');
const { protect, optionalAuth } = require('../middleware/auth');

const router = express.Router();

// @route   POST /api/likes
// @desc    Toggle like on post or comment
// @access  Private
router.post('/', protect, async (req, res, next) => {
  try {
    const { post: postId, comment: commentId, type = 'like' } = req.body;
    const userId = req.user.id;

    if (!postId && !commentId) {
      return res.status(400).json({ success: false, message: 'Either post or comment ID is required' });
    }
    if (postId && commentId) {
      return res.status(400).json({ success: false, message: 'Cannot like both a post and a comment' });
    }

    const isPost = !!postId;
    const targetModel = isPost ? Post : Comment;
    const targetId = isPost ? postId : commentId;
    const likeQuery = { user: userId, [isPost ? 'post' : 'comment']: targetId };

    const [target, existingLike] = await Promise.all([
      targetModel.findById(targetId),
      Like.findOne(likeQuery)
    ]);

    if (!target) {
      const targetName = isPost ? 'Post' : 'Comment';
      return res.status(404).json({ success: false, message: `${targetName} not found` });
    }

    let liked;

    if (existingLike) {
      // Unlike
      await existingLike.deleteOne();
      target.likesCount = Math.max(0, (target.likesCount || 0) - 1);
      liked = false;
    } else {
      // Like
      await Like.create({ ...likeQuery, type });
      target.likesCount = (target.likesCount || 0) + 1;
      liked = true;
    }

    await target.save();

    res.json({
      success: true,
      liked,
      likesCount: target.likesCount
    });

  } catch (error) {
    next(error);
  }
});

// @route   GET /api/likes/check
// @desc    Check if user has liked a post or comment
// @access  Private
router.get('/check', protect, async (req, res, next) => {
  try {
    const { post, comment } = req.query;

    if (!post && !comment) {
      return res.status(400).json({
        success: false,
        message: 'Either post or comment is required'
      });
    }

    if (post && comment) {
      return res.status(400).json({
        success: false,
        message: 'Provide either post or comment, not both'
      });
    }

    const like = await Like.findOne({
      user: req.user.id,
      ...(post ? { post } : { comment })
    });

    res.json({
      success: true,
      liked: !!like,
      likeType: like?.type || null
    });
  } catch (error) {
    next(error);
  }
});

// @route   GET /api/likes/post/:postId
// @desc    Get likes for a post
// @access  Public
router.get('/post/:postId', optionalAuth, async (req, res, next) => {
  try {
    const likes = await Like.find({ post: req.params.postId })
      .populate('user', 'username avatar')
      .sort({ createdAt: -1 });

    const userLiked = req.user ? await Like.findOne({
      user: req.user.id,
      post: req.params.postId
    }) : null;

    res.json({
      success: true,
      count: likes.length,
      userLiked: !!userLiked,
      userLikeType: userLiked?.type || null,
      data: likes
    });
  } catch (error) {
    next(error);
  }
});

// @route   GET /api/likes/comment/:commentId
// @desc    Get likes for a comment
// @access  Public
router.get('/comment/:commentId', optionalAuth, async (req, res, next) => {
  try {
    const likes = await Like.find({ comment: req.params.commentId })
      .populate('user', 'username avatar')
      .sort({ createdAt: -1 });

    const userLiked = req.user ? await Like.findOne({
      user: req.user.id,
      comment: req.params.commentId
    }) : null;

    res.json({
      success: true,
      count: likes.length,
      userLiked: !!userLiked,
      userLikeType: userLiked?.type || null,
      data: likes
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
