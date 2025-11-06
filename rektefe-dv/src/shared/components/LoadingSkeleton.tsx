import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, ViewStyle, StyleProp } from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { spacing, borderRadius } from '@/theme/theme';

export interface LoadingSkeletonProps {
  variant?: 'card' | 'list' | 'detail' | 'fullscreen';
  style?: StyleProp<ViewStyle>;
  count?: number;
  height?: number;
}

const LoadingSkeleton: React.FC<LoadingSkeletonProps> = ({
  variant = 'fullscreen',
  style,
  count = 1,
  height,
}) => {
  const { theme, isDark } = useTheme();
  const fadeAnim = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 0.3,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [fadeAnim]);

  const styles = createStyles(theme, isDark);

  if (variant === 'fullscreen') {
    return (
      <View style={[styles.fullscreenContainer, style]}>
        <SkeletonItem
          width="80%"
          height={20}
          fadeAnim={fadeAnim}
          theme={theme}
          isDark={isDark}
        />
        <SkeletonItem
          width="60%"
          height={16}
          fadeAnim={fadeAnim}
          theme={theme}
          isDark={isDark}
          style={{ marginTop: spacing.md }}
        />
      </View>
    );
  }

  if (variant === 'card') {
    return (
      <View style={[styles.cardContainer, style]}>
        {Array.from({ length: count }).map((_, index) => (
          <CardSkeleton
            key={index}
            fadeAnim={fadeAnim}
            theme={theme}
            isDark={isDark}
            style={index > 0 ? { marginTop: spacing.md } : undefined}
          />
        ))}
      </View>
    );
  }

  if (variant === 'list') {
    return (
      <View style={[styles.listContainer, style]}>
        {Array.from({ length: count }).map((_, index) => (
          <ListItemSkeleton
            key={index}
            fadeAnim={fadeAnim}
            theme={theme}
            isDark={isDark}
            height={height}
            style={index > 0 ? { marginTop: spacing.sm } : undefined}
          />
        ))}
      </View>
    );
  }

  if (variant === 'detail') {
    return (
      <View style={[styles.detailContainer, style]}>
        <SkeletonItem
          width="100%"
          height={24}
          fadeAnim={fadeAnim}
          theme={theme}
          isDark={isDark}
        />
        <SkeletonItem
          width="70%"
          height={16}
          fadeAnim={fadeAnim}
          theme={theme}
          isDark={isDark}
          style={{ marginTop: spacing.md }}
        />
        <SkeletonItem
          width="100%"
          height={200}
          fadeAnim={fadeAnim}
          theme={theme}
          isDark={isDark}
          style={{ marginTop: spacing.lg, borderRadius: borderRadius.card }}
        />
        <SkeletonItem
          width="90%"
          height={16}
          fadeAnim={fadeAnim}
          theme={theme}
          isDark={isDark}
          style={{ marginTop: spacing.lg }}
        />
        <SkeletonItem
          width="80%"
          height={16}
          fadeAnim={fadeAnim}
          theme={theme}
          isDark={isDark}
          style={{ marginTop: spacing.sm }}
    />
  </View>
);
  }

  return null;
};

interface SkeletonItemProps {
  width: number | string;
  height: number;
  fadeAnim: Animated.Value;
  theme: any;
  isDark: boolean;
  style?: ViewStyle;
}

const SkeletonItem: React.FC<SkeletonItemProps> = ({
  width,
  height,
  fadeAnim,
  theme,
  isDark,
  style,
}) => {
  const styles = createStyles(theme, isDark);
  const widthStyle = typeof width === 'string' 
    ? { width: width as `${number}%` }
    : { width };
    
  return (
    <Animated.View
      style={[
        styles.skeletonItem,
        {
          ...widthStyle,
          height,
          opacity: fadeAnim,
        },
        style,
      ]}
    />
  );
};

const CardSkeleton: React.FC<{
  fadeAnim: Animated.Value;
  theme: any;
  isDark: boolean;
  style?: ViewStyle;
}> = ({ fadeAnim, theme, isDark, style }) => {
  const styles = createStyles(theme, isDark);
  return (
    <Animated.View style={[styles.cardSkeleton, { opacity: fadeAnim }, style]}>
      <SkeletonItem
        width="100%"
        height={180}
        fadeAnim={fadeAnim}
        theme={theme}
        isDark={isDark}
        style={{ borderRadius: borderRadius.card }}
      />
      <SkeletonItem
        width="80%"
        height={20}
        fadeAnim={fadeAnim}
        theme={theme}
        isDark={isDark}
        style={{ marginTop: spacing.md }}
      />
      <SkeletonItem
        width="60%"
        height={16}
        fadeAnim={fadeAnim}
        theme={theme}
        isDark={isDark}
        style={{ marginTop: spacing.sm }}
      />
    </Animated.View>
  );
};

const ListItemSkeleton: React.FC<{
  fadeAnim: Animated.Value;
  theme: any;
  isDark: boolean;
  height?: number;
  style?: ViewStyle;
}> = ({ fadeAnim, theme, isDark, height = 80, style }) => {
  const styles = createStyles(theme, isDark);
  return (
    <Animated.View style={[styles.listItemSkeleton, { opacity: fadeAnim }, style]}>
      <SkeletonItem
        width={60}
        height={60}
        fadeAnim={fadeAnim}
        theme={theme}
        isDark={isDark}
        style={{ borderRadius: borderRadius.avatar }}
      />
      <View style={styles.listItemContent}>
        <SkeletonItem
          width="70%"
          height={16}
          fadeAnim={fadeAnim}
          theme={theme}
          isDark={isDark}
        />
        <SkeletonItem
          width="50%"
          height={14}
          fadeAnim={fadeAnim}
          theme={theme}
          isDark={isDark}
          style={{ marginTop: spacing.sm }}
        />
      </View>
    </Animated.View>
  );
};

const createStyles = (theme: any, isDark: boolean) => {
  // Theme'in shadows özelliğini kontrol et
  const shadows = theme?.shadows || {};
  const cardShadow = shadows.card || {};
  const smallShadow = shadows.small || {};
  
  return StyleSheet.create({
    fullscreenContainer: {
      flex: 1, 
      justifyContent: 'center', 
      alignItems: 'center', 
      padding: spacing.xxl,
    },
    cardContainer: {
      padding: spacing.md,
    },
    listContainer: {
      padding: spacing.md,
    },
    detailContainer: {
      padding: spacing.md,
    },
    skeletonItem: {
      backgroundColor: isDark 
        ? (theme?.colors?.background?.tertiary || '#1C1C1E')
        : (theme?.colors?.background?.secondary || '#F2F2F7'),
      borderRadius: borderRadius.sm,
    },
    cardSkeleton: {
      backgroundColor: theme?.colors?.background?.card || '#FFFFFF',
      borderRadius: borderRadius.card,
      padding: spacing.md,
      ...cardShadow,
    },
    listItemSkeleton: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme?.colors?.background?.card || '#FFFFFF',
      borderRadius: borderRadius.card,
      padding: spacing.md,
      ...smallShadow,
    },
    listItemContent: {
      flex: 1,
      marginLeft: spacing.md,
    },
  });
};

export default LoadingSkeleton; 