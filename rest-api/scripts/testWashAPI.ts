import axios from 'axios';

const API_URL = process.env.API_URL || 'http://localhost:3000';

async function testWashAPI() {
  try {
    console.log('🧪 Araç Yıkama API Testi\n');
    console.log(`🔗 API URL: ${API_URL}\n`);

    // Test 1: Provider listesi
    console.log('1️⃣ Provider listesi test ediliyor...');
    const providersResponse = await axios.get(`${API_URL}/api/wash/providers`, {
      params: { type: 'shop' }
    });
    
    console.log(`   ✅ Durum: ${providersResponse.status}`);
    console.log(`   📊 Provider sayısı: ${providersResponse.data.data?.length || 0}`);
    
    if (providersResponse.data.data && providersResponse.data.data.length > 0) {
      const provider = providersResponse.data.data[0];
      console.log(`   🏢 İlk provider: ${provider.businessName}`);
      console.log(`   📍 Şehir: ${provider.location.city}`);
      console.log(`   🆔 ID: ${provider._id}`);
      console.log(`   👤 User ID: ${provider.userId._id || provider.userId}`);
      
      // Test 2: Bu provider'ın paketleri
      console.log('\n2️⃣ Paketler test ediliyor...');
      const packagesResponse = await axios.get(`${API_URL}/api/wash/packages`, {
        params: { providerId: provider._id } // Provider'ın kendi ID'si
      });
      
      console.log(`   ✅ Durum: ${packagesResponse.status}`);
      console.log(`   📦 Paket sayısı: ${packagesResponse.data.data?.length || 0}`);
      
      if (packagesResponse.data.data && packagesResponse.data.data.length > 0) {
        const washPackage = packagesResponse.data.data[0];
        console.log(`   ${1}. ${washPackage.name} - ${washPackage.basePrice} TL (${washPackage.duration} dk)`);
        
        // Test 3: Müsait slotlar
        console.log('\n3️⃣ Müsait slotlar test ediliyor...');
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const dateStr = tomorrow.toISOString().split('T')[0];
        
        try {
          const slotsResponse = await axios.get(`${API_URL}/api/wash/slots/available`, {
            params: { 
              providerId: provider._id,
              date: dateStr,
              duration: washPackage.duration
            }
          });
          
          console.log(`   ✅ Durum: ${slotsResponse.status}`);
          console.log(`   🕐 Slot sayısı: ${slotsResponse.data.data?.length || 0}`);
          
          if (slotsResponse.data.data && slotsResponse.data.data.length > 0) {
            slotsResponse.data.data.forEach((slot: any, index: number) => {
              console.log(`   ${index + 1}. ${slot.startTime} - ${slot.endTime} (${slot.laneName || 'Hat bilgisi yok'})`);
            });
          } else {
            console.log('   ⚠️ Bu tarih için müsait slot bulunamadı');
          }
        } catch (slotsError: any) {
          console.log(`   ❌ Slot hatası: ${slotsError.response?.status} - ${slotsError.response?.data?.message || slotsError.message}`);
        }
      }
    } else {
      console.log('   ⚠️ Hiç provider bulunamadı!');
    }

    console.log('\n✅ Test tamamlandı!');
  } catch (error: any) {
    console.error('\n❌ Hata:', error.response?.data || error.message);
  }
}

testWashAPI();

