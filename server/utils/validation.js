const { body, param, query, validationResult } = require('express-validator');

// Shared validation rules
const validationRules = {
  // User validation
  register: [
    body('username')
      .trim()
      .isLength({ min: 3, max: 30 })
      .withMessage('Username must be 3-30 characters')
      .matches(/^[a-zA-Z0-9_]+$/)
      .withMessage('Username can only contain letters, numbers, and underscores'),
    body('email')
      .isEmail()
      .normalizeEmail()
      .withMessage('Please provide a valid email'),
    body('password')
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
      .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number')
  ],

  login: [
    body('email').isEmail().normalizeEmail(),
    body('password').notEmpty().withMessage('Password is required')
  ],

  // Post validation
  createPost: [
    body('title')
      .trim()
      .isLength({ min: 10, max: 200 })
      .withMessage('Title must be 10-200 characters'),
    body('body')
      .notEmpty()
      .withMessage('Body is required')
      .isLength({ min: 50 })
      .withMessage('Body must be at least 50 characters'),
    body('excerpt')
      .optional()
      .trim()
      .isLength({ max: 500 })
      .withMessage('Excerpt cannot exceed 500 characters'),
    body('status')
      .optional()
      .isIn(['draft', 'published', 'scheduled', 'archived'])
      .withMessage('Invalid status'),
    body('publishDate')
      .optional()
      .isISO8601()
      .withMessage('Invalid date format'),
    body('categories')
      .optional()
      .isArray()
      .withMessage('Categories must be an array'),
    body('tags')
      .optional()
      .isArray()
      .withMessage('Tags must be an array'),
    body('seo.metaTitle')
      .optional()
      .trim()
      .isLength({ max: 60 })
      .withMessage('Meta title cannot exceed 60 characters'),
    body('seo.metaDescription')
      .optional()
      .trim()
      .isLength({ max: 160 })
      .withMessage('Meta description cannot exceed 160 characters')
  ],

  updatePost: [
    param('id').isMongoId().withMessage('Invalid post ID'),
    body('title')
      .optional()
      .trim()
      .isLength({ min: 10, max: 200 }),
    body('body')
      .optional()
      .notEmpty()
      .isLength({ min: 50 })
  ],

  // Comment validation
  createComment: [
    body('post')
      .isMongoId()
      .withMessage('Invalid post ID'),
    body('content')
      .trim()
      .isLength({ min: 1, max: 5000 })
      .withMessage('Comment must be 1-5000 characters'),
    body('parent')
      .optional()
      .isMongoId()
      .withMessage('Invalid parent comment ID')
  ],

  // Category validation
  createCategory: [
    body('name')
      .trim()
      .notEmpty()
      .isLength({ max: 50 })
      .withMessage('Category name cannot exceed 50 characters'),
    body('parent')
      .optional()
      .isMongoId()
      .withMessage('Invalid parent category ID')
  ],

  // Tag validation
  createTag: [
    body('name')
      .trim()
      .notEmpty()
      .isLength({ max: 30 })
      .withMessage('Tag name cannot exceed 30 characters')
      .matches(/^[a-zA-Z0-9\s-]+$/)
      .withMessage('Tag name can only contain letters, numbers, spaces, and hyphens')
  ],

  // Media validation
  uploadMedia: [
    body('alt')
      .optional()
      .trim()
      .isLength({ max: 200 })
      .withMessage('Alt text cannot exceed 200 characters'),
    body('title')
      .optional()
      .trim()
      .isLength({ max: 200 })
      .withMessage('Title cannot exceed 200 characters')
  ],

  // Search validation
  search: [
    query('q')
      .optional()
      .trim()
      .isLength({ min: 1, max: 100 })
      .withMessage('Search query must be 1-100 characters'),
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Page must be a positive integer'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be 1-100')
  ]
};

// Validation middleware
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array().map(err => ({
        field: err.path || err.param,
        message: err.msg,
        value: err.value
      }))
    });
  }
  next();
};

// Export validation rules and middleware
module.exports = {
  validationRules,
  validate,
  validationResult
};


