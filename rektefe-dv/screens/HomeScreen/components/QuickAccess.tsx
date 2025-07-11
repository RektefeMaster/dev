import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export interface QuickAccessCard {
  title: string;
  value: string;
  icon: string;
  color: string;
  lastUpdate?: string;
  isClickable?: boolean;
}

interface QuickAccessProps {
  cards: QuickAccessCard[];
  onCardPress: (card: QuickAccessCard) => void;
}

export const QuickAccess: React.FC<QuickAccessProps> = ({ cards, onCardPress }) => {
  return (
    <View style={styles.container}>
      {cards.map((card, index) => (
        <TouchableOpacity
          key={index}
          style={[
            styles.card,
            card.isClickable && styles.clickableCard,
            { borderLeftColor: card.color }
          ]}
          onPress={() => card.isClickable && onCardPress(card)}
          activeOpacity={card.isClickable ? 0.7 : 1}
          disabled={!card.isClickable}
        >
          <View style={[styles.iconContainer, { backgroundColor: card.color + '20' }]}>
            <MaterialCommunityIcons name={card.icon as any} size={24} color={card.color} />
          </View>
          <View style={styles.contentContainer}>
            <Text style={styles.title}>{card.title}</Text>
            <Text style={styles.value}>{card.value}</Text>
            {card.lastUpdate && (
              <Text style={styles.lastUpdate}>
                Son güncelleme: {new Date(card.lastUpdate).toLocaleDateString('tr-TR')}
              </Text>
            )}
          </View>
          {card.isClickable && (
            <MaterialCommunityIcons 
              name="chevron-right" 
              size={20} 
              color="#666" 
              style={styles.chevron}
            />
          )}
        </TouchableOpacity>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#23242a',
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  clickableCard: {
    backgroundColor: '#2a2b32',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  contentContainer: {
    flex: 1,
  },
  title: {
    fontSize: 14,
    color: '#999',
    marginBottom: 4,
  },
  value: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  lastUpdate: {
    fontSize: 12,
    color: '#666',
  },
  chevron: {
    marginLeft: 8,
  },
}); 