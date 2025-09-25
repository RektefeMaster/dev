const { device, expect, element, by, waitFor } = require('detox');

// Test yardımcı fonksiyonları
class TestUtils {
  // Element bekleme ve görünürlük kontrolü
  static async waitForElement(elementId, timeout = 10000) {
    await waitFor(element(by.id(elementId))).toBeVisible().withTimeout(timeout);
  }

  static async waitForElementNotVisible(elementId, timeout = 10000) {
    await waitFor(element(by.id(elementId))).toBeNotVisible().withTimeout(timeout);
  }

  // Text tabanlı element bekleme
  static async waitForText(text, timeout = 10000) {
    await waitFor(element(by.text(text))).toBeVisible().withTimeout(timeout);
  }

  // Element'e tıklama
  static async tapElement(elementId) {
    await element(by.id(elementId)).tap();
  }

  static async tapText(text) {
    await element(by.text(text)).tap();
  }

  // Text girişi
  static async typeText(elementId, text) {
    await element(by.id(elementId)).typeText(text);
  }

  static async clearAndTypeText(elementId, text) {
    await element(by.id(elementId)).clearText();
    await element(by.id(elementId)).typeText(text);
  }

  // Scroll işlemleri
  static async scrollDown(elementId, pixels = 0.5) {
    await element(by.id(elementId)).scroll(pixels, 'down');
  }

  static async scrollUp(elementId, pixels = 0.5) {
    await element(by.id(elementId)).scroll(pixels, 'up');
  }

  // Swipe işlemleri
  static async swipeLeft(elementId) {
    await element(by.id(elementId)).swipe('left');
  }

  static async swipeRight(elementId) {
    await element(by.id(elementId)).swipe('right');
  }

  // Element varlığını kontrol etme
  static async elementExists(elementId) {
    try {
      await expect(element(by.id(elementId))).toBeVisible();
      return true;
    } catch (error) {
      return false;
    }
  }

  static async textExists(text) {
    try {
      await expect(element(by.text(text))).toBeVisible();
      return true;
    } catch (error) {
      return false;
    }
  }

  // Screenshot alma
  static async takeScreenshot(name) {
    await device.takeScreenshot(name);
  }

  // Rastgele string oluşturma
  static generateRandomString(length = 8) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  // Rastgele telefon numarası
  static generateRandomPhone() {
    const prefix = '5';
    let number = prefix;
    for (let i = 0; i < 9; i++) {
      number += Math.floor(Math.random() * 10);
    }
    return number;
  }

  // Rastgele email
  static generateRandomEmail() {
    return `test${this.generateRandomString(6)}@test.com`;
  }

  // Bekleme fonksiyonu
  static async sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Retry mekanizması
  static async retry(action, maxRetries = 3, delay = 1000) {
    for (let i = 0; i < maxRetries; i++) {
      try {
        return await action();
      } catch (error) {
        if (i === maxRetries - 1) throw error;
        await this.sleep(delay);
      }
    }
  }
}

// Test verileri
const testData = {
  // Auth test verileri
  auth: {
    validUser: {
      email: 'test@example.com',
      password: 'Test123456',
      phone: '5551234567'
    },
    invalidUser: {
      email: 'invalid@test.com',
      password: 'wrongpass',
      phone: '5550000000'
    },
    newUser: {
      name: 'Test Kullanıcı',
      surname: 'Test Soyadı',
      email: TestUtils.generateRandomEmail(),
      phone: TestUtils.generateRandomPhone(),
      password: 'Test123456'
    },
    validMechanic: {
      email: 'mechanic@example.com',
      password: 'Mechanic123456',
      phone: '5551234567',
      serviceTypes: ['repair', 'towing']
    }
  },

  // Arıza bildir test verileri
  faultReport: {
    valid: {
      title: 'Test Arıza',
      description: 'Test arıza açıklaması',
      location: 'İstanbul',
      urgency: 'Yüksek'
    },
    invalid: {
      title: '',
      description: '',
      location: '',
      urgency: ''
    }
  },

  // Randevu test verileri
  appointment: {
    valid: {
      serviceType: 'Tamir & Bakım',
      description: 'Test randevu açıklaması',
      preferredTime: '09:00',
      preferredDate: '2025-01-15'
    }
  },

  // Hizmet test verileri
  service: {
    repair: {
      title: 'Motor Tamiri',
      description: 'Kapsamlı motor bakımı',
      price: '500',
      estimatedDuration: '2 saat'
    },
    towing: {
      description: 'Çekici hizmeti açıklaması',
      pickupLocation: 'İstanbul',
      destination: 'Ankara',
      price: '300'
    },
    wash: {
      description: 'Yıkama hizmeti açıklaması',
      packageType: 'Full Yıkama',
      price: '150'
    },
    tire: {
      description: 'Lastik değişimi açıklaması',
      tireSize: '205/55 R16',
      quantity: '4',
      price: '400'
    }
  },

  // Profil test verileri
  profile: {
    valid: {
      name: 'Güncellenmiş İsim',
      surname: 'Güncellenmiş Soyisim',
      phone: TestUtils.generateRandomPhone(),
      address: 'Test Adresi'
    }
  }
};

module.exports = {
  TestUtils,
  testData
};
