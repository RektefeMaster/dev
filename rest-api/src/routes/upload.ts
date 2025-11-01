import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { Request, Response } from 'express';
import { auth } from '../middleware/optimizedAuth';
import cloudinary, { isCloudinaryConfigured } from '../utils/cloudinary';
import { Readable } from 'stream';

const router = express.Router();

// Memory storage (Cloudinary için)
const memoryStorage = multer.memoryStorage();

// Local dosya sistemi için storage (fallback)
const diskStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const type = req.query.type || 'profile';
    let folder = 'uploads/profile_photos';
    if (type === 'cover') folder = 'uploads/cover_photos';
    if (type === 'insurance') folder = 'uploads/insurance_docs';
    if (type === 'fault_report') folder = 'uploads/fault_reports';
    if (type === 'parts') folder = 'uploads/parts';
    
    // Klasör yoksa oluştur
    if (!fs.existsSync(folder)) {
      fs.mkdirSync(folder, { recursive: true });
    }
    cb(null, folder);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

// Dosya türü ve boyut kısıtları
const allowedMimeTypes = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif'
]);

// Upload middleware (memory storage - Cloudinary için)
const uploadMemory = multer({ 
  storage: memoryStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Sadece resim dosyaları yüklenebilir (JPEG, PNG, WEBP, GIF)'));
    }
  }
});

// Upload middleware (disk storage - local fallback)
const uploadDisk = multer({ 
  storage: diskStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    if (!allowedMimeTypes.has(file.mimetype)) {
      return cb(new Error('Sadece resim dosyaları yüklenebilir'));
    }
    cb(null, true);
  }
});

// Cloudinary'ye yükleme fonksiyonu
const uploadToCloudinary = (buffer: Buffer, folder: string): Promise<any> => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: `rektefe/${folder}`,
        resource_type: 'image',
        transformation: [
          { width: 1000, height: 1000, crop: 'limit' },
          { quality: 'auto' }
        ]
      },
      (error, result) => {
        if (error) reject(error);
        else resolve(result);
      }
    );
    
    const readable = Readable.from(buffer);
    readable.pipe(uploadStream);
  });
};

// type: profile | cover | insurance | fault_report | parts
router.post('/upload', auth, uploadDisk.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Dosya yüklenmedi' });
    }

    // Local URL oluştur (dinamik)
    const protocol = (req.headers['x-forwarded-proto'] as string) || req.protocol;
    const host = req.get('host');
    const baseUrl = `${protocol}://${host}`;
    const normalizedPath = req.file.path.replace(/\\/g, '/');
    const fileUrl = `${baseUrl}/${normalizedPath}`;
    
    res.json({ 
      url: fileUrl,
      path: req.file.path,
      filename: req.file.filename
    });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// ===== PARTS PHOTO UPLOAD (Cloudinary) =====

/**
 * POST /api/upload/parts
 * Parça fotoğraflarını yükle (Cloudinary)
 */
router.post('/parts', auth, uploadMemory.single('image'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Fotoğraf yüklenmedi'
      });
    }

    // Cloudinary konfigürasyon kontrolü
    if (!isCloudinaryConfigured()) {
      console.error('❌ Cloudinary credentials eksik - parça fotoğrafı yüklenemedi');
      return res.status(500).json({
        success: false,
        message: 'Fotoğraf yükleme servisi yapılandırılmamış'
      });
    }

    // Cloudinary'ye yükle
    console.log('📸 Parça fotoğrafı yükleniyor...');
    const result = await uploadToCloudinary(req.file.buffer, 'parts');
    console.log('✅ Cloudinary upload başarılı:', result.secure_url);

    return res.json({
      success: true,
      data: {
        url: result.secure_url,
        publicId: result.public_id,
        width: result.width,
        height: result.height
      },
      message: 'Fotoğraf başarıyla yüklendi'
    });

  } catch (error: any) {
    console.error('❌ Parça fotoğrafı yükleme hatası:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Fotoğraf yüklenemedi'
    });
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
    res.status(500).json({
      success: false,
      message: 'Reklamlar getirilirken hata oluştu',
      error: error.message
    });
  }
});

// ===== CAMPAIGNS ENDPOINT =====

/**
 * @swagger
 * /api/campaigns:
 *   get:
 *     summary: Kampanyaları getir
 *     description: Sistemdeki tüm aktif kampanyaları listeler
 *     tags:
 *       - Campaigns
 *     responses:
 *       200:
 *         description: Kampanyalar başarıyla getirildi
 *       500:
 *         description: Sunucu hatası
 */
router.get('/campaigns', async (req: Request, res: Response) => {
  try {
    // Test kampanya verileri - gerçekçi ve test edilebilir
    const campaigns = [
      {
        id: 1,
        title: 'Kış Lastiği Değişim Kampanyası',
        description: 'Tüm marka lastiklerde %25 indirim. Profesyonel montaj ve balans dahil.',
        image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&h=400&fit=crop',
        company: 'Lastik Dünyası',
        companyLogo: 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=100&h=100&fit=crop',
        validUntil: '2025-03-31',
        discount: '%25 İndirim',
        conditions: ['Minimum 4 lastik alımı', 'Montaj ve balans dahil', 'Geçerli tarih: 31 Mart 2025'],
        serviceType: 'Lastik Değişimi',
        location: {
          city: 'İstanbul',
          district: 'Kadıköy'
        },
        contactInfo: {
          phone: '+90 216 123 45 67',
          address: 'Moda Caddesi No:123, Kadıköy/İstanbul'
        },
        rating: 4.8,
        reviewCount: 156,
        isVerified: true
      },
      {
        id: 2,
        title: 'Motor Yağı Değişim Paketi',
        description: 'Premium motor yağı + filtre değişimi + kontrol. Tüm markalar için geçerli.',
        image: 'https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?w=800&h=400&fit=crop',
        company: 'Oto Servis Merkezi',
        companyLogo: 'https://images.unsplash.com/photo-1581094794329-c8112a89af12?w=100&h=100&fit=crop',
        validUntil: '2025-02-28',
        discount: '%30 İndirim',
        conditions: ['Sadece randevulu hizmet', 'Yağ ve filtre dahil', 'Geçerli tarih: 28 Şubat 2025'],
        serviceType: 'Motor Bakımı',
        location: {
          city: 'Ankara',
          district: 'Çankaya'
        },
        contactInfo: {
          phone: '+90 312 987 65 43',
          address: 'Tunalı Hilmi Caddesi No:456, Çankaya/Ankara'
        },
        rating: 4.6,
        reviewCount: 89,
        isVerified: true
      },
      {
        id: 3,
        title: 'Fren Sistemi Kontrolü',
        description: 'Fren balata, disk ve hidrolik sistem kontrolü. Güvenliğiniz için önemli!',
        image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&h=400&fit=crop',
        company: 'Güvenli Sürüş Oto',
        companyLogo: 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=100&h=100&fit=crop',
        validUntil: '2025-04-15',
        discount: '%20 İndirim',
        conditions: ['Detaylı fren kontrolü', 'Rapor dahil', 'Geçerli tarih: 15 Nisan 2025'],
        serviceType: 'Fren Bakımı',
        location: {
          city: 'İzmir',
          district: 'Konak'
        },
        contactInfo: {
          phone: '+90 232 555 77 88',
          address: 'Alsancak Caddesi No:789, Konak/İzmir'
        },
        rating: 4.9,
        reviewCount: 203,
        isVerified: true
      },
      {
        id: 4,
        title: 'Klima Bakım ve Gaz Dolumu',
        description: 'Klima sistem temizliği, gaz dolumu ve filtre değişimi. Yaz için hazır!',
        image: 'https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?w=800&h=400&fit=crop',
        company: 'Klima Uzmanı',
        companyLogo: 'https://images.unsplash.com/photo-1581094794329-c8112a89af12?w=100&h=100&fit=crop',
        validUntil: '2025-05-30',
        discount: '%35 İndirim',
        conditions: ['Klima gazı dahil', 'Filtre değişimi', 'Geçerli tarih: 30 Mayıs 2025'],
        serviceType: 'Klima Bakımı',
        location: {
          city: 'Bursa',
          district: 'Osmangazi'
        },
        contactInfo: {
          phone: '+90 224 333 44 55',
          address: 'Fomara Caddesi No:321, Osmangazi/Bursa'
        },
        rating: 4.7,
        reviewCount: 134,
        isVerified: false
      },
      {
        id: 5,
        title: 'Yaz Lastiği Kampanyası',
        description: 'Yaz lastiklerinde %40 indirim! Güvenli sürüş için kaliteli lastikler.',
        image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&h=400&fit=crop',
        company: 'Premium Lastik',
        companyLogo: 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=100&h=100&fit=crop',
        validUntil: '2025-06-30',
        discount: '%40 İndirim',
        conditions: ['Tüm markalar geçerli', 'Montaj ücretsiz', 'Geçerli tarih: 30 Haziran 2025'],
        serviceType: 'Lastik Değişimi',
        location: {
          city: 'İstanbul',
          district: 'Beşiktaş'
        },
        contactInfo: {
          phone: '+90 212 555 12 34',
          address: 'Barbaros Bulvarı No:567, Beşiktaş/İstanbul'
        },
        rating: 4.9,
        reviewCount: 287,
        isVerified: true
      },
      {
        id: 6,
        title: 'Araç Yıkama Paketi',
        description: 'Detaylı araç yıkama + iç temizlik + parlatma. Araçınız yeni gibi!',
        image: 'https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?w=800&h=400&fit=crop',
        company: 'Temiz Araç',
        companyLogo: 'https://images.unsplash.com/photo-1581094794329-c8112a89af12?w=100&h=100&fit=crop',
        validUntil: '2025-07-15',
        discount: '%50 İndirim',
        conditions: ['İç ve dış temizlik', 'Parlatma dahil', 'Geçerli tarih: 15 Temmuz 2025'],
        serviceType: 'Araç Yıkama',
        location: {
          city: 'Ankara',
          district: 'Keçiören'
        },
        contactInfo: {
          phone: '+90 312 444 55 66',
          address: 'Etlik Caddesi No:890, Keçiören/Ankara'
        },
        rating: 4.5,
        reviewCount: 98,
        isVerified: true
      },
      {
        id: 7,
        title: 'Akü Değişim Hizmeti',
        description: 'Eski akünüzü getirin, yeni aküde %30 indirim. Evde montaj dahil!',
        image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&h=400&fit=crop',
        company: 'Akü Merkezi',
        companyLogo: 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=100&h=100&fit=crop',
        validUntil: '2025-08-20',
        discount: '%30 İndirim',
        conditions: ['Eski akü getir', 'Evde montaj', 'Geçerli tarih: 20 Ağustos 2025'],
        serviceType: 'Akü Değişimi',
        location: {
          city: 'İzmir',
          district: 'Bornova'
        },
        contactInfo: {
          phone: '+90 232 777 88 99',
          address: 'Kazımdirik Mahallesi No:123, Bornova/İzmir'
        },
        rating: 4.7,
        reviewCount: 156,
        isVerified: true
      },
      {
        id: 8,
        title: 'Genel Araç Bakımı',
        description: 'Kapsamlı araç kontrolü + yağ değişimi + filtre değişimi. Güvenli sürüş!',
        image: 'https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?w=800&h=400&fit=crop',
        company: 'Oto Bakım Merkezi',
        companyLogo: 'https://images.unsplash.com/photo-1581094794329-c8112a89af12?w=100&h=100&fit=crop',
        validUntil: '2025-09-10',
        discount: '%25 İndirim',
        conditions: ['Kapsamlı kontrol', 'Yağ ve filtre dahil', 'Geçerli tarih: 10 Eylül 2025'],
        serviceType: 'Genel Bakım',
        location: {
          city: 'Bursa',
          district: 'Nilüfer'
        },
        contactInfo: {
          phone: '+90 224 999 00 11',
          address: 'Görükle Mahallesi No:456, Nilüfer/Bursa'
        },
        rating: 4.8,
        reviewCount: 203,
        isVerified: true
      }
    ];
    
    res.json({
      success: true,
      data: campaigns,
      message: 'Kampanyalar başarıyla getirildi'
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Kampanyalar getirilirken hata oluştu',
      error: error.message
    });
  }
});

export default router; 
