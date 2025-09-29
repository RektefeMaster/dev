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
      throw error;
    }
  }

  // Kullanıcının sohbetlerini getir
  static async getConversations(userId: string): Promise<any[]> {
    try {
      // Kullanıcının tipini kontrol et
      const user = await User.findById(userId).select('userType');
      if (!user) {
        throw new Error('Kullanıcı bulunamadı');
      }

      let conversations;
      
      if (user.userType === 'mechanic') {
        // Usta ise: Sadece kendisinden hizmet almış müşterileri göster
        // Appointment modelinden bu ustaya hizmet almış müşterileri bul
        const { Appointment } = await import('../models/Appointment');
        
        const customerIds = await Appointment.distinct('userId', {
          mechanicId: userId,
          status: { $in: ['accepted', 'completed', 'paid'] }
        });
        
        // Bu müşterilerle olan conversation'ları getir
        conversations = await Conversation.find({
          participants: { $in: [userId, ...customerIds] },
          $expr: {
            $and: [
              { $in: [userId, '$participants'] },
              { $in: [{ $arrayElemAt: ['$participants', 1] }, customerIds] }
            ]
          }
        })
        .populate('participants', 'name surname profileImage avatar userType')
        .populate('lastMessage')
        .sort({ lastMessageAt: -1 });
      } else {
        // Şoför ise: Tüm conversation'ları göster
        conversations = await Conversation.find({
          participants: userId
        })
        .populate('participants', 'name surname profileImage avatar userType')
        .populate('lastMessage')
        .sort({ lastMessageAt: -1 });
      }

      const result = await Promise.all(conversations.map(async (conv) => {
        // Eğer participants array'inde sadece 1 kişi varsa, düzelt
        if (conv.participants?.length === 1) {
          // Conversation'ı yeniden oluştur
          const otherParticipantId = conv.participants[0]._id.toString() === userId ? 
            '68bf07ffea20171f7866de46' : // Hardcoded for now, should be dynamic
            userId;
          
          conv.participants = [conv.participants[0]._id, otherParticipantId as any];
          try {
            await conv.save();
          } catch (error: any) {
            if (error.name === 'VersionError') {
              const freshConv = await Conversation.findById(conv._id);
              if (freshConv) {
                freshConv.participants = [freshConv.participants[0]._id, otherParticipantId as any];
                await freshConv.save();
              }
            } else {
              throw error;
            }
          }
          
          }
        
        // Diğer katılımcıyı bul (userId'den farklı olan)
        const otherParticipant = conv.participants?.find((p: any) => {
          const participantId = p._id ? p._id.toString() : p.toString();
          const isDifferent = participantId !== userId;
          return isDifferent;
        });
        
        if (!otherParticipant) {
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
          try {
             const userInfo = await User.findById(participantInfo._id, 'name surname profileImage avatar');
            if (userInfo) {
              participantInfo = {
                _id: participantInfo._id,
                name: userInfo.name || 'Bilinmeyen',
                surname: userInfo.surname || 'Kullanıcı',
                avatar: userInfo.avatar || userInfo.profileImage
              };
              }
          } catch (error) {
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
        
        return conversationData;
      })); // null değerleri filtrele
      
      // null değerleri filtrele
      const filteredResult = result.filter(Boolean);
      
      return filteredResult;
    } catch (error) {
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
      throw error;
    }
  }

  // Mesaj sil
  static async deleteMessage(messageId: string, userId: string): Promise<boolean> {
    try {
      console.log(`[MessageService] Deleting message ${messageId} for user ${userId}`);
      
      const message = await Message.findById(messageId);
      if (!message) {
        console.log(`[MessageService] Message ${messageId} not found`);
        return false;
      }
      
      console.log(`[MessageService] Message found - senderId: ${message.senderId}, userId: ${userId}`);
      
      if (message.senderId.toString() !== userId) {
        console.log(`[MessageService] User ${userId} is not the sender of message ${messageId}`);
        return false;
      }
      
      await Message.findByIdAndDelete(messageId);
      console.log(`[MessageService] Message ${messageId} deleted successfully`);
      return true;
    } catch (error) {
      console.error(`[MessageService] Error deleting message ${messageId}:`, error);
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
      throw error;
    }
  }

  // İki kullanıcı arasında sohbet bul
  static async findConversationBetweenUsers(userId1: string, userId2: string): Promise<any> {
    try {
      return await this.findOrCreateConversationWithOtherParticipant(userId1, userId2);
    } catch (error) {
      throw error;
    }
  }

  // Mesajları okundu olarak işaretle
  static async markMessagesAsRead(conversationId: string, userId: string): Promise<void> {
    try {
      await this.markAllAsRead(conversationId, userId);
    } catch (error) {
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
      throw error;
    }
  }

  // Toplam mesaj sayısı
  static async getTotalMessageCount(conversationId: string, userId: string): Promise<number> {
    try {
      return await Message.countDocuments({ conversationId });
    } catch (error) {
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
      throw error;
    }
  }
}
