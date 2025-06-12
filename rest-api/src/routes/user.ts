import { Router, Request, Response } from 'express';
import User from '../models/User';
import { auth } from './auth';
const router = Router();

// AuthRequest tipi
interface AuthRequest extends Request {
  user?: {
    userId: string;
    userType: string;
  };
}

// Takip etme
router.post('/users/follow/:userId', auth, async (req: AuthRequest, res: Response) => {
  console.log(`[POST] /users/follow/${req.params.userId} - İstek geldi. Takip eden:`, req.user?.userId);
  if (!req.user) return res.status(401).json({ message: 'Kullanıcı doğrulanamadı.' });
  try {
    const followerId = req.user.userId;
    const followingId = req.params.userId;

    if (followerId === followingId) {
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
            from: followerId
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
router.post('/users/unfollow/:userId', auth, async (req: AuthRequest, res: Response) => {
  console.log(`[POST] /users/unfollow/${req.params.userId} - İstek geldi. Takipten çıkan:`, req.user?.userId);
  if (!req.user) return res.status(401).json({ message: 'Kullanıcı doğrulanamadı.' });
  try {
    const followerId = req.user.userId;
    const followingId = req.params.userId;

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
router.get('/users/followers/:userId', auth, async (req: AuthRequest, res: Response) => {
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
router.get('/users/following/:userId', auth, async (req: AuthRequest, res: Response) => {
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
router.get('/users/notifications', auth, async (req: AuthRequest, res: Response) => {
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
router.put('/users/notifications/read', auth, async (req: AuthRequest, res: Response) => {
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
router.get('/users/check-follow/:userId', auth, async (req: AuthRequest, res: Response) => {
  console.log(`[GET] /users/check-follow/${req.params.userId} - Takip durumu kontrol ediliyor. Sorgulayan:`, req.user?.userId);
  if (!req.user) return res.status(401).json({ message: 'Kullanıcı doğrulanamadı.' });
  try {
    const followerId = req.user.userId;
    const followingId = req.params.userId;

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

export default router; 