import { device, element, by, expect as detoxExpect, waitFor } from 'detox';

// Global setup for all tests
beforeAll(async () => {
  // Device'ı başlat
  await device.launchApp({
    permissions: {
      location: 'always',
      notifications: 'YES',
      camera: 'YES',
      photos: 'YES'
    },
    newInstance: true
  });
  
  });

beforeEach(async () => {
  .currentTestName}`);
});

afterEach(async () => {
  .currentTestName}`);
  
  // Screenshot al (hata durumunda)
  if (expect.getState().assertionCalls > 0 && expect.getState().suppressedErrors.length > 0) {
    const testName = expect.getState().currentTestName?.replace(/[^a-zA-Z0-9]/g, '_');
    await device.takeScreenshot(`error_${testName}_${Date.now()}`);
  }
});

afterAll(async () => {
  await device.terminateApp();
});

// Custom matchers ve helper functions
global.helpers = {
  // Splash screen'i bekle ve geç
  async skipSplashScreen() {
    await waitFor(element(by.testID('splash-screen')))
      .toBeVisible()
      .withTimeout(5000);
    
    // Splash screen otomatik geçer, ana ekranı bekle
    await waitFor(element(by.testID('onboarding-screen').or(by.testID('auth-screen')).or(by.testID('home-screen'))))
      .toBeVisible()
      .withTimeout(10000);
  },

  // Onboarding'i geç
  async skipOnboarding() {
    try {
      // Onboarding ekranı var mı kontrol et
      await waitFor(element(by.testID('onboarding-screen')))
        .toBeVisible()
        .withTimeout(3000);
      
      // Slide'ları geç
      for (let i = 0; i < 3; i++) {
        await element(by.testID('onboarding-next-button')).tap();
        await device.takeScreenshot(`onboarding_slide_${i + 1}`);
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      // "Başlayalım" butonuna tıkla
      await element(by.testID('onboarding-start-button')).tap();
      
    } catch (error) {
      }
  },

  // Login işlemi
  async loginUser(email: string, password: string) {
    await waitFor(element(by.testID('auth-screen')))
      .toBeVisible()
      .withTimeout(5000);
    
    // Email gir
    await element(by.testID('email-input')).typeText(email);
    await element(by.testID('password-input')).typeText(password);
    
    // Login butonuna tıkla
    await element(by.testID('login-button')).tap();
    
    // Ana ekranı bekle
    await waitFor(element(by.testID('home-screen')))
      .toBeVisible()
      .withTimeout(10000);
      
    },

  // Register işlemi
  async registerUser(userData: any) {
    await waitFor(element(by.testID('auth-screen')))
      .toBeVisible()
      .withTimeout(5000);
    
    // "Kayıt Ol" sekmesine geç
    await element(by.testID('register-tab')).tap();
    
    // Form doldur
    await element(by.testID('register-name-input')).typeText(userData.name);
    await element(by.testID('register-surname-input')).typeText(userData.surname);
    await element(by.testID('register-email-input')).typeText(userData.email);
    await element(by.testID('register-phone-input')).typeText(userData.phone);
    await element(by.testID('register-password-input')).typeText(userData.password);
    
    // Kullanım şartlarını kabul et
    await element(by.testID('terms-checkbox')).tap();
    
    // Kayıt ol butonuna tıkla
    await element(by.testID('register-button')).tap();
    
    },

  // Ana navigasyonu kontrol et
  async navigateToTab(tabName: string) {
    const tabTestIds: { [key: string]: string } = {
      'home': 'tab-anasayfa',
      'messages': 'tab-mesajlar', 
      'garage': 'tab-garajim',
      'wallet': 'tab-cuzdan',
      'tefe-wallet': 'tab-tefe-cuzdan',
      'support': 'tab-destek'
    };
    
    const testId = tabTestIds[tabName];
    if (!testId) {
      throw new Error(`Bilinmeyen tab: ${tabName}`);
    }
    
    await element(by.testID(testId)).tap();
    await waitFor(element(by.testID(`${tabName}-screen`)))
      .toBeVisible()
      .withTimeout(3000);
      
    },

  // Screenshot al
  async takeScreenshot(name: string) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    await device.takeScreenshot(`${name}_${timestamp}`);
  },

  // Element görünür olana kadar bekle
  async waitForElement(testId: string, timeout: number = 5000) {
    await waitFor(element(by.testID(testId)))
      .toBeVisible()
      .withTimeout(timeout);
  },

  // Text içeren elementi bul ve tıkla
  async tapByText(text: string) {
    await element(by.text(text)).tap();
  },

  // Scroll işlemi
  async scrollTo(elementTestId: string, direction: 'up' | 'down' = 'down') {
    await element(by.testID(elementTestId)).scroll(200, direction);
  }
};

// Global expect için Detox expect'i ekle
(global as any).detoxExpect = detoxExpect;
