import axios from 'axios';

const API_URL = 'http://localhost:3000';

async function createWashPackages() {
  try {
    console.log('🧪 Yıkama Paketleri Oluşturuluyor\n');
    console.log(`🔗 API URL: ${API_URL}\n`);

    // 1. Login yaparak token al
    console.log('🔐 Login yapılıyor...');
    const loginResponse = await axios.post(`${API_URL}/api/auth/login`, {
      email: 'testus@gmail.com',
      password: 'test123',
      userType: 'mechanic'
    });

    const token = loginResponse.data.token;
    console.log('✅ Token alındı\n');

    // 2. Provider ID'yi al
    console.log('🔍 Provider bilgileri alınıyor...');
    const providersResponse = await axios.get(`${API_URL}/api/wash/providers`, {
      headers: { Authorization: `Bearer ${token}` },
      params: { type: 'shop' }
    });

    if (!providersResponse.data.data || providersResponse.data.data.length === 0) {
      console.log('❌ Provider bulunamadı!');
      return;
    }

    const providerId = providersResponse.data.data[0]._id;
    console.log(`✅ Provider ID: ${providerId}\n`);

    // 3. Paketleri oluştur
    const packages = [
      {
        name: 'Temel Yıkama',
        description: 'Dış yüzey yıkama ve kurulama',
        type: 'both', // shop ve mobile için
        duration: 30,
        basePrice: 150,
        vehicleSegmentPricing: {
          A: 150,
          B: 180,
          C: 220,
          D: 280,
          SUV: 320
        },
        features: [
          'Dış yüzey yıkama',
          'Jant temizliği',
          'Kurulama'
        ],
        isActive: true
      },
      {
        name: 'Detaylı Yıkama',
        description: 'Dış yıkama + İç temizlik + Lastik parlatma',
        type: 'both',
        duration: 60,
        basePrice: 250,
        vehicleSegmentPricing: {
          A: 250,
          B: 300,
          C: 350,
          D: 400,
          SUV: 450
        },
        features: [
          'Dış yüzey yıkama',
          'İç temizlik',
          'Jant temizliği',
          'Lastik parlatma',
          'Kurulama'
        ],
        isActive: true
      },
      {
        name: 'Premium Yıkama',
        description: 'Komple detaylı temizlik + Cila + Koruma',
        type: 'shop', // Sadece shop için
        duration: 120,
        basePrice: 450,
        vehicleSegmentPricing: {
          A: 450,
          B: 550,
          C: 650,
          D: 750,
          SUV: 850
        },
        features: [
          'Dış yüzey yıkama',
          'İç detaylı temizlik',
          'Motor temizliği',
          'Jant temizliği',
          'Lastik parlatma',
          'Cila',
          'Boya koruma',
          'Kurulama'
        ],
        isActive: true
      },
      {
        name: 'Hızlı Mobil Yıkama',
        description: 'Hızlı dış yıkama - Sadece mobil',
        type: 'mobile',
        duration: 20,
        basePrice: 120,
        vehicleSegmentPricing: {
          A: 120,
          B: 140,
          C: 160,
          D: 200,
          SUV: 250
        },
        features: [
          'Dış yüzey yıkama',
          'Hızlı kurulama'
        ],
        isActive: true
      }
    ];

    console.log('📦 Paketler oluşturuluyor...\n');

    for (const pkg of packages) {
      try {
        const response = await axios.post(
          `${API_URL}/api/wash/packages`,
          { ...pkg, providerId },
          { headers: { Authorization: `Bearer ${token}` } }
        );

        console.log(`✅ ${pkg.name} oluşturuldu`);
        console.log(`   📋 ID: ${response.data.data._id}`);
        console.log(`   💰 Fiyat: ${pkg.basePrice} TL`);
        console.log(`   ⏱️  Süre: ${pkg.duration} dakika`);
        console.log(`   🎯 Tip: ${pkg.type}`);
        console.log('');
      } catch (error: any) {
        console.log(`❌ ${pkg.name} oluşturulamadı:`, error.response?.data?.message || error.message);
      }
    }

    console.log('\n✅ Tüm paketler oluşturuldu!');

  } catch (error: any) {
    console.error('❌ Hata:', error.response?.data?.message || error.message);
    console.error('❌ Detay:', error.response?.data || error);
  }
}

createWashPackages();

