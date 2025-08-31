import express from 'express';
import multer from 'multer';
import cloudinary from '../utils/cloudinary';
import { Request, Response } from 'express';

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

// ===== ADS ENDPOINT =====

/**
 * @swagger
 * /api/ads:
 *   get:
 *     summary: Reklamları getir
 *     description: Sistemdeki tüm reklamları listeler
 *     tags:
 *       - Ads
 *     responses:
 *       200:
 *         description: Reklamlar başarıyla getirildi
 *       500:
 *         description: Sunucu hatası
 */
router.get('/ads', async (req: Request, res: Response) => {
  try {
    // Şimdilik örnek reklam verileri döndürüyoruz
    const ads = [
      {
        id: 1,
        title: 'Özel Bakım Kampanyası',
        description: 'Tüm araçlar için %20 indirim',
        imageUrl: 'https://example.com/ad1.jpg',
        link: 'https://example.com/campaign1',
        active: true,
        startDate: '2025-01-01',
        endDate: '2025-12-31'
      },
      {
        id: 2,
        title: 'Yeni Müşteri İndirimi',
        description: 'İlk randevunuzda %15 indirim',
        imageUrl: 'https://example.com/ad2.jpg',
        link: 'https://example.com/campaign2',
        active: true,
        startDate: '2025-01-01',
        endDate: '2025-12-31'
      }
    ];
    
    res.json({
      success: true,
      data: ads,
      message: 'Reklamlar başarıyla getirildi'
    });
  } catch (error: any) {
    console.error('Ads getirme hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Reklamlar getirilirken hata oluştu',
      error: error.message
    });
  }
});

export default router; 