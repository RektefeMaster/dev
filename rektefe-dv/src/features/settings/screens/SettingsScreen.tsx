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
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { RootStackParamList } from '@/navigation/AppNavigator';
import { spacing, borderRadius } from '@/theme/theme';
import BackButton from '@/shared/components/BackButton';
import ScreenHeader from '@/shared/components/ScreenHeader';

type SettingsScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Settings'>;

export default function SettingsScreen() {
  const navigation = useNavigation<SettingsScreenNavigationProp>();
  const { logout } = useAuth();
  const { isDark, themeMode, setThemeMode, theme } = useTheme();
  const [showLanguageModal, setShowLanguageModal] = useState(false);

  const handleLogout = () => {
    Alert.alert(
      'Çıkış Yap',
      'Hesabınızdan çıkmak istediğinizden emin misiniz?',
      [
        { text: 'İptal', style: 'cancel' },
        { 
          text: 'Çıkış Yap', 
          style: 'destructive',
          onPress: logout 
        }
      ]
    );
  };

  const handleThemeModeChange = (mode: 'light' | 'dark' | 'auto') => {
    setThemeMode(mode);
  };

  const renderSettingItem = (
    icon: string,
    title: string,
    subtitle?: string,
    onPress?: () => void,
    rightElement?: React.ReactNode,
    showChevron = true
  ) => (
    <TouchableOpacity
      style={[
        styles.settingItem,
        {
          backgroundColor: isDark ? theme.colors.background.secondary : '#FFFFFF',
          borderBottomColor: isDark ? theme.colors.border.light : '#E5E5E5',
        }
      ]}
      onPress={onPress}
      activeOpacity={0.7}
      disabled={!onPress}
    >
      <View style={styles.settingLeft}>
        <View
          style={[
            styles.settingIconContainer,
            { backgroundColor: isDark ? theme.colors.background.tertiary : '#F5F5F5' }
          ]}
        >
          <Ionicons
            name={icon as any}
            size={22}
            color={theme.colors.primary.main}
          />
        </View>
        <View style={styles.settingContent}>
          <Text
            style={[
              styles.settingTitle,
              { color: theme.colors.text.primary }
            ]}
          >
            {title}
          </Text>
          {subtitle && (
            <Text
              style={[
                styles.settingSubtitle,
                { color: isDark ? theme.colors.text.tertiary : theme.colors.text.secondary }
              ]}
            >
              {subtitle}
            </Text>
          )}
        </View>
      </View>
      <View style={styles.settingRight}>
        {rightElement || (showChevron && (
          <Ionicons
            name="chevron-forward"
            size={18}
            color={theme.colors.text.tertiary}
          />
        ))}
      </View>
    </TouchableOpacity>
  );

  const renderThemeOption = (mode: 'light' | 'dark' | 'auto', label: string) => (
    <TouchableOpacity
      style={[
        styles.themeOption,
        {
          backgroundColor: themeMode === mode
            ? theme.colors.primary.main
            : isDark
            ? theme.colors.background.secondary
            : '#FFFFFF',
          borderColor: themeMode === mode
            ? theme.colors.primary.main
            : theme.colors.border.primary,
        }
      ]}
      onPress={() => handleThemeModeChange(mode)}
    >
      <Text
        style={[
          styles.themeOptionText,
          {
            color: themeMode === mode
              ? '#FFFFFF'
              : theme.colors.text.primary,
          }
        ]}
      >
        {label}
      </Text>
      {themeMode === mode && (
        <Ionicons name="checkmark" size={20} color="#FFFFFF" />
      )}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView
      style={[
        styles.container,
        { backgroundColor: isDark ? theme.colors.background.primary : '#F2F2F7' }
      ]}
    >
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor="transparent"
        translucent
      />

      {/* Header */}
      <ScreenHeader title="Ayarlar" />

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Bildirim Ayarları */}
        <View style={styles.section}>
          <Text
            style={[
              styles.sectionTitle,
              { color: theme.colors.text.primary }
            ]}
          >
            Bildirimler
          </Text>
          <View
            style={[
              styles.settingsCard,
              {
                backgroundColor: isDark
                  ? theme.colors.background.secondary
                  : '#FFFFFF',
                ...theme.shadows.card,
              }
            ]}
          >
            {renderSettingItem(
              'notifications-outline',
              'Bildirim Ayarları',
              'Bildirim tercihlerini yönet',
              () => navigation.navigate('NotificationSettings')
            )}
          </View>
        </View>

        {/* Görünüm */}
        <View style={styles.section}>
          <Text
            style={[
              styles.sectionTitle,
              { color: theme.colors.text.primary }
            ]}
          >
            Görünüm
          </Text>
          <View
            style={[
              styles.settingsCard,
              {
                backgroundColor: isDark
                  ? theme.colors.background.secondary
                  : '#FFFFFF',
                ...theme.shadows.card,
              }
            ]}
          >
            <View style={styles.themeSection}>
              <View style={styles.settingLeft}>
                <View
                  style={[
                    styles.settingIconContainer,
                    { backgroundColor: isDark ? theme.colors.background.tertiary : '#F5F5F5' }
                  ]}
                >
                  <Ionicons
                    name={isDark ? 'moon' : 'sunny'}
                    size={22}
                    color={theme.colors.primary.main}
                  />
                </View>
                <View style={styles.settingContent}>
                  <Text
                    style={[
                      styles.settingTitle,
                      { color: theme.colors.text.primary }
                    ]}
                  >
                    Tema
                  </Text>
                  <Text
                    style={[
                      styles.settingSubtitle,
                      { color: isDark ? theme.colors.text.tertiary : theme.colors.text.secondary }
                    ]}
                  >
                    Uygulama temasını seçin
                  </Text>
                </View>
              </View>
            </View>
            <View style={styles.themeOptions}>
              {renderThemeOption('light', 'Açık')}
              {renderThemeOption('dark', 'Koyu')}
              {renderThemeOption('auto', 'Otomatik')}
            </View>
          </View>
        </View>

        {/* Dil */}
        <View style={styles.section}>
          <Text
            style={[
              styles.sectionTitle,
              { color: theme.colors.text.primary }
            ]}
          >
            Dil
          </Text>
          <View
            style={[
              styles.settingsCard,
              {
                backgroundColor: isDark
                  ? theme.colors.background.secondary
                  : '#FFFFFF',
                ...theme.shadows.card,
              }
            ]}
          >
            {renderSettingItem(
              'language-outline',
              'Uygulama Dili',
              'Türkçe',
              () => {
                Alert.alert('Dil', 'Dil seçenekleri yakında eklenecek');
              }
            )}
          </View>
        </View>

        {/* Hesap */}
        <View style={styles.section}>
          <Text
            style={[
              styles.sectionTitle,
              { color: theme.colors.text.primary }
            ]}
          >
            Hesap
          </Text>
          <View
            style={[
              styles.settingsCard,
              {
                backgroundColor: isDark
                  ? theme.colors.background.secondary
                  : '#FFFFFF',
                ...theme.shadows.card,
              }
            ]}
          >
            {renderSettingItem(
              'person-outline',
              'Profil',
              'Kişisel bilgileri düzenle',
              () => navigation.navigate('Profile')
            )}
            {renderSettingItem(
              'lock-closed-outline',
              'Şifre Değiştir',
              'Güvenlik ayarları',
              () => navigation.navigate('ChangePassword')
            )}
            {renderSettingItem(
              'trash-outline',
              'Hesabı Sil',
              'Hesabınızı kalıcı olarak silin',
              () => navigation.navigate('DeleteAccount')
            )}
          </View>
        </View>

        {/* Yardım ve Destek */}
        <View style={styles.section}>
          <Text
            style={[
              styles.sectionTitle,
              { color: theme.colors.text.primary }
            ]}
          >
            Yardım ve Destek
          </Text>
          <View
            style={[
              styles.settingsCard,
              {
                backgroundColor: isDark
                  ? theme.colors.background.secondary
                  : '#FFFFFF',
                ...theme.shadows.card,
              }
            ]}
          >
            {renderSettingItem(
              'help-circle-outline',
              'Yardım Merkezi',
              'SSS ve destek',
              () => navigation.navigate('Support')
            )}
            {renderSettingItem(
              'information-circle-outline',
              'Hakkında',
              'Versiyon 1.0.0',
              () => {
                Alert.alert(
                  'Rektefe',
                  'Versiyon: 1.0.0\n\nAraç bakım ve onarım hizmetleri platformu.'
                );
              }
            )}
          </View>
        </View>

        {/* Çıkış Yap */}
        <View style={styles.section}>
          <TouchableOpacity
            style={[
              styles.logoutButton,
              {
                backgroundColor: isDark
                  ? theme.colors.background.secondary
                  : '#FFFFFF',
                ...theme.shadows.card,
              }
            ]}
            onPress={handleLogout}
            activeOpacity={0.8}
          >
            <View style={styles.logoutButtonContent}>
              <Ionicons name="log-out-outline" size={22} color={theme.colors.error.main} />
              <Text
                style={[
                  styles.logoutButtonText,
                  { color: theme.colors.error.main }
                ]}
              >
                Çıkış Yap
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        <View style={styles.bottomSpacing} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.md,
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: spacing.sm,
    marginLeft: spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  settingsCard: {
    borderRadius: borderRadius.card,
    overflow: 'hidden',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  settingContent: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  settingSubtitle: {
    fontSize: 13,
  },
  settingRight: {
    marginLeft: spacing.sm,
  },
  themeSection: {
    padding: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  themeOptions: {
    padding: spacing.md,
    gap: spacing.sm,
  },
  themeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderRadius: borderRadius.button,
    borderWidth: 1,
  },
  themeOptionText: {
    fontSize: 15,
    fontWeight: '500',
  },
  logoutButton: {
    borderRadius: borderRadius.card,
    padding: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoutButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  logoutButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  bottomSpacing: {
    height: spacing.xxl,
  },
});

