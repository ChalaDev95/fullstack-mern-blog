const mongoose = require('mongoose');
const slugify = require('slugify');

const postSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Title is required'],
    trim: true,
    minlength: [10, 'Title must be at least 10 characters'],
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  slug: {
    type: String,
    unique: true,
    lowercase: true,
    trim: true
  },
  body: {
    type: String,
    required: [true, 'Body is required']
  },
  excerpt: {
    type: String,
    maxlength: [500, 'Excerpt cannot exceed 500 characters']
  },
  featuredImage: {
    url: String,
    alt: String,
    sizes: {
      thumbnail: String,
      medium: String,
      large: String
    }
  },
  tags: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tag'
  }],
  categories: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category'
  }],
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  coAuthors: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  status: {
    type: String,
    enum: ['draft', 'scheduled', 'published', 'archived'],
    default: 'draft'
  },
  publishDate: {
    type: Date,
    default: Date.now
  },
  lastModified: {
    type: Date,
    default: Date.now
  },
  readingTime: {
    type: Number, // in minutes
    default: 0
  },
  // SEO fields
  seo: {
    metaTitle: {
      type: String,
      maxlength: [60, 'Meta title should not exceed 60 characters']
    },
    metaDescription: {
      type: String,
      maxlength: [160, 'Meta description should not exceed 160 characters']
    },
    canonicalUrl: String,
    ogImage: String,
    ogType: {
      type: String,
      default: 'article'
    },
    twitterCard: {
      type: String,
      enum: ['summary', 'summary_large_image'],
      default: 'summary_large_image'
    },
    structuredData: {
      type: mongoose.Schema.Types.Mixed
    }
  },
  commentsCount: {
    type: Number,
    default: 0
  },
  viewsCount: {
    type: Number,
    default: 0
  },
  likesCount: {
    type: Number,
    default: 0
  },
  passwordProtected: {
    enabled: {
      type: Boolean,
      default: false
    },
    password: {
      type: String,
      select: false
    }
  },
  pinned: {
    type: Boolean,
    default: false
  },
  template: {
    type: String,
    default: 'default'
  }
}, {
  timestamps: true
});

// Generate slug before saving
postSchema.pre('save', function(next) {
  if (this.isModified('title') && !this.slug) {
    this.slug = slugify(this.title, { lower: true, strict: true });
  }
  next();
});

// Calculate reading time
postSchema.methods.calculateReadingTime = function() {
  const wordsPerMinute = 200;
  const text = this.body.replace(/<[^>]*>/g, ''); // Remove HTML tags
  const wordCount = text.split(/\s+/).length;
  this.readingTime = Math.ceil(wordCount / wordsPerMinute);
  return this.readingTime;
};

// Auto-generate excerpt if not provided
postSchema.pre('save', function(next) {
  if (!this.excerpt && this.body) {
    const text = this.body.replace(/<[^>]*>/g, ''); // Remove HTML
    this.excerpt = text.substring(0, 300).trim() + (text.length > 300 ? '...' : '');
  }
  next();
});

// Indexes for performance
postSchema.index({ slug: 1 });
postSchema.index({ status: 1, publishDate: -1 });
postSchema.index({ author: 1 });
postSchema.index({ tags: 1 });
postSchema.index({ categories: 1 });
postSchema.index({ pinned: -1, publishDate: -1 });

module.exports = mongoose.model('Post', postSchema);


