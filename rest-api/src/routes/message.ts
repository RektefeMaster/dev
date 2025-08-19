import express from 'express';
import { MessageController } from '../controllers/message.controller';
import { auth as authenticateToken } from '../middleware/auth';

const router = express.Router();

// Tüm route'lar için authentication gerekli
router.use(authenticateToken);

// Mesaj gönder
router.post('/send', MessageController.sendMessage);

// Kullanıcının sohbetlerini getir
router.get('/conversations', MessageController.getUserConversations);

// Sohbet mesajlarını getir
router.get('/conversation/:conversationId/messages', MessageController.getConversationMessages);

// İki kullanıcı arasında sohbet bul
router.get('/conversation/find/:otherUserId', MessageController.findConversationBetweenUsers);

// Mesajları okundu olarak işaretle
router.put('/mark-read', MessageController.markMessagesAsRead);

// Sohbeti sil
router.delete('/conversation/:conversationId', MessageController.deleteConversation);

export default router;
