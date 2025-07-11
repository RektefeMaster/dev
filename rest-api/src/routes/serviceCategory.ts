import express, { Request, Response } from 'express';
import { ServiceCategory } from '../models/ServiceCategory';
import { auth } from '../middleware/auth';
import { AuthRequest } from '../types/express';

const router = express.Router();

// Tüm aktif hizmet kategorilerini getir
router.get('/', async (req: Request, res: Response) => {
  try {
    console.log('ServiceCategory GET endpoint çağrıldı');
    const categories = await ServiceCategory.find({});
    console.log('Bulunan kategoriler:', categories.length);
    console.log('Kategoriler:', JSON.stringify(categories, null, 2));
    res.json(categories);
  } catch (error) {
    console.error('ServiceCategory GET hatası:', error);
    res.status(500).json({ message: 'Hizmet kategorileri getirilirken bir hata oluştu' });
  }
});

// Yeni hizmet kategorisi oluştur (sadece admin)
router.post('/', auth, async (req: AuthRequest, res: Response) => {
  try {
    const { name, description, icon } = req.body;
    
    const category = new ServiceCategory({
      name,
      description,
      icon
    });

    await category.save();
    res.status(201).json(category);
  } catch (error) {
    res.status(500).json({ message: 'Hizmet kategorisi oluşturulurken bir hata oluştu' });
  }
});

// Hizmet kategorisini güncelle (sadece admin)
router.put('/:id', auth, async (req: AuthRequest, res: Response) => {
  try {
    const { name, description, icon, isActive } = req.body;
    
    const category = await ServiceCategory.findByIdAndUpdate(
      req.params.id,
      { name, description, icon, isActive },
      { new: true }
    );

    if (!category) {
      return res.status(404).json({ message: 'Hizmet kategorisi bulunamadı' });
    }

    res.json(category);
  } catch (error) {
    res.status(500).json({ message: 'Hizmet kategorisi güncellenirken bir hata oluştu' });
  }
});

// Hizmet kategorisini sil (sadece admin)
router.delete('/:id', auth, async (req: AuthRequest, res: Response) => {
  try {
    const category = await ServiceCategory.findByIdAndDelete(req.params.id);
    
    if (!category) {
      return res.status(404).json({ message: 'Hizmet kategorisi bulunamadı' });
    }

    res.json({ message: 'Hizmet kategorisi başarıyla silindi' });
  } catch (error) {
    res.status(500).json({ message: 'Hizmet kategorisi silinirken bir hata oluştu' });
  }
});

export default router; 