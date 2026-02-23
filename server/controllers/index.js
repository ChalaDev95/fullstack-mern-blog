/**
 * Controllers layer - Handle HTTP requests and responses
 * This layer coordinates between routes and services, handling request/response logic
 */

const PostController = require('./postController');
const UserController = require('./userController');
const AuthController = require('./authController');
const MediaController = require('./mediaController');
const CommentController = require('./commentController');
const CategoryController = require('./categoryController');
const TagController = require('./tagController');

module.exports = {
  PostController,
  UserController,
  AuthController,
  MediaController,
  CommentController,
  CategoryController,
  TagController
};
