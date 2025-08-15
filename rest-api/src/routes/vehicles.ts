import express, { Request, Response } from 'express';
import { auth } from '../middleware/auth';
import { User } from '../models/User';
import { Vehicle } from '../models/Vehicle';
import mongoose from 'mongoose';
import { validate, createVehicleSchema } from '../middleware/validate';
import { ResponseHandler } from '../utils/response';
import { asyncHandler } from '../middleware/errorHandler';

/**
 * @swagger
 * components:
 *   schemas:
 *     Vehicle:
 *       type: object
 *       required:
 *         - brand
 *         - model
 *         - year
 *       properties:
 *         brand:
 *           type: string
 *           description: Araç markası
 *           example: "Toyota"
 *         model:
 *           type: string
 *           description: Araç modeli
 *           example: "Corolla"
 *         year:
 *           type: number
 *           description: Araç üretim yılı
 *           example: 2020
 *         plate:
 *           type: string
 *           description: Araç plakası
 *           example: "34ABC123"
 *         color:
 *           type: string
 *           description: Araç rengi
 *           example: "Beyaz"
 *         fuelType:
 *           type: string
 *           enum: [benzin, dizel, elektrik, hibrit]
 *           description: Yakıt tipi
 *           example: "benzin"
 *         engineSize:
 *           type: number
 *           description: Motor hacmi (cc)
 *           example: 1600
 *         mileage:
 *           type: number
 *           description: Kilometre
 *           example: 50000
 */

const router = express.Router();

/**
 * @swagger
 * /api/vehicles:
 *   get:
 *     summary: Kullanıcının araçlarını getir
 *     description: Giriş yapan kullanıcının tüm araçlarını listeler
 *     tags:
 *       - Vehicles
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Araçlar başarıyla getirildi
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Vehicle'
 *       401:
 *         description: Yetkilendirme hatası
 *       500:
 *         description: Sunucu hatası
 */
// GET /api/vehicles (giriş yapan kullanıcının araçları)
router.get('/', auth, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ message: 'Kullanıcı doğrulanamadı.' });
    }
    const vehicles = await Vehicle.find({ userId });
    res.json(vehicles);
  } catch (error) {
    console.error('Araçlar getirilirken hata:', error);
    res.status(500).json({ message: 'Sunucu hatası' });
  }
});

/**
 * @swagger
 * /api/vehicles:
 *   post:
 *     summary: Yeni araç ekle
 *     description: Kullanıcı yeni bir araç ekler
 *     tags:
 *       - Vehicles
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Vehicle'
 *     responses:
 *       201:
 *         description: Araç başarıyla eklendi
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Vehicle'
 *       400:
 *         description: Geçersiz veri
 *       401:
 *         description: Yetkilendirme hatası
 *       500:
 *         description: Sunucu hatası
 */
// POST /api/vehicles
router.post('/', auth, validate(createVehicleSchema), async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ message: 'Kullanıcı doğrulanamadı.' });
    }
    const vehicle = new Vehicle({
      ...req.body,
      userId
    });
    const savedVehicle = await vehicle.save();
    return ResponseHandler.created(res, savedVehicle, 'Araç başarıyla eklendi');
  } catch (error) {
    console.error('Araç eklenirken hata:', error);
    res.status(500).json({ message: 'Sunucu hatası' });
  }
});

/**
 * @swagger
 * /api/vehicles/{id}/favorite:
 *   put:
 *     summary: Araç favori durumunu güncelle
 *     description: Kullanıcı aracı favorilere ekler veya favorilerden çıkarır
 *     tags:
 *       - Vehicles
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Araç ID'si
 *         example: "507f1f77bcf86cd799439011"
 *     responses:
 *       200:
 *         description: Favori durumu başarıyla güncellendi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Araç favorilere eklendi"
 *                 favoriteVehicle:
 *                   type: string
 *                   nullable: true
 *                   description: Favori araç ID'si (null ise favorilerden çıkarıldı)
 *       400:
 *         description: Geçersiz veri
 *       401:
 *         description: Yetkilendirme hatası
 *       404:
 *         description: Araç veya kullanıcı bulunamadı
 *       500:
 *         description: Sunucu hatası
 */
// PUT /api/vehicles/:id/favorite
router.put('/:id/favorite', auth, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ message: 'Kullanıcı doğrulanamadı.' });
    }

    const vehicleId = new mongoose.Types.ObjectId(req.params.id);
    const objectUserId = new mongoose.Types.ObjectId(userId);

    // Aracın var olduğunu kontrol et
    const vehicle = await Vehicle.findById(vehicleId);
    if (!vehicle) {
      return res.status(404).json({ message: 'Araç bulunamadı' });
    }

    // Kullanıcıyı bul
    const user = await User.findById(objectUserId);
    if (!user) {
      return res.status(404).json({ message: 'Kullanıcı bulunamadı' });
    }

    // Favori güncelle
    let newFavorite: mongoose.Types.ObjectId | null = vehicleId;
    if (user.favoriteVehicle?.toString() === vehicleId.toString()) {
      newFavorite = null;
    }

    await User.findByIdAndUpdate(objectUserId, { favoriteVehicle: newFavorite });

    return ResponseHandler.success(res, {
      favoriteVehicle: newFavorite 
    }, newFavorite ? 'Araç favorilere eklendi' : 'Araç favorilerden kaldırıldı');
  } catch (error) {
    console.error('Favori araç güncellenirken hata:', error);
    res.status(500).json({ message: 'Sunucu hatası' });
  }
});

/**
 * @swagger
 * /api/vehicles/{id}:
 *   delete:
 *     summary: Araç sil
 *     description: Kullanıcı kendi aracını siler
 *     tags:
 *       - Vehicles
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Araç ID'si
 *         example: "507f1f77bcf86cd799439011"
 *     responses:
 *       200:
 *         description: Araç başarıyla silindi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Araç başarıyla silindi"
 *       401:
 *         description: Yetkilendirme hatası
 *       404:
 *         description: Araç bulunamadı veya kullanıcıya ait değil
 *       500:
 *         description: Sunucu hatası
 */
// DELETE /api/vehicles/:id (araç silme)
router.delete('/:id', auth, async (req: Request, res: Response) => {
  try {
    console.log('🗑️ Araç silme isteği alındı:', req.params.id);
    
    const userId = req.user?.userId;
    if (!userId) {
      console.log('❌ Kullanıcı doğrulanamadı');
      return res.status(401).json({ message: 'Kullanıcı doğrulanamadı.' });
    }

    const vehicleId = req.params.id;
    
    // Aracın var olduğunu ve kullanıcıya ait olduğunu kontrol et
    const vehicle = await Vehicle.findOne({ _id: vehicleId, userId });
    if (!vehicle) {
      console.log('❌ Araç bulunamadı veya kullanıcıya ait değil:', vehicleId);
      return res.status(404).json({ message: 'Araç bulunamadı veya bu araç size ait değil.' });
    }

    console.log('✅ Araç bulundu, siliniyor:', vehicleId);
    
    // Aracı sil
    await Vehicle.findByIdAndDelete(vehicleId);
    
    console.log('✅ Araç başarıyla silindi:', vehicleId);
    return ResponseHandler.deleted(res, 'Araç başarıyla silindi');
    
  } catch (error) {
    console.error('❌ Araç silinirken hata:', error);
    res.status(500).json({ 
      message: 'Araç silinirken sunucu hatası oluştu',
      error: error instanceof Error ? error.message : 'Bilinmeyen hata'
    });
  }
});

export default router; 