import { Router, Request, Response } from 'express';
import { getSampleAds } from '../utils/homeFixtures';

const router = Router();

router.get('/', async (_req: Request, res: Response) => {
  try {
    const ads = getSampleAds();

    return res.json({
      success: true,
      data: ads,
      message: 'Reklamlar başarıyla getirildi.',
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: 'Reklamlar getirilirken bir hata oluştu.',
      error: error.message,
    });
  }
});

export default router;

