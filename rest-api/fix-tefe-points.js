/**
 * TefePuan geçmişindeki son transaction'ı düzelten script
 * Eski %6 ile hesaplanmış puanları %1'e düzeltir
 */

require('dotenv').config();
const mongoose = require('mongoose');

// TefePoint model tanımı
const TefePointSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  totalPoints: Number,
  availablePoints: Number,
  usedPoints: Number,
  expiredPoints: Number,
  transactions: [{
    type: String,
    amount: Number,
    serviceCategory: String,
    serviceId: String,
    appointmentId: String,
    description: String,
    multiplier: Number,
    baseAmount: Number,
    date: Date,
    status: String,
    expiresAt: Date
  }]
}, { timestamps: true });

const TefePoint = mongoose.model('TefePoint', TefePointSchema);

async function fixTefePoints() {
  try {
    console.log('🔧 MongoDB bağlantısı kuruluyor...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/rektefe');
    console.log('✅ MongoDB bağlantısı kuruldu');

    // Tüm TefePuan kayıtlarını getir
    const tefePoints = await TefePoint.find({});
    console.log(`\n📊 Toplam ${tefePoints.length} kullanıcı bulundu`);

    let fixedCount = 0;
    let totalPointsFixed = 0;

    for (const tefePoint of tefePoints) {
      let needsUpdate = false;
      let pointDifference = 0;

      // Her transaction'ı kontrol et ve gerekirse düzelt
      for (const transaction of tefePoint.transactions) {
        if (transaction.status === 'earned' && transaction.baseAmount > 0) {
          // Doğru puan miktarını hesapla (%1)
          const correctPoints = Math.floor(transaction.baseAmount * 0.01);
          const currentPoints = transaction.amount;

          // Eğer puan miktarı yanlışsa düzelt
          if (currentPoints !== correctPoints && currentPoints > correctPoints) {
            console.log(`\n🔍 Hatalı transaction bulundu:`);
            console.log(`   Kullanıcı: ${tefePoint.userId}`);
            console.log(`   Açıklama: ${transaction.description}`);
            console.log(`   Tutar: ${transaction.baseAmount} TL`);
            console.log(`   Mevcut Puan: ${currentPoints}`);
            console.log(`   Doğru Puan: ${correctPoints}`);
            console.log(`   Fark: ${currentPoints - correctPoints}`);

            pointDifference += (currentPoints - correctPoints);
            transaction.amount = correctPoints;
            transaction.multiplier = 0.01;
            needsUpdate = true;
          }
        }
      }

      if (needsUpdate) {
        // Toplam ve kullanılabilir puanları düzelt
        tefePoint.totalPoints -= pointDifference;
        tefePoint.availablePoints -= pointDifference;

        // Negatif değerleri sıfırla
        if (tefePoint.totalPoints < 0) tefePoint.totalPoints = 0;
        if (tefePoint.availablePoints < 0) tefePoint.availablePoints = 0;

        await tefePoint.save();
        fixedCount++;
        totalPointsFixed += pointDifference;

        console.log(`✅ Düzeltildi: ${pointDifference} puan azaltıldı`);
        console.log(`   Yeni Toplam: ${tefePoint.totalPoints}`);
        console.log(`   Yeni Kullanılabilir: ${tefePoint.availablePoints}`);
      }
    }

    console.log(`\n🎉 Tamamlandı!`);
    console.log(`   Düzeltilen kullanıcı sayısı: ${fixedCount}`);
    console.log(`   Toplam düzeltilen puan: ${totalPointsFixed}`);

  } catch (error) {
    console.error('❌ Hata:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 MongoDB bağlantısı kapatıldı');
  }
}

// Script'i çalıştır
fixTefePoints();

