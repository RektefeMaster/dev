const https = require('https');

// MongoDB Atlas API ile IP güncelleme script'i
async function updateMongoDBIP() {
  try {
    // 1. Render'ın outbound IP'sini bul
    console.log('🔍 Render\'ın outbound IP\'si bulunuyor...');
    const ipResponse = await fetch('https://api.ipify.org?format=json');
    const ipData = await ipResponse.json();
    const currentIP = ipData.ip;
    
    console.log('📍 Bulunan IP:', currentIP);
    
    // 2. MongoDB Atlas API ile IP'yi güncelle
    const atlasAPIKey = process.env.MONGODB_ATLAS_API_KEY;
    const atlasProjectId = process.env.MONGODB_ATLAS_PROJECT_ID;
    
    if (!atlasAPIKey || !atlasProjectId) {
      console.log('❌ MongoDB Atlas API anahtarları eksik');
      console.log('MONGODB_ATLAS_API_KEY ve MONGODB_ATLAS_PROJECT_ID environment variable\'larını ekleyin');
      return;
    }
    
    // Mevcut IP'leri kontrol et
    const existingIPs = await getExistingIPs(atlasAPIKey, atlasProjectId);
    console.log('📋 Mevcut IP\'ler:', existingIPs);
    
    // IP zaten varsa güncelleme yapma
    if (existingIPs.includes(currentIP + '/32')) {
      console.log('✅ IP zaten MongoDB Atlas\'ta mevcut');
      return;
    }
    
    // Yeni IP ekle
    await addIPToAtlas(atlasAPIKey, atlasProjectId, currentIP);
    console.log('✅ IP MongoDB Atlas\'a eklendi:', currentIP + '/32');
    
  } catch (error) {
    console.error('❌ Hata:', error.message);
  }
}

async function getExistingIPs(apiKey, projectId) {
  const response = await fetch(`https://cloud.mongodb.com/api/atlas/v1.0/groups/${projectId}/accessList`, {
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    }
  });
  
  if (!response.ok) {
    throw new Error(`MongoDB Atlas API error: ${response.status}`);
  }
  
  const data = await response.json();
  return data.results.map(ip => ip.cidrBlock);
}

async function addIPToAtlas(apiKey, projectId, ip) {
  const response = await fetch(`https://cloud.mongodb.com/api/atlas/v1.0/groups/${projectId}/accessList`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      cidrBlock: `${ip}/32`,
      comment: `Render deployment - ${new Date().toISOString()}`
    })
  });
  
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(`MongoDB Atlas API error: ${response.status} - ${JSON.stringify(errorData)}`);
  }
  
  return await response.json();
}

// Script'i çalıştır
updateMongoDBIP();
