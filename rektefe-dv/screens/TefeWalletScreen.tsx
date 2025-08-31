import React, { useState } from 'react';
import Background from '../components/Background';
import { View, Text, StyleSheet, FlatList, SafeAreaView, ScrollView } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { theme } from '../theme/theme';

interface TefeHistoryItem {
  id: string;
  title: string;
  date: string;
  amount: string;
  points: number;
}

const TefeWalletScreen = () => {
  const [tefePoints] = useState(0); // Gerçek TEFE puanı
  const [tefeHistory] = useState<TefeHistoryItem[]>([
    { id: '1', title: 'Genel Bakım', date: '02.06.2025', amount: '0 TL', points: 0 },
    { id: '2', title: 'Araç Yıkama', date: '20.05.2025', amount: '0 TL', points: 0 },
  ]);

  const renderTefeHistoryItem = ({ item }: { item: TefeHistoryItem }) => (
    <View style={styles.historyItem}>
      <View style={styles.historyLeft}>
        <Text style={styles.historyTitle}>{item.title}</Text>
        <Text style={styles.historyDate}>{item.date}</Text>
      </View>
      <View style={styles.historyRight}>
        <Text style={styles.historyAmount}>{item.amount}</Text>
        <Text style={styles.historyPoints}>+{item.points} puan</Text>
      </View>
    </View>
  );

  return (
    <Background>
      <SafeAreaView style={{flex:1}}>
        <ScrollView style={{flex:1}} contentContainerStyle={{padding: 20, paddingBottom: 100}} showsVerticalScrollIndicator={false}>
          {/* TEFE Puanları Bölümü */}
          <View style={styles.tefePointsContainer}>
            <Text style={styles.tefePointsTitle}>TEFE Puanlarım</Text>
            <View style={styles.tefePointsCard}>
              <Text style={styles.tefePointsValue}>{tefePoints}</Text>
              <Text style={styles.tefePointsInfo}>Her alışverişte TEFE puan kazan!</Text>
              <Text style={styles.tefePointsInfoSmall}>Geçmiş işlemlerden kazandığın puanları aşağıda inceleyebilirsin.</Text>
            </View>
          </View>
          {/* TEFE Puan Geçmişi Bölümü */}
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>TEFE Puan Geçmişi</Text>
            <FlatList
              data={tefeHistory}
              keyExtractor={(item) => item.id}
              renderItem={renderTefeHistoryItem}
              scrollEnabled={false}
              contentContainerStyle={{ paddingBottom: 8 }}
            />
          </View>
        </ScrollView>
      </SafeAreaView>
    </Background>
  );
};

const styles = StyleSheet.create({
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
    fontSize: 13,
    color: '#64748B',
    marginBottom: 8,
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
    fontSize: 15,
    fontWeight: '600',
    color: '#D97706',
  },
});

export default TefeWalletScreen; 