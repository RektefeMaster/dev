import Comment from '../models/Comment';
import { Request, Response } from 'express';
import mongoose from 'mongoose';
import Post from '../models/Post';
import { User } from '../models/User';

interface AuthRequest extends Request {
  user?: {
    userId: string;
    userType: string;
  };
}

export const addComment = async (req: AuthRequest, res: Response) => {
  try {
    const { content } = req.body;
    const userId = req.user?.userId;
    const postId = req.params.id;
    if (!userId) return res.status(401).json({ error: 'Kullanıcı doğrulanamadı.' });
    const objectUserId = new mongoose.Types.ObjectId(userId);
    console.log('Yorum ekleniyor, userId:', objectUserId, typeof objectUserId);
    const comment = await Comment.create({ post: postId, user: objectUserId, content });
    const populatedComment = await Comment.findById(comment._id).populate('user', 'name email avatar');

    // Bildirim ekle
    const post = await Post.findById(postId).populate('user', 'name');
    if (post && post.user && String(post.user._id) !== String(userId)) {
      const commentUser = await User.findById(userId);
      await User.findByIdAndUpdate(post.user._id, {
        $push: {
          notifications: {
            type: 'comment',
            from: objectUserId,
            title: 'Yeni Yorum',
            message: `${commentUser?.name || 'Bir kullanıcı'} \"${post.content?.slice(0, 30) || 'gönderiniz'}\" gönderinize yorum yaptı! (${content})`
          }
        }
      });
    }

    res.status(201).json(populatedComment);
  } catch (err) {
    res.status(500).json({ error: 'Yorum eklenemedi.' });
  }
};

export const getComments = async (req: Request, res: Response) => {
  try {
    const postId = req.params.id;
    const comments = await Comment.find({ post: postId })
      .populate('user', 'name email avatar')
      .sort({ createdAt: 1 });
    res.json(comments);
  } catch (err) {
    res.status(500).json({ error: 'Yorumlar alınamadı.' });
  }
};

export const deleteComment = async (req: AuthRequest, res: Response) => {
  try {
    const commentId = req.params.id;
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Kullanıcı doğrulanamadı.' });
    const objectUserId = new mongoose.Types.ObjectId(userId);
    const comment = await Comment.findById(commentId);
    if (!comment) return res.status(404).json({ error: 'Yorum bulunamadı.' });
    if (comment.user.toString() !== objectUserId.toString()) return res.status(403).json({ error: 'Bu yorumu silme yetkiniz yok.' });
    await Comment.findByIdAndDelete(commentId);
    res.json({ message: 'Yorum silindi.' });
  } catch (err) {
    console.error('Yorum silme hatası:', err);
    res.status(500).json({ error: 'Yorum silinemedi.', details: err instanceof Error ? err.message : err });
  }
}; 