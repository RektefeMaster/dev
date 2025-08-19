import { Router } from 'express';
import { auth } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { createVehicleSchema } from '../validators/vehicle.validation';
import { VehicleController } from '../controllers/vehicle.controller';

const router = Router();

/**
 * @swagger
 * /api/vehicles:
 *   post:
 *     summary: Yeni araç ekle
 *     description: Kullanıcı için yeni bir araç oluşturur
 *     tags:
 *       - Vehicles
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - brand
 *               - model
 *               - year
 *               - plateNumber
 *             properties:
 *               brand:
 *                 type: string
 *                 description: Araç markası
 *                 example: "BMW"
 *               model:
 *                 type: string
 *                 description: Araç modeli
 *                 example: "X5"
 *               year:
 *                 type: number
 *                 description: Üretim yılı
 *                 example: 2020
 *               plateNumber:
 *                 type: string
 *                 description: Plaka numarası
 *                 example: "34ABC123"
 *               color:
 *                 type: string
 *                 description: Araç rengi
 *                 example: "Siyah"
 *               engineSize:
 *                 type: string
 *                 description: Motor hacmi
 *                 example: "2.0L"
 *               fuelType:
 *                 type: string
 *                 enum: [benzin, dizel, elektrik, hibrit]
 *                 description: Yakıt tipi
 *                 example: "benzin"
 *     responses:
 *       201:
 *         description: Araç başarıyla oluşturuldu
 *       400:
 *         description: Geçersiz veri
 *       401:
 *         description: Yetkilendirme hatası
 *       500:
 *         description: Sunucu hatası
 */
router.post('/', auth, validate(createVehicleSchema), VehicleController.createVehicle);

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
 *       401:
 *         description: Yetkilendirme hatası
 *       500:
 *         description: Sunucu hatası
 */
router.get('/', auth, VehicleController.getUserVehicles);

/**
 * @swagger
 * /api/vehicles/search:
 *   get:
 *     summary: Araç ara
 *     description: Araç markası, modeli veya plaka numarasına göre arama yapar
 *     tags:
 *       - Vehicles
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema:
 *           type: string
 *         description: Arama terimi
 *         example: "BMW"
 *     responses:
 *       200:
 *         description: Arama sonuçları başarıyla getirildi
 *       400:
 *         description: Arama terimi eksik
 *       401:
 *         description: Yetkilendirme hatası
 *       500:
 *         description: Sunucu hatası
 */
router.get('/search', auth, VehicleController.searchVehicles);

/**
 * @swagger
 * /api/vehicles/all:
 *   get:
 *     summary: Tüm araçları getir (Admin)
 *     description: Sistemdeki tüm araçları listeler (sadece admin için)
 *     tags:
 *       - Vehicles
 *     responses:
 *       200:
 *         description: Tüm araçlar başarıyla getirildi
 *       500:
 *         description: Sunucu hatası
 */
router.get('/all', VehicleController.getAllVehicles);

/**
 * @swagger
 * /api/vehicles/{id}:
 *   get:
 *     summary: Belirli bir aracı getir
 *     description: ID'ye göre belirli bir aracın detaylarını getirir
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
 *         description: Araç başarıyla getirildi
 *       401:
 *         description: Yetkilendirme hatası
 *       404:
 *         description: Araç bulunamadı
 *       500:
 *         description: Sunucu hatası
 */
router.get('/:id', auth, VehicleController.getVehicleById);

/**
 * @swagger
 * /api/vehicles/{id}:
 *   put:
 *     summary: Aracı güncelle
 *     description: Belirli bir aracın bilgilerini günceller
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
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               brand:
 *                 type: string
 *                 description: Araç markası
 *               model:
 *                 type: string
 *                 description: Araç modeli
 *               year:
 *                 type: number
 *                 description: Üretim yılı
 *               plateNumber:
 *                 type: string
 *                 description: Plaka numarası
 *               color:
 *                 type: string
 *                 description: Araç rengi
 *               engineSize:
 *                 type: string
 *                 description: Motor hacmi
 *               fuelType:
 *                 type: string
 *                 enum: [benzin, dizel, elektrik, hibrit]
 *                 description: Yakıt tipi
 *     responses:
 *       200:
 *         description: Araç başarıyla güncellendi
 *       400:
 *         description: Geçersiz veri
 *       401:
 *         description: Yetkilendirme hatası
 *       404:
 *         description: Araç bulunamadı
 *       500:
 *         description: Sunucu hatası
 */
router.put('/:id', auth, VehicleController.updateVehicle);

/**
 * @swagger
 * /api/vehicles/{id}:
 *   delete:
 *     summary: Aracı sil
 *     description: Belirli bir aracı sistemden kaldırır
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
 *       401:
 *         description: Yetkilendirme hatası
 *       404:
 *         description: Araç bulunamadı
 *       500:
 *         description: Sunucu hatası
 */
router.delete('/:id', auth, VehicleController.deleteVehicle);

export default router; 