import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
  Alert,
  SafeAreaView,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import QRCode from 'react-native-qrcode-svg';
import { API_URL } from '@env';
import Background from '../components/Background';

const WalletScreen = ({ navigation }: any) => {
  const [showQR, setShowQR] = useState(false);
  const [cards, setCards] = useState([
    {
      id: '1',
      cardNumber: '**** **** **** 1234',
      cardHolder: 'John Doe',
      expiryDate: '12/25',
      type: 'visa',
    },
  ]);

  const handleAddCard = () => {
    Alert.alert('Bilgi', 'Kart ekleme özelliği yakında eklenecek!');
  };

  const handleAddBalance = () => {
    Alert.alert('Bilgi', 'Bakiye yükleme özelliği yakında eklenecek!');
  };

  const handleShowQR = () => {
    setShowQR(!showQR);
  };

  return (
    <SafeAreaView style={{flex:1}}>
      <Background>
        <ScrollView style={{flex:1}} contentContainerStyle={{padding: 20, paddingBottom: 100}} showsVerticalScrollIndicator={false}>
          {/* Kartlarım ve Bakiye Yükle Bölümü */}
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>Kartlarım</Text>
            {cards.map((card) => (
              <View key={card.id} style={styles.card}>
                <MaterialCommunityIcons
                  name={card.type === 'visa' ? 'credit-card' : 'credit-card-outline'}
                  size={36}
                  color={card.type === 'visa' ? '#1A1F71' : '#888'}
                  style={styles.cardIcon}
                />
                <View style={styles.cardInfo}>
                  <Text style={styles.cardNumber}>{card.cardNumber}</Text>
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
          {/* QR Kod Bölümü */}
          {showQR && (
            <View style={styles.qrModal}>
              <View style={styles.qrContainer}>
                <QRCode
                  value="REKTEFE_PAYMENT_123456"
                  size={200}
                  backgroundColor="white"
                />
                <Text style={styles.qrText}>Ödeme için QR kodu gösterin</Text>
                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={() => setShowQR(false)}
                >
                  <Text style={styles.closeButtonText}>Kapat</Text>
                </TouchableOpacity>
              </View>
            </View>
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
    marginTop: 24,
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    paddingHorizontal: 36,
    borderRadius: 14,
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 10,
  },
  closeButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
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