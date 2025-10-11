import { Router } from 'express';
import { seedDefaultUsers } from '../scripts/seedDefaultUsers';

const router = Router();

/**
 * @swagger
 * /api/admin/seed-users:
 *   post:
 *     summary: Default kullanıcıları oluştur
 *     description: Sistem başlatıldığında default kullanıcıları oluşturur
 *     tags:
 *       - Admin
 *     responses:
 *       200:
 *         description: Seed işlemi tamamlandı
 */
router.post('/seed-users', async (req, res) => {
  try {
    console.log('🌱 Admin: Seed işlemi başlatılıyor...');
    await seedDefaultUsers();
    
    res.json({
      success: true,
      message: 'Default kullanıcılar başarıyla oluşturuldu/güncellendi'
    });
  } catch (error: any) {
    console.error('❌ Admin: Seed hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Seed işlemi başarısız',
      error: error.message
    });
  }
});

export default router;
