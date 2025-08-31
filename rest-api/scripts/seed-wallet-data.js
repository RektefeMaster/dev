const mongoose = require('mongoose');
const { Wallet } = require('../dist/models/Wallet');
const { User } = require('../dist/models/User');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/rektefe';

async function seedWalletData() {
  try {
    // MongoDB'ye bağlan
    await mongoose.connect(MONGODB_URI);
    console.log('✅ MongoDB\'ye bağlandı');

    // Test kullanıcısını bul veya oluştur
    let testUser = await User.findOne({ email: 'test@example.com' });
    
    if (!testUser) {
      console.log('⚠️ Test kullanıcısı bulunamadı, önce kullanıcı oluşturun');
      return;
    }

    // Mevcut wallet'ı kontrol et
    let wallet = await Wallet.findOne({ userId: testUser._id });
    
    if (!wallet) {
      // Yeni wallet oluştur
      wallet = new Wallet({
        userId: testUser._id,
        balance: 1250.75,
        transactions: []
      });
    }

    // Test transactions ekle
    const testTransactions = [
      {
        type: 'debit',
        amount: 45.00,
        description: 'QR Ödeme - Garaj Servisi - Motor yağı değişimi',
        date: new Date('2025-06-12T14:30:00Z'),
        status: 'completed'
      },
      {
        type: 'credit',
        amount: 100.00,
        description: 'Bakiye Yükleme - Garanti BBVA banka kartından',
        date: new Date('2025-06-10T09:15:00Z'),
        status: 'completed'
      },
      {
        type: 'debit',
        amount: 320.00,
        description: 'Usta Ödemesi - Fren sistemi tamiri - Ahmet Usta',
        date: new Date('2025-06-08T16:45:00Z'),
        status: 'completed'
      },
      {
        type: 'credit',
        amount: 25.50,
        description: 'TEFE Bonus - Haftalık aktivite ödülü',
        date: new Date('2025-06-05T12:00:00Z'),
        status: 'completed'
      },
      {
        type: 'debit',
        amount: 87.50,
        description: 'Market Alışverişi - Araç bakım ürünleri - Migros İzmir',
        date: new Date('2025-06-03T18:20:00Z'),
        status: 'completed'
      },
      {
        type: 'debit',
        amount: 150.00,
        description: 'Araç Yıkama - Premium yıkama paketi',
        date: new Date('2025-06-01T10:00:00Z'),
        status: 'completed'
      },
      {
        type: 'credit',
        amount: 500.00,
        description: 'Maaş Yatırımı - İş Bankası hesabından',
        date: new Date('2025-05-30T08:00:00Z'),
        status: 'completed'
      },
      {
        type: 'debit',
        amount: 75.00,
        description: 'Yakıt Alımı - Shell istasyonu - İstanbul',
        date: new Date('2025-05-28T15:30:00Z'),
        status: 'completed'
      }
    ];

    // Transactions'ları wallet'a ekle
    wallet.transactions = testTransactions;
    
    // Balance'ı güncelle
    const totalCredits = testTransactions
      .filter(t => t.type === 'credit')
      .reduce((sum, t) => sum + t.amount, 0);
    
    const totalDebits = testTransactions
      .filter(t => t.type === 'debit')
      .reduce((sum, t) => sum + t.amount, 0);
    
    // Balance negatif olamaz, minimum 0 olmalı
    wallet.balance = Math.max(0, totalCredits - totalDebits);

    // Wallet'ı kaydet
    await wallet.save();
    console.log('✅ Wallet verisi başarıyla eklendi');
    console.log(`💰 Bakiye: ${wallet.balance.toFixed(2)} ₺`);
    console.log(`📊 Toplam İşlem: ${wallet.transactions.length}`);
    console.log(`📈 Toplam Gelir: ${totalCredits.toFixed(2)} ₺`);
    console.log(`📉 Toplam Gider: ${totalDebits.toFixed(2)} ₺`);

  } catch (error) {
    console.error('❌ Wallet veri ekleme hatası:', error);
  } finally {
    // MongoDB bağlantısını kapat
    await mongoose.disconnect();
    console.log('🔌 MongoDB bağlantısı kapatıldı');
  }
}

// Script'i çalıştır
seedWalletData();
