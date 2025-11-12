import express, { Request, Response } from 'express';
import { ServiceCategory } from '../models/ServiceCategory';
import { auth } from '../middleware/optimizedAuth';
import { AuthRequest } from '../types/auth.d';

const router = express.Router();

// Tüm aktif hizmet kategorilerini getir
router.get('/', async (req: Request, res: Response) => {
  try {
    const categories = await ServiceCategory.find({ isActive: true });
    res.json({
      success: true,
      data: categories
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      message: 'Hizmet kategorileri getirilirken bir hata oluştu' 
    });
  }
});

// Ana hizmet kategorilerini getir (yeni sistem için)
router.get('/main-categories', async (req: Request, res: Response) => {
  try {
    const mainCategories = [
      {
        id: 'towing',
        name: 'Çekici Hizmeti',
        description: 'Acil kurtarma hizmetleri',
        icon: 'truck',
        color: '#EF4444',
        subServices: ['Kaza kurtarma', 'Akü takviyesi', 'Lastik değişimi', 'Yakıt takviyesi']
      },
      {
        id: 'repair',
        name: 'Tamir & Bakım',
        description: 'Arıza tespit ve onarım',
        icon: 'wrench',
        color: '#3B82F6',
        subServices: ['Genel Bakım', 'Ağır Bakım', 'Alt Takım', 'Üst Takım', 'Kaporta/Boya', 'Elektrik-Elektronik', 'Egzoz & Emisyon', 'Ekspertiz']
      },
      {
        id: 'wash',
        name: 'Araç Yıkama',
        description: 'Araç temizlik hizmetleri',
        icon: 'water',
        color: '#10B981',
        subServices: ['Basic', 'Detaylı', 'Seramik', 'Koltuk', 'Motor']
      },
      {
        id: 'tire',
        name: 'Lastik & Parça',
        description: 'Lastik ve yedek parça',
        icon: 'car-wrench',
        color: '#F59E0B',
        subServices: ['Lastik', 'Jant', 'Fren balata', 'Filtre', 'Yağ']
      }
    ];

    res.json({
      success: true,
      data: mainCategories
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      message: 'Ana hizmet kategorileri getirilirken bir hata oluştu' 
    });
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