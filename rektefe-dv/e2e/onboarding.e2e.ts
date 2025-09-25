import { device, element, by, expect as detoxExpect, waitFor } from 'detox';

describe('👋 Onboarding ve İlk Kullanım', () => {
  beforeAll(async () => {
    });

  beforeEach(async () => {
    // Her testten önce uygulamayı temiz başlat
    await device.reloadReactNative();
  });

  it('Splash screen doğru şekilde görüntüleniyor', async () => {
    // Splash screen'in görünür olduğunu kontrol et
    await waitFor(element(by.testID('splash-screen')))
      .toBeVisible()
      .withTimeout(5000);
    
    await global.helpers.takeScreenshot('splash_screen');
    
    // Lottie animasyonunun çalıştığını kontrol et
    await detoxExpect(element(by.testID('splash-lottie-animation'))).toBeVisible();
    
    });

  it('Onboarding slide\'ları doğru sırayla gösteriliyor', async () => {
    await global.helpers.skipSplashScreen();
    
    // İlk slide kontrolü
    await detoxExpect(element(by.testID('onboarding-slide-0'))).toBeVisible();
    await detoxExpect(element(by.text('Rektefe\'ye Hoş Geldiniz!'))).toBeVisible();
    await global.helpers.takeScreenshot('onboarding_slide_1');
    
    // İkinci slide'a geç
    await element(by.testID('onboarding-next-button')).tap();
    await detoxExpect(element(by.testID('onboarding-slide-1'))).toBeVisible();
    await global.helpers.takeScreenshot('onboarding_slide_2');
    
    // Üçüncü slide'a geç
    await element(by.testID('onboarding-next-button')).tap();
    await detoxExpected(element(by.testID('onboarding-slide-2'))).toBeVisible();
    await global.helpers.takeScreenshot('onboarding_slide_3');
    
    // "Başlayalım" butonu görünür olmalı
    await detoxExpect(element(by.testID('onboarding-start-button'))).toBeVisible();
    
    });

  it('Onboarding\'den auth ekranına geçiş yapılıyor', async () => {
    await global.helpers.skipSplashScreen();
    await global.helpers.skipOnboarding();
    
    // Auth ekranının görünür olduğunu kontrol et
    await waitFor(element(by.testID('auth-screen')))
      .toBeVisible()
      .withTimeout(5000);
    
    await global.helpers.takeScreenshot('auth_screen_after_onboarding');
    
    // Login ve Register sekmelerinin var olduğunu kontrol et
    await detoxExpect(element(by.testID('login-tab'))).toBeVisible();
    await detoxExpect(element(by.testID('register-tab'))).toBeVisible();
    
    });

  it('Geri butonu ile onboarding\'de gezinebiliyor', async () => {
    await global.helpers.skipSplashScreen();
    
    // İkinci slide'a git
    await element(by.testID('onboarding-next-button')).tap();
    await element(by.testID('onboarding-next-button')).tap();
    
    // Geri butonunun görünür olduğunu kontrol et (ilk slide'da olmamalı)
    await detoxExpect(element(by.testID('onboarding-back-button'))).toBeVisible();
    
    // Geri git
    await element(by.testID('onboarding-back-button')).tap();
    await detoxExpect(element(by.testID('onboarding-slide-1'))).toBeVisible();
    
    // Bir daha geri git
    await element(by.testID('onboarding-back-button')).tap();
    await detoxExpect(element(by.testID('onboarding-slide-0'))).toBeVisible();
    
    });

  it('Skip butonu ile onboarding atlanabiliyor', async () => {
    await global.helpers.skipSplashScreen();
    
    // Skip butonuna tıkla
    await element(by.testID('onboarding-skip-button')).tap();
    
    // Direkt auth ekranına gittiğini kontrol et
    await waitFor(element(by.testID('auth-screen')))
      .toBeVisible()
      .withTimeout(3000);
    
    await global.helpers.takeScreenshot('auth_screen_after_skip');
    
    });

  it('Onboarding tamamlandıktan sonra tekrar gösterilmiyor', async () => {
    // İlk kez onboarding'i tamamla
    await global.helpers.skipSplashScreen();
    await global.helpers.skipOnboarding();
    
    // Uygulamayı yeniden başlat
    await device.reloadReactNative();
    await global.helpers.skipSplashScreen();
    
    // Auth ekranının direkt göründüğünü kontrol et (onboarding olmamalı)
    await waitFor(element(by.testID('auth-screen')))
      .toBeVisible()
      .withTimeout(5000);
    
    // Onboarding ekranının olmadığını kontrol et
    try {
      await waitFor(element(by.testID('onboarding-screen')))
        .toBeVisible()
        .withTimeout(1000);
      throw new Error('Onboarding ekranı tekrar gösterildi!');
    } catch (error) {
      if (error.message.includes('tekrar gösterildi')) {
        throw error;
      }
      // Expected behavior - onboarding gösterilmemeli
    }
    
    });
});
