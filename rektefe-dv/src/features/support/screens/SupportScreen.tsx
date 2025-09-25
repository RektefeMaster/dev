import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Linking,
  Alert,
  TextInput,
  LayoutAnimation,
  Platform,
  UIManager,
  KeyboardAvoidingView,
  SafeAreaView,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, spacing, borderRadius, shadows, typography } from '@/theme/theme';
import { API_URL } from '@/constants/config';
import faqsData from '../data/faqs.json';
import guidesData from '../data/guides.json';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// Yardımcı render fonksiyonu (üstte tanımlı olmalı)
const renderSupportItem = (
  icon: string,
  title: string,
  subtitle: string,
  onPress: () => void,
  colorHex: string = colors.primary.main
) => (
  <TouchableOpacity style={styles.supportItem} onPress={onPress} activeOpacity={0.7}>
    <View style={[styles.supportIcon, { backgroundColor: colorHex + '20' }]}>
      <Ionicons name={icon as any} size={24} color={colorHex} />
    </View>
    <View style={styles.supportContent}>
      <Text style={styles.supportTitle}>{title}</Text>
      <Text style={styles.supportSubtitle}>{subtitle}</Text>
    </View>
    <Ionicons name="chevron-forward" size={20} color={colors.text.tertiary} />
  </TouchableOpacity>
);

// Veriler JSON dosyalarından geliyor (faqsData, guidesData)

const SupportScreen = () => {
  const [openIndex, setOpenIndex] = useState(-1);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [faqSearch, setFaqSearch] = useState('');
  const [guideSearch, setGuideSearch] = useState('');
  const scrollRef = useRef<ScrollView | null>(null);
  const [faqOffset, setFaqOffset] = useState(0);

  const faqs = (faqsData as { question: string; answer: string }[]).filter(faq =>
    faq.question.toLowerCase().includes(faqSearch.toLowerCase()) ||
    faq.answer.toLowerCase().includes(faqSearch.toLowerCase())
  );
  const guides = (guidesData as { icon: string; title: string; desc: string }[]).filter(g =>
    g.title.toLowerCase().includes(guideSearch.toLowerCase()) ||
    g.desc.toLowerCase().includes(guideSearch.toLowerCase())
  );

  const handleAccordion = (idx: number) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpenIndex(openIndex === idx ? -1 : idx);
  };

  const handleContactSubmit = async () => {
    if (!name.trim() || !email.trim() || !message.trim()) {
      Alert.alert('Hata', 'Lütfen tüm alanları doldurun.');
      return;
    }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      Alert.alert('Hata', 'Geçerli bir e-posta adresi girin.');
      return;
    }
    setSending(true);
    try {
      // Önce mailto ile varsayılan e-posta uygulamasını açalım
      const subject = encodeURIComponent(`Rektefe Destek Talebi - ${name}`);
      const body = encodeURIComponent(`Gönderen: ${name}\nE-posta: ${email}\n\nMesaj:\n${message}`);
      await Linking.openURL(`mailto:rektefly@gmail.com?subject=${subject}&body=${body}`);

      // Opsiyonel: Backend mevcutsa aynı içeriği API'ya iletmeyi deneyin
      try {
        await fetch(`${API_URL}/contact`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, email, message }),
        });
      } catch (e) {
        // Backend yoksa sorun değil, mailto zaten açıldı
      }

      setName(''); setEmail(''); setMessage('');
      Alert.alert('Teşekkürler', 'Mesajınız e-posta uygulamanıza iletildi.');
    } catch (e) {
      Alert.alert('Hata', 'Mesaj gönderilemedi.');
    } finally {
      setSending(false);
    }
  };

  // Destek iletişim aksiyonu
  const handleContactSupport = () => {
    Alert.alert(
      'Destek',
      'Müşteri hizmetleri ile iletişime geçmek istiyor musunuz?',
      [
        { text: 'İptal', style: 'cancel' },
        { text: 'Ara', onPress: () => Linking.openURL('tel:+905060550239') },
        { text: 'E-posta', onPress: () => Linking.openURL('mailto:rektefly@gmail.com') }
      ]
    );
  };

  const handleFAQ = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpenIndex(openIndex === 0 ? -1 : 0);
    setTimeout(() => {
      const y = Math.max(faqOffset - spacing.md, 0);
      scrollRef.current?.scrollTo({ y, animated: true });
    }, 0);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primary.main} />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>Destek</Text>
            <Text style={styles.headerSubtitle}>Size nasıl yardımcı olabiliriz?</Text>
          </View>
        </View>
      </View>

      <ScrollView
        ref={scrollRef}
        style={{ flex: 1 }}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
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
              () => Linking.openURL('https://www.youtube.com/results?search_query=Rektefe%20e%C4%9Fitim'),
              '#8B5CF6'
            )}

            {renderSupportItem(
              'chatbubble',
              'Geri Bildirim',
              'Deneyiminizi bizimle paylaşın',
              () => Linking.openURL('mailto:rektefly@gmail.com?subject=' + encodeURIComponent('Rektefe DV - Geri Bildirim')),
              '#F59E0B'
            )}

            {renderSupportItem(
              'logo-whatsapp',
              'WhatsApp Canlı Destek',
              'Hızlıca WhatsApp üzerinden yazın',
              () => Linking.openURL('https://wa.me/905060550239'),
              '#25D366'
            )}
          </View>
        </View>

        {/* Contact Information */}
        <View style={styles.contactSection}>
          <Text style={styles.sectionTitle}>İletişim Bilgileri</Text>

          <View style={styles.contactCard}>
            <TouchableOpacity style={styles.contactItem} onPress={() => Linking.openURL('tel:+905060550239')} activeOpacity={0.7}>
              <Ionicons name="call" size={20} color={colors.primary.main} />
              <View style={styles.contactInfo}>
                <Text style={styles.contactLabel}>Telefon</Text>
                <Text style={styles.contactValue}>+90 506 055 02 39</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={styles.contactItem} onPress={() => Linking.openURL('mailto:rektefly@gmail.com')} activeOpacity={0.7}>
              <Ionicons name="mail" size={20} color={colors.primary.main} />
              <View style={styles.contactInfo}>
                <Text style={styles.contactLabel}>E-posta</Text>
                <Text style={styles.contactValue}>rektefly@gmail.com</Text>
              </View>
            </TouchableOpacity>

            <View style={styles.contactItem}>
              <Ionicons name="time" size={20} color={colors.primary.main} />
              <View style={styles.contactInfo}>
                <Text style={styles.contactLabel}>Çalışma Saatleri</Text>
                <Text style={styles.contactValue}>Pazartesi - Cuma: 09:00 - 18:00</Text>
              </View>
            </View>
          </View>
        </View>

        {/* FAQ */}
        <View style={styles.faqSection} onLayout={(e) => setFaqOffset(e.nativeEvent.layout.y)}>
          <Text style={styles.sectionTitle}>Sık Sorulan Sorular</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="SSS'de ara..."
            placeholderTextColor={colors.text.tertiary}
            value={faqSearch}
            onChangeText={setFaqSearch}
          />
          <View style={styles.faqCard}>
            {faqs.map((item, idx) => (
              <View key={idx}>
                <TouchableOpacity style={styles.faqItem} onPress={() => handleAccordion(idx)}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                    <MaterialCommunityIcons
                      name={openIndex === idx ? 'minus-circle-outline' : 'plus-circle-outline'}
                      size={22}
                      color={colors.primary.main}
                    />
                    <Text style={[styles.faqQuestion, { marginLeft: spacing.xs }]}>{item.question}</Text>
                  </View>
                  <Ionicons name={openIndex === idx ? 'chevron-up' : 'chevron-down'} size={18} color={colors.text.tertiary} />
                </TouchableOpacity>
                {openIndex === idx && (
                  <View style={styles.faqAnswerBox}>
                    <Text style={styles.faqAnswer}>{item.answer}</Text>
                  </View>
                )}
              </View>
            ))}
          </View>
        </View>

        {/* Guides */}
        <View style={styles.guidesSection}>
          <Text style={styles.sectionTitle}>Kısa Rehberler</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Rehberlerde ara..."
            placeholderTextColor={colors.text.tertiary}
            value={guideSearch}
            onChangeText={setGuideSearch}
          />
          <View style={styles.guidesGrid}>
            {guides.map((g, i) => (
              <View key={i} style={styles.guideBox}>
                <MaterialCommunityIcons name={g.icon as any} size={28} color={colors.primary.main} />
                <Text style={styles.guideTitle}>{g.title}</Text>
                <Text style={styles.guideDesc}>{g.desc}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Contact Form */}
        <View style={styles.contactSection}>
          <Text style={styles.sectionTitle}>Bize Ulaşın</Text>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <View style={styles.formCard}>
              <TextInput
                style={styles.input}
                placeholder="Adınız"
                placeholderTextColor={colors.text.tertiary}
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
              />
              <TextInput
                style={styles.input}
                placeholder="E-posta"
                placeholderTextColor={colors.text.tertiary}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
              {!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) && email.trim() !== '' && (
                <Text style={styles.inputError}>Geçerli bir e-posta adresi girin.</Text>
              )}
              <TextInput
                style={[styles.input, { height: 96, textAlignVertical: 'top' }]}
                placeholder="Mesajınız"
                placeholderTextColor={colors.text.tertiary}
                value={message}
                onChangeText={setMessage}
                multiline
              />
              <TouchableOpacity style={styles.sendButton} onPress={handleContactSubmit} disabled={sending}>
                <Text style={styles.sendButtonText}>{sending ? 'Gönderiliyor...' : 'Gönder'}</Text>
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </View>

        <View style={styles.bottomSpacing} />
      </ScrollView>
    </SafeAreaView>
  );
};

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
  contentContainer: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
  },
  sectionTitle: {
    fontSize: typography.h4.fontSize,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: spacing.md,
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
    color: colors.text.primary,
    marginLeft: spacing.sm,
  },
  quickHelpText: {
    fontSize: typography.body2.fontSize,
    color: colors.text.secondary,
    lineHeight: 20,
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
    borderBottomColor: colors.border.secondary,
  },
  supportIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  supportContent: { flex: 1 },
  supportTitle: {
    fontSize: typography.body1.fontSize,
    fontWeight: '600',
    color: colors.text.primary,
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
  contactCard: { gap: spacing.md },
  contactItem: { flexDirection: 'row', alignItems: 'center' },
  contactInfo: { marginLeft: spacing.sm },
  contactLabel: { fontSize: typography.body2.fontSize, color: colors.text.secondary, marginBottom: spacing.xs },
  contactValue: { fontSize: typography.body1.fontSize, fontWeight: '600', color: colors.text.primary },
  faqSection: {
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    ...shadows.small,
  },
  searchInput: {
    backgroundColor: colors.background.tertiary,
    borderWidth: 1,
    borderColor: colors.border.secondary,
    borderRadius: borderRadius.input,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    color: colors.text.primary,
    marginBottom: spacing.md,
  },
  faqCard: { gap: spacing.sm },
  faqItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.secondary,
  },
  faqQuestion: {
    fontSize: typography.body1.fontSize,
    fontWeight: '600',
    color: colors.text.primary,
    flex: 1,
  },
  faqAnswerBox: { paddingVertical: spacing.sm },
  faqAnswer: { fontSize: typography.body2.fontSize, color: colors.text.secondary, lineHeight: 20 },
  guidesSection: {
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    ...shadows.small,
  },
  guidesGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: spacing.md },
  guideBox: {
    width: '48%',
    backgroundColor: colors.background.card,
    borderRadius: borderRadius.card,
    padding: spacing.md,
    alignItems: 'center',
    ...shadows.small,
  },
  guideTitle: { marginTop: spacing.xs, fontSize: typography.body1.fontSize, fontWeight: '700', color: colors.primary.main },
  guideDesc: { marginTop: spacing.xs, fontSize: typography.body2.fontSize, color: colors.text.secondary, textAlign: 'center' },
  formCard: { backgroundColor: colors.background.card, borderRadius: borderRadius.card, padding: spacing.lg, ...shadows.small },
  input: {
    backgroundColor: colors.background.tertiary,
    borderWidth: 1,
    borderColor: colors.border.secondary,
    borderRadius: borderRadius.input,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    color: colors.text.primary,
    marginBottom: spacing.md,
  },
  inputError: { color: colors.error.main, marginTop: -spacing.sm, marginBottom: spacing.sm },
  sendButton: { backgroundColor: colors.primary.main, borderRadius: borderRadius.button, paddingVertical: spacing.md, alignItems: 'center' },
  sendButtonText: { color: colors.text.inverse, fontSize: 16, fontWeight: '700' },
  bottomSpacing: { height: spacing.xl * 2 },
});

export default SupportScreen;
