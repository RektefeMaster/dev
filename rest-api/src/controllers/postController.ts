import Post from '../models/Post';
import Comment from '../models/Comment';
import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { getFromCache, setToCache, clearCache } from '../config/redis';

declare module 'express-serve-static-core' {
  interface Request {
    userId?: string;
  }
}

const CACHE_DURATION = 300; // 5 dakika

export const createPost = async (req: Request, res: Response) => {
  try {
    const { content } = req.body;
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Kullanıcı doğrulanamadı.' });
    const objectUserId = new mongoose.Types.ObjectId(userId);
    console.log('Post oluşturuluyor, userId:', objectUserId, typeof objectUserId);
    const post = await Post.create({ user: objectUserId, content });
    const populatedPost = await Post.findById(post._id).populate('user', 'name surname username bio avatar cover email city tags');
    await clearCache('posts:*');
    res.status(201).json(populatedPost);
  } catch (err) {
    res.status(500).json({ error: 'Gönderi oluşturulamadı.' });
  }
};

export const getAllPosts = async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    const cacheKey = `posts:${page}:${limit}`;
    const cachedPosts = await getFromCache(cacheKey);

    if (cachedPosts) {
      return res.json(cachedPosts);
    }

    const posts = await Post.find()
      .populate('user', 'name surname username bio avatar cover email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();
    
    // Yorum sayılarını toplu olarak al
    const postIds = posts.map(post => post._id);
    const commentCounts = await Comment.aggregate([
      { $match: { post: { $in: postIds } } },
      { $group: { _id: '$post', count: { $sum: 1 } } }
    ]);
    
    // Yorum sayılarını postlara ekle
    const postsWithComments = posts.map(post => ({
      ...post,
      commentsCount: commentCounts.find(c => c._id.toString() === post._id.toString())?.count || 0
    }));
    
    await setToCache(cacheKey, postsWithComments, CACHE_DURATION);
    res.json(postsWithComments);
  } catch (err) {
    console.error('Gönderiler alınırken hata:', err);
    res.status(500).json({ 
      error: 'Gönderiler alınamadı.',
      details: err instanceof Error ? err.message : 'Bilinmeyen hata'
    });
  }
};

export const likePost = async (req: Request, res: Response) => {
  try {
    const postId = req.params.id;
    const userId = req.userId;
    if (!userId) return res.status(401).json({ error: 'Kullanıcı doğrulanamadı.' });
    const objectUserId = new mongoose.Types.ObjectId(userId);
    const post = await Post.findById(postId);
    if (!post) return res.status(404).json({ error: 'Gönderi bulunamadı.' });
    const likeIndex = post.likes.findIndex(like => like.equals(objectUserId));
    if (likeIndex === -1) {
      post.likes.push(objectUserId);
    } else {
      post.likes.splice(likeIndex, 1);
    }
    await post.save();
    await clearCache('posts:*');
    res.json(post);
  } catch (err) {
    console.error('likePost 500 hatası:', err);
    res.status(500).json({ error: 'Beğeni işlemi başarısız.', details: err instanceof Error ? err.message : err });
  }
};

export const deletePost = async (req: Request, res: Response) => {
  try {
    const postId = req.params.id;
    const userId = req.userId;
    const post = await Post.findById(postId);
    
    if (!post) return res.status(404).json({ error: 'Gönderi bulunamadı.' });
    if (post.user.toString() !== userId) return res.status(403).json({ error: 'Bu gönderiyi silme yetkiniz yok.' });
    
    // Toplu silme işlemi
    await Promise.all([
      Post.findByIdAndDelete(postId),
      Comment.deleteMany({ post: postId })
    ]);
    
    await clearCache('posts:*');
    res.json({ message: 'Gönderi silindi.' });
  } catch (err) {
    res.status(500).json({ error: 'Gönderi silinemedi.' });
  }
}; 