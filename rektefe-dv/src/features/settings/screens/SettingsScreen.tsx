import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  StatusBar,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { RootStackParamList } from '@/navigation/AppNavigator';
import ScreenHeader from '@/shared/components/ScreenHeader';

type SettingsScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Settings'>;

type ThemeMode = 'light' | 'dark' | 'auto';

type ThemeModeSwitchProps = {
  value: ThemeMode;
  onChange: (mode: ThemeMode) => void;
  theme: any;
  isDark: boolean;
};

const THEME_MODE_LABELS: Record<ThemeMode, string> = {
  light: 'Açık',
  dark: 'Koyu',
  auto: 'Otomatik',
};

const ThemeModeSwitch: React.FC<ThemeModeSwitchProps> = ({ value, onChange, theme, isDark }) => {
  const options: ThemeMode[] = ['light', 'dark', 'auto'];
  const animatedIndex = useRef(new Animated.Value(options.indexOf(value))).current;
  const [containerWidth, setContainerWidth] = useState(0);
  const colors = theme.colors;
  const spacing = theme.spacing;
  const borderRadius = theme.borderRadius;

  useEffect(() => {
    Animated.spring(animatedIndex, {
      toValue: options.indexOf(value),
      useNativeDriver: true,
      damping: 18,
      stiffness: 180,
      mass: 0.9,
    }).start();
  }, [animatedIndex, value]);

  const switchStyles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          flexDirection: 'row',
          alignItems: 'center',
          borderRadius: borderRadius.button,
          borderWidth: 1,
          borderColor: colors.border.primary,
          backgroundColor: isDark ? colors.background.tertiary : colors.background.secondary,
          overflow: 'hidden',
          height: 56,
        },
        thumb: {
          position: 'absolute',
          top: 0,
          bottom: 0,
          left: 0,
          borderRadius: borderRadius.button,
          backgroundColor: colors.primary.main,
          shadowColor: colors.shadow.primary,
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: isDark ? 0.35 : 0.25,
          shadowRadius: 12,
          elevation: 4,
        },
        option: {
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          paddingVertical: spacing.sm,
        },
        optionLabel: {
          fontSize: 15,
          fontWeight: '600',
          color: colors.text.primary,
        },
        optionLabelActive: {
          color: colors.text.inverse,
        },
      }),
    [borderRadius, colors, isDark, spacing]
  );

  const segmentWidth = containerWidth > 0 ? containerWidth / options.length : 0;

  const thumbDynamicStyle = {
    width: segmentWidth,
    transform: [
      {
        translateX: animatedIndex.interpolate({
          inputRange: options.map((_, idx) => idx),
          outputRange: options.map((_, idx) => segmentWidth * idx),
        }),
      },
    ],
    opacity: containerWidth === 0 ? 0 : 1,
  };

  return (
    <View
      style={switchStyles.container}
      onLayout={(event) => {
        setContainerWidth(event.nativeEvent.layout.width);
      }}
    >
      <Animated.View style={[switchStyles.thumb, thumbDynamicStyle]} />
      {options.map((option) => {
        const isActive = value === option;
        return (
          <TouchableOpacity
            key={option}
            style={switchStyles.option}
            onPress={() => onChange(option)}
            activeOpacity={0.85}
          >
            <Text
              style={[
                switchStyles.optionLabel,
                isActive && switchStyles.optionLabelActive,
              ]}
            >
              {THEME_MODE_LABELS[option]}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

export default function SettingsScreen() {
  const navigation = useNavigation<SettingsScreenNavigationProp>();
  const { logout } = useAuth();
  const { isDark, themeMode, setThemeMode, theme } = useTheme();
  const styles = useMemo(() => createStyles(theme, isDark), [theme, isDark]);
  const themeColors = theme.colors;

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
      style={styles.settingItem}
      onPress={onPress}
      activeOpacity={0.7}
      disabled={!onPress}
    >
      <View style={styles.settingLeft}>
        <View style={styles.settingIconContainer}>
          <Ionicons
            name={icon as any}
            size={22}
            color={themeColors.primary.main}
          />
        </View>
        <View style={styles.settingContent}>
          <Text style={styles.settingTitle}>
            {title}
          </Text>
          {subtitle && (
            <Text style={styles.settingSubtitle}>
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
            color={themeColors.text.tertiary}
          />
        ))}
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
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
          <Text style={styles.sectionTitle}>Bildirimler</Text>
          <View style={styles.settingsCard}>
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
          <Text style={styles.sectionTitle}>Görünüm</Text>
          <View style={styles.settingsCard}>
            <View style={styles.themeSection}>
              <View style={styles.settingLeft}>
                <View style={styles.settingIconContainer}>
                  <Ionicons
                    name={isDark ? 'moon' : 'sunny'}
                    size={22}
                    color={themeColors.primary.main}
                  />
                </View>
                <View style={styles.settingContent}>
                  <Text style={styles.settingTitle}>
                    Tema
                  </Text>
                  <Text style={styles.settingSubtitle}>
                    Uygulama temasını seçin
                  </Text>
                </View>
              </View>
            </View>
            <View style={styles.themeSwitchContainer}>
              <ThemeModeSwitch
                value={themeMode}
                onChange={handleThemeModeChange}
                theme={theme}
                isDark={isDark}
              />
            </View>
          </View>
        </View>

        {/* Dil */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Dil</Text>
          <View style={styles.settingsCard}>
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
          <Text style={styles.sectionTitle}>Hesap</Text>
          <View style={styles.settingsCard}>
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
          <Text style={styles.sectionTitle}>Yardım ve Destek</Text>
          <View style={styles.settingsCard}>
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
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout} activeOpacity={0.8}>
            <View style={styles.logoutButtonContent}>
              <Ionicons name="log-out-outline" size={22} color={themeColors.error.main} />
              <Text style={styles.logoutButtonText}>
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

const createStyles = (theme: any, isDark: boolean) => {
  const colors = theme.colors;
  const spacing = theme.spacing;
  const borderRadius = theme.borderRadius;
  const shadows = theme.shadows;

  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: isDark ? colors.background.primary : colors.background.secondary,
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
      color: colors.text.primary,
    },
    settingsCard: {
      borderRadius: borderRadius.card,
      overflow: 'hidden',
      backgroundColor: isDark ? colors.background.secondary : colors.background.primary,
      ...shadows.card,
    },
    settingItem: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: spacing.md,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border.primary,
      backgroundColor: 'transparent',
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
      backgroundColor: isDark ? colors.background.tertiary : colors.background.secondary,
    },
    settingContent: {
      flex: 1,
    },
    settingTitle: {
      fontSize: 16,
      fontWeight: '600',
      marginBottom: 2,
      color: colors.text.primary,
    },
    settingSubtitle: {
      fontSize: 13,
      color: isDark ? colors.text.tertiary : colors.text.secondary,
    },
    settingRight: {
      marginLeft: spacing.sm,
    },
    themeSection: {
      padding: spacing.md,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border.primary,
    },
    themeSwitchContainer: {
      padding: spacing.md,
    },
    logoutButton: {
      borderRadius: borderRadius.card,
      padding: spacing.md,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: isDark ? colors.background.secondary : colors.background.primary,
      ...shadows.card,
    },
    logoutButtonContent: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    logoutButtonText: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.error.main,
    },
    bottomSpacing: {
      height: spacing.xxl,
    },
  });
};

