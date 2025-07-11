import { Router } from 'express';
import { createPost, getAllPosts, likePost, deletePost } from '../controllers/postController';
import { auth } from '../middleware/auth';
import { getComments, addComment } from '../controllers/commentController';

const router = Router();

// Tüm gönderileri çek
router.get('/', auth, getAllPosts);
// Gönderi oluştur
router.post('/', auth, createPost);
// Gönderiyi beğen
router.post('/:id/like', auth, likePost);
// Gönderiyi sil
router.delete('/:id', auth, deletePost);
// Gönderi yorumlarını çek
router.get('/:id/comments', getComments);
// Yorum ekle
router.post('/:id/comments', auth, addComment);

export default router; 