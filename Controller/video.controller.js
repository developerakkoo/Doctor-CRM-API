import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// Get current directory (for ES Module)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const videoDir = path.join(__dirname, "../uploads/videos");

// Ensure folder exists
if (!fs.existsSync(videoDir)) {
  fs.mkdirSync(videoDir, { recursive: true });
}

export const uploadVideo = (req, res) => {
  const video = req.file;
  if (!video) return res.status(400).json({ message: "No video uploaded" });

  res.status(200).json({
    message: "Video uploaded successfully",
    filename: video.filename,
    url: `/api/videos/stream/${video.filename}`, // Send frontend-friendly stream URL
  });
};

export const streamVideo = (req, res) => {
  const filename = req.params.filename;
  const filePath = path.join(videoDir, filename);

  if (!fs.existsSync(filePath)) {
    return res.status(404).send("Video not found");
  }

  const stat = fs.statSync(filePath);
  const fileSize = stat.size;
  const range = req.headers.range;

  if (!range) {
    // Fallback: if no range, send entire file (not recommended for large files)
    res.writeHead(200, {
      "Content-Length": fileSize,
      "Content-Type": "video/mp4",
    });
    fs.createReadStream(filePath).pipe(res);
    return;
  }

  const parts = range.replace(/bytes=/, "").split("-");
  const start = parseInt(parts[0], 10);
  const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

  const chunksize = end - start + 1;
  const file = fs.createReadStream(filePath, { start, end });

  const head = {
    "Content-Range": `bytes ${start}-${end}/${fileSize}`,
    "Accept-Ranges": "bytes",
    "Content-Length": chunksize,
    "Content-Type": "video/mp4",
  };

  res.writeHead(206, head);
  file.pipe(res);
};