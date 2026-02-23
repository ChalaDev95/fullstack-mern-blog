const nodemailer = require('nodemailer');
const { logger } = require('./logger');

// Create transporter
const createTransporter = () => {
  if (process.env.SMTP_HOST) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_PORT == 465,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
  }
  
  // Development: use ethereal email or console
  if (process.env.NODE_ENV === 'development') {
    return nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      auth: {
        user: 'ethereal.user@ethereal.email',
        pass: 'ethereal.pass'
      }
    });
  }
  
  return null;
};

const transporter = createTransporter();

// Email templates
const templates = {
  welcome: (data) => ({
    subject: 'Welcome to CMS Platform',
    html: `
      <h1>Welcome, ${data.username}!</h1>
      <p>Thank you for joining our platform.</p>
      <p>Your account has been created successfully.</p>
    `,
    text: `Welcome, ${data.username}! Thank you for joining our platform.`
  }),

  passwordReset: (data) => ({
    subject: 'Password Reset Request',
    html: `
      <h1>Password Reset</h1>
      <p>You requested a password reset.</p>
      <p>Click the link below to reset your password:</p>
      <a href="${data.resetUrl}">Reset Password</a>
      <p>This link will expire in 10 minutes.</p>
      <p>If you didn't request this, please ignore this email.</p>
    `,
    text: `Password Reset: ${data.resetUrl}`
  }),

  emailVerification: (data) => ({
    subject: 'Verify Your Email',
    html: `
      <h1>Verify Your Email</h1>
      <p>Please verify your email address by clicking the link below:</p>
      <a href="${data.verificationUrl}">Verify Email</a>
      <p>If you didn't create an account, please ignore this email.</p>
    `,
    text: `Verify Email: ${data.verificationUrl}`
  }),

  commentNotification: (data) => ({
    subject: `New Comment on "${data.postTitle}"`,
    html: `
      <h1>New Comment</h1>
      <p>${data.authorName} commented on your post "${data.postTitle}":</p>
      <p>${data.commentContent}</p>
      <a href="${data.postUrl}">View Post</a>
    `,
    text: `New comment from ${data.authorName} on "${data.postTitle}"`
  }),

  postPublished: (data) => ({
    subject: `Your post "${data.postTitle}" has been published`,
    html: `
      <h1>Post Published</h1>
      <p>Your post "${data.postTitle}" has been published.</p>
      <a href="${data.postUrl}">View Post</a>
    `,
    text: `Your post "${data.postTitle}" has been published.`
  })
};

// Send email
const sendEmail = async (to, templateName, data) => {
  if (!transporter) {
    logger.warn('Email transporter not configured. Email not sent.', { to, templateName });
    return { success: false, message: 'Email service not configured' };
  }

  try {
    const template = templates[templateName];
    if (!template) {
      throw new Error(`Email template "${templateName}" not found`);
    }

    const emailContent = template(data);
    
    const info = await transporter.sendMail({
      from: process.env.EMAIL_FROM || 'noreply@cms.com',
      to,
      ...emailContent
    });

    logger.info('Email sent successfully', { to, templateName, messageId: info.messageId });
    return { success: true, messageId: info.messageId };
  } catch (error) {
    logger.error('Failed to send email', { to, templateName, error: error.message });
    return { success: false, error: error.message };
  }
};

// Queue email (for future BullMQ integration)
const queueEmail = async (to, templateName, data) => {
  // TODO: Integrate with BullMQ for email queue
  return sendEmail(to, templateName, data);
};

module.exports = {
  sendEmail,
  queueEmail,
  templates
};


