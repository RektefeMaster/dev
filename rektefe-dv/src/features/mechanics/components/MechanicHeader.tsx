import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useTheme } from '@/context/ThemeContext';
import { StarRating } from './StarRating';

interface MechanicHeaderProps {
  mechanic: any;
  averageRating: number;
  totalReviews: number;
  onBack: () => void;
}

export const MechanicHeader: React.FC<MechanicHeaderProps> = ({
  mechanic,
  averageRating,
  totalReviews,
  onBack
}) => {
  const { theme } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background.card }]}>
      <TouchableOpacity style={styles.backButton} onPress={onBack}>
        <MaterialCommunityIcons name="arrow-left" size={24} color={theme.colors.text.primary} />
      </TouchableOpacity>
      
      <View style={styles.content}>
        <Image
          source={{ uri: mechanic.avatar || 'https://via.placeholder.com/80' }}
          style={styles.avatar}
        />
        
        <View style={styles.info}>
          <Text style={[styles.name, { color: theme.colors.text.primary }]}>
            {mechanic.name} {mechanic.surname}
          </Text>
          
          {mechanic.shopName && (
            <Text style={[styles.shopName, { color: theme.colors.text.secondary }]}>
              {mechanic.shopName}
            </Text>
          )}
          
          <View style={styles.rating}>
            <StarRating rating={averageRating} />
            <Text style={[styles.ratingText, { color: theme.colors.text.secondary }]}>
              {averageRating.toFixed(1)} ({totalReviews} değerlendirme)
            </Text>
          </View>
          
          <Text style={[styles.location, { color: theme.colors.text.secondary }]}>
            📍 {mechanic.city}
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    paddingTop: 60,
  },
  backButton: {
    position: 'absolute',
    top: 60,
    left: 20,
    zIndex: 1,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginRight: 16,
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 4,
  },
  shopName: {
    fontSize: 16,
    marginBottom: 8,
  },
  rating: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  ratingText: {
    marginLeft: 8,
    fontSize: 14,
  },
  location: {
    fontSize: 14,
  },
});
