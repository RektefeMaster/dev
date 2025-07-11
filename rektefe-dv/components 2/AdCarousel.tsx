import React, { useEffect, useRef, useState } from 'react';
import { View, Text, ScrollView, Image, TouchableOpacity, Modal, StyleSheet, ActivityIndicator, ImageBackground } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export interface CampaignAd {
  id: number;
  title: string;
  image: string;
  shortText: string;
  detailText: string;
  company: string;
  companyLogo?: string;
  validUntil?: string;
}

interface AdCarouselProps {
  token: string;
}

const AdCarousel: React.FC<AdCarouselProps> = ({ token }) => {
  const [ads, setAds] = useState<CampaignAd[]>([]);
  const [loadingAds, setLoadingAds] = useState(false);
  const [activeAd, setActiveAd] = useState(0);
  const [showAdModal, setShowAdModal] = useState(false);
  const [selectedAd, setSelectedAd] = useState<CampaignAd | null>(null);
  const adScrollRef = useRef<ScrollView>(null);

  const fetchAds = async () => {
    setLoadingAds(true);
    try {
      const response = await fetch('http://localhost:3000/ads', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      setAds(data || []);
    } catch (error) {
      setAds([
        {
          id: 1,
          title: 'Ağır Bakımda %10 İndirim!',
          image: 'https://images.unsplash.com/photo-1511918984145-48de785d4c4e?auto=format&fit=crop&w=400&q=80',
          shortText: 'Ağır bakımda %10 indirim! Kaçırma!',
          detailText: "Demir Oto'da 31 Temmuz'a kadar tüm ağır bakım işlemlerinde %10 indirim fırsatı! Hemen randevu al, aracını güvenle teslim et.",
          company: 'Demir Oto',
          companyLogo: '',
          validUntil: '31 Temmuz 2024'
        },
        {
          id: 2,
          title: 'Arkadaşını Getir, 200 TEFE Puan Kazan!',
          image: 'https://images.unsplash.com/photo-1503736334956-4c8f8e92946d?auto=format&fit=crop&w=400&q=80',
          shortText: 'Arkadaşını getir, 200 TEFE puan senin!',
          detailText: 'Bir arkadaşını getir, hem sen hem arkadaşın 200 TEFE puan kazanın! 2.000 TEFE puan ile araç yıkama ücretsiz!',
          company: 'TEFE Club',
          companyLogo: '',
          validUntil: '30 Ağustos 2024'
        },
        {
          id: 3,
          title: 'Fırat Otomotiv Kaporta İndirimi',
          image: 'https://images.unsplash.com/photo-1464983953574-0892a716854b?auto=format&fit=crop&w=400&q=80',
          shortText: 'Kaporta tamirinde indirim!',
          detailText: "Fırat Otomotiv'de kaporta tamirinde %15 indirim fırsatı! Detaylı bilgi ve randevu için hemen tıkla.",
          company: 'Fırat Otomotiv',
          companyLogo: '',
          validUntil: '15 Eylül 2024'
        },
        {
          id: 4,
          title: 'Araç Yıkama Kampanyası',
          image: 'https://images.unsplash.com/photo-1502877338535-766e1452684a?auto=format&fit=crop&w=400&q=80',
          shortText: 'Araç yıkamada 1 alana 1 bedava!',
          detailText: 'Bu ay boyunca araç yıkamada 1 alana 1 bedava kampanyası! Temizliğin keyfini çıkar.',
          company: 'Parlak Oto Yıkama',
          companyLogo: '',
          validUntil: '31 Temmuz 2024'
        }
      ]);
    } finally {
      setLoadingAds(false);
    }
  };

  useEffect(() => {
    if (token) fetchAds();
  }, [token]);

  const renderAdCard = (ad: CampaignAd, idx: number) => (
    <TouchableOpacity
      key={ad.id}
      style={styles.adCard}
      activeOpacity={0.92}
      onPress={() => { setSelectedAd(ad); setShowAdModal(true); }}
    >
      <LinearGradient
        colors={["#23242a", "#181920"]}
        style={styles.adCardShadow}
        start={{ x: 0.1, y: 0.1 }}
        end={{ x: 0.9, y: 0.9 }}
      >
        <Image source={{ uri: ad.image }} style={styles.adImage} />
        <View style={styles.adTextOverlay}>
          <Text style={styles.adShortText}>{ad.shortText}</Text>
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );

  return (
    <View style={styles.adsSection}>
      {loadingAds ? (
        <ActivityIndicator size="large" color="#fff" style={{ marginTop: 40 }} />
      ) : (
        <ScrollView
          ref={adScrollRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.adsScroll}
          contentContainerStyle={styles.adsScrollContent}
          snapToInterval={260}
          decelerationRate="fast"
        >
          {ads.map(renderAdCard)}
        </ScrollView>
      )}
      <Modal
        visible={showAdModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowAdModal(false)}
      >
        <View style={styles.adModalOverlay}>
          <View style={styles.adModalContent}>
            {selectedAd && (
              <>
                <Image source={{ uri: selectedAd.image }} style={styles.adModalImage} />
                <Text style={styles.adModalTitle}>{selectedAd.title}</Text>
                <Text style={styles.adModalCompany}>{selectedAd.company}</Text>
                <Text style={styles.adModalDetail}>{selectedAd.detailText}</Text>
                {selectedAd.validUntil && (
                  <Text style={styles.adModalValid}>Geçerlilik: {selectedAd.validUntil}</Text>
                )}
                <View style={styles.adModalButtonRow}>
                  <TouchableOpacity style={styles.adModalButton}>
                    <Text style={styles.adModalButtonText}>Bilgi Al</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.adModalButton, { backgroundColor: '#34C759' }] }>
                    <Text style={styles.adModalButtonText}>Randevu Al</Text>
                  </TouchableOpacity>
                </View>
                <TouchableOpacity style={styles.adModalClose} onPress={() => setShowAdModal(false)}>
                  <MaterialCommunityIcons name="close" size={28} color="#fff" />
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  adsSection: {
    marginTop: 18,
    marginBottom: 24,
  },
  adsScroll: {
    minHeight: 260,
  },
  adsScrollContent: {
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  adCard: {
    width: 240,
    height: 240,
    borderRadius: 24,
    marginRight: 20,
    overflow: 'hidden',
    backgroundColor: '#23242a',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  adCardShadow: {
    width: '100%',
    height: '100%',
    borderRadius: 24,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  adImage: {
    width: '100%',
    height: '100%',
    borderRadius: 24,
    position: 'absolute',
    top: 0,
    left: 0,
  },
  adTextOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(24,25,32,0.82)',
    padding: 16,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  adShortText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  adModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  adModalContent: {
    width: '88%',
    backgroundColor: '#23242a',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    position: 'relative',
  },
  adModalImage: {
    width: 180,
    height: 180,
    borderRadius: 18,
    marginBottom: 16,
  },
  adModalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 6,
    textAlign: 'center',
  },
  adModalCompany: {
    fontSize: 16,
    color: '#B0B3C6',
    marginBottom: 10,
    textAlign: 'center',
  },
  adModalDetail: {
    fontSize: 15,
    color: '#F5F7FA',
    marginBottom: 10,
    textAlign: 'center',
  },
  adModalValid: {
    fontSize: 13,
    color: '#8E8E93',
    marginBottom: 16,
    textAlign: 'center',
  },
  adModalButtonRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 8,
    marginBottom: 8,
  },
  adModalButton: {
    backgroundColor: '#007AFF',
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 22,
    marginHorizontal: 8,
  },
  adModalButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  adModalClose: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(0,0,0,0.18)',
    borderRadius: 16,
    padding: 4,
  },
});

export default AdCarousel; 