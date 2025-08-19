import { Request, Response } from 'express';
import { MessageService } from '../services/message.service';
import { CustomError } from '../middleware/errorHandler';

export class MessageController {
  /**
   * Yeni mesaj gönder
   */
  static async sendMessage(req: Request, res: Response) {
    try {
      const { receiverId, content, messageType = 'text' } = req.body;
      const senderId = req.user?.userId;

      if (!senderId) {
        throw new CustomError('Kullanıcı kimliği bulunamadı', 401);
      }

      if (!receiverId || !content) {
        throw new CustomError('Alıcı ID ve mesaj içeriği gerekli', 400);
      }

      const message = await MessageService.sendMessage(senderId, receiverId, content, messageType);

      res.status(201).json({
        success: true,
        message: 'Mesaj başarıyla gönderildi',
        data: message
      });
    } catch (error) {
      if (error instanceof CustomError) {
        res.status(error.statusCode).json({
          success: false,
          message: error.message
        });
      } else {
        res.status(500).json({
          success: false,
          message: 'Mesaj gönderilirken hata oluştu'
        });
      }
    }
  }

  /**
   * Kullanıcının sohbetlerini getir
   */
  static async getUserConversations(req: Request, res: Response) {
    try {
      const userId = req.user?.userId;

      if (!userId) {
        throw new CustomError('Kullanıcı kimliği bulunamadı', 401);
      }

      const conversations = await MessageService.getUserConversations(userId);

      res.status(200).json({
        success: true,
        message: 'Sohbetler başarıyla getirildi',
        data: conversations
      });
    } catch (error) {
      if (error instanceof CustomError) {
        res.status(error.statusCode).json({
          success: false,
          message: error.message
        });
      } else {
        res.status(500).json({
          success: false,
          message: 'Sohbetler getirilirken hata oluştu'
        });
      }
    }
  }

  /**
   * Sohbet mesajlarını getir
   */
  static async getConversationMessages(req: Request, res: Response) {
    try {
      const { conversationId } = req.params;
      const { page = 1, limit = 50 } = req.query;
      const userId = req.user?.userId;

      if (!userId) {
        throw new CustomError('Kullanıcı kimliği bulunamadı', 401);
      }

      if (!conversationId) {
        throw new CustomError('Sohbet ID gerekli', 400);
      }

      const result = await MessageService.getConversationMessages(
        conversationId,
        userId,
        parseInt(page as string),
        parseInt(limit as string)
      );

      res.status(200).json({
        success: true,
        message: 'Mesajlar başarıyla getirildi',
        data: result
      });
    } catch (error) {
      if (error instanceof CustomError) {
        res.status(error.statusCode).json({
          success: false,
          message: error.message
        });
      } else {
        res.status(500).json({
          success: false,
          message: 'Mesajlar getirilirken hata oluştu'
        });
      }
    }
  }

  /**
   * İki kullanıcı arasında sohbet bul
   */
  static async findConversationBetweenUsers(req: Request, res: Response) {
    try {
      const { otherUserId } = req.params;
      const userId = req.user?.userId;

      if (!userId) {
        throw new CustomError('Kullanıcı kimliği bulunamadı', 401);
      }

      if (!otherUserId) {
        throw new CustomError('Diğer kullanıcı ID gerekli', 400);
      }

      const conversation = await MessageService.findConversationBetweenUsers(userId, otherUserId);

      res.status(200).json({
        success: true,
        message: conversation ? 'Sohbet bulundu' : 'Sohbet bulunamadı',
        data: conversation
      });
    } catch (error) {
      if (error instanceof CustomError) {
        res.status(error.statusCode).json({
          success: false,
          message: error.message
        });
      } else {
        res.status(500).json({
          success: false,
          message: 'Sohbet bulunurken hata oluştu'
        });
      }
    }
  }

  /**
   * Mesajları okundu olarak işaretle
   */
  static async markMessagesAsRead(req: Request, res: Response) {
    try {
      const { messageIds } = req.body;
      const userId = req.user?.userId;

      if (!userId) {
        throw new CustomError('Kullanıcı kimliği bulunamadı', 401);
      }

      if (!messageIds || !Array.isArray(messageIds)) {
        throw new CustomError('Mesaj ID\'leri gerekli', 400);
      }

      await MessageService.markMessagesAsRead(messageIds, userId);

      res.status(200).json({
        success: true,
        message: 'Mesajlar okundu olarak işaretlendi'
      });
    } catch (error) {
      if (error instanceof CustomError) {
        res.status(error.statusCode).json({
          success: false,
          message: error.message
        });
      } else {
        res.status(500).json({
          success: false,
          message: 'Mesajlar işaretlenirken hata oluştu'
        });
      }
    }
  }

  /**
   * Sohbeti sil
   */
  static async deleteConversation(req: Request, res: Response) {
    try {
      const { conversationId } = req.params;
      const userId = req.user?.userId;

      if (!userId) {
        throw new CustomError('Kullanıcı kimliği bulunamadı', 401);
      }

      if (!conversationId) {
        throw new CustomError('Sohbet ID gerekli', 400);
      }

      await MessageService.deleteConversation(conversationId, userId);

      res.status(200).json({
        success: true,
        message: 'Sohbet başarıyla silindi'
      });
    } catch (error) {
      if (error instanceof CustomError) {
        res.status(error.statusCode).json({
          success: false,
          message: error.message
        });
      } else {
        res.status(500).json({
          success: false,
          message: 'Sohbet silinirken hata oluştu'
        });
      }
    }
  }
}
