const ActivityLog = require('../models/ActivityLog');
const { logger } = require('./logger');

/**
 * Log user activity
 * @param {Object} options - Activity log options
 * @param {String} options.userId - User ID
 * @param {String} options.action - Action type
 * @param {String} options.resourceType - Type of resource
 * @param {String} options.resourceId - Resource ID
 * @param {Object} options.details - Additional details
 * @param {String} options.ipAddress - IP address
 * @param {String} options.userAgent - User agent
 */
const logActivity = async ({
  userId,
  action,
  resourceType = null,
  resourceId = null,
  details = {},
  ipAddress = null,
  userAgent = null
}) => {
  try {
    await ActivityLog.create({
      user: userId,
      action,
      resourceType,
      resourceId,
      details,
      ipAddress,
      userAgent
    });
  } catch (error) {
    // Don't throw error, just log it
    logger.error('Failed to log activity:', error);
  }
};

module.exports = { logActivity };

