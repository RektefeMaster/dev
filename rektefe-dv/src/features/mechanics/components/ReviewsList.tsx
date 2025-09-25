import React from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator } from 'react-native';
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

  return (
    <View style={styles.container}>
      <Text style={[styles.title, { color: theme.colors.text.primary }]}>
        Değerlendirmeler ({reviews.length})
      </Text>
      
      <FlatList
        data={displayedReviews}
        keyExtractor={(item) => item._id}
        renderItem={({ item }) => <ReviewCard review={item} />}
        showsVerticalScrollIndicator={false}
        scrollEnabled={false}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    margin: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  loadingContainer: {
    padding: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
