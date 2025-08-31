import { Message, IMessage } from '../models/Message';
import { Conversation, IConversation } from '../models/Conversation';
import { User } from '../models/User';
import mongoose from 'mongoose';

export class MessageService {
  // İki kullanıcı arasında sohbet bul veya oluştur
  static async findOrCreateConversation(userId1: string, userId2: string): Promise<IConversation> {
    try {
      console.log('🔍 MessageService: findOrCreateConversation çağrıldı:', { userId1, userId2 });
      
      // Mevcut sohbeti ara
      let conversation = await Conversation.findOne({
        participants: { $all: [userId1, userId2] }
      });

      console.log('🔍 MessageService: Mevcut conversation:', conversation ? conversation._id : 'Bulunamadı');

      // Sohbet yoksa oluştur
      if (!conversation) {
        console.log('🔍 MessageService: Yeni conversation oluşturuluyor...');
        conversation = new Conversation({
          participants: [userId1, userId2],
          unreadCount: new Map([
            [userId1, 0],
            [userId2, 0]
          ])
        });
        await conversation.save();
        console.log('✅ MessageService: Yeni sohbet oluşturuldu:', conversation._id);
      } else {
        console.log('🔍 MessageService: Mevcut conversation kullanılıyor:', conversation._id);
      }

      return conversation;
    } catch (error) {
      console.error('findOrCreateConversation error:', error);
      throw error;
    }
  }

  // Mesaj gönder
  static async sendMessage(senderId: string, receiverId: string, content: string, messageType: string = 'text'): Promise<IMessage> {
    try {
      console.log('🔍 MessageService: sendMessage çağrıldı:', { senderId, receiverId, content, messageType });
      
      // Sohbet bul veya oluştur
      const conversation = await this.findOrCreateConversation(senderId, receiverId);
      
      console.log('🔍 MessageService: Conversation bulundu/oluşturuldu:', conversation._id);

      // Mesaj oluştur
      const message = new Message({
        senderId,
        receiverId,
        conversationId: conversation._id,
        content,
        messageType,
        read: false
      });
      await message.save();

      // Sohbeti güncelle
      conversation.lastMessage = message._id as any;
      conversation.lastMessageAt = new Date();
      
      // Unread count'u güncelle
      if (conversation.unreadCount) {
        const currentCount = conversation.unreadCount.get(receiverId) || 0;
        conversation.unreadCount.set(receiverId, currentCount + 1);
      } else {
        conversation.unreadCount = new Map();
        conversation.unreadCount.set(receiverId, 1);
      }
      
      await conversation.save();

      // Socket.IO ile gerçek zamanlı bildirim gönder
      const { io } = require('../index');
      io.to(receiverId).emit('new_message', {
        messageId: message._id,
        senderId,
        content,
        messageType,
        conversationId: conversation._id,
        timestamp: message.createdAt
      });

      console.log('🔍 MessageService: Mesaj kaydedildi:', message._id);
      
      // Mesajı populate ederek döndür
      const populatedMessage = await Message.findById(message._id)
        .populate('senderId', 'name surname profileImage')
        .populate('receiverId', 'name surname profileImage');
      
      console.log('🔍 MessageService: Populated message döndürülüyor:', populatedMessage ? 'Başarılı' : 'Başarısız');
      
      return populatedMessage || message;
    } catch (error) {
      console.error('sendMessage error:', error);
      throw error;
    }
  }

  // Kullanıcının sohbetlerini getir
  static async getConversations(userId: string): Promise<any[]> {
    try {
      const conversations = await Conversation.find({
        participants: userId
      })
      .populate('participants', 'name surname profileImage')
      .populate('lastMessage')
      .sort({ lastMessageAt: -1 });

      return conversations.map(conv => {
        // Diğer katılımcıyı bul (userId'den farklı olan)
        const otherParticipant = conv.participants.find((p: any) => p._id.toString() !== userId);
        
        if (!otherParticipant) {
          return null; // Geçersiz sohbet
        }

        return {
          _id: conv._id,
          conversationId: conv._id,
          otherParticipant: otherParticipant,
          lastMessage: conv.lastMessage,
          lastMessageAt: conv.lastMessageAt,
          unreadCount: conv.unreadCount ? conv.unreadCount.get(userId) || 0 : 0
        };
      }).filter(Boolean); // null değerleri filtrele
    } catch (error) {
      console.error('getConversations error:', error);
      throw error;
    }
  }

  // Sohbet mesajlarını getir
  static async getMessages(conversationId: string, userId: string, page: number = 1, limit: number = 50): Promise<{ messages: any[], total: number }> {
    try {
      // Sohbetin var olduğunu ve kullanıcının katılımcı olduğunu kontrol et
      const conversation = await Conversation.findById(conversationId);
      if (!conversation || !conversation.participants.includes(userId as any)) {
        throw new Error('Sohbet bulunamadı veya erişim izni yok');
      }

      // Skip hesapla (pagination için)
      const skip = (page - 1) * limit;

      // Toplam mesaj sayısını al
      const total = await Message.countDocuments({
        conversationId: conversationId
      });

      // Mesajları getir - conversationId'ye göre
      const messages = await Message.find({
        conversationId: conversationId
      })
      .populate('senderId', 'name surname profileImage')
      .populate('receiverId', 'name surname profileImage')
      .sort({ createdAt: 1 })
      .skip(skip)
      .limit(limit);

      // Sadece hata durumunda log
      if (messages.length === 0) {
        console.log('🔍 MessageService: No messages found for conversation:', conversationId);
      }

      // Okunmamış mesajları okundu olarak işaretle
      await Message.updateMany(
        {
          conversationId: conversationId,
          receiverId: userId,
          read: false
        },
        { read: true }
      );

      // Sohbet unread count'unu sıfırla
      if (conversation.unreadCount) {
        conversation.unreadCount.set(userId, 0);
        await conversation.save();
      }

      // Response'da field'ları düzelt
      const formattedMessages = messages.map(msg => {
        const msgObj = msg.toObject();
        return {
          ...msgObj,
          read: msgObj.read, // read field'ını koru
          isRead: msgObj.read // isRead field'ını da ekle (geriye uyumluluk için)
        };
      });

      return { messages: formattedMessages, total };
    } catch (error) {
      console.error('getMessages error:', error);
      throw error;
    }
  }

  // Belirli bir mesajdan sonraki mesajları getir (yeni mesajları kontrol etmek için)
  static async getMessagesAfter(conversationId: string, userId: string, afterMessageId: string, limit: number = 10): Promise<any[]> {
    try {
      // Sohbetin var olduğunu ve kullanıcının katılımcı olduğunu kontrol et
      const conversation = await Conversation.findById(conversationId);
      if (!conversation || !conversation.participants.includes(userId as any)) {
        throw new Error('Sohbet bulunamadı veya erişim izni yok');
      }

      // Belirtilen mesajdan sonraki mesajları getir
      const afterMessage = await Message.findById(afterMessageId);
      if (!afterMessage) {
        return [];
      }

      const messages = await Message.find({
        conversationId: conversationId,
        createdAt: { $gt: afterMessage.createdAt }
      })
      .populate('senderId', 'name surname profileImage')
      .populate('receiverId', 'name surname profileImage')
      .sort({ createdAt: 1 })
      .limit(limit);

      // Response'da field'ları düzelt
      const formattedMessages = messages.map(msg => {
        const msgObj = msg.toObject();
        return {
          ...msgObj,
          read: msgObj.read, // read field'ını koru
          isRead: msgObj.read // isRead field'ını da ekle (geriye uyumluluk için)
        };
      });

      return formattedMessages;
    } catch (error) {
      console.error('getMessagesAfter error:', error);
      throw error;
    }
  }

  // Toplam mesaj sayısını getir
  static async getTotalMessageCount(conversationId: string, userId: string): Promise<number> {
    try {
      // Sohbetin var olduğunu ve kullanıcının katılımcı olduğunu kontrol et
      const conversation = await Conversation.findById(conversationId);
      if (!conversation || !conversation.participants.includes(userId as any)) {
        return 0;
      }

      // Toplam mesaj sayısını döndür
      return await Message.countDocuments({
        conversationId: conversationId
      });
    } catch (error) {
      console.error('getTotalMessageCount error:', error);
      return 0;
    }
  }

  // Okunmamış mesaj sayısını getir
  static async getUnreadCount(userId: string): Promise<number> {
    try {
      const conversations = await Conversation.find({
        participants: userId
      });

      let totalUnread = 0;
      conversations.forEach(conv => {
        if (conv.unreadCount) {
          totalUnread += conv.unreadCount.get(userId) || 0;
        }
      });

      return totalUnread;
    } catch (error) {
      console.error('getUnreadCount error:', error);
      return 0;
    }
  }

  // Mesajları okundu olarak işaretle
  static async markMessagesAsRead(userId: string, conversationId: string): Promise<void> {
    try {
      // Temp conversation ID kontrolü
      if (conversationId.startsWith('temp_')) {
        console.log('🔍 MessageService: Temp conversation için mark as read atlandı:', conversationId);
        return;
      }
      
      // Sohbetin var olduğunu ve kullanıcının katılımcı olduğunu kontrol et
      const conversation = await Conversation.findById(conversationId);
      if (!conversation || !conversation.participants.includes(userId as any)) {
        throw new Error('Sohbet bulunamadı veya erişim izni yok');
      }

      // Mesajları okundu olarak işaretle
      await Message.updateMany(
        {
          conversationId: conversationId,
          receiverId: userId,
          read: false
        },
        { read: true }
      );

      // Sohbet unread count'unu sıfırla
      if (conversation.unreadCount) {
        conversation.unreadCount.set(userId, 0);
        await conversation.save();
      }
    } catch (error) {
      console.error('markMessagesAsRead error:', error);
      throw error;
    }
  }

  // İki kullanıcı arasında sohbet bul
  static async findConversationBetweenUsers(userId1: string, userId2: string): Promise<IConversation | null> {
    try {
      const conversation = await Conversation.findOne({
        participants: { $all: [userId1, userId2] }
      });
      return conversation;
    } catch (error) {
      console.error('findConversationBetweenUsers error:', error);
      return null;
    }
  }

  // Sohbeti sil
  static async deleteConversation(conversationId: string, userId: string): Promise<void> {
    try {
      // Sohbetin var olduğunu ve kullanıcının katılımcı olduğunu kontrol et
      const conversation = await Conversation.findById(conversationId);
      if (!conversation || !conversation.participants.includes(userId as any)) {
        throw new Error('Sohbet bulunamadı veya erişim izni yok');
      }

      // Sohbeti sil
      await Conversation.findByIdAndDelete(conversationId);
      
      // Sadece bu sohbete ait mesajları sil
      await Message.deleteMany({
        conversationId: conversationId
      });
    } catch (error) {
      console.error('deleteConversation error:', error);
      throw error;
    }
  }

  /**
   * Mesaj sil
   */
  static async deleteMessage(messageId: string, userId: string): Promise<boolean> {
    try {
      const message = await Message.findById(messageId);
      if (!message) {
        return false;
      }

      // Sadece mesaj sahibi silebilir
      if (message.senderId.toString() !== userId) {
        return false;
      }

      await Message.findByIdAndDelete(messageId);
      return true;
    } catch (error) {
      console.error('deleteMessage error:', error);
      return false;
    }
  }

  // Long Polling için yeni mesajları kontrol et
  static async getNewMessages(userId: string, lastMessageId?: string): Promise<any[]> {
    try {
      console.log('🔍 MessageService: getNewMessages çağrıldı:', { userId, lastMessageId });
      
      // Kullanıcının tüm sohbetlerini al
      const conversations = await Conversation.find({
        participants: userId
      });
      
      if (conversations.length === 0) {
        return [];
      }
      
      const allNewMessages: any[] = [];
      
      // Her sohbet için yeni mesajları kontrol et
      for (const conversation of conversations) {
        // Temp conversation ID'leri atla
        if (conversation._id && conversation._id.toString().startsWith('temp_')) {
          console.log('🔍 MessageService: Temp conversation atlandı:', conversation._id);
          continue;
        }
        
        let query: any = {
          conversationId: conversation._id
          // receiverId kaldırıldı - tüm mesajları al
        };
        
        // Eğer lastMessageId varsa, o ID'den sonraki mesajları al
        if (lastMessageId) {
          query._id = { $gt: lastMessageId };
        }
        
        const newMessages = await Message.find(query)
          .populate('senderId', 'name surname profileImage')
          .populate('receiverId', 'name surname profileImage')
          .sort({ createdAt: 1 })
          .limit(50);
        
        if (newMessages.length > 0) {
          allNewMessages.push(...newMessages);
        }
      }
      
      // Tarihe göre sırala (en eski önce)
      allNewMessages.sort((a, b) => 
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );
      
      console.log('🔍 MessageService: getNewMessages sonucu:', allNewMessages.length, 'yeni mesaj');
      
      return allNewMessages;
    } catch (error) {
      console.error('getNewMessages error:', error);
      throw error;
    }
  }
}
