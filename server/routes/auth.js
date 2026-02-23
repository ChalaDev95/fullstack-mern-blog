const express = require('express');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const generateToken = require('../utils/generateToken');
const { protect } = require('../middleware/auth');
const { sanitizeText } = require('../utils/sanitize');
const { catchAsync, AppError } = require('../utils/errorHandler');
const crypto = require('crypto');

const ensureValid = (req) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const validationError = new AppError('Validation failed', 400);
    validationError.details = errors.array();
    throw validationError;
  }
};

const router = express.Router();

// @route   POST /api/auth/register
// @desc    Register user
// @access  Public
router.post('/register', [
  body('username').trim().isLength({ min: 3, max: 30 }).withMessage('Username must be 3-30 characters'),
  body('email').isEmail().normalizeEmail().withMessage('Please provide a valid email'),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
], catchAsync(async (req, res) => {
  ensureValid(req);

  const { username, email, password } = req.body;

  const userExists = await User.findOne({ $or: [{ email: email.toLowerCase() }, { username: sanitizeText(username) }] });
  if (userExists) {
    throw new AppError('User already exists with this email or username', 400);
  }

  const user = await User.create({
    username: sanitizeText(username),
    email: email.toLowerCase(),
    password
  });

  const token = generateToken(user._id);

  res.status(201).json({
    success: true,
    token,
    user: {
      id: user._id,
      username: user.username,
      email: user.email,
      role: user.role,
      avatar: user.avatar
    }
  });
}));

// @route   POST /api/auth/login
// @desc    Login user
// @access  Public
router.post('/login', [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty()
], catchAsync(async (req, res) => {
  ensureValid(req);

  const { email, password } = req.body;

  const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
  if (!user) {
    throw new AppError('Invalid credentials', 401);
  }

  if (user.isLocked()) {
    throw new AppError('Account temporarily locked due to too many failed login attempts', 423);
  }

  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    await user.incLoginAttempts();
    throw new AppError('Invalid credentials', 401);
  }

  if (user.loginAttempts > 0) {
    await user.resetLoginAttempts();
  }

  const token = generateToken(user._id);

  res.json({
    success: true,
    token,
    user: {
      id: user._id,
      username: user.username,
      email: user.email,
      role: user.role,
      avatar: user.avatar
    }
  });
}));

// @route   GET /api/auth/me
// @desc    Get current user
// @access  Private
router.get('/me', protect, catchAsync(async (req, res) => {
  const user = await User.findById(req.user.id);
  res.json({
    success: true,
    user
  });
}));

// @route   POST /api/auth/forgot-password
// @desc    Forgot password
// @access  Public
router.post('/forgot-password', [
  body('email').isEmail().normalizeEmail()
], catchAsync(async (req, res) => {
  ensureValid(req);

  const user = await User.findOne({ email: req.body.email.toLowerCase() });
  if (!user) {
    return res.json({
      success: true,
      message: 'If that email exists, a password reset link has been sent'
    });
  }

  const resetToken = crypto.randomBytes(32).toString('hex');
  user.passwordResetToken = crypto.createHash('sha256').update(resetToken).digest('hex');
  user.passwordResetExpires = Date.now() + 10 * 60 * 1000;
  await user.save({ validateBeforeSave: false });

  // Dev helper: Log token since we don't have email service configured yet
  if (process.env.NODE_ENV === 'development') {
    console.log('--- PASSWORD RESET TOKEN ---');
    console.log(`Token: ${resetToken}`);
    console.log('----------------------------');
  }

  res.json({
    success: true,
    message: 'If that email exists, a password reset link has been sent'
  });
}));

// @route   POST /api/auth/reset-password
// @desc    Reset password
// @access  Public
router.post('/reset-password', [
  body('token').notEmpty(),
  body('password').isLength({ min: 8 })
], catchAsync(async (req, res) => {
  ensureValid(req);

  const hashedToken = crypto.createHash('sha256').update(req.body.token).digest('hex');
  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() }
  });

  if (!user) {
    throw new AppError('Invalid or expired token', 400);
  }

  user.password = req.body.password;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  await user.save();

  const token = generateToken(user._id);

  res.json({
    success: true,
    token,
    message: 'Password reset successful'
  });
}));

module.exports = router;
