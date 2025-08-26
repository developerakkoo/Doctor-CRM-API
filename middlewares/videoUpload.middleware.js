import multer from 'multer';
import fs from 'fs';
import path from 'path';

// ✅ Ensure upload directory exists
const uploadDir = './uploads/videos';
fs.mkdirSync(uploadDir, { recursive: true });

// ✅ Multer storage setup
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
    cb(null, uniqueName);
  }
});

// ✅ File type validation
const videoFilter = (req, file, cb) => {
  const allowedTypes = ['video/mp4', 'video/mkv', 'video/webm'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only MP4, MKV, and WEBM video files are allowed'), false);
  }
};

// ✅ Export middleware
const uploadVideoMiddleware = multer({
  storage,
  fileFilter: videoFilter,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB
  }
}).single('video');

export default uploadVideoMiddleware;
