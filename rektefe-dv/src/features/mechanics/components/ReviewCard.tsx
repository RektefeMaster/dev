import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { StarRating } from './StarRating';

interface Review {
  _id: string;
  rating: number;
  comment?: string;
  createdAt: string;
  userId: {
    name: string;
    surname: string;
  };
}

interface ReviewCardProps {
  review: Review;
}

export const ReviewCard: React.FC<ReviewCardProps> = ({ review }) => {
  const { theme } = useTheme();

  return (
    <View style={[styles.reviewCard, { backgroundColor: theme.colors.background.card }]}>
      <View style={styles.reviewHeader}>
        <View style={styles.reviewerInfo}>
          <Text style={[styles.reviewerName, { color: theme.colors.text.primary }]}>
            {review.userId.name} {review.userId.surname}
          </Text>
          <Text style={[styles.reviewDate, { color: theme.colors.text.secondary }]}>
            {new Date(review.createdAt).toLocaleDateString('tr-TR')}
          </Text>
        </View>
        <View style={styles.reviewRating}>
          <StarRating rating={review.rating} />
        </View>
      </View>
      {review.comment && (
        <Text style={[styles.reviewComment, { color: theme.colors.text.primary }]}>
          {review.comment}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  reviewCard: {
    padding: 16,
    marginBottom: 12,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  reviewerInfo: {
    flex: 1,
  },
  reviewerName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  reviewDate: {
    fontSize: 14,
  },
  reviewRating: {
    marginLeft: 12,
  },
  reviewComment: {
    fontSize: 14,
    lineHeight: 20,
  },
});
