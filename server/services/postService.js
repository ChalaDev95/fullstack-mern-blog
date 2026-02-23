const Post = require('../models/Post');
const PostRevision = require('../models/PostRevision');
const Category = require('../models/Category');
const Tag = require('../models/Tag');
const { logger } = require('../utils/logger');
const { sanitizeHTML } = require('../utils/sanitize');
const slugify = require('slugify');

class PostService {
  /**
   * Create a new post with business logic validation
   */
  static async createPost(postData, authorId) {
    try {
      // Validate required fields
      if (!postData.title || !postData.content) {
        throw new Error('Title and content are required');
      }

      // Generate unique slug
      let slug = slugify(postData.title, { lower: true, strict: true });
      const existingPost = await Post.findOne({ slug });
      
      if (existingPost) {
        slug = `${slug}-${Date.now()}`;
      }

      // Sanitize content
      const sanitizedContent = sanitizeHTML(postData.content);
      const sanitizedExcerpt = postData.excerpt ? sanitizeHTML(postData.excerpt) : '';

      // Handle categories and tags
      const categoryIds = await this.resolveCategories(postData.categories);
      const tagIds = await this.resolveTags(postData.tags);

      const post = new Post({
        title: postData.title,
        slug,
        content: sanitizedContent,
        excerpt: sanitizedExcerpt,
        author: authorId,
        status: postData.status || 'draft',
        categories: categoryIds,
        tags: tagIds,
        featuredImage: postData.featuredImage,
        seoTitle: postData.seoTitle,
        seoDescription: postData.seoDescription,
        publishDate: postData.status === 'published' ? new Date() : null
      });

      const savedPost = await post.save();

      // Create initial revision
      await this.createRevision(savedPost._id, authorId, 'create');

      logger.info('Post created', { postId: savedPost._id, title: savedPost.title });
      
      return savedPost;
    } catch (error) {
      logger.error('Error creating post', { error: error.message, postData });
      throw error;
    }
  }

  /**
   * Update post with revision tracking
   */
  static async updatePost(postId, updateData, authorId) {
    try {
      const post = await Post.findById(postId);
      if (!post) {
        throw new Error('Post not found');
      }

      // Store old values for revision
      const oldValues = { ...post.toObject() };

      // Update fields
      if (updateData.title) {
        post.title = updateData.title;
        post.slug = slugify(updateData.title, { lower: true, strict: true });
      }

      if (updateData.content) {
        post.content = sanitizeHTML(updateData.content);
      }

      if (updateData.excerpt) {
        post.excerpt = sanitizeHTML(updateData.excerpt);
      }

      if (updateData.status) {
        post.status = updateData.status;
        if (updateData.status === 'published' && !post.publishDate) {
          post.publishDate = new Date();
        }
      }

      if (updateData.categories) {
        post.categories = await this.resolveCategories(updateData.categories);
      }

      if (updateData.tags) {
        post.tags = await this.resolveTags(updateData.tags);
      }

      if (updateData.featuredImage) {
        post.featuredImage = updateData.featuredImage;
      }

      if (updateData.seoTitle) {
        post.seoTitle = updateData.seoTitle;
      }

      if (updateData.seoDescription) {
        post.seoDescription = updateData.seoDescription;
      }

      post.updatedAt = new Date();
      const updatedPost = await post.save();

      // Create revision
      await this.createRevision(postId, authorId, 'update', oldValues);

      logger.info('Post updated', { postId, title: updatedPost.title });
      
      return updatedPost;
    } catch (error) {
      logger.error('Error updating post', { error: error.message, postId });
      throw error;
    }
  }

  /**
   * Delete post (soft delete)
   */
  static async deletePost(postId, authorId) {
    try {
      const post = await Post.findById(postId);
      if (!post) {
        throw new Error('Post not found');
      }

      post.status = 'deleted';
      post.deletedAt = new Date();
      await post.save();

      // Create revision
      await this.createRevision(postId, authorId, 'delete');

      logger.info('Post deleted', { postId, title: post.title });
      
      return post;
    } catch (error) {
      logger.error('Error deleting post', { error: error.message, postId });
      throw error;
    }
  }

  /**
   * Get published posts with pagination and filtering
   */
  static async getPublishedPosts(options = {}) {
    const {
      page = 1,
      limit = 10,
      category,
      tag,
      search,
      sortBy = 'publishDate',
      sortOrder = 'desc'
    } = options;

    const query = { 
      status: 'published',
      publishDate: { $lte: new Date() }
    };

    // Apply filters
    if (category) {
      query.categories = category;
    }

    if (tag) {
      query.tags = tag;
    }

    if (search) {
      query.$text = { $search: search };
    }

    // Sorting
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const skip = (page - 1) * limit;

    const [posts, total] = await Promise.all([
      Post.find(query)
        .populate('author', 'username')
        .populate('categories', 'name slug')
        .populate('tags', 'name slug')
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .select('-content'), // Exclude content for list view
      Post.countDocuments(query)
    ]);

    return {
      posts,
      pagination: {
        current: page,
        pages: Math.ceil(total / limit),
        total,
        limit
      }
    };
  }

  /**
   * Get post by slug
   */
  static async getPostBySlug(slug) {
    const post = await Post.findOne({ 
      slug, 
      status: 'published',
      publishDate: { $lte: new Date() }
    })
      .populate('author', 'username')
      .populate('categories', 'name slug')
      .populate('tags', 'name slug');

    return post;
  }

  /**
   * Resolve category names to IDs
   */
  static async resolveCategories(categories) {
    if (!categories || categories.length === 0) return [];

    const categoryDocs = await Promise.all(
      categories.map(async (cat) => {
        if (typeof cat === 'string') {
          // Find by name or create new
          let category = await Category.findOne({ name: cat });
          if (!category) {
            category = await Category.create({
              name: cat,
              slug: slugify(cat, { lower: true, strict: true })
            });
          }
          return category._id;
        }
        return cat; // Assume it's already an ID
      })
    );

    return categoryDocs;
  }

  /**
   * Resolve tag names to IDs
   */
  static async resolveTags(tags) {
    if (!tags || tags.length === 0) return [];

    const Tag = require('../models/Tag');
    const tagDocs = await Promise.all(
      tags.map(async (tag) => {
        if (typeof tag === 'string') {
          // Find by name or create new
          let tagDoc = await Tag.findOne({ name: tag });
          if (!tagDoc) {
            tagDoc = await Tag.create({
              name: tag,
              slug: slugify(tag, { lower: true, strict: true })
            });
          }
          return tagDoc._id;
        }
        return tag; // Assume it's already an ID
      })
    );

    return tagDocs;
  }

  /**
   * Create post revision
   */
  static async createRevision(postId, authorId, action, oldValues = {}) {
    try {
      const post = await Post.findById(postId);
      if (!post) return;

      const revision = new PostRevision({
        post: postId,
        author: authorId,
        action,
        oldValues,
        newValues: post.toObject()
      });

      await revision.save();
    } catch (error) {
      logger.error('Error creating revision', { error: error.message, postId });
    }
  }

  /**
   * Get post revisions
   */
  static async getPostRevisions(postId) {
    return await PostRevision.find({ post: postId })
      .populate('author', 'username')
      .sort({ createdAt: -1 });
  }
}

module.exports = PostService;
