import React from 'react';
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
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { colors, spacing, borderRadius, shadows, typography } from '../theme/theme';
import { BackButton } from '../components';
import { useAuth } from '../context/AuthContext';
import { DrawerNavigationProp } from '@react-navigation/drawer';
import { DrawerParamList } from '../types/common';

type SupportScreenNavigationProp = DrawerNavigationProp<DrawerParamList, 'Support'>;

export default function SupportScreen() {
  const navigation = useNavigation<SupportScreenNavigationProp>();
  const { user } = useAuth();

  const handleContactSupport = () => {
    Alert.alert(
      'Destek',
      'Müşteri hizmetleri ile iletişime geçmek istiyor musunuz?',
      [
        { text: 'İptal', style: 'cancel' },
        { text: 'Ara', onPress: () => Linking.openURL('tel:+905551234567') },
        { text: 'E-posta', onPress: () => Linking.openURL('mailto:destek@rektefe.com') }
      ]
    );
  };

  const handleFAQ = () => {
    Alert.alert('SSS', 'Sık sorulan sorular yakında eklenecek');
  };

  const handleTutorial = () => {
    Alert.alert('Eğitim', 'Uygulama eğitim videoları yakında eklenecek');
  };

  const handleFeedback = () => {
    Alert.alert('Geri Bildirim', 'Geri bildirim formu yakında eklenecek');
  };

  const renderSupportItem = (
    icon: string,
    title: string,
    subtitle: string,
    onPress: () => void,
    color: string = colors.primary.main
  ) => (
    <TouchableOpacity
      style={styles.supportItem}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={[styles.supportIcon, { backgroundColor: color + '20' }]}>
        <Ionicons name={icon as any} size={24} color={color} />
      </View>
      
      <View style={styles.supportContent}>
        <Text style={styles.supportTitle}>{title}</Text>
        <Text style={styles.supportSubtitle}>{subtitle}</Text>
      </View>
      
      <Ionicons name="chevron-forward" size={20} color={colors.text.tertiary} />
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
            <Text style={styles.headerTitle}>Destek</Text>
            <Text style={styles.headerSubtitle}>Size nasıl yardımcı olabiliriz?</Text>
          </View>
        </View>
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.contentContainer}
      >
        {/* Quick Help Section */}
        <View style={styles.quickHelpSection}>
          <Text style={styles.sectionTitle}>Hızlı Yardım</Text>
          
          <View style={styles.quickHelpCard}>
            <View style={styles.quickHelpHeader}>
              <Ionicons name="help-circle" size={24} color={colors.primary.main} />
              <Text style={styles.quickHelpTitle}>Yardıma mı ihtiyacınız var?</Text>
            </View>
            <Text style={styles.quickHelpText}>
              Uygulama ile ilgili herhangi bir sorun yaşıyorsanız, aşağıdaki seçeneklerden birini kullanarak bizimle iletişime geçebilirsiniz.
            </Text>
          </View>
        </View>

        {/* Support Options */}
        <View style={styles.supportSection}>
          <Text style={styles.sectionTitle}>Destek Seçenekleri</Text>
          
          <View style={styles.supportCard}>
            {renderSupportItem(
              'call',
              'Müşteri Hizmetleri',
              'Telefon veya e-posta ile destek alın',
              handleContactSupport,
              '#10B981'
            )}
            
            {renderSupportItem(
              'help-circle',
              'Sık Sorulan Sorular',
              'Yaygın sorular ve cevapları',
              handleFAQ,
              '#3B82F6'
            )}
            
            {renderSupportItem(
              'play-circle',
              'Eğitim Videoları',
              'Uygulama kullanım rehberi',
              handleTutorial,
              '#8B5CF6'
            )}
            
            {renderSupportItem(
              'chatbubble',
              'Geri Bildirim',
              'Deneyiminizi bizimle paylaşın',
              handleFeedback,
              '#F59E0B'
            )}
          </View>
        </View>

        {/* Contact Information */}
        <View style={styles.contactSection}>
          <Text style={styles.sectionTitle}>İletişim Bilgileri</Text>
          
          <View style={styles.contactCard}>
            <View style={styles.contactItem}>
              <Ionicons name="call" size={20} color={colors.primary.main} />
              <View style={styles.contactInfo}>
                <Text style={styles.contactLabel}>Telefon</Text>
                <Text style={styles.contactValue}>+90 555 123 45 67</Text>
              </View>
            </View>
            
            <View style={styles.contactItem}>
              <Ionicons name="mail" size={20} color={colors.primary.main} />
              <View style={styles.contactInfo}>
                <Text style={styles.contactLabel}>E-posta</Text>
                <Text style={styles.contactValue}>destek@rektefe.com</Text>
              </View>
            </View>
            
            <View style={styles.contactItem}>
              <Ionicons name="time" size={20} color={colors.primary.main} />
              <View style={styles.contactInfo}>
                <Text style={styles.contactLabel}>Çalışma Saatleri</Text>
                <Text style={styles.contactValue}>Pazartesi - Cuma: 09:00 - 18:00</Text>
              </View>
            </View>
          </View>
        </View>

        {/* FAQ Preview */}
        <View style={styles.faqSection}>
          <Text style={styles.sectionTitle}>Sık Sorulan Sorular</Text>
          
          <View style={styles.faqCard}>
            <TouchableOpacity style={styles.faqItem} onPress={handleFAQ}>
              <Text style={styles.faqQuestion}>Uygulamayı nasıl kullanabilirim?</Text>
              <Ionicons name="chevron-down" size={20} color={colors.text.tertiary} />
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.faqItem} onPress={handleFAQ}>
              <Text style={styles.faqQuestion}>Ödeme nasıl yapılır?</Text>
              <Ionicons name="chevron-down" size={20} color={colors.text.tertiary} />
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.faqItem} onPress={handleFAQ}>
              <Text style={styles.faqQuestion}>Randevu nasıl iptal edilir?</Text>
              <Ionicons name="chevron-down" size={20} color={colors.text.tertiary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Bottom Spacing */}
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
  },
  contentContainer: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
  },
  quickHelpSection: {
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    ...shadows.small,
  },
  quickHelpCard: {
    marginTop: spacing.md,
  },
  quickHelpHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  quickHelpTitle: {
    fontSize: typography.h4.fontSize,
    fontWeight: '700',
    color: colors.text.primary.main,
    marginLeft: spacing.sm,
  },
  quickHelpText: {
    fontSize: typography.body2.fontSize,
    color: colors.text.secondary,
    lineHeight: 20,
  },
  sectionTitle: {
    fontSize: typography.h4.fontSize,
    fontWeight: '700',
    color: colors.text.primary.main,
    marginBottom: spacing.md,
  },
  supportSection: {
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    ...shadows.small,
  },
  supportCard: {
    gap: spacing.md,
  },
  supportItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.primary,
  },
  supportIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  supportContent: {
    flex: 1,
  },
  supportTitle: {
    fontSize: typography.body1.fontSize,
    fontWeight: '600',
    color: colors.text.primary.main,
    marginBottom: spacing.xs,
  },
  supportSubtitle: {
    fontSize: typography.body2.fontSize,
    color: colors.text.secondary,
    lineHeight: 18,
  },
  contactSection: {
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    ...shadows.small,
  },
  contactCard: {
    gap: spacing.md,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  contactInfo: {
    marginLeft: spacing.sm,
  },
  contactLabel: {
    fontSize: typography.body2.fontSize,
    color: colors.text.secondary,
    marginBottom: spacing.xs,
  },
  contactValue: {
    fontSize: typography.body1.fontSize,
    fontWeight: '600',
    color: colors.text.primary.main,
  },
  faqSection: {
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    ...shadows.small,
  },
  faqCard: {
    gap: spacing.sm,
  },
  faqItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.primary,
  },
  faqQuestion: {
    fontSize: typography.body1.fontSize,
    fontWeight: '600',
    color: colors.text.primary.main,
    flex: 1,
  },
  bottomSpacing: {
    height: spacing.xl * 2,
  },
});
