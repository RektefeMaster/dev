import { Message, IMessage } from '../models/Message';
import { Conversation, IConversation } from '../models/Conversation';
import { User } from '../models/User';
import mongoose from 'mongoose';
import { CustomError } from '../middleware/errorHandler';

export class MessageService {
  /**
   * Yeni mesaj gönder
   */
  static async sendMessage(senderId: string, receiverId: string, content: string, messageType: 'text' | 'image' | 'file' = 'text'): Promise<IMessage> {
    try {
      // Gönderici ve alıcının var olduğunu kontrol et
      const [sender, receiver] = await Promise.all([
        User.findById(senderId),
        User.findById(receiverId)
      ]);

      if (!sender || !receiver) {
        throw new CustomError('Gönderici veya alıcı bulunamadı', 404);
      }

      // Sohbet var mı kontrol et, yoksa oluştur
      let conversation = await Conversation.findOne({
        participants: { $all: [new mongoose.Types.ObjectId(senderId), new mongoose.Types.ObjectId(receiverId)] }
      });

      if (!conversation) {
        conversation = new Conversation({
          participants: [senderId, receiverId],
          unreadCount: { [receiverId]: 0 }
        });
        await conversation.save();
      }

      // Yeni mesaj oluştur
      const message = new Message({
        senderId,
        receiverId,
        content,
        messageType
      });

      await message.save();

      // Sohbeti güncelle
      conversation.lastMessage = message._id;
      conversation.lastMessageAt = message.createdAt;
      
      // Alıcının okunmamış mesaj sayısını artır
      const currentUnread = conversation.unreadCount.get(receiverId) || 0;
      conversation.unreadCount.set(receiverId, currentUnread + 1);
      
      await conversation.save();

      return message;
    } catch (error) {
      if (error instanceof CustomError) throw error;
      throw new CustomError('Mesaj gönderilirken hata oluştu', 500);
    }
  }

  /**
   * Kullanıcının sohbetlerini getir
   */
  static async getUserConversations(userId: string): Promise<any[]> {
    try {
      const conversations = await Conversation.find({
        participants: new mongoose.Types.ObjectId(userId)
      })
      .populate('participants', 'name surname avatar userType')
      .populate('lastMessage', 'content messageType createdAt')
      .sort({ lastMessageAt: -1 });

      return conversations.map(conv => {
        const otherParticipant = conv.participants.find((p: any) => p._id.toString() !== userId);
        const unreadCount = conv.unreadCount.get(userId) || 0;
        
        return {
          _id: conv._id,
          otherParticipant: {
            _id: otherParticipant._id,
            name: otherParticipant.name,
            surname: otherParticipant.surname,
            avatar: otherParticipant.avatar,
            userType: otherParticipant.userType
          },
          lastMessage: conv.lastMessage,
          lastMessageAt: conv.lastMessageAt,
          unreadCount,
          createdAt: conv.createdAt
        };
      });
    } catch (error) {
      throw new CustomError('Sohbetler getirilirken hata oluştu', 500);
    }
  }

  /**
   * Sohbet mesajlarını getir
   */
  static async getConversationMessages(conversationId: string, userId: string, page: number = 1, limit: number = 50): Promise<any> {
    try {
      // Sohbetin var olduğunu ve kullanıcının katılımcısı olduğunu kontrol et
      const conversation = await Conversation.findById(conversationId);
      if (!conversation || !conversation.participants.some(p => p.toString() === userId)) {
        throw new CustomError('Sohbet bulunamadı', 404);
      }

      // Mesajları getir
      const skip = (page - 1) * limit;
      const messages = await Message.find({
        $or: [
          { senderId: new mongoose.Types.ObjectId(userId), receiverId: { $in: conversation.participants.filter(p => p.toString() !== userId) } },
          { receiverId: new mongoose.Types.ObjectId(userId), senderId: { $in: conversation.participants.filter(p => p.toString() !== userId) } }
        ]
      })
      .populate('senderId', 'name surname avatar')
      .populate('receiverId', 'name surname avatar')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

      // Toplam mesaj sayısını getir
      const totalMessages = await Message.countDocuments({
        $or: [
          { senderId: new mongoose.Types.ObjectId(userId), receiverId: { $in: conversation.participants.filter(p => p.toString() !== userId) } },
          { receiverId: new mongoose.Types.ObjectId(userId), senderId: { $in: conversation.participants.filter(p => p.toString() !== userId) } }
        ]
      });

      // Mesajları okundu olarak işaretle
      const unreadMessages = messages.filter(msg => 
        msg.receiverId._id.toString() === userId && !msg.isRead
      );

      if (unreadMessages.length > 0) {
        await Message.updateMany(
          { _id: { $in: unreadMessages.map(m => m._id) } },
          { isRead: true }
        );
      }

      // Sohbetin okunmamış mesaj sayısını sıfırla
      conversation.unreadCount.set(userId, 0);
      await conversation.save();

      return {
        messages: messages.reverse(), // En eski mesajdan en yeniye
        pagination: {
          page,
          limit,
          total: totalMessages,
          pages: Math.ceil(totalMessages / limit)
        }
      };
    } catch (error) {
      if (error instanceof CustomError) throw error;
      throw new CustomError('Mesajlar getirilirken hata oluştu', 500);
    }
  }

  /**
   * İki kullanıcı arasında sohbet bul
   */
  static async findConversationBetweenUsers(userId1: string, userId2: string): Promise<any> {
    try {
      const conversation = await Conversation.findOne({
        participants: { 
          $all: [
            new mongoose.Types.ObjectId(userId1), 
            new mongoose.Types.ObjectId(userId2)
          ] 
        }
      });

      if (!conversation) {
        return null;
      }

      // Sohbeti populate et
      await conversation.populate('participants', 'name surname avatar userType');
      await conversation.populate('lastMessage', 'content messageType createdAt');

      const otherParticipant = conversation.participants.find((p: any) => p._id.toString() !== userId1);
      const unreadCount = conversation.unreadCount.get(userId1) || 0;

      return {
        _id: conversation._id,
        otherParticipant: {
          _id: otherParticipant._id,
          name: otherParticipant.name,
          surname: otherParticipant.surname,
          avatar: otherParticipant.avatar,
          userType: otherParticipant.userType
        },
        lastMessage: conversation.lastMessage,
        lastMessageAt: conversation.lastMessageAt,
        unreadCount,
        createdAt: conversation.createdAt
      };
    } catch (error) {
      throw new CustomError('Sohbet bulunurken hata oluştu', 500);
    }
  }

  /**
   * Mesajları okundu olarak işaretle
   */
  static async markMessagesAsRead(messageIds: string[], userId: string): Promise<void> {
    try {
      await Message.updateMany(
        { _id: { $in: messageIds }, receiverId: new mongoose.Types.ObjectId(userId) },
        { isRead: true }
      );
    } catch (error) {
      throw new CustomError('Mesajlar işaretlenirken hata oluştu', 500);
    }
  }

  /**
   * Sohbeti sil
   */
  static async deleteConversation(conversationId: string, userId: string): Promise<void> {
    try {
      const conversation = await Conversation.findById(conversationId);
      if (!conversation || !conversation.participants.some(p => p.toString() === userId)) {
        throw new CustomError('Sohbet bulunamadı', 404);
      }

      // Sohbeti sil
      await Conversation.findByIdAndDelete(conversationId);
      
      // İlgili mesajları sil
      await Message.deleteMany({
        $or: [
          { senderId: new mongoose.Types.ObjectId(userId), receiverId: { $in: conversation.participants.filter(p => p.toString() !== userId) } },
          { receiverId: new mongoose.Types.ObjectId(userId), senderId: { $in: conversation.participants.filter(p => p.toString() !== userId) } }
        ]
      });
    } catch (error) {
      if (error instanceof CustomError) throw error;
      throw new CustomError('Sohbet silinirken hata oluştu', 500);
    }
  }
}
