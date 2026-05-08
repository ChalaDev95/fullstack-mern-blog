const mongoose = require('mongoose');

const subscriptionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  post: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Post',
    required: function() {
      return !this.category && !this.tag;
    }
  },
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: function() {
      return !this.post && !this.tag;
    }
  },
  tag: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tag',
    required: function() {
      return !this.post && !this.category;
    }
  },
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  unsubscribeToken: {
    type: String,
    required: true,
    unique: true
  },
  lastNotified: {
    type: Date
  }
}, {
  timestamps: true
});

subscriptionSchema.pre('validate', function(next) {
  const targets = [this.post, this.category, this.tag].filter(Boolean);

  if (targets.length !== 1) {
    this.invalidate('post', 'A subscription must reference exactly one target: post, category, or tag');
    this.invalidate('category', 'A subscription must reference exactly one target: post, category, or tag');
    this.invalidate('tag', 'A subscription must reference exactly one target: post, category, or tag');
  }

  next();
});

// Indexes
subscriptionSchema.index({ user: 1 });
subscriptionSchema.index({ post: 1 });
subscriptionSchema.index({ category: 1 });
subscriptionSchema.index({ tag: 1 });
subscriptionSchema.index({ user: 1, post: 1 }, { unique: true, sparse: true });
subscriptionSchema.index({ user: 1, category: 1 }, { unique: true, sparse: true });
subscriptionSchema.index({ user: 1, tag: 1 }, { unique: true, sparse: true });
subscriptionSchema.index({ email: 1 });
subscriptionSchema.index({ unsubscribeToken: 1 });

module.exports = mongoose.model('Subscription', subscriptionSchema);

