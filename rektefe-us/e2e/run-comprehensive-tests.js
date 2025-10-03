#!/usr/bin/env node

/**
 * Kapsamlı E2E Test Çalıştırıcısı
 * Hem rektefe-us hem rektefe-dv için tüm testleri çalıştırır
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

// Test konfigürasyonu
const config = {
  rektefeUs: {
    path: path.join(__dirname, '..'),
    tests: [
      'comprehensive-authentication.e2e.ts',
      'comprehensive-dashboard.e2e.ts', 
      'comprehensive-appointments.e2e.ts',
      'comprehensive-customers.e2e.ts',
      'comprehensive-messaging.e2e.ts'
    ]
  },
  rektefeDv: {
    path: path.join(__dirname, '..', '..', 'rektefe-dv'),
    tests: [
      'comprehensive-driver-authentication.e2e.ts',
      'comprehensive-driver-dashboard.e2e.ts'
    ]
  }
};

// Renkli konsol çıktıları
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title) {
  console.log('\n' + '='.repeat(60));
  log(`  ${title}`, 'bright');
  console.log('='.repeat(60));
}

function logTest(testName, status) {
  const statusColor = status === 'PASS' ? 'green' : status === 'FAIL' ? 'red' : 'yellow';
  const icon = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : '⏳';
  log(`  ${icon} ${testName}`, statusColor);
}

// Test çalıştırma fonksiyonu
async function runTests(project, testFiles) {
  logSection(`${project.toUpperCase()} - KAPSAMLI E2E TESTLER`);
  
  const results = {
    total: 0,
    passed: 0,
    failed: 0,
    skipped: 0
  };

  for (const testFile of testFiles) {
    const testName = testFile.replace('.e2e.ts', '');
    results.total++;
    
    try {
      log(`\n🔄 ${testName} çalıştırılıyor...`, 'cyan');
      
      // Test dosyasının varlığını kontrol et
      const testPath = path.join(config[project].path, 'e2e', testFile);
      if (!fs.existsSync(testPath)) {
        logTest(testName, 'SKIP');
        log(`    ⚠️  Test dosyası bulunamadı: ${testPath}`, 'yellow');
        results.skipped++;
        continue;
      }

      // Detox test komutunu çalıştır
      const command = `cd ${config[project].path} && npx detox test e2e/${testFile} --configuration ios.sim.debug`;
      
      log(`    📱 Komut: ${command}`, 'blue');
      
      execSync(command, { 
        stdio: 'inherit',
        timeout: 300000 // 5 dakika timeout
      });
      
      logTest(testName, 'PASS');
      results.passed++;
      
    } catch (error) {
      logTest(testName, 'FAIL');
      log(`    ❌ Hata: ${error.message}`, 'red');
      results.failed++;
    }
  }

  return results;
}

// Ana çalıştırma fonksiyonu
async function runAllTests() {
  const startTime = Date.now();
  
  logSection('🚀 KAPSAMLI E2E TEST BAŞLATIYOR');
  log('Bu test süreci saatlerce sürebilir...', 'yellow');
  log('Lütfen sabırlı olun ve testlerin tamamlanmasını bekleyin.', 'yellow');
  
  const allResults = {
    rektefeUs: null,
    rektefeDv: null,
    total: {
      total: 0,
      passed: 0,
      failed: 0,
      skipped: 0
    }
  };

  // REKTEFE-US Testleri
  try {
    allResults.rektefeUs = await runTests('rektefeUs', config.rektefeUs.tests);
    allResults.total.total += allResults.rektefeUs.total;
    allResults.total.passed += allResults.rektefeUs.passed;
    allResults.total.failed += allResults.rektefeUs.failed;
    allResults.total.skipped += allResults.rektefeUs.skipped;
  } catch (error) {
    log(`❌ REKTEFE-US testleri çalıştırılamadı: ${error.message}`, 'red');
  }

  // REKTEFE-DV Testleri
  try {
    allResults.rektefeDv = await runTests('rektefeDv', config.rektefeDv.tests);
    allResults.total.total += allResults.rektefeDv.total;
    allResults.total.passed += allResults.rektefeDv.passed;
    allResults.total.failed += allResults.rektefeDv.failed;
    allResults.total.skipped += allResults.rektefeDv.skipped;
  } catch (error) {
    log(`❌ REKTEFE-DV testleri çalıştırılamadı: ${error.message}`, 'red');
  }

  // Sonuçları göster
  const endTime = Date.now();
  const duration = Math.round((endTime - startTime) / 1000 / 60); // dakika

  logSection('📊 TEST SONUÇLARI');
  
  if (allResults.rektefeUs) {
    log('\n🏠 REKTEFE-US (Usta Uygulaması):', 'cyan');
    log(`   Toplam: ${allResults.rektefeUs.total}`, 'blue');
    log(`   ✅ Başarılı: ${allResults.rektefeUs.passed}`, 'green');
    log(`   ❌ Başarısız: ${allResults.rektefeUs.failed}`, 'red');
    log(`   ⏭️  Atlanan: ${allResults.rektefeUs.skipped}`, 'yellow');
  }

  if (allResults.rektefeDv) {
    log('\n🚗 REKTEFE-DV (Şöför Uygulaması):', 'cyan');
    log(`   Toplam: ${allResults.rektefeDv.total}`, 'blue');
    log(`   ✅ Başarılı: ${allResults.rektefeDv.passed}`, 'green');
    log(`   ❌ Başarısız: ${allResults.rektefeDv.failed}`, 'red');
    log(`   ⏭️  Atlanan: ${allResults.rektefeDv.skipped}`, 'yellow');
  }

  log('\n📈 GENEL SONUÇLAR:', 'bright');
  log(`   Toplam Test: ${allResults.total.total}`, 'blue');
  log(`   ✅ Başarılı: ${allResults.total.passed}`, 'green');
  log(`   ❌ Başarısız: ${allResults.total.failed}`, 'red');
  log(`   ⏭️  Atlanan: ${allResults.total.skipped}`, 'yellow');
  log(`   ⏱️  Süre: ${duration} dakika`, 'magenta');

  // Başarı oranı
  const successRate = allResults.total.total > 0 
    ? Math.round((allResults.total.passed / allResults.total.total) * 100)
    : 0;

  log(`   📊 Başarı Oranı: ${successRate}%`, successRate >= 80 ? 'green' : 'red');

  // Test raporu dosyası oluştur
  const reportPath = path.join(__dirname, 'test-report.json');
  const report = {
    timestamp: new Date().toISOString(),
    duration: duration,
    results: allResults,
    successRate: successRate
  };

  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  log(`\n📄 Detaylı rapor: ${reportPath}`, 'blue');

  // Sonuç mesajı
  if (allResults.total.failed === 0) {
    log('\n🎉 TÜM TESTLER BAŞARIYLA TAMAMLANDI!', 'green');
  } else if (successRate >= 80) {
    log('\n✅ TESTLER BÜYÜK ÖLÇÜDE BAŞARILI!', 'green');
  } else {
    log('\n⚠️  BAZI TESTLER BAŞARISIZ OLDU!', 'red');
  }

  process.exit(allResults.total.failed > 0 ? 1 : 0);
}

// Hata yakalama
process.on('unhandledRejection', (reason, promise) => {
  log(`❌ İşlenmeyen hata: ${reason}`, 'red');
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  log(`❌ Beklenmeyen hata: ${error.message}`, 'red');
  process.exit(1);
});

// Testleri başlat
runAllTests().catch(error => {
  log(`❌ Test çalıştırma hatası: ${error.message}`, 'red');
  process.exit(1);
});
