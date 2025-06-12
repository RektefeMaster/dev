import { Router, Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User';
import Driver from '../models/Driver';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Types
interface AuthRequest extends Request {
  user?: {
    userId: string;
    userType: string;
  };
}

// Middleware
export const auth = async (req: AuthRequest, res: Response, next: NextFunction) => {
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
  const { name, surname, email, password, avatar } = req.body;
  try {
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      console.log('Kayıt başarısız: Bu e-posta zaten kayıtlı.', email);
      return res.status(400).json({ message: 'Bu e-posta zaten kayıtlı.' });
    }
    const hashedPassword = await bcrypt.hash(password, 10);

    const user = new User({ name, surname, email, password: hashedPassword, avatar });
    const driver = new Driver({ name, surname, email, password: hashedPassword });

    await user.save();
    await driver.save();

    // Süresiz token oluştur
    const token = jwt.sign(
      { userId: user._id, userType: 'user' },
      JWT_SECRET
    );

    console.log('Kayıt başarılı:', { name, surname, email });
    res.status(201).json({ 
      message: 'Kayıt başarılı!', 
      userId: user._id, 
      userType: 'user',
      token 
    });
  } catch (err) {
    console.error('Kayıt sırasında hata:', err);
    res.status(500).json({ message: 'Sunucu hatası.' });
  }
});

router.post('/login', async (req: Request, res: Response) => {
  console.log('Giriş isteği alındı:', req.body);
  const { email, password } = req.body;
  try {
    // Önce User'da ara
    let user = await User.findOne({ email });
    let userType = 'user';
    if (!user) {
      // Eğer User yoksa Driver'da ara
      user = await Driver.findOne({ email });
      userType = 'driver';
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
      { userId: user._id, userType },
      JWT_SECRET
    );

    console.log('Giriş başarılı:', { email, userType, userId: user._id });
    res.status(200).json({ 
      message: 'Giriş başarılı!', 
      userId: user._id, 
      userType,
      token 
    });
  } catch (err) {
    console.error('Giriş sırasında hata:', err);
    res.status(500).json({ message: 'Sunucu hatası.' });
  }
});

// Çıkış yapma endpoint'i
router.post('/logout', auth, async (req: AuthRequest, res: Response) => {
  try {
    res.json({ message: 'Çıkış başarılı' });
  } catch (error) {
    console.error('Çıkış hatası:', error);
    res.status(500).json({ message: 'Sunucu hatası' });
  }
});

// Kullanıcı bilgisi getir
router.get('/user/:id', auth, async (req: AuthRequest, res: Response) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'Kullanıcı bulunamadı' });
    }
    res.json(user);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// Kullanıcı bilgisi güncelle
router.patch('/user/:id', auth, async (req: AuthRequest, res: Response) => {
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
router.post('/users/profile-photo', auth, async (req: AuthRequest, res: Response) => {
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
router.post('/users/cover-photo', auth, async (req: AuthRequest, res: Response) => {
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

export default router; 