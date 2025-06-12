import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking, LayoutAnimation, Platform, UIManager, SafeAreaView, TextInput, Alert } from 'react-native';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import faqsData from './faqs.json';
import guidesData from './guides.json';
import { API_URL } from '@env';
import Background from '../components/Background';
import LottieView from 'lottie-react-native';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const FAQS = [
  {
    question: 'Nasıl araç eklerim?',
    answer: 'Garaj sekmesine gidip "Araç Ekle" butonuna tıklayarak aracınızı ekleyebilirsiniz.'
  },
  {
    question: 'TEFE puanları nedir?',
    answer: 'TEFE puanları, uygulama içi işlemlerden kazandığınız ödül puanlarıdır. Profilinizde görüntüleyebilir ve avantajlardan yararlanabilirsiniz.'
  },
  {
    question: 'Favori aracımı nasıl değiştiririm?',
    answer: 'Garajınızdaki araçlardan birine yıldız ikonuna tıklayarak favori aracınızı değiştirebilirsiniz.'
  },
  {
    question: 'QR ile ödeme nasıl yapılır?',
    answer: 'Cüzdan sekmesinden "QR ile Öde" butonuna tıklayarak ödeme işlemini başlatabilirsiniz.'
  },
  {
    question: 'Profilimi nasıl düzenlerim?',
    answer: 'Profil sekmesinde "Profili Düzenle" butonuna tıklayarak bilgilerinizi güncelleyebilirsiniz.'
  },
];

const GUIDES = [
  {
    icon: 'car',
    title: 'Garaj Yönetimi',
    desc: 'Araç ekle, sil, favori seç. Tüm araçlarını kolayca yönet.'
  },
  {
    icon: 'wallet',
    title: 'Cüzdan & Ödeme',
    desc: 'Bakiye görüntüle, QR ile ödeme yap, kart ekle.'
  },
  {
    icon: 'account-edit',
    title: 'Profil & Sosyal',
    desc: 'Profilini düzenle, gönderi paylaş, sosyal özellikleri keşfet.'
  },
  {
    icon: 'star-circle',
    title: 'TEFE Puanları',
    desc: 'Puan kazan, avantajlardan yararlan, ödülleri takip et.'
  },
];

const SupportScreen = () => {
  const [openIndex, setOpenIndex] = useState(-1);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [faqSearch, setFaqSearch] = useState('');
  const [guideSearch, setGuideSearch] = useState('');
  const [loading, setLoading] = useState(false);

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
    // Basit e-posta kontrolü
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      Alert.alert('Hata', 'Geçerli bir e-posta adresi girin.');
      return;
    }
    setSending(true);
    try {
      // Şimdilik sadece console.log, backend endpointi eklenince fetch/axios ile gönderilecek
      console.log('İletişim formu:', { name, email, message });
      setName(''); setEmail(''); setMessage('');
      Alert.alert('Teşekkürler', 'Mesajınız başarıyla gönderildi!');
    } catch (e) {
      Alert.alert('Hata', 'Mesaj gönderilemedi.');
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={{flex:1, justifyContent:'center', alignItems:'center', backgroundColor:'transparent'}}>
        <LottieView
          source={require('../assets/loading.json')}
          autoPlay
          loop
          style={{ width: 120, height: 120 }}
        />
        <Text style={{color:'#fff', marginTop:16, fontSize:16}}>Yükleniyor...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{flex:1}}>
      <Background>
        <ScrollView style={{flex:1}} contentContainerStyle={{padding: 20, paddingBottom: 100}} showsVerticalScrollIndicator={false}>
          <Text style={styles.title}>Destek & Yardım</Text>
          <Text style={styles.subtitle}>Sık Sorulan Sorular</Text>
          <TextInput
            style={styles.input}
            placeholder="SSS'de ara..."
            value={faqSearch}
            onChangeText={setFaqSearch}
          />
          <View style={styles.accordionContainer}>
            {faqs.map((item, idx) => (
              <View key={idx} style={styles.accordionItem}>
                <TouchableOpacity style={styles.accordionHeader} onPress={() => handleAccordion(idx)}>
                  <MaterialCommunityIcons name={openIndex === idx ? 'chevron-down' : 'chevron-right'} size={24} color="#007AFF" />
                  <Text style={styles.accordionQuestion}>{item.question}</Text>
                </TouchableOpacity>
                {openIndex === idx && (
                  <View style={styles.accordionBody}>
                    <Text style={styles.accordionAnswer}>{item.answer}</Text>
                  </View>
                )}
              </View>
            ))}
          </View>

          <Text style={styles.subtitle}>Kısa Rehberler</Text>
          <TextInput
            style={styles.input}
            placeholder="Rehberlerde ara..."
            value={guideSearch}
            onChangeText={setGuideSearch}
          />
          <View style={styles.guidesRow}>
            {guides.map((g, i) => (
              <View key={i} style={styles.guideBox}>
                <MaterialCommunityIcons name={g.icon as any} size={32} color="#007AFF" style={{ marginBottom: 8 }} />
                <Text style={styles.guideTitle}>{g.title}</Text>
                <Text style={styles.guideDesc}>{g.desc}</Text>
              </View>
            ))}
          </View>

          <Text style={styles.subtitle}>Bize Ulaşın</Text>
          <View style={styles.contactFormBox}>
            <TextInput
              style={styles.input}
              placeholder="Adınız"
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
            />
            <TextInput
              style={styles.input}
              placeholder="E-posta"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <TextInput
              style={[styles.input, { height: 80 }]}
              placeholder="Mesajınız"
              value={message}
              onChangeText={setMessage}
              multiline
            />
            <TouchableOpacity style={styles.sendButton} onPress={handleContactSubmit} disabled={sending}>
              <Text style={styles.sendButtonText}>{sending ? 'Gönderiliyor...' : 'Gönder'}</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.contactRow}>
            <TouchableOpacity style={styles.contactButton} onPress={() => Linking.openURL('mailto:destek@rektefe.com')}>
              <Ionicons name="mail" size={22} color="#fff" />
              <Text style={styles.contactButtonText}>E-posta Gönder</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.contactButton} onPress={() => Linking.openURL('tel:05060550239')}>
              <Ionicons name="call" size={22} color="#fff" />
              <Text style={styles.contactButtonText}>Ara</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.subtitle}>Canlı Destek</Text>
          <TouchableOpacity style={styles.liveButton} onPress={() => Linking.openURL('https://wa.me/905555555555')}>
            <MaterialCommunityIcons name="whatsapp" size={24} color="#fff" />
            <Text style={styles.liveButtonText}>WhatsApp ile Canlı Destek</Text>
          </TouchableOpacity>
        </ScrollView>
      </Background>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f5f7fa',
  },
  container: {
    flex: 1,
    backgroundColor: '#f5f7fa',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 16,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#f5f7fa',
    marginTop: 24,
    marginBottom: 12,
  },
  accordionContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    marginBottom: 16,
    padding: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 4,
  },
  accordionItem: {
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  accordionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  accordionQuestion: {
    fontSize: 16,
    fontWeight: '600',
    color: '#222',
    marginLeft: 8,
  },
  accordionBody: {
    paddingLeft: 32,
    paddingBottom: 12,
  },
  accordionAnswer: {
    fontSize: 15,
    color: '#444',
  },
  guidesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  guideBox: {
    width: '47%',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 4,
  },
  guideTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#007AFF',
    marginBottom: 4,
    textAlign: 'center',
  },
  guideDesc: {
    fontSize: 13,
    color: '#f5f7fa',
    textAlign: 'center',
  },
  contactRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  contactButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007AFF',
    padding: 14,
    borderRadius: 12,
    marginHorizontal: 4,
    justifyContent: 'center',
  },
  contactButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    marginLeft: 8,
    fontSize: 15,
  },
  liveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#25D366',
    padding: 16,
    borderRadius: 14,
    justifyContent: 'center',
    marginBottom: 32,
  },
  liveButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    marginLeft: 10,
    fontSize: 16,
  },
  contactFormBox: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 4,
  },
  input: {
    backgroundColor: '#f5f7fa',
    borderRadius: 8,
    padding: 14,
    fontSize: 15,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e1e4e8',
  },
  sendButton: {
    backgroundColor: '#007AFF',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  sendButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
});

export default SupportScreen; 