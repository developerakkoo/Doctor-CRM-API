import express from "express";
import multer from "multer";
import path from "path";
import { uploadVideo, streamVideo } from "../Controller/video.controller.js";

const router = express.Router();

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/videos");
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    cb(null, Date.now() + ext); // Unique filename
  },
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 1024 * 1024 * 1000 }, // 1GB
});

// Routes
router.post("/upload", upload.single("video"), uploadVideo);
router.get("/stream/:filename", streamVideo);

export default router;