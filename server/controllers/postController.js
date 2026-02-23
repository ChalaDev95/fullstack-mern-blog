const { PostService } = require('../services');
const { sendSuccess, sendError, asyncHandler } = require('../utils/responseHandler');
const { validationResult } = require('express-validator');

class PostController {
  /**
   * GET /api/posts
   * Get all published posts with pagination
   */
  static getPosts = asyncHandler(async (req, res) => {
    const options = {
      page: parseInt(req.query.page) || 1,
      limit: parseInt(req.query.limit) || 10,
      category: req.query.category,
      tag: req.query.tag,
      search: req.query.search,
      sortBy: req.query.sortBy || 'publishDate',
      sortOrder: req.query.sortOrder || 'desc'
    };

    const result = await PostService.getPublishedPosts(options);
    
    sendSuccess(res, result, 200, 'Posts retrieved successfully');
  });

  /**
   * GET /api/posts/:slug
   * Get a single post by slug
   */
  static getPost = asyncHandler(async (req, res) => {
    const { slug } = req.params;
    
    const post = await PostService.getPostBySlug(slug);
    
    if (!post) {
      return sendError(res, { message: 'Post not found' }, 404, 'Post not found');
    }

    sendSuccess(res, post, 200, 'Post retrieved successfully');
  });

  /**
   * POST /api/posts
   * Create a new post (admin only)
   */
  static createPost = asyncHandler(async (req, res) => {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return sendError(res, { details: errors.array() }, 400, 'Validation failed');
    }

    const postData = {
      title: req.body.title,
      content: req.body.content,
      excerpt: req.body.excerpt,
      status: req.body.status,
      categories: req.body.categories,
      tags: req.body.tags,
      featuredImage: req.body.featuredImage,
      seoTitle: req.body.seoTitle,
      seoDescription: req.body.seoDescription
    };

    const post = await PostService.createPost(postData, req.user._id);
    
    sendSuccess(res, post, 201, 'Post created successfully');
  });

  /**
   * PUT /api/posts/:id
   * Update a post (admin only)
   */
  static updatePost = asyncHandler(async (req, res) => {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return sendError(res, { details: errors.array() }, 400, 'Validation failed');
    }

    const { id } = req.params;
    const updateData = {
      title: req.body.title,
      content: req.body.content,
      excerpt: req.body.excerpt,
      status: req.body.status,
      categories: req.body.categories,
      tags: req.body.tags,
      featuredImage: req.body.featuredImage,
      seoTitle: req.body.seoTitle,
      seoDescription: req.body.seoDescription
    };

    const post = await PostService.updatePost(id, updateData, req.user._id);
    
    sendSuccess(res, post, 200, 'Post updated successfully');
  });

  /**
   * DELETE /api/posts/:id
   * Delete a post (admin only)
   */
  static deletePost = asyncHandler(async (req, res) => {
    const { id } = req.params;
    
    const post = await PostService.deletePost(id, req.user._id);
    
    sendSuccess(res, post, 200, 'Post deleted successfully');
  });

  /**
   * GET /api/posts/:id/revisions
   * Get post revisions (admin only)
   */
  static getPostRevisions = asyncHandler(async (req, res) => {
    const { id } = req.params;
    
    const revisions = await PostService.getPostRevisions(id);
    
    sendSuccess(res, revisions, 200, 'Post revisions retrieved successfully');
  });
}

module.exports = PostController;
