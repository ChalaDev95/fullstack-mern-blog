const mongoose = require('mongoose');
const {
  buildExcerpt,
  calculateReadingTime,
  stripHtml,
  syncSlugOnDocument,
  syncSlugOnUpdate
} = require('./helpers/modelUtils');

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
  syncSlugOnDocument(this, 'title');

  if (this.isModified('body')) {
    this.readingTime = calculateReadingTime(this.body);

    if (!this.isModified('excerpt')) {
      this.excerpt = buildExcerpt(this.body);
    }
  }

  if (this.isModified('excerpt') && this.excerpt) {
    this.excerpt = stripHtml(this.excerpt);
  }

  next();
});

postSchema.pre(['findOneAndUpdate', 'updateOne', 'updateMany'], function(next) {
  const update = this.getUpdate();
  syncSlugOnUpdate(update, 'title');

  const updatePayload = update?.$set && typeof update.$set === 'object' ? update.$set : update;

  if (updatePayload?.body) {
    updatePayload.readingTime = calculateReadingTime(updatePayload.body);

    if (!Object.prototype.hasOwnProperty.call(updatePayload, 'excerpt')) {
      updatePayload.excerpt = buildExcerpt(updatePayload.body);
    }
  }

  if (Object.prototype.hasOwnProperty.call(updatePayload || {}, 'excerpt') && updatePayload.excerpt) {
    updatePayload.excerpt = stripHtml(updatePayload.excerpt);
  }

  next();
});

// Calculate reading time
postSchema.methods.calculateReadingTime = function() {
  this.readingTime = calculateReadingTime(this.body);
  return this.readingTime;
};

// Auto-generate excerpt if not provided
postSchema.pre('save', function(next) {
  if (!this.excerpt && this.body) {
    this.excerpt = buildExcerpt(this.body);
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


