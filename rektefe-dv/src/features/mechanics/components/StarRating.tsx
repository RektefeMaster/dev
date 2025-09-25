import React from 'react';
import { View, StyleSheet } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

interface StarRatingProps {
  rating: number;
  size?: number;
  activeColor?: string;
  inactiveColor?: string;
}

export const StarRating: React.FC<StarRatingProps> = ({
  rating,
  size = 16,
  activeColor = '#F59E0B',
  inactiveColor = '#D1D5DB'
}) => {
  return (
    <View style={styles.starsRow}>
      {[1, 2, 3, 4, 5].map((star) => (
        <MaterialCommunityIcons
          key={star}
          name={star <= rating ? 'star' : 'star-outline'}
          size={size}
          color={star <= rating ? activeColor : inactiveColor}
        />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  starsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
