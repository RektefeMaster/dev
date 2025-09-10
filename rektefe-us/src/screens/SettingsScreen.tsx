import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Switch,
  ScrollView,
  Alert,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { colors, typography, spacing, borderRadius, shadows } from '../theme/theme';
import { BackButton } from '../components';

export default function SettingsScreen() {
  const { logout } = useAuth();
  
  const [settings, setSettings] = useState({
    notifications: true,
    emailUpdates: true,
    pushNotifications: true,
    locationSharing: false,
    profileVisibility: true,
    autoAcceptJobs: false,
    soundAlerts: true,
    vibrationAlerts: true,
    darkMode: false,
    language: 'tr',
  });

  const handleSettingToggle = (setting: keyof typeof settings) => {
    setSettings(prev => ({
      ...prev,
      [setting]: !prev[setting]
    }));
  };

  const handleLogout = () => {
    Alert.alert(
      'Çıkış Yap',
      'Hesabınızdan çıkmak istediğinizden emin misiniz?',
      [
        { text: 'İptal', style: 'cancel' },
        { text: 'Çıkış Yap', onPress: logout }
      ]
    );
  };

  const renderSettingItem = (
    icon: string, 
    title: string, 
    subtitle: string, 
    setting: keyof typeof settings, 
    hasSwitch = true,
    onPress?: () => void
  ) => (
    <TouchableOpacity 
      style={styles.settingItem}
      onPress={onPress}
      disabled={!onPress && hasSwitch}
    >
      <View style={styles.settingIcon}>
        <Ionicons name={icon as any} size={24} color={colors.primary.main} />
      </View>
      
      <View style={styles.settingContent}>
        <Text style={styles.settingTitle}>{title}</Text>
        <Text style={styles.settingSubtitle}>{subtitle}</Text>
      </View>
      
      {hasSwitch ? (
        <Switch
          value={settings[setting] as boolean}
          onValueChange={() => handleSettingToggle(setting)}
          trackColor={{ false: colors.border.secondary, true: colors.primary.light }}
          thumbColor={settings[setting] ? colors.primary.main : colors.text.tertiary}
        />
      ) : (
        <Ionicons name="chevron-forward" size={20} color={colors.text.tertiary} />
      )}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primary.main} />
      
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <BackButton />
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>Ayarlar</Text>
            <Text style={styles.headerSubtitle}>Hesap ve uygulama ayarlarınızı yönetin</Text>
          </View>
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Bildirim Ayarları */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Bildirim Ayarları</Text>
          <View style={styles.settingsCard}>
            {renderSettingItem(
              'notifications',
              'Bildirimler',
              'Randevu ve mesaj bildirimleri',
              'notifications'
            )}
            
            {renderSettingItem(
              'mail',
              'E-posta Güncellemeleri',
              'Haftalık rapor ve güncellemeler',
              'emailUpdates'
            )}
            
            {renderSettingItem(
              'phone-portrait',
              'Push Bildirimleri',
              'Anlık bildirimler',
              'pushNotifications'
            )}
            
            {renderSettingItem(
              'volume-high',
              'Ses Uyarıları',
              'Bildirim sesleri',
              'soundAlerts'
            )}
            
            {renderSettingItem(
              'phone-portrait',
              'Titreşim Uyarıları',
              'Bildirim titreşimleri',
              'vibrationAlerts'
            )}
          </View>
        </View>

        {/* Gizlilik Ayarları */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Gizlilik Ayarları</Text>
          <View style={styles.settingsCard}>
            {renderSettingItem(
              'location',
              'Konum Paylaşımı',
              'Müşterilere konumunuzu göster',
              'locationSharing'
            )}
            
            {renderSettingItem(
              'eye',
              'Profil Görünürlüğü',
              'Profilinizi herkese açık yap',
              'profileVisibility'
            )}
          </View>
        </View>

        {/* İş Ayarları */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>İş Ayarları</Text>
          <View style={styles.settingsCard}>
            {renderSettingItem(
              'checkmark-circle',
              'Otomatik İş Kabulü',
              'Gelen işleri otomatik kabul et',
              'autoAcceptJobs'
            )}
          </View>
        </View>

        {/* Uygulama Ayarları */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Uygulama Ayarları</Text>
          <View style={styles.settingsCard}>
            {renderSettingItem(
              'moon',
              'Karanlık Mod',
              'Karanlık tema kullan',
              'darkMode'
            )}
            
            {renderSettingItem(
              'language',
              'Dil',
              'Türkçe',
              'language',
              false,
              () => Alert.alert('Dil', 'Dil seçenekleri yakında eklenecek')
            )}
          </View>
        </View>

        {/* Hesap Yönetimi */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Hesap Yönetimi</Text>
          <View style={styles.settingsCard}>
            <TouchableOpacity style={styles.settingItem}>
              <View style={styles.settingIcon}>
                <Ionicons name="person" size={24} color={colors.primary.main} />
              </View>
              <View style={styles.settingContent}>
                <Text style={styles.settingTitle}>Profili Düzenle</Text>
                <Text style={styles.settingSubtitle}>Kişisel bilgileri güncelle</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.text.tertiary} />
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.settingItem}>
              <View style={styles.settingIcon}>
                <Ionicons name="shield-checkmark" size={24} color={colors.primary.main} />
              </View>
              <View style={styles.settingContent}>
                <Text style={styles.settingTitle}>Güvenlik</Text>
                <Text style={styles.settingSubtitle}>Şifre ve güvenlik ayarları</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.text.tertiary} />
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.settingItem}>
              <View style={styles.settingIcon}>
                <Ionicons name="construct" size={24} color={colors.primary.main} />
              </View>
              <View style={styles.settingContent}>
                <Text style={styles.settingTitle}>Hizmet Alanlarım</Text>
                <Text style={styles.settingSubtitle}>Uzmanlık alanlarını yönet</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.text.tertiary} />
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.settingItem}>
              <View style={styles.settingIcon}>
                <Ionicons name="time" size={24} color={colors.primary.main} />
              </View>
              <View style={styles.settingContent}>
                <Text style={styles.settingTitle}>Çalışma Saatleri</Text>
                <Text style={styles.settingSubtitle}>Müsaitlik durumunu ayarla</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.text.tertiary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Destek ve Yardım */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Destek ve Yardım</Text>
          <View style={styles.settingsCard}>
            <TouchableOpacity style={styles.settingItem}>
              <View style={styles.settingIcon}>
                <Ionicons name="help-circle" size={24} color={colors.primary.main} />
              </View>
              <View style={styles.settingContent}>
                <Text style={styles.settingTitle}>Yardım Merkezi</Text>
                <Text style={styles.settingSubtitle}>Sık sorulan sorular</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.text.tertiary} />
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.settingItem}>
              <View style={styles.settingIcon}>
                <Ionicons name="chatbubble" size={24} color={colors.primary.main} />
              </View>
              <View style={styles.settingContent}>
                <Text style={styles.settingTitle}>Destek</Text>
                <Text style={styles.settingSubtitle}>Müşteri hizmetleri ile iletişim</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.text.tertiary} />
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.settingItem}>
              <View style={styles.settingIcon}>
                <Ionicons name="information-circle" size={24} color={colors.primary.main} />
              </View>
              <View style={styles.settingContent}>
                <Text style={styles.settingTitle}>Hakkında</Text>
                <Text style={styles.settingSubtitle}>Uygulama versiyonu ve bilgileri</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.text.tertiary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Çıkış Yap */}
        <View style={styles.section}>
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={24} color="#DC2626" />
            <Text style={styles.logoutButtonText}>Çıkış Yap</Text>
          </TouchableOpacity>
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
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  headerContent: {
    flex: 1,
    alignItems: 'center',
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
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: typography.h4.fontSize,
    fontWeight: '600',
    color: colors.text.primary.main,
    marginBottom: spacing.md,
    paddingHorizontal: spacing.sm,
  },
  settingsCard: {
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    ...shadows.small,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.secondary,
  },
  settingIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary.ultraLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  settingContent: {
    flex: 1,
  },
  settingTitle: {
    fontSize: typography.body1.fontSize,
    fontWeight: '600',
    color: colors.text.primary.main,
    marginBottom: spacing.xs,
  },
  settingSubtitle: {
    fontSize: typography.caption.large.fontSize,
    color: colors.text.secondary,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    ...shadows.small,
  },
  logoutButtonText: {
    fontSize: typography.body1.fontSize,
    fontWeight: '600',
    color: '#DC2626',
    marginLeft: spacing.sm,
  },
  bottomSpacing: {
    height: spacing.xl * 2,
  },
});
