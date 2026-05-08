const mongoose = require('mongoose');
const { syncSlugOnDocument, syncSlugOnUpdate } = require('./helpers/modelUtils');

const tagSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Tag name is required'],
    unique: true,
    trim: true,
    lowercase: true,
    maxlength: [30, 'Tag name cannot exceed 30 characters']
  },
  slug: {
    type: String,
    unique: true,
    lowercase: true,
    trim: true
  },
  description: {
    type: String,
    maxlength: [300, 'Description cannot exceed 300 characters']
  },
  postsCount: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Generate slug
tagSchema.pre('save', function(next) {
  syncSlugOnDocument(this, 'name');
  next();
});

tagSchema.pre(['findOneAndUpdate', 'updateOne', 'updateMany'], function(next) {
  syncSlugOnUpdate(this.getUpdate(), 'name');
  next();
});

// Indexes
tagSchema.index({ slug: 1 });
tagSchema.index({ name: 1 });

module.exports = mongoose.model('Tag', tagSchema);

