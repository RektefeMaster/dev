import express from 'express';
import { auth } from '../middleware/auth';
import {
  addComment,
  getComments,
  deleteComment
} from '../controllers/commentController';

const router = express.Router();

// Yorum oluşturma
router.post('/:id', auth, addComment);

// Yorumları getirme
router.get('/:id', getComments);

// Yorum silme
router.delete('/delete/:id', auth, deleteComment);

export default router; 