const mongoose = require('mongoose');
const { syncSlugOnDocument, syncSlugOnUpdate } = require('./helpers/modelUtils');

const categorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Category name is required'],
    unique: true,
    trim: true,
    maxlength: [50, 'Category name cannot exceed 50 characters']
  },
  slug: {
    type: String,
    unique: true,
    lowercase: true,
    trim: true
  },
  description: {
    type: String,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  parent: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    default: null
  },
  postsCount: {
    type: Number,
    default: 0
  },
  image: {
    url: String,
    alt: String
  }
}, {
  timestamps: true
});

// Generate slug
categorySchema.pre('save', function(next) {
  syncSlugOnDocument(this, 'name');
  next();
});

categorySchema.pre(['findOneAndUpdate', 'updateOne', 'updateMany'], function(next) {
  syncSlugOnUpdate(this.getUpdate(), 'name');
  next();
});

// Indexes
categorySchema.index({ slug: 1 });
categorySchema.index({ parent: 1 });

module.exports = mongoose.model('Category', categorySchema);


