import express from 'express';
import multer from 'multer';
import cloudinary from '../utils/cloudinary';

const router = express.Router();

const storage = multer.memoryStorage();
const upload = multer({ storage });

// type: profile | cover | insurance
router.post('/upload', upload.single('image'), async (req, res) => {
  try {
    const type = req.query.type || 'profile';
    let folder = 'profile_photos';
    if (type === 'cover') folder = 'cover_photos';
    if (type === 'insurance') folder = 'insurance_docs';
    const stream = cloudinary.uploader.upload_stream(
      { folder, upload_preset: 'rektefe_rektagram.v1' },
      (error: any, result: any) => {
        if (error) {
          console.error('Cloudinary HATASI:', error); // Debug log
          return res.status(500).json({ error: error.message });
        }
        return res.json({ url: result.secure_url });
      }
    );
    stream.end(req.file?.buffer);
  } catch (err) {
    console.error('Genel upload.ts hatası:', err); // Debug log
    res.status(500).json({ error: (err as Error).message });
  }
});

export default router; 