import multer from 'multer';
import path from 'path';

// 1. Pure Memory Storage Configuration
// Pure memory storage: file buffer RAM me rehti hai so we can stream directly to APIs
const storage = multer.memoryStorage();

// 2. File Filter (Images + Videos allowed)
const fileFilter = (req, file, cb) => {
  // Allowed extensions regex
  const allowedExtensions = /jpeg|jpg|png|webp|gif|mp4|mov|avi|mkv|webm/;

  // Allowed mimetypes regex
  const allowedMimeTypes = /^image\/(jpeg|jpg|png|webp|gif)$|^video\/(mp4|quicktime|x-msvideo|x-matroska|webm)$/;

  const extname = allowedExtensions.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedMimeTypes.test(file.mimetype);

  if (extname && mimetype) {
    return cb(null, true);
  } else {
    cb(
      new Error("Invalid file type! Only images (jpg, jpeg, png, webp, gif) and videos (mp4, mov, avi, mkv, webm) are allowed!"),
      false
    );
  }
};

// 3. Export Multer instance
export const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: 100 * 1024 * 1024 }, // Max 100MB file limit for videos
});


export const handleMulterUpload = (fieldName) => {
  return (req, res, next) => {
    const uploadSingle = upload.single(fieldName);

    uploadSingle(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        // Multer specific errors (e.g., File too large)
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({
            success: false,
            message: 'File size limit exceeded! Maximum allowed size is 100MB.',
          });
        }
        return res.status(400).json({
          success: false,
          message: `Upload error: ${err.message}`,
        });
      } else if (err) {
        // Custom File Filter Error (e.g., Invalid file type)
        return res.status(400).json({
          success: false,
          message: err.message,
        });
      }

      // No error, proceed to controller
      next();
    });
  };
};