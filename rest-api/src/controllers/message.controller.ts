import { Request, Response } from 'express';
import { MessageService } from '../services/message.service';

export class MessageController {
  // Sohbet listesi
  static async getConversations(req: Request, res: Response) {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Kullanıcı kimliği bulunamadı'
        });
      }

      const conversations = await MessageService.getConversations(userId);
      res.json({
        success: true,
        data: {
          conversations: conversations
        },
        message: 'Sohbetler başarıyla getirildi'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Sohbetler getirilirken hata oluştu'
      });
    }
  }

  // Sohbet mesajları
  static async getMessages(req: Request, res: Response) {
    try {
      const { conversationId } = req.params;
      const { page = 1, limit = 50 } = req.query;
      const userId = req.user?.userId;
      
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Kullanıcı kimliği bulunamadı'
        });
      }

      // Page ve limit'i number'a çevir
      const pageNum = parseInt(page as string) || 1;
      const limitNum = parseInt(limit as string) || 50;

      const result = await MessageService.getMessages(conversationId, pageNum, limitNum);
      
      // Pagination bilgilerini hesapla
      const totalMessages = await MessageService.getTotalMessageCount(conversationId, userId);
      const totalPages = Math.ceil(totalMessages / limitNum);
      
      res.json({
        success: true,
        data: { 
          messages: result,
          pagination: {
            page: pageNum,
            pages: totalPages,
            total: totalMessages,
            limit: limitNum,
            hasMore: pageNum < totalPages
          }
        },
        message: 'Mesajlar başarıyla getirildi'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Mesajlar getirilirken hata oluştu'
      });
    }
  }

  // Belirli bir mesajdan sonraki mesajları getir
  static async getMessagesAfter(req: Request, res: Response) {
    try {
      const { conversationId, messageId } = req.params;
      const { limit = 10 } = req.query;
      const userId = req.user?.userId;
      
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Kullanıcı kimliği bulunamadı'
        });
      }

      const limitNum = parseInt(limit as string) || 10;
      const messages = await MessageService.getMessagesAfter(conversationId, messageId, limitNum);
      
      res.json({
        success: true,
        data: { messages },
        message: 'Yeni mesajlar başarıyla getirildi'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Yeni mesajlar getirilirken hata oluştu'
      });
    }
  }

  // İki kullanıcı arasında sohbet bul
  static async findConversationBetweenUsers(req: Request, res: Response) {
    try {
      const { otherUserId } = req.params;
      const userId = req.user?.userId;
      
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Kullanıcı kimliği bulunamadı'
        });
      }

      const conversation = await MessageService.findConversationBetweenUsers(userId, otherUserId);
      res.json({
        success: true,
        data: conversation,
        message: 'Sohbet başarıyla bulundu'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Sohbet bulunurken hata oluştu'
      });
    }
  }

  // Mesaj gönder
  static async sendMessage(req: Request, res: Response) {
    try {
      const { receiverId, content, messageType = 'text' } = req.body;
      const senderId = req.user?.userId;
      
      if (!senderId) {
        return res.status(401).json({
          success: false,
          message: 'Kullanıcı kimliği bulunamadı'
        });
      }

      if (!receiverId || !content) {
        return res.status(400).json({
          success: false,
          message: 'Alıcı ID ve mesaj içeriği gerekli'
        });
      }

      const message = await MessageService.sendMessage(senderId, receiverId, content, messageType);
      
      res.json({
        success: true,
        data: message,
        message: 'Mesaj başarıyla gönderildi'
      });
    } catch (error: any) {
      console.error('Send message error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Mesaj gönderilirken hata oluştu'
      });
    }
  }

  // Mesajları okundu olarak işaretle
  static async markMessagesAsRead(req: Request, res: Response) {
    try {
      const { conversationId } = req.body;
      const userId = req.user?.userId;
      
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Kullanıcı kimliği bulunamadı'
        });
      }

      await MessageService.markMessagesAsRead(conversationId, userId);
      res.json({
        success: true,
        message: 'Mesajlar okundu olarak işaretlendi'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Mesajlar işaretlenirken hata oluştu'
      });
    }
  }

  // Okunmamış mesaj sayısı
  static async getUnreadCount(req: Request, res: Response) {
    try {
      const userId = req.user?.userId;
      
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Kullanıcı kimliği bulunamadı'
        });
      }

      const count = await MessageService.getUnreadCount(userId);
      res.json({
        success: true,
        data: { unreadCount: count },
        message: 'Okunmamış mesaj sayısı getirildi'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Okunmamış mesaj sayısı getirilirken hata oluştu'
      });
    }
  }

  // Sohbeti sil
  static async deleteConversation(req: Request, res: Response) {
    try {
      const { conversationId } = req.params;
      const userId = req.user?.userId;
      
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Kullanıcı kimliği bulunamadı'
        });
      }

      await MessageService.deleteConversation(conversationId, userId);
      res.json({
        success: true,
        message: 'Sohbet başarıyla silindi'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Sohbet silinirken hata oluştu'
      });
    }
  }

  // Mesaj sil
  static async deleteMessage(req: Request, res: Response) {
    try {
      const { messageId } = req.params;
      const userId = req.user?.userId;
      
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Kullanıcı kimliği bulunamadı'
        });
      }

      await MessageService.deleteMessage(messageId, userId);
      res.json({
        success: true,
        message: 'Mesaj başarıyla silindi'
      });
    } catch (error: any) {
      console.error('Delete message error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Mesaj silinirken hata oluştu'
      });
    }
  }
}
