import { Router, Request, Response } from 'express';
import { auth } from '../middleware/auth';
import { Message } from '../models/Message';
import { Conversation } from '../models/Conversation';
import { MessageService } from '../services/message.service';

const router = Router();

// ===== MESSAGE ENDPOINTS =====
router.get('/unread-count', auth, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Kullanıcı ID bulunamadı' });
    }
    
    const unreadCount = await MessageService.getUnreadCount(userId);
    
    res.json({
      success: true,
      data: { unreadCount },
      message: 'Unread message count başarıyla getirildi'
    });
  } catch (error: any) {
    console.error('Unread count hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Unread count getirilirken hata oluştu',
      error: error.message
    });
  }
});

router.get('/conversations', auth, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Kullanıcı ID bulunamadı' });
    }
    
    const conversations = await MessageService.getConversations(userId);
    
    res.json({
      success: true,
      data: conversations,
      message: 'Conversations başarıyla getirildi'
    });
  } catch (error: any) {
    console.error('Conversations hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Conversations getirilirken hata oluştu',
      error: error.message
    });
  }
});

router.get('/conversations/:conversationId/messages', auth, async (req: Request, res: Response) => {
  try {
    const { conversationId } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const userId = req.user?.userId;
    
    console.log('🔍 Backend: GET /conversations/:conversationId/messages called');
    console.log('🔍 Backend: conversationId:', conversationId);
    console.log('🔍 Backend: userId:', userId);
    console.log('🔍 Backend: page:', page, 'limit:', limit);
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Kullanıcı ID bulunamadı'
      });
    }
    
    const result = await MessageService.getMessages(conversationId, userId, page, limit);
    
    console.log('🔍 Backend: getMessages result:', result.messages.length, 'messages');
    
    res.json({
      success: true,
      data: result.messages,
      message: 'Messages başarıyla getirildi'
    });
  } catch (error: any) {
    console.error('Messages hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Messages getirilirken hata oluştu',
      error: error.message
    });
  }
});

// ===== SEND MESSAGE ENDPOINT =====
router.post('/send', auth, async (req: Request, res: Response) => {
  try {
    const { receiverId, content, messageType = 'text' } = req.body;
    const senderId = req.user?.userId;
    
    console.log('🔍 Backend: POST /send called');
    console.log('🔍 Backend: senderId:', senderId);
    console.log('🔍 Backend: receiverId:', receiverId);
    console.log('🔍 Backend: content:', content);
    console.log('🔍 Backend: messageType:', messageType);
    
    if (!senderId) {
      return res.status(401).json({
        success: false,
        message: 'Kullanıcı ID bulunamadı'
      });
    }

    if (!receiverId || !content) {
      return res.status(400).json({
        success: false,
        message: 'Alıcı ID ve mesaj içeriği gerekli'
      });
    }

    const message = await MessageService.sendMessage(senderId, receiverId, content, messageType);
    
    console.log('🔍 Backend: sendMessage result:', message._id);
    
    res.json({
      success: true,
      data: message,
      message: 'Mesaj başarıyla gönderildi'
    });
  } catch (error: any) {
    console.error('Send message hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Mesaj gönderilirken hata oluştu',
      error: error.message
    });
  }
});

// ===== MARK AS READ ENDPOINT =====
router.put('/mark-read', auth, async (req: Request, res: Response) => {
  try {
    const { conversationId } = req.body;
    const userId = req.user?.userId;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Kullanıcı ID bulunamadı'
      });
    }

    if (!conversationId) {
      return res.status(400).json({
        success: false,
        message: 'Conversation ID gerekli'
      });
    }

    await MessageService.markMessagesAsRead(userId, conversationId);
    
    res.json({
      success: true,
      message: 'Mesajlar okundu olarak işaretlendi'
    });
  } catch (error: any) {
    console.error('Mark as read hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Mesajlar işaretlenirken hata oluştu',
      error: error.message
    });
  }
});

// ===== DELETE CONVERSATION ENDPOINT =====
router.delete('/conversations/:conversationId', auth, async (req: Request, res: Response) => {
  try {
    const { conversationId } = req.params;
    const userId = req.user?.userId;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Kullanıcı ID bulunamadı'
      });
    }

    await MessageService.deleteConversation(conversationId, userId);
    
    res.json({
      success: true,
      message: 'Sohbet başarıyla silindi'
    });
  } catch (error: any) {
    console.error('Delete conversation hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Sohbet silinirken hata oluştu',
      error: error.message
    });
  }
});

// ===== GET MESSAGES AFTER ENDPOINT =====
router.get('/conversations/:conversationId/messages/after/:messageId', auth, async (req: Request, res: Response) => {
  try {
    const { conversationId, messageId } = req.params;
    const limit = parseInt(req.query.limit as string) || 10;
    const userId = req.user?.userId;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Kullanıcı ID bulunamadı'
      });
    }
    
    const messages = await MessageService.getMessagesAfter(conversationId, userId, messageId, limit);
    
    res.json({
      success: true,
      data: messages,
      message: 'Messages after başarıyla getirildi'
    });
  } catch (error: any) {
    console.error('Messages after hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Messages after getirilirken hata oluştu',
      error: error.message
    });
  }
});

// ===== EKSİK ENDPOINT'LER =====

/**
 * @swagger
 * /api/message/conversation/find/{mechanicId}:
 *   get:
 *     summary: Mekanik ile konuşma bul
 *     description: Belirli bir mekanik ile konuşma bulur veya yeni konuşma oluşturur
 *     tags:
 *       - Messages
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: mechanicId
 *         required: true
 *         schema:
 *           type: string
 *         description: Mekanik ID'si
 *         example: "507f1f77bcf86cd799439011"
 *     responses:
 *       200:
 *         description: Konuşma bulundu veya oluşturuldu
 *       401:
 *         description: Yetkilendirme hatası
 *       500:
 *         description: Sunucu hatası
 */
router.get('/conversation/find/:mechanicId', auth, async (req: Request, res: Response) => {
  try {
    const { mechanicId } = req.params;
    const userId = req.user?.userId;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Kullanıcı doğrulanamadı'
      });
    }
    
    // Mevcut konuşmayı bul veya oluştur
    const conversation = await MessageService.findOrCreateConversation(userId, mechanicId);
    
    res.json({
      success: true,
      data: conversation,
      message: 'Konuşma bulundu'
    });
  } catch (error: any) {
    console.error('Conversation find hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Konuşma bulunurken hata oluştu',
      error: error.message
    });
  }
});

// ===== LONG POLLING ENDPOINT =====
router.get('/poll-messages', auth, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const lastMessageId = req.query.lastMessageId as string;
    
    console.log('🔍 Backend: GET /poll-messages called');
    console.log('🔍 Backend: userId:', userId);
    console.log('🔍 Backend: lastMessageId:', lastMessageId);
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Kullanıcı ID bulunamadı'
      });
    }
    
    // İlk kontrol - yeni mesaj var mı?
    let newMessages = await MessageService.getNewMessages(userId, lastMessageId);
    
    if (newMessages.length > 0) {
      console.log('🔍 Backend: Yeni mesajlar bulundu:', newMessages.length);
      return res.json({
        success: true,
        data: newMessages,
        hasNewMessages: true,
        message: 'Yeni mesajlar bulundu'
      });
    }
    
    console.log('🔍 Backend: Yeni mesaj yok, long polling başlatılıyor...');
    
    // Yeni mesaj yoksa long polling başlat
    const startTime = Date.now();
    const timeout = 30000; // 30 saniye timeout
    let pollInterval: NodeJS.Timeout | null = null;
    
    // Client bağlantısı kesildiğinde interval'i temizle
    req.on('close', () => {
      console.log('🔍 Backend: Client bağlantısı kesildi, polling durduruldu');
      if (pollInterval) {
        clearInterval(pollInterval);
      }
    });
    
    // Timeout kontrolü
    const timeoutId = setTimeout(() => {
      console.log('🔍 Backend: Long polling timeout');
      if (pollInterval) {
        clearInterval(pollInterval);
      }
      
      // Response henüz gönderilmemişse gönder
      if (!res.headersSent) {
        res.json({
          success: true,
          data: [],
          hasNewMessages: false,
          message: 'Timeout - yeni mesaj yok'
        });
      }
    }, timeout);
    
    // Polling interval'i
    pollInterval = setInterval(async () => {
      try {
        // Response zaten gönderildiyse interval'i temizle
        if (res.headersSent) {
          if (pollInterval) {
            clearInterval(pollInterval);
          }
          clearTimeout(timeoutId);
          return;
        }
        
        // Yeni mesajları tekrar kontrol et
        newMessages = await MessageService.getNewMessages(userId, lastMessageId);
        
        if (newMessages.length > 0) {
          console.log('🔍 Backend: Long polling ile yeni mesajlar bulundu:', newMessages.length);
          
          if (pollInterval) {
            clearInterval(pollInterval);
          }
          clearTimeout(timeoutId);
          
          res.json({
            success: true,
            data: newMessages,
            hasNewMessages: true,
            message: 'Yeni mesajlar bulundu'
          });
        }
        
        // Timeout kontrolü
        if (Date.now() - startTime > timeout) {
          console.log('🔍 Backend: Long polling timeout');
          
          if (pollInterval) {
            clearInterval(pollInterval);
          }
          clearTimeout(timeoutId);
          
          if (!res.headersSent) {
            res.json({
              success: true,
              data: [],
              hasNewMessages: false,
              message: 'Timeout - yeni mesaj yok'
            });
          }
        }
      } catch (error) {
        console.error('🔍 Backend: Long polling hatası:', error);
        
        if (pollInterval) {
          clearInterval(pollInterval);
        }
        clearTimeout(timeoutId);
        
        if (!res.headersSent) {
          res.status(500).json({
            success: false,
            message: 'Long polling sırasında hata oluştu',
            error: error instanceof Error ? error.message : 'Bilinmeyen hata'
          });
        }
      }
    }, 2000); // Her 2 saniyede bir kontrol et (1 saniye yerine)
    
  } catch (error: any) {
    console.error('Poll messages hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Mesajlar kontrol edilirken hata oluştu',
      error: error.message
    });
  }
});

// ===== DELETE MESSAGE ENDPOINT =====
router.delete('/message/:messageId', auth, async (req: Request, res: Response) => {
  try {
    const { messageId } = req.params;
    const userId = req.user?.userId;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Kullanıcı ID bulunamadı'
      });
    }

    const deleted = await MessageService.deleteMessage(messageId, userId);
    
    if (deleted) {
      res.json({
        success: true,
        message: 'Mesaj başarıyla silindi'
      });
    } else {
      res.status(404).json({
        success: false,
        message: 'Mesaj bulunamadı'
      });
    }
  } catch (error: any) {
    console.error('Delete message hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Mesaj silinirken hata oluştu',
      error: error.message
    });
  }
});

export default router;
