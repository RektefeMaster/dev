const mongoose = require('mongoose');
const { Conversation } = require('./dist/models/Conversation');
const { User } = require('./dist/models/User');

async function createTestConversation() {
  try {
    // MongoDB bağlantısı
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/rektefe');
    console.log('Connected to MongoDB');

    // İki test kullanıcısı bul veya oluştur
    let user1 = await User.findOne({ email: 'test1@example.com' });
    let user2 = await User.findOne({ email: 'test2@example.com' });

    if (!user1) {
      user1 = new User({
        name: 'Test',
        surname: 'User1',
        email: 'test1@example.com',
        phone: '+905551234567',
        userType: 'mechanic'
      });
      await user1.save();
      console.log('Created user1:', user1._id);
    }

    if (!user2) {
      user2 = new User({
        name: 'Test',
        surname: 'User2', 
        email: 'test2@example.com',
        phone: '+905559876543',
        userType: 'driver'
      });
      await user2.save();
      console.log('Created user2:', user2._id);
    }

    // Mevcut conversation'ları kontrol et
    const existingConversation = await Conversation.findOne({
      participants: { $all: [user1._id, user2._id] }
    });

    if (!existingConversation) {
      // Yeni conversation oluştur
      const conversation = new Conversation({
        participants: [user1._id, user2._id],
        type: 'private',
        unreadCount: new Map([
          [user1._id.toString(), 0],
          [user2._id.toString(), 1]
        ]),
        lastMessageAt: new Date()
      });

      await conversation.save();
      console.log('Created conversation:', conversation._id);
      console.log('Participants:', conversation.participants);
    } else {
      console.log('Conversation already exists:', existingConversation._id);
    }

    // Tüm conversation'ları listele
    const allConversations = await Conversation.find({})
      .populate('participants', 'name surname email')
      .sort({ createdAt: -1 });

    console.log('\n=== All Conversations ===');
    allConversations.forEach((conv, index) => {
      console.log(`${index + 1}. ID: ${conv._id}`);
      console.log(`   Participants: ${conv.participants.map(p => `${p.name} ${p.surname} (${p.email})`).join(', ')}`);
      console.log(`   Last Message At: ${conv.lastMessageAt}`);
      console.log(`   Created At: ${conv.createdAt}`);
      console.log('---');
    });

    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');

  } catch (error) {
    console.error('Error:', error);
    await mongoose.disconnect();
  }
}

createTestConversation();
