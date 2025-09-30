import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Linking,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography, spacing, borderRadius, shadows } from '@/shared/theme';
import { BackButton } from '@/shared/components';
import apiService from '@/shared/services';

interface AppInfo {
  version: string;
  buildNumber: string;
  releaseDate: string;
  features: string[];
  changelog: string[];
}

export default function AboutScreen() {
  const [appInfo, setAppInfo] = useState<AppInfo>({
    version: '1.0.0',
    buildNumber: '100',
    releaseDate: '2024-01-01',
    features: [],
    changelog: []
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadAppInfo();
  }, []);

  const loadAppInfo = async () => {
    try {
      setLoading(true);
      const response = await apiService.getAppInfo();
      
      if (response.success && response.data) {
        setAppInfo(response.data);
      } else {
        // Fallback data
        setAppInfo({
          version: '1.0.0',
          buildNumber: '100',
          releaseDate: '2024-01-01',
          features: [
            'Akıllı Randevu Yönetimi - Gelen, onaylanan ve tamamlanan randevuları kolayca takip edin',
            'Çalışma Saatleri Ayarlama - Haftanın her günü için esnek çalışma saatleri belirleyin',
            'Hizmet Alanları Yönetimi - 10 farklı hizmet kategorisinden uzmanlık alanlarınızı seçin',
            'Gerçek Zamanlı Bildirimler - Push, e-posta ve SMS bildirimleri ile hiçbir işi kaçırmayın',
            'Güvenli Ödeme Sistemi - Otomatik ödeme takibi ve güvenli para transferi',
            'Konum Paylaşımı - Müşterilerinize kolay ulaşım için konum paylaşımı',
            'Karanlık Mod - Göz yorgunluğunu azaltan karanlık tema desteği',
            'Çoklu Dil Desteği - Türkçe ve İngilizce dil seçenekleri',
            'Güvenlik ve Gizlilik - End-to-end şifreleme ve kişisel veri koruması'
          ],
          changelog: [
            'v1.0.0 - İlk sürüm yayınlandı (Ocak 2024)',
            '• Temel randevu yönetimi sistemi',
            '• Kullanıcı profil yönetimi',
            '• Bildirim sistemi entegrasyonu',
            '• Ödeme sistemi altyapısı',
            '• Modern ve kullanıcı dostu arayüz',
            '• iOS ve Android platform desteği',
            '• Güvenlik protokolleri ve veri koruması',
            '• Çoklu hizmet kategorisi desteği',
            '• Gerçek zamanlı mesajlaşma sistemi'
          ]
        });
      }
    } catch (error) {
      console.error('App info load error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleContactSupport = () => {
    Alert.alert(
      'Destek',
      'Müşteri hizmetleri ile iletişime geçmek için:',
      [
        { 
          text: 'E-posta Gönder', 
          onPress: () => {
            Linking.openURL('mailto:rektefly@gmail.com?subject=Rektefe Destek&body=Merhaba, Rektefe uygulaması ile ilgili bir sorunum var.');
          }
        },
        { 
          text: 'Telefon Ara', 
          onPress: () => {
            Linking.openURL('tel:05060550239');
          }
        },
        { text: 'İptal', style: 'cancel' }
      ]
    );
  };

  const handleRateApp = () => {
    Alert.alert(
      'Uygulamayı Değerlendir',
      'Uygulamamızı beğendiyseniz App Store\'da değerlendirmenizi bekliyoruz!',
      [
        { text: 'Daha Sonra', style: 'cancel' },
        { text: 'Değerlendir', onPress: () => {
          // App Store'a yönlendir
          Linking.openURL('https://apps.apple.com/app/rektefe');
        }}
      ]
    );
  };

  const handlePrivacyPolicy = () => {
    Linking.openURL('https://rektefe.com/privacy');
  };

  const handleTermsOfService = () => {
    Linking.openURL('https://rektefe.com/terms');
  };

  const renderInfoItem = (
    icon: string,
    title: string,
    subtitle: string,
    onPress?: () => void
  ) => (
    <TouchableOpacity
      style={styles.infoItem}
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
      disabled={!onPress}
    >
      <View style={styles.infoLeft}>
        <View style={styles.infoIconContainer}>
          <Ionicons name={icon as any} size={22} color={colors.primary.main} />
        </View>
        
        <View style={styles.infoContent}>
          <Text style={styles.infoTitle}>{title}</Text>
          <Text style={styles.infoSubtitle}>{subtitle}</Text>
        </View>
      </View>
      
      {onPress && (
        <View style={styles.chevronContainer}>
          <Ionicons name="chevron-forward" size={18} color={colors.text.tertiary} />
        </View>
      )}
    </TouchableOpacity>
  );

  const renderFeatureItem = (feature: string, index: number) => (
    <View key={index} style={styles.featureItem}>
      <View style={styles.featureIcon}>
        <Ionicons name="checkmark-circle" size={16} color={colors.primary.main} />
      </View>
      <Text style={styles.featureText}>{feature}</Text>
    </View>
  );

  const renderChangelogItem = (change: string, index: number) => (
    <View key={index} style={styles.changelogItem}>
      <View style={styles.changelogIcon}>
        <Ionicons name="ellipse" size={8} color={colors.primary.main} />
      </View>
      <Text style={styles.changelogText}>{change}</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primary.main} />
      
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.headerTop}>
            <BackButton />
            <View style={styles.headerTitleContainer}>
              <Text style={styles.headerTitle}>Hakkında</Text>
              <Text style={styles.headerSubtitle}>Uygulama bilgileri ve versiyon</Text>
            </View>
          </View>
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Uygulama Bilgileri */}
        <View style={styles.section}>
          <View style={styles.appInfoCard}>
            <View style={styles.appIconContainer}>
              <Ionicons name="construct" size={48} color={colors.primary.main} />
            </View>
            <Text style={styles.appName}>Rektefe</Text>
            <Text style={styles.appDescription}>Usta ve Şöför Buluşma Platformu</Text>
            <Text style={styles.appVersion}>Versiyon {appInfo.version}</Text>
            <Text style={styles.appBuild}>Build {appInfo.buildNumber}</Text>
          </View>
        </View>

        {/* Özellikler */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Özellikler</Text>
          <View style={styles.featuresCard}>
            {appInfo.features.map(renderFeatureItem)}
          </View>
        </View>

        {/* Değişiklik Geçmişi */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Değişiklik Geçmişi</Text>
          <View style={styles.changelogCard}>
            {appInfo.changelog.map(renderChangelogItem)}
          </View>
        </View>

        {/* İletişim ve Destek */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>İletişim ve Destek</Text>
          <View style={styles.infoCard}>
            {renderInfoItem(
              'chatbubble',
              'Destek',
              'Müşteri hizmetleri ile iletişim',
              handleContactSupport
            )}
            
            {renderInfoItem(
              'star',
              'Uygulamayı Değerlendir',
              'App Store\'da puan verin',
              handleRateApp
            )}
          </View>
        </View>

        {/* Yasal Bilgiler */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Yasal Bilgiler</Text>
          <View style={styles.infoCard}>
            {renderInfoItem(
              'shield-checkmark',
              'Gizlilik Politikası',
              'Kişisel verilerin korunması',
              handlePrivacyPolicy
            )}
            
            {renderInfoItem(
              'document-text',
              'Kullanım Şartları',
              'Hizmet şartları ve koşulları',
              handleTermsOfService
            )}
          </View>
        </View>

        {/* Alt Boşluk */}
        <View style={styles.bottomSpacing} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  header: {
    backgroundColor: colors.primary.main,
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
    paddingHorizontal: spacing.lg,
  },
  headerContent: {
    flex: 1,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitleContainer: {
    flex: 1,
    marginLeft: spacing.md,
  },
  headerTitle: {
    fontSize: typography.h1.fontSize,
    fontWeight: '700',
    color: colors.text.inverse,
    marginBottom: spacing.xs,
  },
  headerSubtitle: {
    fontSize: typography.body2.fontSize,
    color: colors.text.inverse,
    opacity: 0.9,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    fontSize: typography.h4.fontSize,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: spacing.md,
    paddingHorizontal: spacing.xs,
  },
  appInfoCard: {
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    alignItems: 'center',
    ...shadows.medium,
    borderWidth: 1,
    borderColor: colors.border.primary,
  },
  appIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primary.main + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  appName: {
    fontSize: typography.h2.fontSize,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  appDescription: {
    fontSize: typography.body1.fontSize,
    color: colors.text.secondary,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  appVersion: {
    fontSize: typography.body2.fontSize,
    fontWeight: '600',
    color: colors.primary.main,
    marginBottom: spacing.xs,
  },
  appBuild: {
    fontSize: typography.caption.large.fontSize,
    color: colors.text.tertiary,
  },
  featuresCard: {
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    ...shadows.medium,
    borderWidth: 1,
    borderColor: colors.border.primary,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  featureIcon: {
    marginRight: spacing.sm,
  },
  featureText: {
    fontSize: typography.body2.fontSize,
    color: colors.text.primary,
    flex: 1,
  },
  changelogCard: {
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    ...shadows.medium,
    borderWidth: 1,
    borderColor: colors.border.primary,
  },
  changelogItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  changelogIcon: {
    marginRight: spacing.sm,
    marginTop: spacing.xs,
  },
  changelogText: {
    fontSize: typography.body2.fontSize,
    color: colors.text.primary,
    flex: 1,
    lineHeight: 20,
  },
  infoCard: {
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.xl,
    padding: spacing.sm,
    ...shadows.medium,
    borderWidth: 1,
    borderColor: colors.border.primary,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.lg,
    marginVertical: spacing.xs,
    backgroundColor: colors.background.primary,
    ...shadows.small,
  },
  infoLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  infoIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary.main + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  infoContent: {
    flex: 1,
  },
  infoTitle: {
    fontSize: typography.body1.fontSize,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  infoSubtitle: {
    fontSize: typography.caption.large.fontSize,
    color: colors.text.secondary,
    lineHeight: 18,
  },
  chevronContainer: {
    paddingLeft: spacing.sm,
    paddingRight: spacing.xs,
  },
  bottomSpacing: {
    height: spacing.xl * 2,
  },
});
