const express = require('express');
const multer = require('multer');
const cloudinary = require('../utils/cloudinary');
const router = express.Router();

const storage = multer.memoryStorage();
const upload = multer({ storage });

router.post('/upload', upload.single('image'), async (req, res) => {
  try {
    console.log('Dosya:', req.file); // Debug log
    const stream = cloudinary.uploader.upload_stream(
      { folder: 'profile_photos', upload_preset: 'rektefe_rektagram.v1' },
      (error, result) => {
        if (error) {
          console.error('Cloudinary HATASI:', error); // Debug log
          return res.status(500).json({ error: error.message });
        }
        return res.json({ url: result.secure_url });
      }
    );
    stream.end(req.file.buffer);
  } catch (err) {
    console.error('Genel upload.js hatası:', err); // Debug log
    res.status(500).json({ error: err.message });
  }
});

module.exports = router; 