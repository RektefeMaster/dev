import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
  Alert,
  SafeAreaView,
  Animated
} from 'react-native';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import QRCode from 'react-native-qrcode-svg';
import * as FileSystem from 'expo-file-system';
import { API_URL } from '../constants/config';
import Background from '../components/Background';
// @ts-ignore
import * as Sharing from 'expo-sharing';
import AsyncStorage from '@react-native-async-storage/async-storage';

const WalletScreen = ({ navigation }: any) => {
  const [showQR, setShowQR] = useState(false);
  const [qrOpacity] = useState(new Animated.Value(0));
  const [cards, setCards] = useState([
    {
      id: '1',
      cardNumber: '1234 5678 9012 3456',
      cardHolder: 'John Doe',
      expiryDate: '12/25',
      type: 'visa',
    },
  ]);
  const [transactions, setTransactions] = useState([
    { id: '1', title: 'QR Ödeme', date: '12/06/2025', amount: '-45 ₺' },
    { id: '2', title: 'Bakiye Yükleme', date: '10/06/2025', amount: '+100 ₺' },
  ]);
  const [showCardNumbers, setShowCardNumbers] = useState(false);
  const qrRef = useRef<any>(null);

  const handleAddCard = () => {
    Alert.alert('Bilgi', 'Kart ekleme özelliği yakında eklenecek!');
  };

  const handleAddBalance = () => {
    Alert.alert('Bilgi', 'Bakiye yükleme özelliği yakında eklenecek!');
  };

  const handleShowQR = () => {
    setShowQR(true);
    qrOpacity.setValue(0);
    Animated.timing(qrOpacity, { toValue: 1, duration: 300, useNativeDriver: true }).start();
  };

  const handleShareQR = async () => {
    if (qrRef.current) {
      qrRef.current.toDataURL(async (data: string) => {
        const fileUri = FileSystem.cacheDirectory + 'qr.png';
        await FileSystem.writeAsStringAsync(fileUri, data, { encoding: FileSystem.EncodingType.Base64 });
        await Sharing.shareAsync(fileUri);
      });
    }
  };

  return (
    <SafeAreaView style={{flex:1}}>
      <Background>
        <ScrollView style={{flex:1}} contentContainerStyle={{padding: 20, paddingBottom: 100}} showsVerticalScrollIndicator={false}>
          {/* Kartlarım ve Bakiye Yükle Bölümü */}
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>Kartlarım</Text>
            <TouchableOpacity onPress={() => setShowCardNumbers(!showCardNumbers)}>
              <Text style={{ color: '#007AFF', fontWeight: '600', marginBottom: 8 }}>
                {showCardNumbers ? 'Kart Numaralarını Gizle' : 'Kart Numaralarını Göster'}
              </Text>
            </TouchableOpacity>
            {cards.map((card) => (
              <View key={card.id} style={styles.card}>
                <MaterialCommunityIcons
                  name={card.type === 'visa' ? 'credit-card' : 'credit-card-outline'}
                  size={36}
                  color={card.type === 'visa' ? '#1A1F71' : '#888'}
                  style={styles.cardIcon}
                />
                <View style={styles.cardInfo}>
                  <Text style={styles.cardNumber}>
                    {showCardNumbers ? card.cardNumber : '**** **** **** ****'}
                  </Text>
                  <Text style={styles.cardHolder}>{card.cardHolder}</Text>
                  <Text style={styles.expiryDate}>{card.expiryDate}</Text>
                </View>
              </View>
            ))}
            <TouchableOpacity style={styles.addCardButton} onPress={handleAddCard}>
              <MaterialCommunityIcons name="plus-circle" size={28} color="#4c9aff" />
              <Text style={styles.addCardText}>Yeni Kart Ekle</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.loadBalanceButton} onPress={handleAddBalance}>
              <Text style={styles.loadBalanceText}>Bakiye Yükle</Text>
            </TouchableOpacity>
          </View>
          {/* İşlem Geçmişi */}
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>İşlem Geçmişi</Text>
            {transactions.map((item) => (
              <View key={item.id} style={styles.historyItem}>
                <View style={styles.historyLeft}>
                  <Text style={styles.historyTitle}>{item.title}</Text>
                  <Text style={styles.historyDate}>{item.date}</Text>
                </View>
                <View style={styles.historyRight}>
                  <Text style={styles.historyAmount}>{item.amount}</Text>
                </View>
              </View>
            ))}
          </View>
          {/* QR Kod Bölümü */}
          {showQR && (
            <Animated.View style={[styles.qrModal, { opacity: qrOpacity }]}>
              <View style={styles.qrContainer}>
                <QRCode
                  value="REKTEFE_PAYMENT_123456"
                  size={200}
                  backgroundColor="white"
                  getRef={ref => qrRef.current = ref}
                />
                <Text style={styles.qrText}>Ödeme için QR kodu gösterin</Text>
                <View style={{ flexDirection: 'row', marginTop: 12 }}>
                  <TouchableOpacity onPress={handleShareQR} style={styles.closeButton}>
                    <Text style={styles.closeButtonText}>Paylaş</Text>
                  </TouchableOpacity>
                </View>
                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={() => setShowQR(false)}
                >
                  <Text style={styles.closeButtonText}>Kapat</Text>
                </TouchableOpacity>
              </View>
            </Animated.View>
          )}
          <View style={styles.showQRContainer}>
            <TouchableOpacity style={styles.showQRButton} onPress={handleShowQR}>
              <MaterialCommunityIcons name="qrcode-scan" size={28} color="#fff" />
              <Text style={styles.showQRButtonText}>QR ile Öde</Text>
            </TouchableOpacity>
          </View>
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
  tefePointsContainer: {
    padding: 16,
  },
  tefePointsTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#fff',
  },
  tefePointsCard: {
    backgroundColor: '#007AFF',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  tefePointsValue: {
    fontSize: 40,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 6,
  },
  tefePointsInfo: {
    color: '#f5f7fa',
    fontSize: 16,
    fontWeight: '600',
  },
  tefePointsInfoSmall: {
    color: '#f5f7fa',
    fontSize: 14,
    marginTop: 8,
    fontWeight: '400',
  },
  sectionContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 12,
    color: '#fff',
  },
  historyItem: {
    backgroundColor: 'white',
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 7,
  },
  historyLeft: {
    flex: 1,
  },
  historyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#222',
    marginBottom: 4,
  },
  historyDate: {
    fontSize: 14,
    color: '#666',
  },
  historyRight: {
    alignItems: 'flex-end',
  },
  historyAmount: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
    marginBottom: 4,
  },
  historyPoints: {
    fontSize: 14,
    color: '#28a745',
    fontWeight: '700',
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 10,
  },
  cardIcon: {
    marginRight: 16,
  },
  cardInfo: {
    flex: 1,
  },
  cardNumber: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111',
    marginBottom: 4,
  },
  cardHolder: {
    fontSize: 14,
    color: '#555',
    marginBottom: 2,
  },
  expiryDate: {
    fontSize: 14,
    color: '#555',
  },
  addCardButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e6f0ff',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 20,
    marginBottom: 16,
    shadowColor: '#4c9aff',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  addCardText: {
    marginLeft: 12,
    fontSize: 16,
    color: '#4c9aff',
    fontWeight: '600',
  },
  loadBalanceButton: {
    backgroundColor: '#4c9aff',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: '#4c9aff',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 12,
  },
  loadBalanceText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '700',
  },
  qrModal: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  qrContainer: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 28,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 20,
  },
  qrText: {
    marginTop: 20,
    fontSize: 18,
    color: '#333',
    fontWeight: '600',
  },
  closeButton: {
    backgroundColor: '#e6f0ff',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 20,
    marginTop: 12,
    marginHorizontal: 8,
    shadowColor: '#4c9aff',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  closeButtonText: {
    color: '#4c9aff',
    fontSize: 16,
    fontWeight: '600',
  },
  showQRContainer: {
    padding: 16,
    alignItems: 'center',
  },
  showQRButton: {
    flexDirection: 'row',
    backgroundColor: '#007AFF',
    borderRadius: 24,
    paddingVertical: 14,
    paddingHorizontal: 40,
    alignItems: 'center',
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.6,
    shadowRadius: 14,
    elevation: 14,
  },
  showQRButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '700',
    marginLeft: 12,
  },
});

export default WalletScreen;