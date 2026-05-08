const mongoose = require('mongoose');
const { syncSlugOnDocument, syncSlugOnUpdate } = require('./helpers/modelUtils');

const pageSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Page title is required'],
    trim: true
  },
  slug: {
    type: String,
    unique: true,
    lowercase: true,
    trim: true
  },
  content: {
    type: String,
    required: [true, 'Page content is required']
  },
  template: {
    type: String,
    default: 'default'
  },
  isPublished: {
    type: Boolean,
    default: false
  },
  publishedAt: {
    type: Date
  },
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  seo: {
    metaTitle: String,
    metaDescription: String,
    canonicalUrl: String
  },
  order: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Generate slug
pageSchema.pre('save', function(next) {
  syncSlugOnDocument(this, 'title');
  next();
});

pageSchema.pre(['findOneAndUpdate', 'updateOne', 'updateMany'], function(next) {
  syncSlugOnUpdate(this.getUpdate(), 'title');
  next();
});

// Indexes
pageSchema.index({ slug: 1 });
pageSchema.index({ isPublished: 1 });

module.exports = mongoose.model('Page', pageSchema);


