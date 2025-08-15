import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface StatCard {
  title: string;
  value: string;
  change: string;
  trend: 'up' | 'down' | 'neutral';
  icon: string;
  color: string;
  details?: string[];
  lastUpdate?: string;
}

interface StatCardsProps {
  stats: StatCard[];
}

export const StatCards: React.FC<StatCardsProps> = ({ stats }) => {
  return (
    <View style={styles.container}>
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {stats.map((stat, index) => (
          <View key={index} style={[styles.card, { borderLeftColor: stat.color }]}>
            <View style={styles.cardHeader}>
              <MaterialCommunityIcons name={stat.icon as any} size={24} color={stat.color} />
              <Text style={styles.cardTitle}>{stat.title}</Text>
            </View>
            <Text style={styles.cardValue}>{stat.value}</Text>
            {stat.change && (
              <View style={styles.changeContainer}>
                <MaterialCommunityIcons 
                  name={stat.trend === 'up' ? 'trending-up' : stat.trend === 'down' ? 'trending-down' : 'trending-neutral'} 
                  size={16} 
                  color={stat.trend === 'up' ? '#34C759' : stat.trend === 'down' ? '#FF3B30' : '#8E8E93'} 
                />
                <Text style={[
                  styles.changeText,
                  { color: stat.trend === 'up' ? '#34C759' : stat.trend === 'down' ? '#FF3B30' : '#8E8E93' }
                ]}>
                  {stat.change}
                </Text>
              </View>
            )}
            {stat.details && stat.details.length > 0 && (
              <View style={styles.cardDetails}>
                {stat.details.map((detail, idx) => (
                  <Text key={idx} style={styles.cardDetailText}>{detail}</Text>
                ))}
              </View>
            )}
            {stat.lastUpdate && (
              <Text style={styles.cardLastUpdate}>
                Son güncelleme: {new Date(stat.lastUpdate).toLocaleDateString('tr-TR')}
              </Text>
            )}
          </View>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 24,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  card: {
    width: 200,
    backgroundColor: '#23242a',
    borderRadius: 12,
    padding: 16,
    marginRight: 12,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#F5F7FA',
    marginLeft: 8,
  },
  cardValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#F5F7FA',
    marginBottom: 8,
  },
  changeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  changeText: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
  },
  cardDetails: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  cardDetailText: {
    fontSize: 14,
    color: '#B0B3C6',
    marginBottom: 4,
  },
  cardLastUpdate: {
    fontSize: 12,
    color: '#8E8E93',
    marginTop: 8,
  },
}); 