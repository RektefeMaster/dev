import { Message, IMessage } from '../models/Message';
import { Conversation, IConversation } from '../models/Conversation';
import { User } from '../models/User';
import mongoose from 'mongoose';

export class MessageService {
  // İki kullanıcı arasında sohbet bul veya oluştur
  static async findOrCreateConversation(userId1: string, userId2: string): Promise<IConversation> {
    try {
      // Mevcut sohbeti ara - participants sırasından bağımsız olarak
      let conversation = await Conversation.findOne({
        participants: { 
          $all: [userId1, userId2],
          $size: 2
        }
      });

      // Sohbet yoksa oluştur
      if (!conversation) {
        conversation = new Conversation({
          participants: [userId1, userId2],
          unreadCount: new Map([
            [userId1, 0],
            [userId2, 0]
          ])
        });
        await conversation.save();
      }

      // Mongoose document olarak döndür (save() için gerekli)
      return conversation;
    } catch (error) {
      console.error('findOrCreateConversation error:', error);
      throw error;
    }
  }

  // Conversation bulma endpoint'i için otherParticipant field'ı ile birlikte döndür
  static async findOrCreateConversationWithOtherParticipant(userId1: string, userId2: string): Promise<any> {
    try {
      const conversation = await this.findOrCreateConversation(userId1, userId2);
      
      // Response'da otherParticipant field'ını ekle
      const conversationObj = conversation.toObject();
      const otherParticipantId = conversation.participants.find(p => p.toString() !== userId1)?.toString();
      
      if (otherParticipantId) {
        const otherUser = await User.findById(otherParticipantId).select('name surname profileImage avatar');
        if (otherUser) {
          conversationObj.otherParticipant = {
            _id: otherUser._id,
            name: otherUser.name,
            surname: otherUser.surname,
            avatar: otherUser.avatar || otherUser.profileImage
          };
        }
      }
      
      return conversationObj;
    } catch (error) {
      console.error('findOrCreateConversationWithOtherParticipant error:', error);
      throw error;
    }
  }

  // Mesaj gönder
  static async sendMessage(senderId: string, receiverId: string, content: string, messageType: string = 'text'): Promise<IMessage> {
    try {
      // Sohbeti bul veya oluştur
      const conversation = await this.findOrCreateConversation(senderId, receiverId);
      
      // Mesajı oluştur
      const message = new Message({
        senderId,
        receiverId,
        conversationId: conversation._id,
        content,
        messageType,
        status: 'sent'
      });
      
      await message.save();
      
      // Conversation'ın lastMessage ve lastMessageAt'ini güncelle
      conversation.lastMessage = message._id as any;
      conversation.lastMessageAt = new Date();
      await conversation.save();
      
      return message;
    } catch (error) {
      console.error('sendMessage error:', error);
      throw error;
    }
  }

  // Kullanıcının sohbetlerini getir
  static async getConversations(userId: string): Promise<any[]> {
    try {
      console.log('🔍 getConversations: userId:', userId);
      
      const conversations = await Conversation.find({
        participants: userId
      })
      .populate('participants', 'name surname profileImage avatar')
      .populate('lastMessage')
      .sort({ lastMessageAt: -1 });

      console.log('🔍 getConversations: Raw conversations after populate:', conversations.map(c => ({
        _id: c._id,
        participants: c.participants.map((p: any) => ({ 
          _id: p._id, 
          name: p.name, 
          surname: p.surname, 
          profileImage: p.profileImage,
          avatar: p.avatar 
        })),
        lastMessage: c.lastMessage,
        lastMessageAt: c.lastMessageAt
      })));

      console.log('🔍 getConversations: Raw conversations count:', conversations.length);
      console.log('🔍 getConversations: Raw conversations:', conversations.map(c => ({
        _id: c._id,
        participants: c.participants.map((p: any) => ({ _id: p._id, name: p.name, surname: p.surname })),
        lastMessage: c.lastMessage,
        lastMessageAt: c.lastMessageAt
      })));

      const result = await Promise.all(conversations.map(async (conv) => {
        console.log('🔍 getConversations: Processing conversation:', conv._id);
        console.log('🔍 getConversations: Participants:', conv.participants);
        console.log('🔍 getConversations: Participants length:', conv.participants?.length);
        
        // Eğer participants array'inde sadece 1 kişi varsa, düzelt
        if (conv.participants?.length === 1) {
          console.log('⚠️ getConversations: Conversation has only 1 participant, fixing...');
          
          // Conversation'ı yeniden oluştur
          const otherParticipantId = conv.participants[0]._id.toString() === userId ? 
            '68bf07ffea20171f7866de46' : // Hardcoded for now, should be dynamic
            userId;
          
          conv.participants = [conv.participants[0]._id, otherParticipantId as any];
          conv.save();
          
          console.log('✅ getConversations: Fixed conversation participants:', conv.participants);
        }
        
        // Diğer katılımcıyı bul (userId'den farklı olan)
        const otherParticipant = conv.participants?.find((p: any) => {
          const participantId = p._id ? p._id.toString() : p.toString();
          const isDifferent = participantId !== userId;
          console.log('🔍 getConversations: Checking participant:', {
            participantId,
            userId,
            isDifferent
          });
          return isDifferent;
        });
        
        console.log('🔍 getConversations: otherParticipant found:', !!otherParticipant);
        console.log('🔍 getConversations: otherParticipant:', otherParticipant);
        
        if (!otherParticipant) {
          console.log('❌ getConversations: No other participant found for conversation:', conv._id);
          return null; // Geçersiz sohbet
        }

        // Eğer otherParticipant bilgileri eksikse, User modelinden çek
        let participantInfo = {
          _id: (otherParticipant as any)._id,
          name: (otherParticipant as any).name,
          surname: (otherParticipant as any).surname,
          avatar: (otherParticipant as any).profileImage || (otherParticipant as any).avatar
        };

        // Eğer name veya surname eksikse, User modelinden çek
        if (!participantInfo.name || !participantInfo.surname) {
          console.log('⚠️ getConversations: Participant bilgileri eksik, User modelinden çekiliyor...');
          try {
            const userInfo = await User.findById(participantInfo._id, 'name surname profileImage avatar');
            if (userInfo) {
              participantInfo = {
                _id: participantInfo._id,
                name: userInfo.name || 'Bilinmeyen',
                surname: userInfo.surname || 'Kullanıcı',
                avatar: userInfo.avatar || userInfo.profileImage
              };
              console.log('✅ getConversations: User bilgileri çekildi:', participantInfo);
            }
          } catch (error) {
            console.log('❌ getConversations: User bilgileri çekilemedi:', error);
            participantInfo = {
              _id: participantInfo._id,
              name: 'Bilinmeyen',
              surname: 'Kullanıcı',
              avatar: null
            };
          }
        }

        const conversationData = {
          _id: conv._id,
          conversationId: conv._id,
          otherParticipant: participantInfo,
          lastMessage: conv.lastMessage,
          lastMessageAt: conv.lastMessageAt,
          unreadCount: conv.unreadCount ? conv.unreadCount.get(userId) || 0 : 0
        };
        
        console.log('✅ getConversations: Processed conversation:', conversationData);
        return conversationData;
      })); // null değerleri filtrele
      
      // null değerleri filtrele
      const filteredResult = result.filter(Boolean);
      
      console.log('🔍 getConversations: Final result count:', filteredResult.length);
      console.log('🔍 getConversations: Final result:', filteredResult);
      
      return filteredResult;
    } catch (error) {
      console.error('getConversations error:', error);
      throw error;
    }
  }

  // Belirli bir sohbetin mesajlarını getir
  static async getMessages(conversationId: string, page: number = 1, limit: number = 50): Promise<IMessage[]> {
    try {
      const skip = (page - 1) * limit;
      
      const messages = await Message.find({ conversationId })
        .populate('senderId', 'name surname profileImage avatar')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);
      
      return messages.reverse(); // En eski mesajlar önce gelsin
    } catch (error) {
      console.error('getMessages error:', error);
      throw error;
    }
  }

  // Belirli bir mesajdan sonraki mesajları getir
  static async getMessagesAfter(conversationId: string, lastMessageId: string, limit: number = 50): Promise<IMessage[]> {
    try {
      const lastMessage = await Message.findById(lastMessageId);
      if (!lastMessage) {
        return [];
      }
      
      const messages = await Message.find({
        conversationId,
        createdAt: { $gt: lastMessage.createdAt }
      })
        .populate('senderId', 'name surname profileImage avatar')
        .sort({ createdAt: 1 })
        .limit(limit);
      
      return messages;
    } catch (error) {
      console.error('getMessagesAfter error:', error);
      throw error;
    }
  }

  // Mesajı okundu olarak işaretle
  static async markAsRead(messageId: string, userId: string): Promise<void> {
    try {
      await Message.findByIdAndUpdate(messageId, { 
        read: true,
        isRead: true 
      });
      
      // Conversation'ın unreadCount'unu güncelle
      const message = await Message.findById(messageId);
      if (message) {
        const conversation = await Conversation.findById(message.conversationId);
        if (conversation && conversation.unreadCount) {
          const currentCount = conversation.unreadCount.get(userId) || 0;
          if (currentCount > 0) {
            conversation.unreadCount.set(userId, currentCount - 1);
            await conversation.save();
          }
        }
      }
    } catch (error) {
      console.error('markAsRead error:', error);
      throw error;
    }
  }

  // Tüm mesajları okundu olarak işaretle
  static async markAllAsRead(conversationId: string, userId: string): Promise<void> {
    try {
      await Message.updateMany(
        { 
          conversationId,
          receiverId: userId,
          read: false 
        },
        { 
          read: true,
          isRead: true 
        }
      );
      
      // Conversation'ın unreadCount'unu sıfırla
      const conversation = await Conversation.findById(conversationId);
      if (conversation && conversation.unreadCount) {
        conversation.unreadCount.set(userId, 0);
        await conversation.save();
      }
    } catch (error) {
      console.error('markAllAsRead error:', error);
      throw error;
    }
  }

  // Mesaj sil
  static async deleteMessage(messageId: string, userId: string): Promise<boolean> {
    try {
      const message = await Message.findById(messageId);
      if (!message || message.senderId.toString() !== userId) {
        return false;
      }
      
      await Message.findByIdAndDelete(messageId);
      return true;
    } catch (error) {
      console.error('deleteMessage error:', error);
      throw error;
    }
  }

  // Sohbet sil
  static async deleteConversation(conversationId: string, userId: string): Promise<boolean> {
    try {
      const conversation = await Conversation.findById(conversationId);
      if (!conversation || !conversation.participants.includes(userId as any)) {
        return false;
      }
      
      // Önce tüm mesajları sil
      await Message.deleteMany({ conversationId });
      
      // Sonra sohbeti sil
      await Conversation.findByIdAndDelete(conversationId);
      return true;
    } catch (error) {
      console.error('deleteConversation error:', error);
      throw error;
    }
  }

  // İki kullanıcı arasında sohbet bul
  static async findConversationBetweenUsers(userId1: string, userId2: string): Promise<any> {
    try {
      return await this.findOrCreateConversationWithOtherParticipant(userId1, userId2);
    } catch (error) {
      console.error('findConversationBetweenUsers error:', error);
      throw error;
    }
  }

  // Mesajları okundu olarak işaretle
  static async markMessagesAsRead(conversationId: string, userId: string): Promise<void> {
    try {
      await this.markAllAsRead(conversationId, userId);
    } catch (error) {
      console.error('markMessagesAsRead error:', error);
      throw error;
    }
  }

  // Okunmamış mesaj sayısı
  static async getUnreadCount(userId: string): Promise<number> {
    try {
      const conversations = await Conversation.find({
        participants: userId
      });

      let totalUnread = 0;
      for (const conv of conversations) {
        if (conv.unreadCount) {
          totalUnread += conv.unreadCount.get(userId) || 0;
        }
      }

      return totalUnread;
    } catch (error) {
      console.error('getUnreadCount error:', error);
      throw error;
    }
  }

  // Toplam mesaj sayısı
  static async getTotalMessageCount(conversationId: string, userId: string): Promise<number> {
    try {
      return await Message.countDocuments({ conversationId });
    } catch (error) {
      console.error('getTotalMessageCount error:', error);
      throw error;
    }
  }

  // Yeni mesajları getir (long polling için)
  static async getNewMessages(userId: string, lastMessageId?: string): Promise<IMessage[]> {
    try {
      // Kullanıcının tüm konuşmalarını bul
      const conversations = await Conversation.find({
        participants: userId
      }).select('_id');

      const conversationIds = conversations.map(conv => conv._id);

      let query: any = {
        conversationId: { $in: conversationIds },
        receiverId: userId,
        read: false
      };

      // Eğer lastMessageId varsa, o mesajdan sonraki mesajları getir
      if (lastMessageId) {
        const lastMessage = await Message.findById(lastMessageId);
        if (lastMessage) {
          query.createdAt = { $gt: lastMessage.createdAt };
        }
      }

      const messages = await Message.find(query)
        .populate('senderId', 'name surname profileImage avatar')
        .sort({ createdAt: 1 })
        .limit(50);

      return messages;
    } catch (error) {
      console.error('getNewMessages error:', error);
      throw error;
    }
  }
}
