const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const { logger } = require('./logger');

// Storage strategies
const STORAGE_TYPES = {
  LOCAL: 'local',
  CLOUDINARY: 'cloudinary',
  S3: 's3',
  SUPABASE: 'supabase',
  FIREBASE: 'firebase'
};

class MediaStorage {
  constructor() {
    this.storageType = process.env.MEDIA_STORAGE || STORAGE_TYPES.LOCAL;
    this.initializeStorage();
  }

  initializeStorage() {
    switch (this.storageType) {
      case STORAGE_TYPES.CLOUDINARY:
        this.cloudinary = require('cloudinary').v2;
        this.cloudinary.config({
          cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
          api_key: process.env.CLOUDINARY_API_KEY,
          api_secret: process.env.CLOUDINARY_API_SECRET
        });
        break;
      case STORAGE_TYPES.S3:
        this.s3 = require('aws-sdk').S3;
        this.s3Client = new this.s3({
          accessKeyId: process.env.AWS_ACCESS_KEY_ID,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
          region: process.env.AWS_REGION
        });
        this.s3Bucket = process.env.AWS_S3_BUCKET;
        break;
    }
  }

  // Validate file
  validateFile(file) {
    const allowedMimeTypes = [
      'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
      'image/svg+xml',
      'video/mp4', 'video/webm',
      'audio/mpeg', 'audio/wav', 'audio/ogg',
      'application/pdf'
    ];

    const maxSize = parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024; // 10MB

    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new Error(`File type ${file.mimetype} not allowed`);
    }

    if (file.size > maxSize) {
      throw new Error(`File size exceeds ${maxSize / 1024 / 1024}MB limit`);
    }

    return true;
  }

  // Process image (resize, optimize)
  async processImage(filePath, options = {}) {
    const {
      thumbnail = { width: 300, height: 300 },
      medium = { width: 800, height: 800 },
      large = { width: 1200, height: 1200 }
    } = options;

    const results = {};

    try {
      const image = sharp(filePath);
      const metadata = await image.metadata();

      // Generate thumbnail
      if (thumbnail) {
        const thumbPath = filePath.replace(/(\.[\w\d]+)$/, '_thumb$1');
        await image
          .clone()
          .resize(thumbnail.width, thumbnail.height, {
            fit: 'inside',
            withoutEnlargement: true
          })
          .webp({ quality: 80 })
          .toFile(thumbPath);
        results.thumbnail = thumbPath;
      }

      // Generate medium size
      if (medium) {
        const mediumPath = filePath.replace(/(\.[\w\d]+)$/, '_medium$1');
        await image
          .clone()
          .resize(medium.width, medium.height, {
            fit: 'inside',
            withoutEnlargement: true
          })
          .webp({ quality: 85 })
          .toFile(mediumPath);
        results.medium = mediumPath;
      }

      // Generate large size
      if (large) {
        const largePath = filePath.replace(/(\.[\w\d]+)$/, '_large$1');
        await image
          .clone()
          .resize(large.width, large.height, {
            fit: 'inside',
            withoutEnlargement: true
          })
          .webp({ quality: 90 })
          .toFile(largePath);
        results.large = largePath;
      }

      results.original = filePath;
      results.dimensions = { width: metadata.width, height: metadata.height };

      return results;
    } catch (error) {
      logger.error('Image processing error', { error: error.message, filePath });
      throw error;
    }
  }

  // Upload to local storage
  async uploadLocal(file, folder = 'uploads') {
    const uploadDir = path.join(process.cwd(), folder);
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const filename = `${Date.now()}-${Math.round(Math.random() * 1E9)}${path.extname(file.originalname)}`;
    const filepath = path.join(uploadDir, filename);

    await fs.promises.writeFile(filepath, file.buffer);

    const url = `/uploads/${filename}`;
    return { url, path: filepath, filename };
  }

  // Upload to Cloudinary
  async uploadCloudinary(file, folder = 'cms') {
    return new Promise((resolve, reject) => {
      const uploadStream = this.cloudinary.uploader.upload_stream(
        {
          folder,
          resource_type: 'auto',
          transformation: [
            { width: 1200, height: 1200, crop: 'limit', quality: 'auto' }
          ]
        },
        (error, result) => {
          if (error) {
            reject(error);
          } else {
            resolve({
              url: result.secure_url,
              publicId: result.public_id,
              width: result.width,
              height: result.height
            });
          }
        }
      );

      file.stream.pipe(uploadStream);
    });
  }

  // Upload to S3
  async uploadS3(file, folder = 'cms') {
    const filename = `${Date.now()}-${Math.round(Math.random() * 1E9)}${path.extname(file.originalname)}`;
    const key = `${folder}/${filename}`;

    const params = {
      Bucket: this.s3Bucket,
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype,
      ACL: 'public-read'
    };

    const result = await this.s3Client.upload(params).promise();
    
    return {
      url: result.Location,
      key: result.Key,
      bucket: result.Bucket
    };
  }

  // Main upload method
  async upload(file, options = {}) {
    this.validateFile(file);

    let result;

    switch (this.storageType) {
      case STORAGE_TYPES.CLOUDINARY:
        result = await this.uploadCloudinary(file, options.folder);
        break;
      case STORAGE_TYPES.S3:
        result = await this.uploadS3(file, options.folder);
        break;
      default:
        result = await this.uploadLocal(file, options.folder);
        
        // Process image if it's an image
        if (file.mimetype.startsWith('image/')) {
          const processed = await this.processImage(result.path, options.sizes);
          result.sizes = processed;
        }
    }

    return {
      ...result,
      originalName: file.originalname,
      mimeType: file.mimetype,
      size: file.size
    };
  }

  // Delete file
  async delete(fileUrl, filePath) {
    try {
      switch (this.storageType) {
        case STORAGE_TYPES.CLOUDINARY:
          const publicId = fileUrl.split('/').pop().split('.')[0];
          await this.cloudinary.uploader.destroy(publicId);
          break;
        case STORAGE_TYPES.S3:
          const key = filePath || fileUrl.split('.com/')[1];
          await this.s3Client.deleteObject({
            Bucket: this.s3Bucket,
            Key: key
          }).promise();
          break;
        default:
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            // Delete processed versions
            const ext = path.extname(filePath);
            const base = filePath.replace(ext, '');
            ['_thumb', '_medium', '_large'].forEach(suffix => {
              const processedPath = `${base}${suffix}${ext}`;
              if (fs.existsSync(processedPath)) {
                fs.unlinkSync(processedPath);
              }
            });
          }
      }
      return { success: true };
    } catch (error) {
      logger.error('File deletion error', { error: error.message, fileUrl });
      throw error;
    }
  }

  // Generate pre-signed URL (for S3)
  async getPresignedUrl(key, expiresIn = 3600) {
    if (this.storageType !== STORAGE_TYPES.S3) {
      return null;
    }

    return this.s3Client.getSignedUrlPromise('getObject', {
      Bucket: this.s3Bucket,
      Key: key,
      Expires: expiresIn
    });
  }
}

module.exports = new MediaStorage();


