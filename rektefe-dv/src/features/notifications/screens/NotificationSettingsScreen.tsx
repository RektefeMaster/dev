import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  StatusBar,
  SafeAreaView,
  ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { apiService } from '@/shared/services/api';
import { NotificationService, NotificationSettings } from '../services/notificationService';

const NotificationSettingsScreen = ({ navigation }: any) => {
  const { isDark, colors: themeColors } = useTheme();
  const { user } = useAuth();
  
  const [settings, setSettings] = useState<NotificationSettings>({
    pushNotifications: true,
    appointmentNotifications: true,
    paymentNotifications: true,
    messageNotifications: true,
    systemNotifications: true,
    marketingNotifications: false,
    soundEnabled: true,
    vibrationEnabled: true,
  });
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const response = await apiService.getNotificationSettings();
      
      if (response.success && response.data) {
        setSettings(response.data);
      }
    } catch (error) {
      Alert.alert('Hata', 'Bildirim ayarları yüklenirken bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const updateSetting = async (key: keyof NotificationSettings, value: boolean) => {
    try {
      setSaving(true);
      
      const newSettings = { ...settings, [key]: value };
      setSettings(newSettings);
      
      const response = await apiService.updateNotificationSettings(newSettings);
      
      if (!response.success) {
        // Hata durumunda eski değeri geri yükle
        setSettings(settings);
        Alert.alert('Hata', response.message || 'Ayar güncellenemedi');
      }
    } catch (error) {
      // Hata durumunda eski değeri geri yükle
      setSettings(settings);
      Alert.alert('Hata', 'Ayar güncellenirken bir hata oluştu');
    } finally {
      setSaving(false);
    }
  };

  const sendTestNotification = async () => {
    try {
      await NotificationService.getInstance().sendTestNotification();
      Alert.alert('Başarılı', 'Test bildirimi gönderildi!');
    } catch (error) {
      Alert.alert('Hata', 'Test bildirimi gönderilemedi');
    }
  };

  const renderSettingItem = (
    key: keyof NotificationSettings,
    title: string,
    description: string,
    icon: string,
    disabled?: boolean
  ) => (
    <View style={[
      styles.settingItem,
      { 
        backgroundColor: isDark ? themeColors.background.primary : '#FFFFFF',
        borderBottomColor: isDark ? themeColors.border.tertiary : '#E5E5E5'
      }
    ]}>
      <View style={styles.settingLeft}>
        <View style={[
          styles.settingIcon,
          { backgroundColor: isDark ? themeColors.background.tertiary : '#F5F5F5' }
        ]}>
          <Ionicons 
            name={icon as any} 
            size={20} 
            color={isDark ? themeColors.text.primary : themeColors.text.secondary} 
          />
        </View>
        <View style={styles.settingText}>
          <Text style={[
            styles.settingTitle,
            { color: themeColors.text.primary }
          ]}>
            {title}
          </Text>
          <Text style={[
            styles.settingDescription,
            { color: isDark ? themeColors.text.tertiary : themeColors.text.secondary }
          ]}>
            {description}
          </Text>
        </View>
      </View>
      <Switch
        value={settings[key]}
        onValueChange={(value) => updateSetting(key, value)}
        disabled={disabled || saving}
        trackColor={{ 
          false: isDark ? themeColors.background.tertiary : '#E5E5E5', 
          true: themeColors.primary.main 
        }}
        thumbColor={settings[key] ? '#FFFFFF' : '#FFFFFF'}
      />
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={[
          styles.loadingContainer,
          { backgroundColor: isDark ? themeColors.background.primary : '#FFFFFF' }
        ]}>
          <ActivityIndicator size="large" color={themeColors.primary.main} />
          <Text style={[
            styles.loadingText,
            { color: themeColors.text.primary }
          ]}>
            Ayarlar yükleniyor...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar 
        barStyle={isDark ? 'light-content' : 'dark-content'} 
        backgroundColor="transparent" 
        translucent 
      />
      
      {/* Header */}
      <View style={[
        styles.header,
        { 
          backgroundColor: isDark ? themeColors.background.primary : '#FFFFFF',
          borderBottomColor: isDark ? themeColors.border.tertiary : '#E5E5E5'
        }
      ]}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons 
            name="arrow-back" 
            size={24} 
            color={themeColors.text.primary} 
          />
        </TouchableOpacity>
        
        <Text style={[
          styles.headerTitle,
          { color: themeColors.text.primary }
        ]}>
          Bildirim Ayarları
        </Text>
        
        <View style={styles.headerRight} />
      </View>

      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Genel Ayarlar */}
        <View style={styles.section}>
          <Text style={[
            styles.sectionTitle,
            { color: themeColors.text.primary }
          ]}>
            Genel Ayarlar
          </Text>
          
          {renderSettingItem(
            'pushNotifications',
            'Push Bildirimleri',
            'Tüm push bildirimlerini al',
            'notifications-outline'
          )}
          
          {renderSettingItem(
            'soundEnabled',
            'Ses',
            'Bildirimlerde ses çal',
            'volume-high-outline',
            !settings.pushNotifications
          )}
          
          {renderSettingItem(
            'vibrationEnabled',
            'Titreşim',
            'Bildirimlerde titreşim kullan',
            'phone-portrait-outline',
            !settings.pushNotifications
          )}
        </View>

        {/* Bildirim Türleri */}
        <View style={styles.section}>
          <Text style={[
            styles.sectionTitle,
            { color: themeColors.text.primary }
          ]}>
            Bildirim Türleri
          </Text>
          
          {renderSettingItem(
            'appointmentNotifications',
            'Randevu Bildirimleri',
            'Randevu onayları, iptalleri ve hatırlatmaları',
            'calendar-outline',
            !settings.pushNotifications
          )}
          
          {renderSettingItem(
            'paymentNotifications',
            'Ödeme Bildirimleri',
            'Ödeme onayları ve cüzdan işlemleri',
            'card-outline',
            !settings.pushNotifications
          )}
          
          {renderSettingItem(
            'messageNotifications',
            'Mesaj Bildirimleri',
            'Yeni mesajlar ve sohbet bildirimleri',
            'chatbubble-outline',
            !settings.pushNotifications
          )}
          
          {renderSettingItem(
            'systemNotifications',
            'Sistem Bildirimleri',
            'Uygulama güncellemeleri ve sistem duyuruları',
            'settings-outline',
            !settings.pushNotifications
          )}
          
          {renderSettingItem(
            'marketingNotifications',
            'Pazarlama Bildirimleri',
            'Promosyonlar ve özel teklifler',
            'gift-outline',
            !settings.pushNotifications
          )}
        </View>

        {/* Test Bölümü */}
        <View style={styles.section}>
          <Text style={[
            styles.sectionTitle,
            { color: themeColors.text.primary }
          ]}>
            Test
          </Text>
          
          <TouchableOpacity
            style={[
              styles.testButton,
              { 
                backgroundColor: themeColors.primary.main,
                opacity: saving ? 0.6 : 1
              }
            ]}
            onPress={sendTestNotification}
            disabled={saving}
          >
            <Ionicons name="send-outline" size={20} color="white" />
            <Text style={styles.testButtonText}>
              {saving ? 'Gönderiliyor...' : 'Test Bildirimi Gönder'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Bilgi */}
        <View style={styles.infoSection}>
          <View style={[
            styles.infoCard,
            { backgroundColor: isDark ? themeColors.background.tertiary : '#F8F9FA' }
          ]}>
            <Ionicons 
              name="information-circle-outline" 
              size={20} 
              color={themeColors.primary.main} 
            />
            <Text style={[
              styles.infoText,
              { color: isDark ? themeColors.text.tertiary : themeColors.text.secondary }
            ]}>
              Bildirim ayarlarınız cihazınızın sistem ayarlarından da kontrol edilebilir.
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    fontWeight: '500',
    marginTop: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 8,
    marginRight: 12,
  },
  headerTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
  },
  headerRight: {
    width: 40,
  },
  section: {
    marginTop: 24,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 16,
    marginBottom: 1,
    borderBottomWidth: 1,
  },
  settingLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  settingText: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
  testButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 8,
  },
  testButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  infoSection: {
    marginTop: 32,
    paddingHorizontal: 20,
    marginBottom: 32,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
});

export default NotificationSettingsScreen;
