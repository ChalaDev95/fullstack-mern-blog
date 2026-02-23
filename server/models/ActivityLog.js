const mongoose = require('mongoose');

const activityLogSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  action: {
    type: String,
    required: true,
    enum: [
      'post.created',
      'post.updated',
      'post.deleted',
      'post.published',
      'post.scheduled',
      'page.created',
      'page.updated',
      'page.deleted',
      'comment.approved',
      'comment.rejected',
      'comment.deleted',
      'user.created',
      'user.updated',
      'user.deleted',
      'media.uploaded',
      'media.deleted',
      'settings.updated',
      'login',
      'logout'
    ]
  },
  resourceType: {
    type: String,
    enum: ['post', 'page', 'comment', 'user', 'media', 'settings', 'auth']
  },
  resourceId: {
    type: mongoose.Schema.Types.ObjectId
  },
  details: {
    type: mongoose.Schema.Types.Mixed
  },
  ipAddress: {
    type: String,
    select: false
  },
  userAgent: {
    type: String,
    select: false
  }
}, {
  timestamps: true
});

// Indexes for performance
activityLogSchema.index({ user: 1, createdAt: -1 });
activityLogSchema.index({ action: 1, createdAt: -1 });
activityLogSchema.index({ resourceType: 1, resourceId: 1 });

module.exports = mongoose.model('ActivityLog', activityLogSchema);

