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
        packagesResponse.data.data.forEach((pkg: any, index: number) => {
          console.log(`   ${index + 1}. ${pkg.name} - ${pkg.basePrice} TL (${pkg.duration} dk)`);
        });
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

