import { Router } from 'express';
import { addComment, getComments } from '../controllers/commentController';
import auth from '../middleware/auth';

const router = Router();

// Bir gönderinin yorumlarını çek
router.get('/:id', getComments);
// Bir gönderiye yorum ekle
router.post('/:id', auth, addComment);

export default router; 