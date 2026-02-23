const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const sharp = require('sharp');
const Media = require('../models/Media');
const { protect, authorize } = require('../middleware/auth');
const { logger } = require('../utils/logger');

const router = express.Router();

// Ensure upload directory exists
const uploadDir = process.env.UPLOAD_PATH || './uploads';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|webp|pdf|mp4|mp3|wav|ogg/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only images, PDFs, videos, and audio files are allowed.'));
  }
};

const upload = multer({
  storage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024 // 10MB default
  },
  fileFilter
});

// @route   POST /api/media/upload
// @desc    Upload media file
// @access  Private
router.post('/upload', protect, authorize('admin', 'editor', 'author'), upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    const fileUrl = `/uploads/${req.file.filename}`;
    let thumbnailUrl = null;
    let thumbnailPath = null;
    let dimensions = null;

    // Process images
    if (req.file.mimetype.startsWith('image/')) {
      try {
        const image = sharp(req.file.path);
        const metadata = await image.metadata();
        dimensions = { width: metadata.width, height: metadata.height };

        // Generate thumbnail
        const thumbnailFilename = `thumb-${req.file.filename}`;
        thumbnailPath = path.join(uploadDir, thumbnailFilename);
        await image
          .resize(300, 300, { fit: 'inside', withoutEnlargement: true })
          .toFile(thumbnailPath);
        thumbnailUrl = `/uploads/${thumbnailFilename}`;

        // Generate multiple sizes
        const sizes = { medium: 800, large: 1200 };
        for (const [sizeName, size] of Object.entries(sizes)) {
          const sizeFilename = `${sizeName}-${req.file.filename}`;
          const sizePath = path.join(uploadDir, sizeFilename);
          await image
            .resize(size, size, { fit: 'inside', withoutEnlargement: true })
            .toFile(sizePath);
        }
      } catch (error) {
        logger.error('Image processing error:', error);
      }
    }

    const media = await Media.create({
      filename: req.file.filename,
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
      size: req.file.size,
      path: req.file.path,
      url: fileUrl,
      thumbnail: thumbnailUrl ? { url: thumbnailUrl, path: thumbnailPath } : undefined,
      alt: req.body.alt || '',
      title: req.body.title || req.file.originalname,
      uploadedBy: req.user.id,
      dimensions
    });

    res.status(201).json({
      success: true,
      data: media
    });
  } catch (error) {
    // Delete uploaded file on error
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    next(error);
  }
});

// @route   GET /api/media
// @desc    Get all media
// @access  Private
router.get('/', protect, authorize('admin', 'editor', 'author'), async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const query = {};
    if (req.query.type) {
      query.mimeType = { $regex: req.query.type };
    }
    if (req.query.search) {
      query.$or = [
        { originalName: { $regex: req.query.search, $options: 'i' } },
        { title: { $regex: req.query.search, $options: 'i' } }
      ];
    }

    const media = await Media.find(query)
      .populate('uploadedBy', 'username')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Media.countDocuments(query);

    res.json({
      success: true,
      count: media.length,
      total,
      page,
      pages: Math.ceil(total / limit),
      data: media
    });
  } catch (error) {
    next(error);
  }
});

// @route   DELETE /api/media/:id
// @desc    Delete media
// @access  Private
router.delete('/:id', protect, authorize('admin', 'editor'), async (req, res, next) => {
  try {
    const media = await Media.findById(req.params.id);
    if (!media) {
      return res.status(404).json({
        success: false,
        message: 'Media not found'
      });
    }

    // Delete files
    if (fs.existsSync(media.path)) {
      fs.unlinkSync(media.path);
    }
    if (media.thumbnail && media.thumbnail.path && fs.existsSync(media.thumbnail.path)) {
      fs.unlinkSync(media.thumbnail.path);
    }

    await media.deleteOne();

    res.json({
      success: true,
      message: 'Media deleted'
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;


