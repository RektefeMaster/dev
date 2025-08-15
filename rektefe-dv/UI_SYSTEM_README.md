# 🎨 Modern UI/UX Sistemi

Bu proje için geliştirilmiş profesyonel, kullanıcı dostu ve göz yormayan modern UI/UX sistemi.

## ✨ Özellikler

- **Modern Tema Sistemi** - Tutarlı renk paleti ve tipografi
- **Responsive Tasarım** - Farklı ekran boyutlarına uyum
- **Accessibility** - Erişilebilirlik standartlarına uygun
- **Micro-interactions** - Smooth animasyonlar ve geçişler
- **Dark/Light Mode** - Tema desteği
- **Component Library** - Yeniden kullanılabilir bileşenler

## 🚀 Kurulum

```bash
# Bileşenleri import edin
import { 
  Button, 
  Card, 
  Typography, 
  Layout, 
  theme 
} from '../components';
```

## 🎯 Temel Bileşenler

### 1. Button (Düğme)

```tsx
// Farklı varyantlar
<Button 
  title="Kaydet" 
  onPress={handleSave} 
  variant="primary" 
  size="lg" 
  icon="check"
/>

<Button 
  title="İptal" 
  onPress={handleCancel} 
  variant="outline" 
  size="md"
/>

<Button 
  title="Sil" 
  onPress={handleDelete} 
  variant="danger" 
  size="sm"
/>
```

**Varyantlar:**
- `primary` - Ana düğme (mavi)
- `secondary` - İkincil düğme (açık mavi)
- `outline` - Çerçeveli düğme
- `ghost` - Şeffaf düğme
- `danger` - Tehlike düğmesi (kırmızı)

**Boyutlar:**
- `sm` - Küçük (36px)
- `md` - Orta (44px)
- `lg` - Büyük (52px)

### 2. Card (Kart)

```tsx
// Temel kart
<Card>
  <CardHeader title="Başlık" subtitle="Alt başlık" />
  <CardContent>
    <Text>İçerik buraya gelecek</Text>
  </CardContent>
  <CardFooter>
    <Button title="Eylem" onPress={handleAction} />
  </CardFooter>
</Card>

// Tıklanabilir kart
<Card onPress={handlePress} variant="elevated">
  <Text>Bu karta tıklanabilir</Text>
</Card>
```

**Varyantlar:**
- `default` - Standart kart
- `elevated` - Yükseltilmiş kart
- `outlined` - Çerçeveli kart
- `filled` - Dolu kart

### 3. Typography (Tipografi)

```tsx
// Başlıklar
<H1>Ana Başlık</H1>
<H2>Alt Başlık</H2>
<H3>Bölüm Başlığı</H3>

// Metin varyantları
<Typography variant="body" color="primary" weight="medium">
  Normal metin
</Typography>

<Typography variant="caption" color="secondary" align="center">
  Küçük açıklama metni
</Typography>
```

**Varyantlar:**
- `h1`, `h2`, `h3`, `h4`, `h5`, `h6` - Başlıklar
- `body`, `body2` - Ana metin
- `caption` - Küçük metin
- `overline` - Üst çizgi metni
- `button` - Düğme metni

**Renkler:**
- `primary` - Ana renk
- `secondary` - İkincil renk
- `success` - Başarı rengi
- `warning` - Uyarı rengi
- `error` - Hata rengi

### 4. Layout (Düzen)

```tsx
// Satır düzeni
<Row align="center" justify="space-between" gap="md">
  <Text>Sol öğe</Text>
  <Text>Sağ öğe</Text>
</Row>

// Sütun düzeni
<Column align="start" gap="sm">
  <Text>Üst öğe</Text>
  <Text>Alt öğe</Text>
</Column>

// Esnek düzen
<Layout direction="row" wrap="wrap" gap="lg">
  <Flex flex={1}>
    <Text>Esnek öğe</Text>
  </Flex>
  <Flex flex={2}>
    <Text>2x esnek öğe</Text>
  </Flex>
</Layout>
```

### 5. Input (Giriş)

```tsx
// Temel input
<Input
  label="E-posta"
  placeholder="ornek@email.com"
  value={email}
  onChangeText={setEmail}
  type="email"
  required
/>

// Şifre input
<Input
  label="Şifre"
  value={password}
  onChangeText={setPassword}
  type="password"
  leftIcon="lock"
/>

// Hata durumu
<Input
  label="Kullanıcı Adı"
  value={username}
  onChangeText={setUsername}
  error="Bu alan zorunludur"
/>
```

### 6. Spacing (Boşluk)

```tsx
// Kenar boşlukları
<Spacing size="lg" />
<Spacing horizontal="md" />
<Spacing vertical="sm" />
<Spacing top="xl" bottom="md" />

// Container
<Container size="md" padding="lg">
  <Text>İçerik buraya</Text>
</Container>

// Section
<Section title="Bölüm Başlığı" subtitle="Açıklama" padding="xl">
  <Text>Bölüm içeriği</Text>
</Section>
```

## 🎨 Tema Sistemi

### Renkler

```tsx
import { theme } from '../components';

// Ana renkler
theme.colors.primary.main      // #0A84FF
theme.colors.secondary.main    // #5AC8FA
theme.colors.success.main      // #30D158
theme.colors.warning.main      // #FF9F0A
theme.colors.error.main        // #FF453A

// Metin renkleri
theme.colors.text.primary.light   // #202124
theme.colors.text.secondary.light // #5F6368

// Arka plan renkleri
theme.colors.background.default.light  // #FFFFFF
theme.colors.background.surface.light  // #F1F3F4
```

### Boşluklar

```tsx
// 8px grid sistemi
theme.spacing.xs    // 4px
theme.spacing.sm    // 8px
theme.spacing.md    // 16px
theme.spacing.lg    // 24px
theme.spacing.xl    // 32px
theme.spacing.xxl   // 48px
theme.spacing.xxxl  // 64px
```

### Tipografi

```tsx
// Font boyutları
theme.typography.fontSizes.xs     // 12px
theme.typography.fontSizes.sm     // 14px
theme.typography.fontSizes.md     // 16px
theme.typography.fontSizes.lg     // 18px
theme.typography.fontSizes.xl     // 20px
theme.typography.fontSizes.xxl    // 24px
theme.typography.fontSizes.xxxl   // 32px

// Font ağırlıkları
theme.typography.fontWeights.regular    // 400
theme.typography.fontWeights.medium     // 500
theme.typography.fontWeights.semibold   // 600
theme.typography.fontWeights.bold       // 700
```

### Gölgeler

```tsx
// Gölge varyantları
theme.shadows.xs    // Çok hafif gölge
theme.shadows.sm    // Hafif gölge
theme.shadows.md    // Orta gölge
theme.shadows.lg    // Güçlü gölge
theme.shadows.xl    // Çok güçlü gölge
theme.shadows.glow  // Parlama efekti
```

## 🔧 Özelleştirme

### Tema Genişletme

```tsx
// theme/theme.ts dosyasında
export const theme = {
  // ... mevcut tema
  custom: {
    brandColor: '#FF6B35',
    accentColor: '#4ECDC4',
  },
};
```

### Bileşen Stilleri

```tsx
// Inline stiller
<Button 
  title="Özel Düğme" 
  onPress={handlePress}
  style={{
    backgroundColor: theme.colors.custom.brandColor,
    borderRadius: 25,
  }}
/>

// Özel bileşen stilleri
const CustomButton = styled(Button)`
  background: linear-gradient(45deg, #FF6B35, #4ECDC4);
  border-radius: 25px;
`;
```

## 📱 Responsive Tasarım

```tsx
// Breakpoint'ler
theme.layout.breakpoints.sm    // 375px
theme.layout.breakpoints.md    // 768px
theme.layout.breakpoints.lg    // 1024px
theme.layout.breakpoints.xl    // 1200px

// Container boyutları
<Container size="sm">  // 16px padding
<Container size="md">  // 24px padding
<Container size="lg">  // 32px padding
<Container size="full"> // Tam genişlik
```

## ♿ Accessibility

```tsx
// Erişilebilirlik özellikleri
<Button
  title="Kaydet"
  onPress={handleSave}
  accessibilityLabel="Değişiklikleri kaydet"
  accessibilityHint="Form verilerini veritabanına kaydeder"
  accessibilityRole="button"
/>
```

## 🎭 Animasyonlar

```tsx
// Micro-interactions
theme.animation.duration.fast    // 200ms
theme.animation.duration.normal  // 300ms
theme.animation.duration.slow    // 500ms

// Easing functions
theme.animation.easing.smooth    // cubic-bezier(0.4, 0, 0.2, 1)
theme.animation.easing.bounce    // cubic-bezier(0.68, -0.55, 0.265, 1.55)
```

## 📚 Örnek Kullanım

### Form Sayfası

```tsx
import React, { useState } from 'react';
import { 
  Screen, 
  Container, 
  Typography, 
  Input, 
  Button, 
  Card,
  Spacing 
} from '../components';

const FormScreen = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    message: '',
  });

  return (
    <Screen padding="lg">
      <Container size="md">
        <Typography variant="h1" align="center" style={{ marginBottom: 32 }}>
          İletişim Formu
        </Typography>
        
        <Card variant="elevated" padding="lg">
          <Input
            label="Ad Soyad"
            value={formData.name}
            onChangeText={(text) => setFormData({ ...formData, name: text })}
            required
            leftIcon="account"
          />
          
          <Spacing top="md" />
          
          <Input
            label="E-posta"
            value={formData.email}
            onChangeText={(text) => setFormData({ ...formData, email: text })}
            type="email"
            required
            leftIcon="email"
          />
          
          <Spacing top="md" />
          
          <Input
            label="Mesaj"
            value={formData.message}
            onChangeText={(text) => setFormData({ ...formData, message: text })}
            multiline
            numberOfLines={4}
            leftIcon="message-text"
          />
          
          <Spacing top="lg" />
          
          <Button
            title="Gönder"
            onPress={() => console.log('Form gönderildi')}
            variant="primary"
            size="lg"
            icon="send"
            fullWidth
          />
        </Card>
      </Container>
    </Screen>
  );
};

export default FormScreen;
```

## 🎨 Tasarım Prensipleri

1. **Tutarlılık** - Tüm bileşenler aynı tasarım dilini kullanır
2. **Basitlik** - Gereksiz karmaşıklıktan kaçınılır
3. **Erişilebilirlik** - Tüm kullanıcılar için erişilebilir
4. **Responsive** - Tüm cihazlarda çalışır
5. **Performans** - Smooth animasyonlar ve hızlı yükleme
6. **Modern** - Güncel tasarım trendlerini takip eder

## 🚀 Gelecek Geliştirmeler

- [ ] Dark/Light mode toggle
- [ ] Daha fazla animasyon varyantı
- [ ] Advanced form validasyonu
- [ ] Chart ve grafik bileşenleri
- [ ] Drag & drop desteği
- [ ] Gesture handling
- [ ] Internationalization (i18n)

## 📖 Daha Fazla Bilgi

- [React Native Docs](https://reactnative.dev/)
- [Material Design](https://material.io/design)
- [Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/)

---

**Not:** Bu UI sistemi sürekli geliştirilmektedir. Önerileriniz için lütfen issue açın veya pull request gönderin.
