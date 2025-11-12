import { Router, Request, Response } from 'express';
import { getSampleCampaigns } from '../utils/homeFixtures';

const router = Router();

router.get('/', async (_req: Request, res: Response) => {
  try {
    const campaigns = getSampleCampaigns();

    return res.json({
      success: true,
      data: campaigns,
      message: 'Kampanyalar başarıyla getirildi.',
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: 'Kampanyalar getirilirken bir hata oluştu.',
      error: error.message,
    });
  }
});

export default router;

