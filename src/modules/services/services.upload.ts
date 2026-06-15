import multer from 'multer';
import { AppError } from '../../common/errors/AppError.js';
import { ErrorCodes } from '../../common/errors/error-codes.js';

// Setup memory storage to hold files in memory (avoid local disk usage on Render)
const storage = multer.memoryStorage();

// Allowed image formats
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

// File filter to restrict uploads to allowed mime types
const fileFilter: multer.Options['fileFilter'] = (req, file, callback) => {
  if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    callback(null, true);
  } else {
    callback(
      new AppError(
        'صيغة الملف غير مدعومة. يسمح فقط بصور JPEG و PNG و WebP.',
        400,
        ErrorCodes.BAD_REQUEST
      )
    );
  }
};

// Configure multer instance
export const servicesUpload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
});
