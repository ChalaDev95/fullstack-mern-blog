require('dotenv').config();

const mongoose = require('mongoose');
const { connectDB, disconnectDB } = require('../config/database');
const { logger } = require('../utils/logger');
const Like = require('../models/Like');
const Subscription = require('../models/Subscription');
const ActivityLog = require('../models/ActivityLog');

const args = new Set(process.argv.slice(2));
const applyChanges = args.has('--apply');

const collectDuplicateIds = (documents, buildKey) => {
  const groups = new Map();
  const duplicateIds = [];

  for (const document of documents) {
    const key = buildKey(document);
    if (!groups.has(key)) {
      groups.set(key, []);
    }

    groups.get(key).push(document);
  }

  for (const group of groups.values()) {
    if (group.length <= 1) {
      continue;
    }

    group.sort((left, right) => new Date(left.createdAt) - new Date(right.createdAt));
    duplicateIds.push(...group.slice(1).map((document) => document._id));
  }

  return duplicateIds;
};

const auditLikes = async () => {
  const likes = await Like.find({}, '_id user post comment createdAt').lean();
  const invalidIds = likes
    .filter((like) => [like.post, like.comment].filter(Boolean).length !== 1)
    .map((like) => like._id);

  const validLikes = likes.filter((like) => [like.post, like.comment].filter(Boolean).length === 1);
  const duplicateIds = collectDuplicateIds(validLikes, (like) => {
    const targetType = like.post ? 'post' : 'comment';
    const targetId = String(like.post || like.comment);
    return `${String(like.user)}:${targetType}:${targetId}`;
  });

  return {
    model: 'Like',
    invalidIds,
    duplicateIds
  };
};

const auditSubscriptions = async () => {
  const subscriptions = await Subscription.find({}, '_id user post category tag createdAt').lean();
  const invalidIds = subscriptions
    .filter((subscription) => [subscription.post, subscription.category, subscription.tag].filter(Boolean).length !== 1)
    .map((subscription) => subscription._id);

  const validSubscriptions = subscriptions.filter((subscription) => {
    return [subscription.post, subscription.category, subscription.tag].filter(Boolean).length === 1;
  });

  const duplicateIds = collectDuplicateIds(validSubscriptions, (subscription) => {
    const targetType = subscription.post ? 'post' : subscription.category ? 'category' : 'tag';
    const targetId = String(subscription.post || subscription.category || subscription.tag);
    return `${String(subscription.user)}:${targetType}:${targetId}`;
  });

  return {
    model: 'Subscription',
    invalidIds,
    duplicateIds
  };
};

const auditActivityLogs = async () => {
  const allowedActions = new Set(ActivityLog.schema.path('action').enumValues);
  const invalidLogs = await ActivityLog.find({
    action: { $nin: Array.from(allowedActions) }
  }, '_id action').lean();

  return {
    model: 'ActivityLog',
    invalidIds: invalidLogs.map((log) => log._id),
    duplicateIds: []
  };
};

const applyAuditResult = async (Model, result) => {
  const idsToDelete = [...result.invalidIds, ...result.duplicateIds];

  if (idsToDelete.length === 0) {
    return 0;
  }

  const outcome = await Model.deleteMany({ _id: { $in: idsToDelete } });
  return outcome.deletedCount || 0;
};

const formatSummary = (result) => {
  const totalAffected = result.invalidIds.length + result.duplicateIds.length;
  return {
    model: result.model,
    invalid: result.invalidIds.length,
    duplicates: result.duplicateIds.length,
    totalAffected
  };
};

const run = async () => {
  try {
    await connectDB();

    const [likeAudit, subscriptionAudit, activityLogAudit] = await Promise.all([
      auditLikes(),
      auditSubscriptions(),
      auditActivityLogs()
    ]);

    const summaries = [likeAudit, subscriptionAudit, activityLogAudit].map(formatSummary);
    logger.info('Database integrity audit completed', {
      mode: applyChanges ? 'apply' : 'dry-run',
      summaries
    });

    if (!applyChanges) {
      console.log(JSON.stringify({
        mode: 'dry-run',
        summaries
      }, null, 2));
      return;
    }

    const [removedLikes, removedSubscriptions, removedActivityLogs] = await Promise.all([
      applyAuditResult(Like, likeAudit),
      applyAuditResult(Subscription, subscriptionAudit),
      applyAuditResult(ActivityLog, activityLogAudit)
    ]);

    console.log(JSON.stringify({
      mode: 'apply',
      removed: {
        likes: removedLikes,
        subscriptions: removedSubscriptions,
        activityLogs: removedActivityLogs
      },
      summaries
    }, null, 2));
  } catch (error) {
    logger.error('Database integrity repair failed', {
      error: error.message,
      stack: error.stack
    });
    process.exitCode = 1;
  } finally {
    if (mongoose.connection.readyState !== 0) {
      await disconnectDB();
    }
  }
};

run();