require('dotenv').config();

const { connectDB, disconnectDB } = require('../config/database');
const User = require('../models/User');

const username = (process.env.BOOTSTRAP_ADMIN_USERNAME || 'admin').trim();
const email = (process.env.BOOTSTRAP_ADMIN_EMAIL || 'admin@local.dev').trim().toLowerCase();
const password = process.env.BOOTSTRAP_ADMIN_PASSWORD || 'Admin!2026Local#';

const validateInput = () => {
  if (!username || username.length < 3) {
    throw new Error('BOOTSTRAP_ADMIN_USERNAME must be at least 3 characters');
  }

  if (!/^\S+@\S+\.\S+$/.test(email)) {
    throw new Error('BOOTSTRAP_ADMIN_EMAIL must be a valid email address');
  }

  if (!password || password.length < 8) {
    throw new Error('BOOTSTRAP_ADMIN_PASSWORD must be at least 8 characters');
  }
};

const run = async () => {
  validateInput();
  await connectDB();

  const existingByEmail = await User.findOne({ email });
  const existingByUsername = await User.findOne({ username });
  const user = existingByEmail || existingByUsername;

  if (user) {
    user.username = username;
    user.email = email;
    user.role = 'admin';
    user.isActive = true;
    user.password = password;
    await user.save();

    console.log(JSON.stringify({
      action: 'updated',
      username,
      email,
      role: user.role
    }, null, 2));
    return;
  }

  const createdUser = await User.create({
    username,
    email,
    password,
    role: 'admin',
    isActive: true,
    isEmailVerified: true
  });

  console.log(JSON.stringify({
    action: 'created',
    username: createdUser.username,
    email: createdUser.email,
    role: createdUser.role
  }, null, 2));
};

run()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await disconnectDB();
  });