console.log('mechanicService.ts yüklendi');
import express, { Request, Response } from 'express';
import { auth } from '../middleware/auth';
import { ServiceCategory } from '../models/ServiceCategory';
import { Mechanic } from '../models/Mechanic';

const router = express.Router();

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
      orConditions.push({ vehicleBrands: 'Tümü' });
    }
    if (city) filter['location.city'] = city;
    if (isAvailable !== undefined) filter.isAvailable = isAvailable === 'true';
    if (orConditions.length > 0) {
      filter.$or = orConditions;
    }
    const mechanics = await Mechanic.find(filter).select(
      'name surname shopName avatar cover bio serviceCategories vehicleBrands rating totalServices isAvailable location.city workingHours phone'
    );
    res.json(mechanics);
  } catch (error) {
    res.status(500).json({ message: 'Usta listesi getirilirken hata oluştu', error });
  }
});

export default router; 