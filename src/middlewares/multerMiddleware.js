import multer from 'multer';
import path from 'path';

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const allowedExtensions = /jpeg|jpg|png|webp|gif|mp4|mov|avi|mkv|webm/;
  const allowedMimeTypes = /^image\/(jpeg|jpg|png|webp|gif)$|^video\/(mp4|quicktime|x-msvideo|x-matroska|webm)$/;

  const ext = path.extname(file.originalname).toLowerCase().replace('.', '');
  
  const extname = allowedExtensions.test(ext);
  const mimetype = allowedMimeTypes.test(file.mimetype);

  if (extname && mimetype) {
    return cb(null, true);
  } else {
    return cb(
      new Error("Invalid file type! Only images and videos are allowed!"),
      false
    );
  }
};

export const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: 100 * 1024 * 1024 },
});

// 💥 YAHAN ADD KAREIN (Export Error Handler Function)
export const handleMulterUpload = (uploadMiddleware) => {
  return (req, res, next) => {
    uploadMiddleware(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({
            success: false,
            message: "File size exceeds 100MB limit!"
          });
        }
        return res.status(400).json({ success: false, message: err.message });
      } else if (err) {
        return res.status(400).json({ success: false, message: err.message });
      }
      next();
    });
  };
};