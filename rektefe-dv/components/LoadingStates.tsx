import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import LottieView from 'lottie-react-native';
import theme from '../theme/theme';
import Typography from './Typography';

const { width: screenWidth } = Dimensions.get('window');

// Loading Spinner Component
export const LoadingSpinner: React.FC<{
  size?: 'small' | 'large';
  color?: string;
  text?: string;
  style?: any;
}> = ({ size = 'large', color = theme.colors.primary.main, text, style }) => {
  return (
    <View style={[styles.spinnerContainer, style]}>
      <ActivityIndicator size={size} color={color} />
      {text && (
        <Typography
          variant="body2"
          color="secondary"
          align="center"
          style={styles.spinnerText}
        >
          {text}
        </Typography>
      )}
    </View>
  );
};

// Skeleton Loading Component
export const Skeleton: React.FC<{
  width?: number | string;
  height?: number;
  borderRadius?: keyof typeof theme.borderRadius;
  style?: any;
}> = ({ width = '100%', height = 20, borderRadius = 'sm', style }) => {
  const animatedValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(animatedValue, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: false,
        }),
        Animated.timing(animatedValue, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: false,
        }),
      ])
    );
    animation.start();

    return () => animation.stop();
  }, []);

  const opacity = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  return (
    <Animated.View
      style={[
        styles.skeleton,
        {
          width,
          height,
          borderRadius: theme.borderRadius[borderRadius],
          opacity,
        },
        style,
      ]}
    />
  );
};

// Skeleton Card Component
export const SkeletonCard: React.FC<{
  variant?: 'default' | 'compact' | 'detailed';
  style?: any;
}> = ({ variant = 'default', style }) => {
  const getSkeletonContent = () => {
    switch (variant) {
      case 'compact':
        return (
          <>
            <Skeleton width="60%" height={16} style={styles.skeletonMargin} />
            <Skeleton width="40%" height={14} />
          </>
        );
      case 'detailed':
        return (
          <>
            <Skeleton width="80%" height={20} style={styles.skeletonMargin} />
            <Skeleton width="60%" height={16} style={styles.skeletonMargin} />
            <Skeleton width="40%" height={14} style={styles.skeletonMargin} />
            <View style={styles.skeletonRow}>
              <Skeleton width="30%" height={12} />
              <Skeleton width="20%" height={12} />
            </View>
          </>
        );
      default:
        return (
          <>
            <Skeleton width="70%" height={18} style={styles.skeletonMargin} />
            <Skeleton width="50%" height={14} />
          </>
        );
    }
  };

  return (
    <View style={[styles.skeletonCard, style]}>
      {getSkeletonContent()}
    </View>
  );
};

// Skeleton List Component
export const SkeletonList: React.FC<{
  count?: number;
  variant?: 'default' | 'compact' | 'detailed';
  style?: any;
}> = ({ count = 3, variant = 'default', style }) => {
  return (
    <View style={[styles.skeletonList, style]}>
      {Array.from({ length: count }).map((_, index) => (
        <SkeletonCard
          key={index}
          variant={variant}
          style={styles.skeletonListItem}
        />
      ))}
    </View>
  );
};

// Empty State Component
export const EmptyState: React.FC<{
  icon?: string;
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  variant?: 'default' | 'compact' | 'illustrated';
  style?: any;
}> = ({ icon = 'inbox-outline', title, subtitle, action, variant = 'default', style }) => {
  const getEmptyStateContent = () => {
    const iconSize = variant === 'illustrated' ? 80 : variant === 'compact' ? 40 : 60;
    const iconColor = theme.colors.text.secondary.light;

    return (
      <View style={[styles.emptyState, style]}>
        <MaterialCommunityIcons
          name={icon as any}
          size={iconSize}
          color={iconColor}
          style={styles.emptyStateIcon}
        />
        
        <Typography
          variant={variant === 'compact' ? 'h6' : 'h5'}
          color="secondary"
          align="center"
          style={styles.emptyStateTitle}
        >
          {title}
        </Typography>
        
        {subtitle && (
          <Typography
            variant="body2"
            color="secondary"
            align="center"
            style={styles.emptyStateSubtitle}
          >
            {subtitle}
          </Typography>
        )}
        
        {action && (
          <View style={styles.emptyStateAction}>
            {action}
          </View>
        )}
      </View>
    );
  };

  return getEmptyStateContent();
};

// Error State Component
export const ErrorState: React.FC<{
  icon?: string;
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  variant?: 'default' | 'compact' | 'illustrated';
  style?: any;
}> = ({ icon = 'alert-circle-outline', title, subtitle, action, variant = 'default', style }) => {
  const getErrorStateContent = () => {
    const iconSize = variant === 'illustrated' ? 80 : variant === 'compact' ? 40 : 60;
    const iconColor = theme.colors.error.main;

    return (
      <View style={[styles.errorState, style]}>
        <MaterialCommunityIcons
          name={icon as any}
          size={iconSize}
          color={iconColor}
          style={styles.errorStateIcon}
        />
        
        <Typography
          variant={variant === 'compact' ? 'h6' : 'h5'}
          color="error"
          align="center"
          style={styles.errorStateTitle}
        >
          {title}
        </Typography>
        
        {subtitle && (
          <Typography
            variant="body2"
            color="secondary"
            align="center"
            style={styles.errorStateSubtitle}
          >
            {subtitle}
          </Typography>
        )}
        
        {action && (
          <View style={styles.errorStateAction}>
            {action}
          </View>
        )}
      </View>
    );
  };

  return getErrorStateContent();
};

// Success State Component
export const SuccessState: React.FC<{
  icon?: string;
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  variant?: 'default' | 'compact' | 'illustrated';
  style?: any;
}> = ({ icon = 'check-circle-outline', title, subtitle, action, variant = 'default', style }) => {
  const getSuccessStateContent = () => {
    const iconSize = variant === 'illustrated' ? 80 : variant === 'compact' ? 40 : 60;
    const iconColor = theme.colors.success.main;

    return (
      <View style={[styles.successState, style]}>
        <MaterialCommunityIcons
          name={icon as any}
          size={iconSize}
          color={iconColor}
          style={styles.successStateIcon}
        />
        
        <Typography
          variant={variant === 'compact' ? 'h6' : 'h5'}
          color="success"
          align="center"
          style={styles.successStateTitle}
        >
          {title}
        </Typography>
        
        {subtitle && (
          <Typography
            variant="body2"
            color="secondary"
            align="center"
            style={styles.successStateSubtitle}
          >
            {subtitle}
          </Typography>
        )}
        
        {action && (
          <View style={styles.successStateAction}>
            {action}
          </View>
        )}
      </View>
    );
  };

  return getSuccessStateContent();
};

// Lottie Loading Component
export const LottieLoading: React.FC<{
  source: any;
  size?: number;
  text?: string;
  style?: any;
}> = ({ source, size = 200, text, style }) => {
  return (
    <View style={[styles.lottieContainer, style]}>
      <LottieView
        source={source}
        autoPlay
        loop
        style={{ width: size, height: size }}
      />
      {text && (
        <Typography
          variant="body2"
          color="secondary"
          align="center"
          style={styles.lottieText}
        >
          {text}
        </Typography>
      )}
    </View>
  );
};

// Pull to Refresh Component
export const PullToRefresh: React.FC<{
  refreshing: boolean;
  onRefresh: () => void;
  children: React.ReactNode;
  style?: any;
}> = ({ refreshing, onRefresh, children, style }) => {
  return (
    <View style={[styles.pullToRefresh, style]}>
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  // Spinner styles
  spinnerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.lg,
  },
  spinnerText: {
    marginTop: theme.spacing.md,
  },

  // Skeleton styles
  skeleton: {
    backgroundColor: theme.colors.background.surface.light,
  },
  skeletonMargin: {
    marginBottom: theme.spacing.sm,
  },
  skeletonCard: {
    backgroundColor: theme.colors.background.elevated.light,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.card,
    marginBottom: theme.spacing.sm,
    ...theme.shadows.xs,
  },
  skeletonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: theme.spacing.sm,
  },
  skeletonList: {
    width: '100%',
  },
  skeletonListItem: {
    marginBottom: theme.spacing.md,
  },

  // Empty state styles
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.xxl,
    minHeight: 300,
  },
  emptyStateIcon: {
    marginBottom: theme.spacing.lg,
    opacity: 0.6,
  },
  emptyStateTitle: {
    marginBottom: theme.spacing.sm,
  },
  emptyStateSubtitle: {
    marginBottom: theme.spacing.lg,
    maxWidth: screenWidth * 0.7,
  },
  emptyStateAction: {
    marginTop: theme.spacing.md,
  },

  // Error state styles
  errorState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.xxl,
    minHeight: 300,
  },
  errorStateIcon: {
    marginBottom: theme.spacing.lg,
    opacity: 0.8,
  },
  errorStateTitle: {
    marginBottom: theme.spacing.sm,
  },
  errorStateSubtitle: {
    marginBottom: theme.spacing.lg,
    maxWidth: screenWidth * 0.7,
  },
  errorStateAction: {
    marginTop: theme.spacing.md,
  },

  // Success state styles
  successState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.xxl,
    minHeight: 300,
  },
  successStateIcon: {
    marginBottom: theme.spacing.lg,
    opacity: 0.8,
  },
  successStateTitle: {
    marginBottom: theme.spacing.sm,
  },
  successStateSubtitle: {
    marginBottom: theme.spacing.lg,
    maxWidth: screenWidth * 0.7,
  },
  successStateAction: {
    marginTop: theme.spacing.md,
  },

  // Lottie styles
  lottieContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.lg,
  },
  lottieText: {
    marginTop: theme.spacing.md,
  },

  // Pull to refresh styles
  pullToRefresh: {
    flex: 1,
  },
});

// Individual components are exported above
