import { Router } from 'express';
import { auth } from '../middleware/optimizedAuth';
import { OdometerController } from '../controllers/odometer.controller';

const router = Router({ mergeParams: true });

router.get('/:id/odometer', auth, OdometerController.getEstimate);
router.post('/:id/odometer/events', auth, OdometerController.createEvent);
router.get('/:id/odometer/timeline', auth, OdometerController.getTimeline);
router.get('/:id/odometer/audit', auth, OdometerController.getAuditLogs);

export default router;


