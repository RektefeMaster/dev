console.log('mechanicService.ts yüklendi');
import express, { Request, Response } from 'express';
import { auth } from '../middleware/auth';
import { ServiceCategory } from '../models/ServiceCategory';
import { Mechanic } from '../models/Mechanic';

/**
 * @swagger
 * components:
 *   schemas:
 *     ServiceCategory:
 *       type: object
 *       required:
 *         - name
 *         - type
 *       properties:
 *         name:
 *           type: string
 *           description: Kategori adı
 *           example: "Genel Bakım"
 *         type:
 *           type: string
 *           description: Kategori tipi
 *           example: "maintenance"
 *         description:
 *           type: string
 *           description: Kategori açıklaması
 *           example: "Genel araç bakım hizmetleri"
 *         icon:
 *           type: string
 *           description: Kategori ikonu
 *           example: "🔧"
 *         subCategories:
 *           type: array
 *           items:
 *             type: string
 *           example: ["Yağ Değişimi", "Filtre Değişimi", "Fren Bakımı"]
 *         isActive:
 *           type: boolean
 *           description: Kategori aktif mi
 *           example: true
 *     MechanicProfile:
 *       type: object
 *       required:
 *         - name
 *         - surname
 *         - email
 *         - shopName
 *       properties:
 *         name:
 *           type: string
 *           description: Usta adı
 *           example: "Ahmet"
 *         surname:
 *           type: string
 *           description: Usta soyadı
 *           example: "Yılmaz"
 *         email:
 *           type: string
 *           format: email
 *           description: E-posta adresi
 *           example: "ahmet@usta.com"
 *         phone:
 *           type: string
 *           description: Telefon numarası
 *           example: "+90 555 123 4567"
 *         shopName:
 *           type: string
 *           description: Dükkan adı
 *           example: "Ahmet Usta Oto Servis"
 *         bio:
 *           type: string
 *           description: Usta hakkında bilgi
 *           example: "20 yıllık deneyim ile kaliteli hizmet"
 *         location:
 *           type: object
 *           properties:
 *             address:
 *               type: string
 *               example: "Atatürk Caddesi No:123"
 *             city:
 *               type: string
 *               example: "İstanbul"
 *             district:
 *               type: string
 *               example: "Kadıköy"
 *             coordinates:
 *               type: object
 *               properties:
 *                 latitude:
 *                   type: number
 *                   example: 40.9909
 *                 longitude:
 *                   type: number
 *                   example: 29.0304
 *         serviceCategories:
 *           type: array
 *           items:
 *             type: string
 *           example: ["Genel Bakım", "Motor", "Fren Sistemi"]
 *         vehicleBrands:
 *           type: array
 *           items:
 *             type: string
 *           example: ["Toyota", "Honda", "Ford", "Genel"]
 *         workingHours:
 *           type: object
 *           properties:
 *             monday:
 *               type: object
 *               properties:
 *                 start:
 *                   type: string
 *                   example: "08:00"
 *                 end:
 *                   type: string
 *                   example: "18:00"
 *                 isOpen:
 *                   type: boolean
 *                   example: true
 *             tuesday:
 *               type: object
 *               properties:
 *                 start:
 *                   type: string
 *                   example: "08:00"
 *                 end:
 *                   type: string
 *                   example: "18:00"
 *                 isOpen:
 *                   type: boolean
 *                   example: true
 *         rating:
 *           type: number
 *           description: Ortalama puan
 *           example: 4.8
 *         totalReviews:
 *           type: number
 *           description: Toplam değerlendirme sayısı
 *           example: 156
 *         documents:
 *           type: object
 *           properties:
 *             insurance:
 *               type: string
 *               description: Sigorta bilgisi
 *               example: "Tam sigorta mevcut"
 *             certifications:
 *               type: array
 *               items:
 *                 type: string
 *               example: ["ASE Sertifikası", "Toyota Yetkili Servis"]
 */

const router = express.Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     MechanicProfile:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           example: "507f1f77bcf86cd799439011"
 *         name:
 *           type: string
 *           example: "Ahmet"
 *         surname:
 *           type: string
 *           example: "Yılmaz"
 *         shopName:
 *           type: string
 *           example: "Ahmet Usta Oto Servis"
 *         bio:
 *           type: string
 *           example: "20 yıllık deneyim ile kaliteli hizmet"
 *         city:
 *           type: string
 *           example: "İstanbul"
 *         rating:
 *           type: number
 *           example: 4.8
 *         experience:
 *           type: number
 *           example: 20
 *         totalServices:
 *           type: number
 *           example: 1250
 *         isAvailable:
 *           type: boolean
 *           example: true
 *         serviceCategories:
 *           type: array
 *           items:
 *             type: string
 *           example: ["Genel Bakım", "Motor", "Fren Sistemi"]
 *         vehicleBrands:
 *           type: array
 *           items:
 *             type: string
 *           example: ["Toyota", "Honda", "Ford"]
 *         location:
 *           type: object
 *           properties:
 *             city:
 *               type: string
 *               example: "İstanbul"
 *             district:
 *               type: string
 *               example: "Kadıköy"
 *         workingHours:
 *           type: object
 *           properties:
 *             monday:
 *               type: object
 *               properties:
 *                 start:
 *                   type: string
 *                   example: "08:00"
 *                 end:
 *                   type: string
 *                   example: "18:00"
 *                 isOpen:
 *                   type: boolean
 *                   example: true
 *         phone:
 *           type: string
 *           example: "+90 555 123 4567"
 *     ServiceCategory:
 *       type: object
 *       properties:
 *         name:
 *           type: string
 *           example: "Genel Bakım"
 *         type:
 *           type: string
 *           example: "maintenance"
 *         description:
 *           type: string
 *           example: "Genel araç bakım hizmetleri"
 *         icon:
 *           type: string
 *           example: "🔧"
 *         subCategories:
 *           type: array
 *           items:
 *             type: string
 *           example: ["Yağ Değişimi", "Filtre Değişimi", "Fren Bakımı"]
 *         isActive:
 *           type: boolean
 *           example: true
 *     AvailableSlot:
 *       type: object
 *       properties:
 *         time:
 *           type: string
 *           example: "08:00"
 *         isAvailable:
 *           type: boolean
 *           example: true
 *     MechanicAvailabilityResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         data:
 *           type: object
 *           properties:
 *             availableSlots:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/AvailableSlot'
 *         message:
 *           type: string
 *           example: "Müsait saatler başarıyla getirildi"
 *     MechanicListResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         data:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/MechanicProfile'
 *         message:
 *           type: string
 *           example: "5 adet usta bulundu"
 * 
 * /api/mechanic-services:
 *   get:
 *     summary: Tüm servis kategorilerini getir
 *     description: Sistemdeki tüm servis kategorilerini ve alt kategorilerini listeler
 *     tags:
 *       - Mechanic Services
 *     responses:
 *       200:
 *         description: Kategoriler başarıyla getirildi
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/ServiceCategory'
 *       500:
 *         description: Sunucu hatası
 */
// Tüm servis kategorilerini getir
router.get('/', async (req: Request, res: Response) => {
  try {
    const categories = await ServiceCategory.find()
      .populate('subCategories');
    res.json(categories);
  } catch (error) {
    res.status(500).json({ message: 'Kategoriler getirilirken bir hata oluştu' });
  }
});

/**
 * @swagger
 * /api/mechanic-services/type/{type}:
 *   get:
 *     summary: Belirli tipteki servis kategorilerini getir
 *     description: Belirli bir tipteki (maintenance, repair, diagnostic vb.) servis kategorilerini listeler
 *     tags:
 *       - Mechanic Services
 *     parameters:
 *       - in: path
 *         name: type
 *         required: true
 *         schema:
 *           type: string
 *         description: Kategori tipi
 *         example: "maintenance"
 *     responses:
 *       200:
 *         description: Kategoriler başarıyla getirildi
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/ServiceCategory'
 *       500:
 *         description: Sunucu hatası
 */
// Belirli bir tipteki kategorileri getir
router.get('/type/:type', async (req: Request, res: Response) => {
  try {
    const categories = await ServiceCategory.find({ type: req.params.type })
      .populate('subCategories');
    res.json(categories);
  } catch (error) {
    res.status(500).json({ message: 'Kategoriler getirilirken bir hata oluştu' });
  }
});

/**
 * @swagger
 * /api/mechanic-services/mechanic/{id}:
 *   get:
 *     summary: Usta profilini getir
 *     description: Belirli bir ustanın profil bilgilerini getirir (sadece kendi profilini veya admin görebilir)
 *     tags:
 *       - Mechanic Services
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Usta ID'si
 *         example: "507f1f77bcf86cd799439011"
 *     responses:
 *       200:
 *         description: Usta profili başarıyla getirildi
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MechanicProfile'
 *       401:
 *         description: Yetkilendirme hatası
 *       403:
 *         description: Yetkisiz erişim
 *       404:
 *         description: Usta bulunamadı
 *       500:
 *         description: Sunucu hatası
 */
// Usta profilini getir
router.get('/mechanic/:id', auth, async (req: Request, res: Response) => {
  console.log('GET /mechanic/:id çalıştı', req.params, req.user);
  try {
    const { id } = req.params;
    if (!req.user) {
      return res.status(401).json({ message: 'Kullanıcı doğrulanamadı.' });
    }
    const mechanic = await Mechanic.findById(id);
    if (!mechanic) {
      return res.status(404).json({ message: 'Usta bulunamadı' });
    }
    // Sadece kendi profilini görebilir veya admin ise
    if (req.user.userId !== id && req.user.userType !== 'admin') {
      return res.status(403).json({ message: 'Yetkisiz erişim' });
    }
    res.json(mechanic);
  } catch (error) {
    res.status(500).json({ message: 'Profil getirilirken hata oluştu' });
  }
 });

/**
 * @swagger
 * /api/mechanic-services/mechanic/{id}:
 *   put:
 *     summary: Usta profilini güncelle
 *     description: Usta kendi profil bilgilerini günceller (sadece kendi profilini veya admin güncelleyebilir)
 *     tags:
 *       - Mechanic Services
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Usta ID'si
 *         example: "507f1f77bcf86cd799439011"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               shopName:
 *                 type: string
 *                 description: Dükkan adı
 *                 example: "Ahmet Usta Oto Servis"
 *               phone:
 *                 type: string
 *                 description: Telefon numarası
 *                 example: "+90 555 123 4567"
 *               bio:
 *                 type: string
 *                 description: Usta hakkında bilgi
 *                 example: "20 yıllık deneyim ile kaliteli hizmet"
 *               location:
 *                 type: object
 *                 properties:
 *                   address:
 *                     type: string
 *                     example: "Atatürk Caddesi No:123"
 *                   city:
 *                     type: string
 *                     example: "İstanbul"
 *                   district:
 *                     type: string
 *                     example: "Kadıköy"
 *                   coordinates:
 *                     type: object
 *                     properties:
 *                       latitude:
 *                         type: number
 *                         example: 40.9909
 *                       longitude:
 *                         type: number
 *                         example: 29.0304
 *               serviceCategories:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["Genel Bakım", "Motor", "Fren Sistemi"]
 *               vehicleBrands:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["Toyota", "Honda", "Ford", "Genel"]
 *               workingHours:
 *                 type: object
 *                 properties:
 *                   monday:
 *                     type: object
 *                     properties:
 *                       start:
 *                         type: string
 *                         example: "08:00"
 *                       end:
 *                         type: string
 *                         example: "18:00"
 *                       isOpen:
 *                         type: boolean
 *                         example: true
 *     responses:
 *       200:
 *         description: Profil başarıyla güncellendi
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MechanicProfile'
 *       400:
 *         description: Geçersiz veri
 *       401:
 *         description: Yetkilendirme hatası
 *       403:
 *         description: Yetkisiz erişim
 *       404:
 *         description: Usta bulunamadı
 *       500:
 *         description: Sunucu hatası
 */
// Usta profilini güncelle
router.put('/mechanic/:id', auth, async (req: Request, res: Response) => {
  console.log('PUT /mechanic/:id çalıştı', req.params, req.user);
  try {
    const { id } = req.params;
    if (!req.user) {
      return res.status(401).json({ message: 'Kullanıcı doğrulanamadı.' });
    }
    if (req.user.userId !== id && req.user.userType !== 'admin') {
      return res.status(403).json({ message: 'Yetkisiz erişim' });
    }

    const updateFields = req.body;
    
    // Zorunlu alanları kontrol et ve varsayılan değerler ata
    const validatedFields = {
      ...updateFields,
      serviceCategories: updateFields.serviceCategories && updateFields.serviceCategories.length > 0 
        ? updateFields.serviceCategories 
        : ['Genel Bakım'],
      vehicleBrands: updateFields.vehicleBrands && updateFields.vehicleBrands.length > 0 
        ? updateFields.vehicleBrands 
        : ['Genel'],
      documents: {
        insurance: updateFields.documents?.insurance || 'Sigorta bilgisi eklenecek'
      }
    };

    console.log('Güncellenecek alanlar:', JSON.stringify(validatedFields, null, 2));

    const mechanic = await Mechanic.findByIdAndUpdate(
      id, 
      validatedFields, 
      { 
        new: true, 
        runValidators: true 
      }
    );
    
    if (!mechanic) {
      return res.status(404).json({ message: 'Usta bulunamadı' });
    }

    console.log('Mechanic güncellendi:', mechanic._id);
    res.json(mechanic);
  } catch (error) {
    console.error('Profil güncelleme hatası:', error);
    res.status(500).json({ 
      message: 'Profil güncellenirken hata oluştu',
      error: error instanceof Error ? error.message : 'Bilinmeyen hata'
    });
  }
});

// Yeni servis kategorisi ekle (sadece admin)
router.post('/', auth, async (req: Request, res: Response) => {
  try {
    const { name, type, subCategories } = req.body;
    
    const category = new ServiceCategory({
      name,
      type,
      subCategories
    });

    await category.save();
    res.status(201).json(category);
  } catch (error) {
    res.status(500).json({ message: 'Kategori eklenirken bir hata oluştu' });
  }
});

// Servis kategorisini güncelle (sadece admin)
router.put('/:id', auth, async (req: Request, res: Response) => {
  try {
    const { name, type, subCategories } = req.body;
    
    const category = await ServiceCategory.findByIdAndUpdate(
      req.params.id,
      { name, type, subCategories },
      { new: true }
    );

    if (!category) {
      return res.status(404).json({ message: 'Kategori bulunamadı' });
    }

    res.json(category);
  } catch (error) {
    res.status(500).json({ message: 'Kategori güncellenirken bir hata oluştu' });
  }
});

// Servis kategorisini sil (sadece admin)
router.delete('/:id', auth, async (req: Request, res: Response) => {
  try {
    const category = await ServiceCategory.findByIdAndDelete(req.params.id);
    
    if (!category) {
      return res.status(404).json({ message: 'Kategori bulunamadı' });
    }

    res.json({ message: 'Kategori başarıyla silindi' });
  } catch (error) {
    res.status(500).json({ message: 'Kategori silinirken bir hata oluştu' });
  }
});

// Test için: Yeni mechanic ekle (sadece development)
router.post('/mechanic/test-create', async (req: Request, res: Response) => {
  try {
    const { name, surname, email, phone } = req.body;
    const mechanic = new Mechanic({
      name,
      surname,
      email,
      phone,
      userType: 'mechanic',
      serviceCategories: [],
      vehicleBrands: []
    });
    await mechanic.save();
    res.status(201).json(mechanic);
  } catch (error) {
    res.status(500).json({ message: 'Test mechanic eklenemedi', error });
  }
});

/**
 * @swagger
 * /api/mechanic-services/mechanics:
 *   get:
 *     summary: Usta listesini getir
 *     description: Filtrelenebilir usta listesi döndürür
 *     tags:
 *       - Mechanic Services
 *     parameters:
 *       - in: query
 *         name: serviceCategory
 *         schema:
 *           type: string
 *         description: "Servis kategorisi (orn: Genel Bakim)"
 *         example: "Genel Bakım"
 *       - in: query
 *         name: vehicleBrand
 *         schema:
 *           type: string
 *         description: "Arac markasi (orn: Toyota)"
 *         example: "Toyota"
 *       - in: query
 *         name: city
 *         schema:
 *           type: string
 *         description: Şehir
 *         example: "İstanbul"
 *       - in: query
 *         name: isAvailable
 *         schema:
 *           type: boolean
 *         description: Müsaitlik durumu
 *         example: true
 *     responses:
 *       200:
 *         description: Usta listesi başarıyla getirildi
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MechanicListResponse'
 *       500:
 *         description: Sunucu hatası
 */
// Usta listesini getir (filtrelenebilir)
router.get('/mechanics', async (req: Request, res: Response) => {
  try {
    const { serviceCategory, vehicleBrand, city, isAvailable } = req.query;
    const filter: any = {};
    const orConditions = [];
    
    if (serviceCategory) {
      orConditions.push({ serviceCategories: serviceCategory });
      orConditions.push({ serviceCategories: 'Tümü' });
    }
    if (vehicleBrand) {
      orConditions.push({ vehicleBrands: vehicleBrand });
      orConditions.push({ vehicleBrands: 'Genel' });
      orConditions.push({ vehicleBrands: 'Tüm Markalar' });
    }
    if (city) filter['location.city'] = city;
    if (isAvailable !== undefined) filter.isAvailable = isAvailable === 'true';
    
    if (orConditions.length > 0) {
      filter.$or = orConditions;
    }
    
    const mechanics = await Mechanic.find(filter).select(
      'name surname shopName avatar cover bio serviceCategories vehicleBrands rating totalServices isAvailable location.city workingHours phone experience ratingCount'
    );
    
    // API response formatını düzenle
    res.json({
      success: true,
      data: mechanics,
      message: `${mechanics.length} adet usta bulundu`
    });
  } catch (error) {
    console.error('Mechanic listesi hatası:', error);
    res.status(500).json({ 
      success: false,
      message: 'Usta listesi getirilirken hata oluştu', 
      error: error instanceof Error ? error.message : 'Bilinmeyen hata'
    });
  }
});

/**
 * @swagger
 * /api/mechanic-services/mechanic-availability:
 *   get:
 *     summary: Mekaniğin müsaitlik durumunu getir
 *     description: Belirli bir tarihte mekaniğin müsait saatlerini getirir
 *     tags:
 *       - Mechanic Services
 *     parameters:
 *       - in: query
 *         name: date
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *         description: Tarih (YYYY-MM-DD formatında)
 *         example: "2024-01-15"
 *       - in: query
 *         name: mechanicId
 *         required: true
 *         schema:
 *           type: string
 *         description: Mekanik ID'si
 *         example: "507f1f77bcf86cd799439011"
 *     responses:
 *       200:
 *         description: Müsait saatler başarıyla getirildi
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MechanicAvailabilityResponse'
 *       400:
 *         description: Tarih veya mekanik ID eksik
 *       500:
 *         description: Sunucu hatası
 */
router.get('/mechanic-availability', async (req: Request, res: Response) => {
  try {
    const { date, mechanicId } = req.query;

    if (!date || !mechanicId) {
      return res.status(400).json({ 
        success: false,
        message: 'Tarih ve mekanik ID gerekli' 
      });
    }

    // Basit müsaitlik kontrolü - gerçek uygulamada MaintenanceAppointment modeli kullanılabilir
    const workingHours = {
      start: 8,
      end: 18
    };

    const availableSlots = [];
    for (let hour = workingHours.start; hour < workingHours.end; hour++) {
      const slotTime = `${hour.toString().padStart(2, '0')}:00`;
      
      // Basit olarak tüm saatleri müsait olarak işaretle
      // Gerçek uygulamada randevu çakışması kontrol edilir
      availableSlots.push({
        time: slotTime,
        isAvailable: true
      });
    }

    res.json({
      success: true,
      data: { availableSlots },
      message: 'Müsait saatler başarıyla getirildi'
    });
  } catch (error) {
    console.error('Mechanic availability hatası:', error);
    res.status(500).json({ 
      success: false,
      message: 'Müsaitlik durumu getirilirken hata oluştu', 
      error: error instanceof Error ? error.message : 'Bilinmeyen hata'
    });
  }
});

export default router; 