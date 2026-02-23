const mongoose = require('mongoose');

const postRevisionSchema = new mongoose.Schema({
  post: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Post',
    required: true
  },
  title: String,
  body: String,
  excerpt: String,
  featuredImage: mongoose.Schema.Types.Mixed,
  tags: [mongoose.Schema.Types.ObjectId],
  categories: [mongoose.Schema.Types.ObjectId],
  seo: mongoose.Schema.Types.Mixed,
  editedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  revisionNumber: {
    type: Number,
    required: true
  }
}, {
  timestamps: true
});

// Indexes
postRevisionSchema.index({ post: 1, createdAt: -1 });
postRevisionSchema.index({ editedBy: 1 });

module.exports = mongoose.model('PostRevision', postRevisionSchema);


