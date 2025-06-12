import Comment from '../models/Comment';
import { Request, Response } from 'express';
import mongoose from 'mongoose';

declare module 'express-serve-static-core' {
  interface Request {
    userId?: string;
  }
}

export const addComment = async (req: Request, res: Response) => {
  try {
    const { content } = req.body;
    const userId = req.userId;
    const postId = req.params.id;
    if (!userId) return res.status(401).json({ error: 'Kullanıcı doğrulanamadı.' });
    const comment = await Comment.create({ post: postId, user: userId, content });
    res.status(201).json(comment);
  } catch (err) {
    res.status(500).json({ error: 'Yorum eklenemedi.' });
  }
};

export const getComments = async (req: Request, res: Response) => {
  try {
    const postId = req.params.id;
    const comments = await Comment.find({ post: postId })
      .populate('user', 'name email')
      .sort({ createdAt: 1 });
    res.json(comments);
  } catch (err) {
    res.status(500).json({ error: 'Yorumlar alınamadı.' });
  }
}; 