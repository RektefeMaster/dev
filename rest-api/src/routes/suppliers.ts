import { Router, Request, Response } from 'express';
import { auth } from '../middleware/auth';
import { User } from '../models/User';
import { Types } from 'mongoose';

const router = Router();

/**
 * @swagger
 * /api/suppliers:
 *   get:
 *     summary: Ustanın tedarikçilerini getir
 *     description: Ustanın kayıtlı tedarikçilerini listeler
 *     tags:
 *       - Suppliers
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: search
 *         required: false
 *         schema:
 *           type: string
 *         description: Tedarikçi arama terimi
 *       - in: query
 *         name: specialty
 *         required: false
 *         schema:
 *           type: string
 *         description: Uzmanlık alanı filtresi
 *     responses:
 *       200:
 *         description: Tedarikçiler başarıyla getirildi
 *       401:
 *         description: Yetkilendirme hatası
 *       500:
 *         description: Sunucu hatası
 */
router.get('/', auth, async (req: Request, res: Response) => {
  try {
    const mechanicId = (req as any).user?.userId;
    const search = req.query.search as string;
    const specialty = req.query.specialty as string;

    if (!mechanicId) {
      return res.status(401).json({
        success: false,
        message: 'Kullanıcı ID bulunamadı'
      });
    }

    // Ustanın profilini getir
    const mechanic = await User.findById(mechanicId);
    if (!mechanic) {
      return res.status(404).json({
        success: false,
        message: 'Usta bulunamadı'
      });
    }

    let suppliers = mechanic.suppliers || [];

    // Arama filtresi uygula
    if (search) {
      const searchLower = search.toLowerCase();
      suppliers = suppliers.filter(supplier => 
        supplier.name?.toLowerCase().includes(searchLower) ||
        supplier.phone?.includes(search) ||
        supplier.email?.toLowerCase().includes(searchLower) ||
        supplier.address?.toLowerCase().includes(searchLower) ||
        supplier.specialties?.some(s => s.toLowerCase().includes(searchLower))
      );
    }

    // Uzmanlık alanı filtresi uygula
    if (specialty) {
      suppliers = suppliers.filter(supplier => 
        supplier.specialties?.includes(specialty)
      );
    }

    // Tarihe göre sırala (en yeni önce)
    suppliers.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    res.json({
      success: true,
      data: suppliers,
      message: `${suppliers.length} tedarikçi bulundu`
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Tedarikçiler getirilirken hata oluştu',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/suppliers:
 *   post:
 *     summary: Yeni tedarikçi ekle
 *     description: Usta için yeni tedarikçi ekler
 *     tags:
 *       - Suppliers
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - phone
 *             properties:
 *               name:
 *                 type: string
 *                 description: Tedarikçi adı
 *                 example: "Ahmet Parça Merkezi"
 *               phone:
 *                 type: string
 *                 description: Telefon numarası
 *                 example: "+90 555 123 4567"
 *               email:
 *                 type: string
 *                 format: email
 *                 description: E-posta adresi
 *                 example: "ahmet@parca.com"
 *               address:
 *                 type: string
 *                 description: Adres
 *                 example: "Atatürk Caddesi No:123, Kadıköy/İstanbul"
 *               specialties:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Uzmanlık alanları
 *                 example: ["Motor Parçaları", "Fren Sistemi", "Elektrik"]
 *               notes:
 *                 type: string
 *                 description: Notlar
 *                 example: "Hızlı teslimat, kaliteli parçalar"
 *     responses:
 *       200:
 *         description: Tedarikçi başarıyla eklendi
 *       400:
 *         description: Geçersiz veri
 *       401:
 *         description: Yetkilendirme hatası
 *       500:
 *         description: Sunucu hatası
 */
router.post('/', auth, async (req: Request, res: Response) => {
  try {
    const mechanicId = (req as any).user?.userId;
    const { name, phone, email, address, specialties, notes } = req.body;

    if (!mechanicId) {
      return res.status(401).json({
        success: false,
        message: 'Kullanıcı ID bulunamadı'
      });
    }

    if (!name || !phone) {
      return res.status(400).json({
        success: false,
        message: 'Tedarikçi adı ve telefon numarası gerekli'
      });
    }

    // Yeni tedarikçi objesi oluştur
    const newSupplier = {
      _id: new Types.ObjectId(),
      name: name.trim(),
      phone: phone.trim(),
      email: email?.trim() || '',
      address: address?.trim() || '',
      specialties: specialties || [],
      notes: notes?.trim() || '',
      createdAt: new Date()
    };

    // Ustanın profilini güncelle
    const updatedUser = await User.findByIdAndUpdate(
      mechanicId,
      {
        $push: {
          suppliers: newSupplier
        }
      },
      { new: true }
    );

    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        message: 'Usta bulunamadı'
      });
    }

    res.json({
      success: true,
      data: newSupplier,
      message: 'Tedarikçi başarıyla eklendi'
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Tedarikçi eklenirken hata oluştu',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/suppliers/{supplierId}:
 *   put:
 *     summary: Tedarikçi bilgilerini güncelle
 *     description: Mevcut tedarikçi bilgilerini günceller
 *     tags:
 *       - Suppliers
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: supplierId
 *         required: true
 *         schema:
 *           type: string
 *         description: Tedarikçi ID'si
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 description: Tedarikçi adı
 *               phone:
 *                 type: string
 *                 description: Telefon numarası
 *               email:
 *                 type: string
 *                 format: email
 *                 description: E-posta adresi
 *               address:
 *                 type: string
 *                 description: Adres
 *               specialties:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Uzmanlık alanları
 *               notes:
 *                 type: string
 *                 description: Notlar
 *     responses:
 *       200:
 *         description: Tedarikçi başarıyla güncellendi
 *       400:
 *         description: Geçersiz veri
 *       401:
 *         description: Yetkilendirme hatası
 *       404:
 *         description: Tedarikçi bulunamadı
 *       500:
 *         description: Sunucu hatası
 */
router.put('/:supplierId', auth, async (req: Request, res: Response) => {
  try {
    const mechanicId = (req as any).user?.userId;
    const { supplierId } = req.params;
    const { name, phone, email, address, specialties, notes } = req.body;

    if (!mechanicId) {
      return res.status(401).json({
        success: false,
        message: 'Kullanıcı ID bulunamadı'
      });
    }

    // Güncellenecek alanları hazırla
    const updateFields: any = {};
    if (name !== undefined) updateFields['suppliers.$.name'] = name.trim();
    if (phone !== undefined) updateFields['suppliers.$.phone'] = phone.trim();
    if (email !== undefined) updateFields['suppliers.$.email'] = email?.trim() || '';
    if (address !== undefined) updateFields['suppliers.$.address'] = address?.trim() || '';
    if (specialties !== undefined) updateFields['suppliers.$.specialties'] = specialties || [];
    if (notes !== undefined) updateFields['suppliers.$.notes'] = notes?.trim() || '';

    // Ustanın profilini güncelle
    const updatedUser = await User.findOneAndUpdate(
      {
        _id: mechanicId,
        'suppliers._id': supplierId
      },
      {
        $set: updateFields
      },
      { new: true }
    );

    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        message: 'Tedarikçi bulunamadı'
      });
    }

    // Güncellenmiş tedarikçiyi bul
    const updatedSupplier = updatedUser.suppliers?.find(s => s._id?.toString() === supplierId);

    res.json({
      success: true,
      data: updatedSupplier,
      message: 'Tedarikçi başarıyla güncellendi'
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Tedarikçi güncellenirken hata oluştu',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/suppliers/{supplierId}:
 *   delete:
 *     summary: Tedarikçi sil
 *     description: Mevcut tedarikçiyi siler
 *     tags:
 *       - Suppliers
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: supplierId
 *         required: true
 *         schema:
 *           type: string
 *         description: Tedarikçi ID'si
 *     responses:
 *       200:
 *         description: Tedarikçi başarıyla silindi
 *       401:
 *         description: Yetkilendirme hatası
 *       404:
 *         description: Tedarikçi bulunamadı
 *       500:
 *         description: Sunucu hatası
 */
router.delete('/:supplierId', auth, async (req: Request, res: Response) => {
  try {
    const mechanicId = (req as any).user?.userId;
    const { supplierId } = req.params;

    if (!mechanicId) {
      return res.status(401).json({
        success: false,
        message: 'Kullanıcı ID bulunamadı'
      });
    }

    // Ustanın profilini güncelle
    const updatedUser = await User.findByIdAndUpdate(
      mechanicId,
      {
        $pull: {
          suppliers: { _id: supplierId }
        }
      },
      { new: true }
    );

    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        message: 'Tedarikçi bulunamadı'
      });
    }

    res.json({
      success: true,
      message: 'Tedarikçi başarıyla silindi'
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Tedarikçi silinirken hata oluştu',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/suppliers/specialties:
 *   get:
 *     summary: Uzmanlık alanlarını getir
 *     description: Sistemdeki tüm uzmanlık alanlarını listeler
 *     tags:
 *       - Suppliers
 *     responses:
 *       200:
 *         description: Uzmanlık alanları başarıyla getirildi
 *       500:
 *         description: Sunucu hatası
 */
router.get('/specialties', async (req: Request, res: Response) => {
  try {
    const specialties = [
      'Motor Parçaları',
      'Fren Sistemi',
      'Süspansiyon',
      'Elektrik',
      'Klima',
      'Lastik',
      'Egzoz',
      'Kaportaj',
      'Boyama',
      'Genel Bakım',
      'Yedek Parça',
      'Aksesuar',
      'Yağ ve Sıvılar',
      'Filtreler',
      'Diğer'
    ];

    res.json({
      success: true,
      data: specialties,
      message: 'Uzmanlık alanları başarıyla getirildi'
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Uzmanlık alanları getirilirken hata oluştu',
      error: error.message
    });
  }
});

export default router;
