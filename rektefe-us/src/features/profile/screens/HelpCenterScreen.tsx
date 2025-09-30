import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  TextInput,
  Linking,
  Alert,
  Modal,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography, spacing, borderRadius, shadows } from '@/shared/theme';
import { BackButton } from '@/shared/components';

interface HelpArticle {
  id: string;
  title: string;
  content: string;
  category: string;
}

export default function HelpCenterScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedArticle, setSelectedArticle] = useState<HelpArticle | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  const categories = [
    { id: 'all', name: 'Tümü', icon: 'list' },
    { id: 'account', name: 'Hesap', icon: 'person' },
    { id: 'services', name: 'Hizmetler', icon: 'construct' },
    { id: 'payments', name: 'Ödemeler', icon: 'card' },
    { id: 'technical', name: 'Teknik', icon: 'settings' },
    { id: 'general', name: 'Genel', icon: 'information-circle' },
  ];

  const helpArticles: HelpArticle[] = [
    // Genel Bilgiler - En başta
    {
      id: '1',
      title: 'Rektefe nedir?',
      content: 'Rektefe, usta ve şöförleri buluşturan güvenilir bir platformdur. Araç sahipleri ihtiyaç duydukları hizmetleri kolayca bulabilir, ustalar ise müşteri portföylerini genişletebilir. Güvenli ödeme sistemi ve kalite garantisi ile hizmet verir.',
      category: 'general'
    },
    {
      id: '2',
      title: 'Güvenlik nasıl sağlanıyor?',
      content: 'Tüm kullanıcılar kimlik doğrulaması yapılır, ödemeler güvenli ödeme sistemleri ile işlenir, konuşmalar şifrelenir ve kişisel verileriniz korunur. Şüpheli aktiviteler anında tespit edilir ve gerekli önlemler alınır.',
      category: 'general'
    },
    {
      id: '3',
      title: 'Müşteri değerlendirmeleri nasıl çalışır?',
      content: 'Her tamamlanan işten sonra müşteriler sizi 1-5 yıldız arasında değerlendirebilir. Bu değerlendirmeler profilinizde görünür ve diğer müşterilerin karar vermesine yardımcı olur.',
      category: 'general'
    },

    // Hesap Yönetimi
    {
      id: '4',
      title: 'Hesabımı nasıl oluştururum?',
      content: 'Rektefe uygulamasını indirdikten sonra "Kayıt Ol" butonuna tıklayın. E-posta adresinizi, telefon numaranızı ve güçlü bir şifre girin. E-posta doğrulama linkine tıklayarak hesabınızı aktifleştirin.',
      category: 'account'
    },
    {
      id: '5',
      title: 'Profil bilgilerimi nasıl güncellerim?',
      content: 'Ana menüden "Profil" sekmesine gidin ve "Profili Düzenle" butonuna tıklayın. Ad, soyad, telefon, şehir ve bio bilgilerinizi güncelleyebilirsiniz. Değişiklikler anında kaydedilir.',
      category: 'account'
    },
    {
      id: '6',
      title: 'Şifremi nasıl değiştiririm?',
      content: 'Ayarlar > Güvenlik > Şifre Değiştir bölümünden mevcut şifrenizi ve yeni şifrenizi girin. Şifreniz en az 6 karakter olmalıdır. Güvenlik için düzenli olarak şifrenizi değiştirmenizi öneririz.',
      category: 'account'
    },
    {
      id: '7',
      title: 'Hesabımı nasıl silerim?',
      content: 'Hesap silme işlemi için müşteri hizmetleri ile iletişime geçmeniz gerekmektedir. E-posta: rektefly@gmail.com veya telefon: 0506 055 02 39 numaralarından bize ulaşabilirsiniz.',
      category: 'account'
    },
    
    // Hizmet Yönetimi
    {
      id: '8',
      title: 'Hizmet alanlarımı nasıl düzenlerim?',
      content: 'Ayarlar > Hesap Yönetimi > Hizmet Alanlarım bölümünden uzmanlık alanlarınızı seçebilirsiniz.\n\nÇEKİCİ HİZMETLERİ:\n- Araç Çekici\n- Yol Yardımı\n- Kaza Çekici\n\nYIKAMA HİZMETLERİ:\n- Otomatik Yıkama\n- El Yıkama\n- İç Temizlik\n- Motor Yıkama\n- Cila ve Wax\n\nLASTİK HİZMETLERİ:\n- Lastik Değişimi\n- Lastik Tamiri\n- Balans Ayarı\n- Rot Ayarı\n- Lastik Montaj\n\nTAMİR BAKIM HİZMETLERİ:\n- Motor Tamiri\n- Fren Sistemi\n- Elektrik Sistemi\n- Klima Sistemi\n- Akü Değişimi\n- Yağ Değişimi\n- Egzoz Sistemi\n- Kaporta Tamiri\n- Cam Değişimi\n- Periyodik Bakım\n\nBu alanlar müşterilerin sizi bulmasını kolaylaştırır.',
      category: 'services'
    },
    {
      id: '9',
      title: 'Çalışma saatlerimi nasıl ayarlarım?',
      content: 'Ayarlar > Hesap Yönetimi > Çalışma Saatleri bölümünden haftanın her günü için çalışma saatlerinizi belirleyebilirsiniz. Müsait olduğunuz saatleri seçin ve "Kapalı" olarak işaretleyebilirsiniz. Bu bilgiler müşterilere gösterilir.',
      category: 'services'
    },
    {
      id: '10',
      title: 'Randevularımı nasıl yönetirim?',
      content: 'Ana ekranda "Randevularım" sekmesinden tüm randevularınızı görüntüleyebilirsiniz. Gelen, Onaylanan, Devam Eden ve Tamamlanan randevuları filtreleyebilir, detaylarını inceleyebilir ve durumlarını güncelleyebilirsiniz.',
      category: 'services'
    },
    {
      id: '11',
      title: 'Otomatik iş kabulü nasıl çalışır?',
      content: 'Ayarlar > İş Ayarları bölümünden "Otomatik İş Kabulü" özelliğini açabilirsiniz. Bu özellik aktif olduğunda, size gelen iş talepleri otomatik olarak kabul edilir. Müsait değilseniz bu özelliği kapatmanızı öneririz.',
      category: 'services'
    },
    
    // Ödeme Sistemi
    {
      id: '12',
      title: 'Ödeme nasıl alırım?',
      content: 'Tamamlanan işler için ödemeler otomatik olarak hesabınıza yatırılır. Ödeme yöntemleri: Banka kartı, Kredi kartı, Havale/EFT. Ödemeler iş tamamlandıktan 24 saat sonra hesabınıza geçer. Cüzdan bölümünden ödeme geçmişinizi takip edebilirsiniz.',
      category: 'payments'
    },
    {
      id: '13',
      title: 'Ödeme geçmişimi nasıl görürüm?',
      content: 'Ana menüden "Cüzdan" sekmesine gidin. Burada tüm gelirlerinizi, harcamalarınızı ve bakiye durumunuzu görebilirsiniz. Filtreleme seçenekleri ile belirli tarih aralıklarını inceleyebilirsiniz.',
      category: 'payments'
    },
    
    // Teknik Destek
    {
      id: '14',
      title: 'Bildirimleri nasıl yönetirim?',
      content: 'Ayarlar > Bildirim Ayarları bölümünden push bildirimleri, e-posta bildirimleri, ses uyarıları ve titreşim ayarlarını düzenleyebilirsiniz. Randevu bildirimleri, ödeme bildirimleri ve sistem bildirimlerini ayrı ayrı kontrol edebilirsiniz.',
      category: 'technical'
    },
    {
      id: '15',
      title: 'Uygulama çöküyor, ne yapmalıyım?',
      content: 'Uygulama çökme sorunları için: 1) Uygulamayı kapatıp yeniden açın, 2) Cihazınızı yeniden başlatın, 3) Uygulamayı güncelleyin, 4) Sorun devam ederse müşteri hizmetleri ile iletişime geçin.',
      category: 'technical'
    },
    {
      id: '16',
      title: 'Konum paylaşımı nasıl çalışır?',
      content: 'Konum paylaşımı, müşterilerin size daha kolay ulaşmasını sağlar. Ayarlar > Gizlilik Ayarları bölümünden konum paylaşımını açabilirsiniz. Konumunuz sadece aktif işler sırasında paylaşılır ve güvenliğiniz korunur.',
      category: 'technical'
    },
    {
      id: '17',
      title: 'Karanlık mod nasıl aktif edilir?',
      content: 'Ayarlar > Uygulama Ayarları bölümünden "Karanlık Mod" seçeneğini açabilirsiniz. Bu özellik göz yorgunluğunu azaltır ve düşük ışıkta daha rahat kullanım sağlar. Ayar değişikliği anında uygulanır.',
      category: 'technical'
    }
  ];

  const filteredArticles = helpArticles.filter(article => {
    const matchesCategory = selectedCategory === 'all' || article.category === selectedCategory;
    const matchesSearch = article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         article.content.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const renderCategoryItem = (category: any) => (
    <TouchableOpacity
      key={category.id}
      style={[
        styles.categoryItem,
        selectedCategory === category.id && styles.selectedCategoryItem
      ]}
      onPress={() => setSelectedCategory(category.id)}
      activeOpacity={0.7}
    >
      <Ionicons 
        name={category.icon as any} 
        size={20} 
        color={selectedCategory === category.id ? colors.primary.main : colors.text.secondary} 
      />
      <Text style={[
        styles.categoryText,
        selectedCategory === category.id && styles.selectedCategoryText
      ]}>
        {category.name}
      </Text>
    </TouchableOpacity>
  );

  const handleArticlePress = (article: HelpArticle) => {
    setSelectedArticle(article);
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
    setSelectedArticle(null);
  };

  const renderArticleItem = (article: HelpArticle) => (
    <TouchableOpacity
      key={article.id}
      style={styles.articleItem}
      onPress={() => handleArticlePress(article)}
      activeOpacity={0.7}
    >
      <View style={styles.articleContent}>
        <Text style={styles.articleTitle}>{article.title}</Text>
        <Text style={styles.articlePreview} numberOfLines={2}>
          {article.content}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.text.tertiary} />
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
              <Text style={styles.headerTitle}>Yardım Merkezi</Text>
              <Text style={styles.headerSubtitle}>Sık sorulan sorular ve rehberler</Text>
            </View>
          </View>
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Arama */}
        <View style={styles.searchContainer}>
          <View style={styles.searchInputContainer}>
            <Ionicons name="search" size={20} color={colors.text.tertiary} />
            <TextInput
              style={styles.searchInput}
              placeholder="Yardım ara..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholderTextColor={colors.text.tertiary}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity
                onPress={() => setSearchQuery('')}
                style={styles.clearButton}
                activeOpacity={0.7}
              >
                <Ionicons name="close-circle" size={20} color={colors.text.tertiary} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Kategoriler */}
        <View style={styles.categoriesContainer}>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoriesScroll}
          >
            {categories.map(renderCategoryItem)}
          </ScrollView>
        </View>

        {/* Makaleler */}
        <View style={styles.articlesContainer}>
          {filteredArticles.length > 0 ? (
            <View style={styles.articlesList}>
              {filteredArticles.map(renderArticleItem)}
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="search" size={48} color={colors.text.tertiary} />
              <Text style={styles.emptyStateTitle}>Sonuç bulunamadı</Text>
              <Text style={styles.emptyStateSubtitle}>
                Arama kriterlerinizi değiştirerek tekrar deneyin
              </Text>
            </View>
          )}
        </View>

        {/* İletişim */}
        <View style={styles.contactContainer}>
          <View style={styles.contactCard}>
            <View style={styles.contactIconContainer}>
              <Ionicons name="chatbubble" size={24} color={colors.primary.main} />
            </View>
            <View style={styles.contactContent}>
              <Text style={styles.contactTitle}>Destek Ekibi ile İletişim</Text>
              <Text style={styles.contactSubtitle}>
                7/24 müşteri hizmetleri desteği
              </Text>
            </View>
            <TouchableOpacity 
              style={styles.contactButton}
              onPress={() => {
                Alert.alert(
                  'Destek',
                  'Müşteri hizmetleri ile iletişime geçmek için:',
                  [
                    { 
                      text: 'E-posta Gönder', 
                      onPress: () => {
                        // E-posta uygulamasını aç
                        Linking.openURL('mailto:rektefly@gmail.com?subject=Rektefe Destek&body=Merhaba, Rektefe uygulaması ile ilgili bir sorunum var.');
                      }
                    },
                    { 
                      text: 'Telefon Ara', 
                      onPress: () => {
                        // Telefon uygulamasını aç
                        Linking.openURL('tel:05060550239');
                      }
                    },
                    { text: 'İptal', style: 'cancel' }
                  ]
                );
              }}
            >
              <Text style={styles.contactButtonText}>İletişime Geç</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Alt Boşluk */}
        <View style={styles.bottomSpacing} />
      </ScrollView>

      {/* Makale Detay Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={closeModal}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={closeModal}
              activeOpacity={0.7}
            >
              <Ionicons name="close" size={24} color={colors.text.primary} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Yardım</Text>
            <View style={styles.placeholder} />
          </View>
          
          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            {selectedArticle && (
              <>
                <Text style={styles.modalArticleTitle}>{selectedArticle.title}</Text>
                <Text style={styles.modalArticleContent}>{selectedArticle.content}</Text>
              </>
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>
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
  searchContainer: {
    marginBottom: spacing.xl,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border.secondary,
  },
  searchInput: {
    flex: 1,
    marginLeft: spacing.sm,
    fontSize: typography.body1.fontSize,
    color: colors.text.primary,
  },
  clearButton: {
    padding: spacing.xs,
  },
  categoriesContainer: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    fontSize: typography.h4.fontSize,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: spacing.md,
    paddingHorizontal: spacing.xs,
  },
  categoriesScroll: {
    paddingHorizontal: spacing.xs,
  },
  categoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginRight: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border.secondary,
  },
  selectedCategoryItem: {
    backgroundColor: colors.primary.main + '15',
    borderColor: colors.primary.main,
  },
  categoryText: {
    fontSize: typography.body2.fontSize,
    fontWeight: '500',
    color: colors.text.secondary,
    marginLeft: spacing.sm,
  },
  selectedCategoryText: {
    color: colors.primary.main,
  },
  articlesContainer: {
    marginBottom: spacing.xl,
  },
  articlesList: {
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.xl,
    padding: spacing.sm,
    ...shadows.medium,
    borderWidth: 1,
    borderColor: colors.border.primary,
  },
  articleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.xl,
    marginVertical: spacing.xs,
    backgroundColor: colors.background.secondary,
    ...shadows.medium,
    borderWidth: 1,
    borderColor: colors.border.primary,
  },
  articleContent: {
    flex: 1,
    marginRight: spacing.md,
  },
  articleTitle: {
    fontSize: typography.body1.fontSize,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: spacing.xs,
    lineHeight: 22,
  },
  articlePreview: {
    fontSize: typography.body2.fontSize,
    color: colors.text.secondary,
    lineHeight: 20,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing.xl * 2,
  },
  emptyStateTitle: {
    fontSize: typography.h4.fontSize,
    fontWeight: '600',
    color: colors.text.primary,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  emptyStateSubtitle: {
    fontSize: typography.body2.fontSize,
    color: colors.text.secondary,
    textAlign: 'center',
    paddingHorizontal: spacing.lg,
  },
  contactContainer: {
    marginBottom: spacing.xl,
  },
  contactCard: {
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    ...shadows.medium,
    borderWidth: 1,
    borderColor: colors.border.primary,
  },
  contactIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary.main + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  contactContent: {
    flex: 1,
  },
  contactTitle: {
    fontSize: typography.body1.fontSize,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  contactSubtitle: {
    fontSize: typography.caption.large.fontSize,
    color: colors.text.secondary,
  },
  contactButton: {
    backgroundColor: colors.primary.main,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  contactButtonText: {
    fontSize: typography.body2.fontSize,
    fontWeight: '600',
    color: colors.text.inverse,
  },
  bottomSpacing: {
    height: spacing.xl * 2,
  },
  // Modal Styles
  modalContainer: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.secondary,
    backgroundColor: colors.background.secondary,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.background.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.small,
  },
  modalTitle: {
    fontSize: typography.h3.fontSize,
    fontWeight: '600',
    color: colors.text.primary,
  },
  placeholder: {
    width: 40,
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  modalArticleTitle: {
    fontSize: typography.h2.fontSize,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: spacing.lg,
    lineHeight: 32,
  },
  modalArticleContent: {
    fontSize: typography.body1.fontSize,
    color: colors.text.secondary,
    lineHeight: 24,
    marginBottom: spacing.xl,
  },
});

