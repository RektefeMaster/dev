import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useTheme } from '@/context/ThemeContext';
import { ReviewCard } from './ReviewCard';

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

interface ReviewsListProps {
  reviews: Review[];
  showAllReviews: boolean;
  onToggleShowAll: () => void;
  onRefresh: () => void;
  loading: boolean;
}

export const ReviewsList: React.FC<ReviewsListProps> = ({
  reviews,
  showAllReviews,
  onToggleShowAll,
  onRefresh,
  loading
}) => {
  const { theme } = useTheme();

  const displayedReviews = showAllReviews ? reviews : reviews.slice(0, 3);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary.main} />
      </View>
    );
  }

  if (reviews.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={[styles.title, { color: theme.colors.text.primary }]}>
          Değerlendirmeler (0)
        </Text>
        <View style={styles.emptyState}>
          <MaterialCommunityIcons name="comment-outline" size={48} color={theme.colors.text.tertiary} />
          <Text style={[styles.emptyText, { color: theme.colors.text.tertiary }]}>
            Henüz değerlendirme bulunmuyor
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.colors.text.primary }]}>
          Değerlendirmeler ({reviews.length})
        </Text>
        
        {reviews.length > 3 && (
          <TouchableOpacity onPress={onToggleShowAll} style={styles.showMoreButton}>
            <Text style={[styles.showMoreText, { color: theme.colors.primary.main }]}>
              {showAllReviews ? 'Daha Az Göster' : 'Tümünü Gör'}
            </Text>
            <MaterialCommunityIcons 
              name={showAllReviews ? "chevron-up" : "chevron-down"} 
              size={16} 
              color={theme.colors.primary.main} 
            />
          </TouchableOpacity>
        )}
      </View>
      
      {displayedReviews.map((review) => (
        <ReviewCard key={review._id} review={review} />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    margin: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
  },
  showMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  showMoreText: {
    fontSize: 14,
    fontWeight: '500',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    marginTop: 12,
    textAlign: 'center',
  },
  loadingContainer: {
    padding: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
