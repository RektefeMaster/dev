import React, { useState, useEffect } from 'react';
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
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/shared/context';
import { useSettings } from '@/shared/context/SettingsContext';
import { colors, typography, spacing, borderRadius, shadows } from '@/shared/theme';
import { BackButton } from '@/shared/components';

export default function SettingsScreen() {
  const navigation = useNavigation();
  const { logout } = useAuth();
  const { 
    notificationSettings, 
    privacySettings, 
    jobSettings, 
    appSettings,
    updateNotificationSettings,
    updatePrivacySettings,
    updateJobSettings,
    updateAppSettings,
    loading,
    error
  } = useSettings();

  useEffect(() => {
    if (error) {
      Alert.alert('Hata', error);
    }
  }, [error]);

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
    value: boolean,
    onToggle: () => void,
    hasSwitch = true,
    onPress?: () => void
  ) => (
    <TouchableOpacity 
      style={styles.settingItem}
      onPress={onPress}
      disabled={!onPress && hasSwitch}
      activeOpacity={0.7}
    >
      <View style={styles.settingLeft}>
        <View style={styles.settingIconContainer}>
          <Ionicons name={icon as any} size={22} color={colors.primary.main} />
        </View>
        
        <View style={styles.settingContent}>
          <Text style={styles.settingTitle}>{title}</Text>
          <Text style={styles.settingSubtitle}>{subtitle}</Text>
        </View>
      </View>
      
      {hasSwitch ? (
        <View style={styles.switchContainer}>
          <Switch
            value={value}
            onValueChange={onToggle}
            trackColor={{ 
              false: colors.border.secondary, 
              true: colors.primary.main + '40' 
            }}
            thumbColor={value ? colors.primary.main : '#FFFFFF'}
            disabled={loading}
            style={styles.switch}
          />
        </View>
      ) : (
        <View style={styles.chevronContainer}>
          <Ionicons name="chevron-forward" size={18} color={colors.text.tertiary} />
        </View>
      )}
    </TouchableOpacity>
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
              <Text style={styles.headerTitle}>Ayarlar</Text>
              <Text style={styles.headerSubtitle}>Hesap ve uygulama ayarlarınızı yönetin</Text>
            </View>
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
              notificationSettings.pushNotifications,
              () => updateNotificationSettings({ pushNotifications: !notificationSettings.pushNotifications })
            )}
            
            {renderSettingItem(
              'mail',
              'E-posta Güncellemeleri',
              'Haftalık rapor ve güncellemeler',
              notificationSettings.emailUpdates,
              () => updateNotificationSettings({ emailUpdates: !notificationSettings.emailUpdates })
            )}
            
            {renderSettingItem(
              'phone-portrait',
              'Push Bildirimleri',
              'Anlık bildirimler',
              notificationSettings.pushNotifications,
              () => updateNotificationSettings({ pushNotifications: !notificationSettings.pushNotifications })
            )}
            
            {renderSettingItem(
              'volume-high',
              'Ses Uyarıları',
              'Bildirim sesleri',
              notificationSettings.soundAlerts,
              () => updateNotificationSettings({ soundAlerts: !notificationSettings.soundAlerts })
            )}
            
            {renderSettingItem(
              'phone-portrait',
              'Titreşim Uyarıları',
              'Bildirim titreşimleri',
              notificationSettings.vibrationAlerts,
              () => updateNotificationSettings({ vibrationAlerts: !notificationSettings.vibrationAlerts })
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
              privacySettings.locationSharing,
              () => updatePrivacySettings({ locationSharing: !privacySettings.locationSharing })
            )}
            
            {renderSettingItem(
              'eye',
              'Profil Görünürlüğü',
              'Profilinizi herkese açık yap',
              privacySettings.profileVisibility,
              () => updatePrivacySettings({ profileVisibility: !privacySettings.profileVisibility })
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
              jobSettings.autoAcceptJobs,
              () => updateJobSettings({ autoAcceptJobs: !jobSettings.autoAcceptJobs })
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
              appSettings.darkMode,
              () => updateAppSettings({ darkMode: !appSettings.darkMode })
            )}
            
            {renderSettingItem(
              'language',
              'Dil',
              'Türkçe',
              false,
              () => {},
              false,
              () => Alert.alert('Dil', 'Dil seçenekleri yakında eklenecek')
            )}
          </View>
        </View>

        {/* Hesap Yönetimi */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Hesap Yönetimi</Text>
          <View style={styles.settingsCard}>
            <TouchableOpacity 
              style={styles.settingItem}
              onPress={() => navigation.navigate('EditProfile' as never)}
              activeOpacity={0.7}
            >
              <View style={styles.settingLeft}>
                <View style={styles.settingIconContainer}>
                  <Ionicons name="person" size={22} color={colors.primary.main} />
                </View>
                <View style={styles.settingContent}>
                  <Text style={styles.settingTitle}>Profili Düzenle</Text>
                  <Text style={styles.settingSubtitle}>Kişisel bilgileri güncelle</Text>
                </View>
              </View>
              <View style={styles.chevronContainer}>
                <Ionicons name="chevron-forward" size={18} color={colors.text.tertiary} />
              </View>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.settingItem}
              onPress={() => navigation.navigate('Security' as never)}
              activeOpacity={0.7}
            >
              <View style={styles.settingLeft}>
                <View style={styles.settingIconContainer}>
                  <Ionicons name="shield-checkmark" size={22} color={colors.primary.main} />
                </View>
                <View style={styles.settingContent}>
                  <Text style={styles.settingTitle}>Güvenlik</Text>
                  <Text style={styles.settingSubtitle}>Şifre ve güvenlik ayarları</Text>
                </View>
              </View>
              <View style={styles.chevronContainer}>
                <Ionicons name="chevron-forward" size={18} color={colors.text.tertiary} />
              </View>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.settingItem}
              onPress={() => navigation.navigate('ServiceAreas' as never)}
              activeOpacity={0.7}
            >
              <View style={styles.settingLeft}>
                <View style={styles.settingIconContainer}>
                  <Ionicons name="construct" size={22} color={colors.primary.main} />
                </View>
                <View style={styles.settingContent}>
                  <Text style={styles.settingTitle}>Hizmet Alanlarım</Text>
                  <Text style={styles.settingSubtitle}>Uzmanlık alanlarını yönet</Text>
                </View>
              </View>
              <View style={styles.chevronContainer}>
                <Ionicons name="chevron-forward" size={18} color={colors.text.tertiary} />
              </View>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.settingItem}
              onPress={() => navigation.navigate('WorkingHours' as never)}
              activeOpacity={0.7}
            >
              <View style={styles.settingLeft}>
                <View style={styles.settingIconContainer}>
                  <Ionicons name="time" size={22} color={colors.primary.main} />
                </View>
                <View style={styles.settingContent}>
                  <Text style={styles.settingTitle}>Çalışma Saatleri</Text>
                  <Text style={styles.settingSubtitle}>Müsaitlik durumunu ayarla</Text>
                </View>
              </View>
              <View style={styles.chevronContainer}>
                <Ionicons name="chevron-forward" size={18} color={colors.text.tertiary} />
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* Destek ve Yardım */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Destek ve Yardım</Text>
          <View style={styles.settingsCard}>
            <TouchableOpacity 
              style={styles.settingItem}
              onPress={() => navigation.navigate('HelpCenter' as never)}
              activeOpacity={0.7}
            >
              <View style={styles.settingLeft}>
                <View style={styles.settingIconContainer}>
                  <Ionicons name="help-circle" size={22} color={colors.primary.main} />
                </View>
                <View style={styles.settingContent}>
                  <Text style={styles.settingTitle}>Yardım Merkezi</Text>
                  <Text style={styles.settingSubtitle}>Sık sorulan sorular</Text>
                </View>
              </View>
              <View style={styles.chevronContainer}>
                <Ionicons name="chevron-forward" size={18} color={colors.text.tertiary} />
              </View>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.settingItem}
              onPress={() => navigation.navigate('Support' as never)}
              activeOpacity={0.7}
            >
              <View style={styles.settingLeft}>
                <View style={styles.settingIconContainer}>
                  <Ionicons name="chatbubble" size={22} color={colors.primary.main} />
                </View>
                <View style={styles.settingContent}>
                  <Text style={styles.settingTitle}>Destek</Text>
                  <Text style={styles.settingSubtitle}>Müşteri hizmetleri ile iletişim</Text>
                </View>
              </View>
              <View style={styles.chevronContainer}>
                <Ionicons name="chevron-forward" size={18} color={colors.text.tertiary} />
              </View>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.settingItem}
              onPress={() => navigation.navigate('About' as never)}
              activeOpacity={0.7}
            >
              <View style={styles.settingLeft}>
                <View style={styles.settingIconContainer}>
                  <Ionicons name="information-circle" size={22} color={colors.primary.main} />
                </View>
                <View style={styles.settingContent}>
                  <Text style={styles.settingTitle}>Hakkında</Text>
                  <Text style={styles.settingSubtitle}>Uygulama versiyonu ve bilgileri</Text>
                </View>
              </View>
              <View style={styles.chevronContainer}>
                <Ionicons name="chevron-forward" size={18} color={colors.text.tertiary} />
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* Çıkış Yap */}
        <View style={styles.section}>
          <TouchableOpacity 
            style={styles.logoutButton} 
            onPress={handleLogout}
            activeOpacity={0.8}
          >
            <View style={styles.logoutButtonContent}>
              <View style={styles.logoutIconContainer}>
                <Ionicons name="log-out-outline" size={22} color="#DC2626" />
              </View>
              <Text style={styles.logoutButtonText}>Çıkış Yap</Text>
            </View>
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
  settingsCard: {
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.xl,
    padding: spacing.sm,
    ...shadows.medium,
    borderWidth: 1,
    borderColor: colors.border.primary,
  },
  settingItem: {
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
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary.main + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  settingContent: {
    flex: 1,
  },
  settingTitle: {
    fontSize: typography.body1.fontSize,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  settingSubtitle: {
    fontSize: typography.caption.large.fontSize,
    color: colors.text.secondary,
    lineHeight: 18,
  },
  switchContainer: {
    paddingLeft: spacing.sm,
  },
  switch: {
    transform: [{ scaleX: 0.9 }, { scaleY: 0.9 }],
  },
  chevronContainer: {
    paddingLeft: spacing.sm,
    paddingRight: spacing.xs,
  },
  logoutButton: {
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    ...shadows.medium,
    borderWidth: 1,
    borderColor: colors.border.primary,
  },
  logoutButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoutIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#DC2626' + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  logoutButtonText: {
    fontSize: typography.body1.fontSize,
    fontWeight: '600',
    color: '#DC2626',
  },
  bottomSpacing: {
    height: spacing.xl * 2,
  },
});
