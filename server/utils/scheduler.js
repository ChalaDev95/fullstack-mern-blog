const Bull = require('bull');
const Post = require('../models/Post');
const { logger } = require('./logger');
const { sendEmail } = require('./email');
const User = require('../models/User');

// Create Bull queue for scheduled publishing
const publishQueue = new Bull('publish-posts', {
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379,
    password: process.env.REDIS_PASSWORD
  }
});

// Process scheduled posts
publishQueue.process(async (job) => {
  const { postId } = job.data;
  
  try {
    const post = await Post.findById(postId);
    
    if (!post) {
      logger.warn(`Post ${postId} not found for scheduled publishing`);
      return;
    }

    if (post.status === 'scheduled' && post.publishDate <= new Date()) {
      post.status = 'published';
      await post.save();
      
      logger.info(`Post ${postId} published successfully`);
      
      // Notify subscribers if enabled
      if (process.env.ENABLE_EMAIL_NOTIFICATIONS === 'true') {
        const author = await User.findById(post.author);
        // Send notification to subscribers (implement subscription logic)
        // This would be handled by a separate subscription service
      }
    }
  } catch (error) {
    logger.error(`Error publishing post ${postId}:`, error);
    throw error;
  }
});

// Add post to publishing queue
const schedulePost = async (postId, publishDate) => {
  const delay = new Date(publishDate).getTime() - Date.now();
  
  if (delay > 0) {
    await publishQueue.add(
      { postId },
      {
        delay,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000
        }
      }
    );
    logger.info(`Post ${postId} scheduled for ${publishDate}`);
  } else {
    // Publish immediately if date is in the past
    await publishQueue.add({ postId }, { delay: 0 });
  }
};

// Remove scheduled job
const unschedulePost = async (postId) => {
  const jobs = await publishQueue.getJobs(['delayed', 'waiting']);
  for (const job of jobs) {
    if (job.data.postId === postId.toString()) {
      await job.remove();
      logger.info(`Removed scheduled job for post ${postId}`);
    }
  }
};

// Clean up completed jobs
publishQueue.on('completed', (job) => {
  logger.info(`Job ${job.id} completed`);
});

publishQueue.on('failed', (job, err) => {
  logger.error(`Job ${job.id} failed:`, err);
});

module.exports = {
  schedulePost,
  unschedulePost,
  publishQueue
};

