import { Router } from 'express';
import { auth } from '../middleware/optimizedAuth';
import { validate } from '../middleware/validate';
import { requireMechanic } from '../middleware/roleAuth';
import { MechanicJobsController } from '../controllers/mechanicJobs.controller';

const router = Router();

// Önce spesifik route'ları tanımla
router.get('/stats', auth, MechanicJobsController.getJobStats);
router.get('/schedule', auth, MechanicJobsController.getJobSchedule);

// Sonra ana route'ları tanımla
router.get('/', auth, MechanicJobsController.getMechanicJobs);

// En son parametreli route'ları tanımla
router.get('/:jobId', auth, MechanicJobsController.getJobDetails);
router.put('/:jobId/status', auth, MechanicJobsController.updateJobStatus);
router.put('/:jobId/price', auth, MechanicJobsController.updateJobPrice);
router.post('/:jobId/complete', auth, MechanicJobsController.completeJob);

export default router;
