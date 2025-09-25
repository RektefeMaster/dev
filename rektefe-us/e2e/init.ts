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
  console.log(`Test başlıyor: ${expect.getState().currentTestName}`);
});

afterEach(async () => {
  console.log(`Test tamamlandı: ${expect.getState().currentTestName}`);
  
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
    await waitFor(element(by.testID('onboarding-screen').or(by.testID('auth-screen')).or(by.testID('mechanic-home-screen'))))
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
    
    // Ana ekranı bekle (mechanic için)
    await waitFor(element(by.testID('mechanic-home-screen')))
      .toBeVisible()
      .withTimeout(10000);
      
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
