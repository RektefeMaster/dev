import { Router, Request, Response } from 'express';
import { User } from '../models/User';
import { auth } from '../middleware/auth';
import mongoose from 'mongoose';

const router = Router();

// Takip etme
router.post('/users/follow/:userId', auth, async (req: Request, res: Response) => {
  console.log(`[POST] /users/follow/${req.params.userId} - İstek geldi. Takip eden:`, req.user?.userId);
  if (!req.user) return res.status(401).json({ message: 'Kullanıcı doğrulanamadı.' });
  try {
    const followerId = new mongoose.Types.ObjectId(req.user.userId);
    const followingId = new mongoose.Types.ObjectId(req.params.userId);

    if (followerId.toString() === followingId.toString()) {
      console.log('Kendini takip etmeye çalıştı!');
      return res.status(400).json({ message: 'Kendinizi takip edemezsiniz' });
    }

    const [follower, following] = await Promise.all([
      User.findById(followerId),
      User.findById(followingId)
    ]);

    if (!follower || !following) {
      console.log('Takip edilecek kullanıcı bulunamadı!');
      return res.status(404).json({ message: 'Kullanıcı bulunamadı' });
    }

    if ((follower.following || []).includes(followingId)) {
      console.log('Zaten takip ediliyor!');
      return res.status(400).json({ message: 'Bu kullanıcıyı zaten takip ediyorsunuz' });
    }

    await Promise.all([
      User.findByIdAndUpdate(followerId, {
        $push: { following: followingId }
      }),
      User.findByIdAndUpdate(followingId, {
        $push: { 
          followers: followerId,
          notifications: {
            type: 'follow',
            from: followerId,
            title: 'Yeni Takipçi',
            message: `${follower.name} ${follower.surname} sizi takip etmeye başladı!`
          }
        }
      })
    ]);

    console.log('Takip işlemi başarılı!');
    res.json({ message: 'Kullanıcı başarıyla takip edildi' });
  } catch (error) {
    console.error('Takip etme sunucu hatası:', error);
    res.status(500).json({ message: 'Sunucu hatası', error });
  }
});

// Takibi bırakma
router.post('/users/unfollow/:userId', auth, async (req: Request, res: Response) => {
  console.log(`[POST] /users/unfollow/${req.params.userId} - İstek geldi. Takipten çıkan:`, req.user?.userId);
  if (!req.user) return res.status(401).json({ message: 'Kullanıcı doğrulanamadı.' });
  try {
    const followerId = new mongoose.Types.ObjectId(req.user.userId);
    const followingId = new mongoose.Types.ObjectId(req.params.userId);

    const [follower, following] = await Promise.all([
      User.findById(followerId),
      User.findById(followingId)
    ]);

    if (!follower || !following) {
      console.log('Takipten çıkılacak kullanıcı bulunamadı!');
      return res.status(404).json({ message: 'Kullanıcı bulunamadı' });
    }

    if (!(follower.following || []).includes(followingId)) {
      console.log('Zaten takip edilmiyor!');
      return res.status(400).json({ message: 'Bu kullanıcıyı zaten takip etmiyorsunuz' });
    }

    await Promise.all([
      User.findByIdAndUpdate(followerId, {
        $pull: { following: followingId }
      }),
      User.findByIdAndUpdate(followingId, {
        $pull: { followers: followerId }
      })
    ]);

    console.log('Takipten çıkma işlemi başarılı!');
    res.json({ message: 'Kullanıcı takibi bırakıldı' });
  } catch (error) {
    console.error('Takipten çıkma sunucu hatası:', error);
    res.status(500).json({ message: 'Sunucu hatası', error });
  }
});

// Takipçileri getir
router.get('/users/followers/:userId', auth, async (req: Request, res: Response) => {
  console.log(`[GET] /users/followers/${req.params.userId} - Takipçi listesi isteniyor.`);
  try {
    const user = await User.findById(req.params.userId)
      .populate('followers', 'name surname username avatar');
    if (!user) {
      console.log('Takipçi listesi için kullanıcı bulunamadı!');
      return res.status(404).json({ message: 'Kullanıcı bulunamadı' });
    }
    console.log('Takipçi listesi başarıyla döndü!');
    res.json(Array.isArray(user.followers) ? user.followers : []);
  } catch (error) {
    console.error('Takipçi listesi sunucu hatası:', error);
    res.status(500).json({ message: 'Sunucu hatası', error });
  }
});

// Takip edilenleri getir
router.get('/users/following/:userId', auth, async (req: Request, res: Response) => {
  console.log(`[GET] /users/following/${req.params.userId} - Takip edilenler listesi isteniyor.`);
  try {
    const user = await User.findById(req.params.userId)
      .populate('following', 'name surname username avatar');
    if (!user) {
      console.log('Takip edilenler için kullanıcı bulunamadı!');
      return res.status(404).json({ message: 'Kullanıcı bulunamadı' });
    }
    console.log('Takip edilenler listesi başarıyla döndü!');
    res.json(Array.isArray(user.following) ? user.following : []);
  } catch (error) {
    console.error('Takip edilenler sunucu hatası:', error);
    res.status(500).json({ message: 'Sunucu hatası', error });
  }
});

// Bildirimleri getir
router.get('/users/notifications', auth, async (req: Request, res: Response) => {
  if (!req.user) return res.status(401).json({ message: 'Kullanıcı doğrulanamadı.' });
  try {
    const user = await User.findById(req.user.userId)
      .populate('notifications.from', 'username profileImage');
    
    if (!user) {
      return res.status(404).json({ message: 'Kullanıcı bulunamadı' });
    }

    res.json(user.notifications);
  } catch (error) {
    res.status(500).json({ message: 'Sunucu hatası', error });
  }
});

// Bildirimleri okundu olarak işaretle
router.put('/users/notifications/read', auth, async (req: Request, res: Response) => {
  if (!req.user) return res.status(401).json({ message: 'Kullanıcı doğrulanamadı.' });
  try {
    await User.findByIdAndUpdate(req.user.userId, {
      $set: { 'notifications.$[].read': true }
    });

    res.json({ message: 'Bildirimler okundu olarak işaretlendi' });
  } catch (error) {
    res.status(500).json({ message: 'Sunucu hatası', error });
  }
});

// Takip durumu kontrolü
router.get('/users/check-follow/:userId', auth, async (req: Request, res: Response) => {
  console.log(`[GET] /users/check-follow/${req.params.userId} - Takip durumu kontrol ediliyor. Sorgulayan:`, req.user?.userId);
  if (!req.user) return res.status(401).json({ message: 'Kullanıcı doğrulanamadı.' });
  try {
    const followerId = new mongoose.Types.ObjectId(req.user.userId);
    const followingId = new mongoose.Types.ObjectId(req.params.userId);

    const follower = await User.findById(followerId);
    if (!follower) {
      console.log('Takip durumu için kullanıcı bulunamadı!');
      return res.status(404).json({ message: 'Kullanıcı bulunamadı' });
    }

    const isFollowing = (follower.following || []).includes(followingId);
    console.log('Takip durumu sonucu:', isFollowing);
    res.json({ isFollowing });
  } catch (error) {
    console.error('Takip durumu kontrolü sunucu hatası:', error);
    res.status(500).json({ message: 'Sunucu hatası', error });
  }
});

// Kullanıcıya sistem bildirimi ekle
router.post('/users/:userId/notifications', auth, async (req: Request, res: Response) => {
  if (!req.user) return res.status(401).json({ message: 'Kullanıcı doğrulanamadı.' });
  try {
    const { type, title, message, data } = req.body;
    await User.findByIdAndUpdate(req.params.userId, {
      $push: { notifications: { type, title, message, data, from: req.user.userId } }
    });
    res.json({ message: 'Bildirim eklendi' });
  } catch (error) {
    res.status(500).json({ message: 'Sunucu hatası', error });
  }
});

// Bildirim silme
router.delete('/users/notifications/:notificationId', auth, async (req: Request, res: Response) => {
  if (!req.user) return res.status(401).json({ message: 'Kullanıcı doğrulanamadı.' });
  try {
    await User.findByIdAndUpdate(req.user.userId, {
      $pull: { notifications: { _id: req.params.notificationId } }
    });
    res.json({ message: 'Bildirim silindi' });
  } catch (error) {
    res.status(500).json({ message: 'Sunucu hatası', error });
  }
});

// Kullanıcı bilgisi getir
router.get('/users/:userId', auth, async (req: Request, res: Response) => {
  try {
    let userId = req.params.userId;
    if (userId === 'me') {
      if (!req.user || !req.user.userId) {
        return res.status(401).json({ message: 'Kullanıcı doğrulanamadı.' });
      }
      userId = req.user.userId;
    }
    console.log('Kullanıcı bilgisi get endpointi: req.user:', req.user, 'req.params.userId:', req.params.userId);
    const user = await User.findById(userId);
    if (!user) {
      console.log('Kullanıcı bulunamadı! userId:', userId);
      return res.status(404).json({ message: 'Kullanıcı bulunamadı' });
    }
    res.json(user);
  } catch (error) {
    console.log('Kullanıcı bilgisi get endpointi hata:', error);
    res.status(500).json({ message: 'Sunucu hatası', error });
  }
});

export default router; 