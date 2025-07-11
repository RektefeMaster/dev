import { Router, Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User, IUser } from '../models/User';
import { Driver, IDriver } from '../models/Driver';
import { Mechanic, IMechanic } from '../models/Mechanic';
import mongoose from 'mongoose';
import { IAuthUser } from '../types/auth';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

interface IBaseUser {
  _id: mongoose.Types.ObjectId;
  name: string;
  surname: string;
  email: string;
  password: string;
}

// Middleware
export const auth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    console.log('Backend gelen token:', token);

    if (!token) {
      return res.status(401).json({ message: 'Yetkilendirme token\'ı bulunamadı' });
    }

    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string; userType: string };
    req.user = decoded;
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(401).json({ message: 'Geçersiz token' });
  }
};

// Routes
router.post('/register', async (req: Request, res: Response) => {
  console.log('Kayıt isteği alındı:', JSON.stringify(req.body, null, 2));
  let { name, surname, email, password, userType } = req.body;
  email = email.trim().toLowerCase();
  
  try {
    // Gelen verileri kontrol et
    if (!name || !surname || !email || !password) {
      console.log('Eksik veri:', { name, surname, email });
      return res.status(400).json({ 
        message: 'Eksik veri',
        errors: {
          name: !name ? 'İsim zorunludur' : undefined,
          surname: !surname ? 'Soyisim zorunludur' : undefined,
          email: !email ? 'E-posta zorunludur' : undefined,
          password: !password ? 'Şifre zorunludur' : undefined
        }
      });
    }

    // Email formatını kontrol et
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: 'Geçersiz e-posta formatı.' });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      console.log('Kayıt başarısız: Bu e-posta zaten kayıtlı.', email);
      return res.status(400).json({ message: 'Bu e-posta zaten kayıtlı.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const finalUserType = userType === 'mechanic' ? 'mechanic' : 'mechanic'; // Default mechanic

    const user = new User({ 
      name, 
      surname, 
      email: email.trim().toLowerCase(), 
      password: hashedPassword, 
      userType: finalUserType
    });

    console.log('Oluşturulacak kullanıcı:', JSON.stringify(user, null, 2));
    await user.save();

    // Mechanic olarak da ekle
    if (finalUserType === 'mechanic') {
      try {
        // Username için email kullan, unique olması için timestamp ekle
        const username = `${email.split('@')[0]}_${Date.now()}`;
        const {
          shopName = '',
          phone = '',
          location = {},
          description = '',
          serviceCategories = ['Genel Bakım'],
          vehicleBrands = ['Genel'],
          workingHours = {},
        } = req.body;
        const mechanic = new Mechanic({
          _id: user._id, // aynı id ile
          name,
          surname,
          email: email.trim().toLowerCase(),
          password: hashedPassword,
          userType: 'mechanic',
          username: username, // unique ve zorunlu
          shopName,
          phone,
          location,
          bio: description,
          serviceCategories,
          vehicleBrands,
          workingHours,
          documents: { insurance: 'Sigorta bilgisi eklenecek' }, // dummy bir değer
          experience: 0,
          rating: 0,
          totalServices: 0,
          isAvailable: true,
          currentLocation: {
            type: 'Point',
            coordinates: [0, 0]
          }
        });
        
        console.log('Oluşturulacak mechanic:', JSON.stringify(mechanic, null, 2));
        await mechanic.save();
        console.log('Mechanic kaydı başarılı:', mechanic._id);
      } catch (err) {
        console.error('Mechanic kaydı sırasında hata:', err);
        // User kaydını sil
        await User.findByIdAndDelete(user._id);
        return res.status(500).json({ 
          message: 'Mechanic kaydı sırasında hata oluştu', 
          error: err instanceof Error ? err.message : 'Bilinmeyen hata'
        });
      }
    }

    const token = jwt.sign(
      { userId: (user._id as mongoose.Types.ObjectId).toString(), userType: finalUserType },
      JWT_SECRET
    );
    const refreshToken = jwt.sign(
      { userId: (user._id as mongoose.Types.ObjectId).toString(), userType: finalUserType },
      JWT_SECRET,
      { expiresIn: '60d' }
    );

    console.log('Kayıt başarılı:', { name, surname, email, userType: finalUserType, userId: user._id });
    res.status(201).json({ 
      message: 'Kayıt başarılı!', 
      userId: user._id, 
      userType: finalUserType,
      token,
      refreshToken,
      user
    });
  } catch (err) {
    console.error('Kayıt sırasında hata:', err);
    res.status(500).json({ 
      message: 'Sunucu hatası.',
      error: err instanceof Error ? err.message : 'Bilinmeyen hata'
    });
  }
});

router.post('/login', async (req: Request, res: Response) => {
  console.log('Giriş isteği alındı:', req.body);
  let { email, password, userType } = req.body;
  email = email.trim().toLowerCase();
  try {
    let user: IUser | null = null;
    let finalUserType = 'user';

    // İstenen userType'a göre arama yap
    if (userType === 'mechanic') {
      user = await Mechanic.findOne({ email: new RegExp('^' + email + '$', 'i') });
      if (user) finalUserType = 'mechanic';
    } else if (userType === 'driver') {
      user = await Driver.findOne({ email: new RegExp('^' + email + '$', 'i') });
      if (user) finalUserType = 'driver';
    } else {
      user = await User.findOne({ email: new RegExp('^' + email + '$', 'i') });
      if (user) finalUserType = user.userType;
    }

    if (!user) {
      console.log('Kullanıcı bulunamadı:', email);
      return res.status(400).json({ message: 'Kullanıcı bulunamadı.' });
    }

    if (!user.password) {
      console.log('Kullanıcının şifresi yok:', email);
      return res.status(400).json({ message: 'Kullanıcı şifresi bulunamadı.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      console.log('Şifre hatalı:', email);
      return res.status(400).json({ message: 'Şifre hatalı.' });
    }

    // Süresiz token oluştur
    const token = jwt.sign(
      { userId: (user._id as mongoose.Types.ObjectId).toString(), userType: finalUserType },
      JWT_SECRET
    );
    // Refresh token oluştur (60 gün geçerli)
    const refreshToken = jwt.sign(
      { userId: (user._id as mongoose.Types.ObjectId).toString(), userType: finalUserType },
      JWT_SECRET,
      { expiresIn: '60d' }
    );

    console.log('Giriş başarılı:', { email, userType: finalUserType, userId: user._id });
    res.status(200).json({ 
      message: 'Giriş başarılı!', 
      userId: user._id, 
      userType: finalUserType,
      token,
      refreshToken,
      user
    });
  } catch (err) {
    console.error('Giriş sırasında hata:', err);
    res.status(500).json({ message: 'Sunucu hatası.' });
  }
});

// Çıkış yapma endpoint'i
router.post('/logout', auth, async (req: Request, res: Response) => {
  try {
    res.json({ message: 'Çıkış başarılı' });
  } catch (error) {
    console.error('Çıkış hatası:', error);
    res.status(500).json({ message: 'Sunucu hatası' });
  }
});

// Kullanıcı bilgisi güncelle
router.patch('/user/:id', auth, async (req: Request, res: Response) => {
  try {
    // Sadece kendi profilini güncelleyebilir
    if (req.user?.userId !== req.params.id) {
      return res.status(403).json({ message: 'Bu işlem için yetkiniz yok' });
    }
    const updated = await User.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// Profil fotoğrafı güncelleme endpointi
router.post('/users/profile-photo', auth, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { photoUrl } = req.body;
    if (!userId) {
      return res.status(401).json({ message: 'Kullanıcı doğrulanamadı.' });
    }
    if (!photoUrl) {
      return res.status(400).json({ message: 'Fotoğraf URL\'si eksik.' });
    }
    const updated = await User.findByIdAndUpdate(userId, { avatar: photoUrl }, { new: true });
    if (!updated) {
      return res.status(404).json({ message: 'Kullanıcı bulunamadı.' });
    }
    res.json({ message: 'Profil fotoğrafı güncellendi.', user: updated });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// Kapak fotoğrafı güncelleme endpointi
router.post('/users/cover-photo', auth, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { photoUrl } = req.body;
    console.log('Kapak fotoğrafı güncelleme isteği:', { userId, photoUrl });
    if (!userId) {
      return res.status(401).json({ message: 'Kullanıcı doğrulanamadı.' });
    }
    if (!photoUrl) {
      return res.status(400).json({ message: 'Fotoğraf URL\'si eksik.' });
    }
    const updated = await User.findByIdAndUpdate(userId, { cover: photoUrl }, { new: true });
    console.log('Güncellenmiş kullanıcı:', updated);
    if (!updated) {
      return res.status(404).json({ message: 'Kullanıcı bulunamadı.' });
    }
    res.json({ message: 'Kapak fotoğrafı güncellendi.', user: updated });
  } catch (error: any) {
    console.error('Kapak fotoğrafı güncelleme hatası:', error);
    res.status(500).json({ message: error.message });
  }
});

// Refresh token endpointi
router.post('/refresh-token', async (req: Request, res: Response) => {
  const { refreshToken } = req.body;
  if (!refreshToken) {
    return res.status(400).json({ message: 'Refresh token gerekli.' });
  }
  try {
    const decoded = jwt.verify(refreshToken, JWT_SECRET) as { userId: string; userType: string };
    // Yeni access token üret
    const token = jwt.sign(
      { userId: decoded.userId, userType: decoded.userType },
      JWT_SECRET
    );
    res.json({ token });
  } catch (err) {
    return res.status(401).json({ message: 'Geçersiz veya süresi dolmuş refresh token.' });
  }
});

export default router; 