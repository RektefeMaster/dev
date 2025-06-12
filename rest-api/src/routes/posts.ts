import { Router } from 'express';
import { createPost, getAllPosts, likePost, deletePost } from '../controllers/postController';
import auth from '../middleware/auth';

const router = Router();

// Tüm gönderileri çek
router.get('/', auth, getAllPosts);
// Gönderi oluştur
router.post('/', auth, createPost);
// Gönderiyi beğen
router.post('/:id/like', auth, likePost);
// Gönderiyi sil
router.delete('/:id', auth, deletePost);

export default router; 