import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ViewStyle,
  Animated,
  TouchableOpacity,
  Dimensions,
  Text,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import theme from '../theme/theme';

export interface CardProps {
  children: React.ReactNode;
  variant?: 'default' | 'elevated' | 'outlined' | 'filled';
  size?: 'sm' | 'md' | 'lg';
  onPress?: () => void;
  disabled?: boolean;
  style?: ViewStyle;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  margin?: 'none' | 'sm' | 'md' | 'lg';
  shadow?: keyof typeof theme.shadows;
  borderRadius?: keyof typeof theme.borderRadius;
  backgroundColor?: string;
  borderColor?: string;
  fullWidth?: boolean;
  animated?: boolean;
}

const { width: screenWidth } = Dimensions.get('window');

const Card: React.FC<CardProps> = ({
  children,
  variant = 'default',
  size = 'md',
  onPress,
  disabled = false,
  style,
  padding = 'md',
  margin = 'sm',
  shadow = 'sm',
  borderRadius = 'card',
  backgroundColor,
  borderColor,
  fullWidth = false,
  animated = true,
}) => {
  const { isDark } = useTheme();
  const [scaleValue] = useState(new Animated.Value(1));
  const [elevationValue] = useState(new Animated.Value(0));

  const handlePressIn = () => {
    if (disabled || !onPress || !animated) return;
    
    Animated.parallel([
      Animated.spring(scaleValue, {
        toValue: 0.98,
        useNativeDriver: true,
        tension: 100,
        friction: 8,
      }),
      Animated.timing(elevationValue, {
        toValue: 1,
        duration: 100,
        useNativeDriver: false,
      }),
    ]).start();
  };

  const handlePressOut = () => {
    if (disabled || !onPress || !animated) return;
    
    Animated.parallel([
      Animated.spring(scaleValue, {
        toValue: 1,
        useNativeDriver: true,
        tension: 100,
        friction: 8,
      }),
      Animated.timing(elevationValue, {
        toValue: 0,
        duration: 200,
        useNativeDriver: false,
      }),
    ]).start();
  };

  const getCardStyle = (): ViewStyle => {
    const baseStyle: ViewStyle = {
      borderRadius: theme.borderRadius[borderRadius],
      overflow: 'hidden',
    };

    // Size styles
    const sizeStyles = {
      sm: {
        minHeight: 80,
      },
      md: {
        minHeight: 120,
      },
      lg: {
        minHeight: 160,
      },
    };

    // Variant styles with dark mode support
    const variantStyles = {
      default: {
        backgroundColor: backgroundColor || (isDark ? theme.colors.background.card.dark : theme.colors.background.card.light),
        borderWidth: 0,
        ...theme.shadows[shadow],
      },
      elevated: {
        backgroundColor: backgroundColor || (isDark ? theme.colors.background.elevated.dark : theme.colors.background.elevated.light),
        borderWidth: 0,
        ...theme.shadows.lg,
      },
      outlined: {
        backgroundColor: backgroundColor || (isDark ? theme.colors.background.default.dark : theme.colors.background.default.light),
        borderWidth: 1,
        borderColor: borderColor || (isDark ? theme.colors.border.dark : theme.colors.border.light),
        ...theme.shadows.none,
      },
      filled: {
        backgroundColor: backgroundColor || (isDark ? theme.colors.background.surface.dark : theme.colors.background.surface.light),
        borderWidth: 0,
        ...theme.shadows.xs,
      },
    };

    // Padding styles
    const paddingStyles = {
      none: { padding: 0 },
      sm: { padding: theme.spacing.sm },
      md: { padding: theme.spacing.md },
      lg: { padding: theme.spacing.lg },
    };

    // Margin styles
    const marginStyles = {
      none: { margin: 0 },
      sm: { margin: theme.spacing.sm },
      md: { margin: theme.spacing.md },
      lg: { margin: theme.spacing.lg },
    };

    // Width style
    const widthStyle = fullWidth ? { width: screenWidth - (theme.spacing.screen * 2) } : {};

    // Disabled style
    const disabledStyle = disabled ? {
      opacity: 0.6,
    } : {};

    return {
      ...baseStyle,
      ...sizeStyles[size],
      ...variantStyles[variant],
      ...paddingStyles[padding],
      ...marginStyles[margin],
      ...widthStyle,
      ...disabledStyle,
    };
  };

  const getAnimatedStyle = () => {
    if (!animated) return {};
    
    return {
      transform: [{ scale: scaleValue }],
      elevation: elevationValue,
    };
  };

  const CardContent = (
    <Animated.View style={[getCardStyle(), getAnimatedStyle(), style]}>
      {children}
    </Animated.View>
  );

  if (onPress) {
    return (
      <TouchableOpacity
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled}
        activeOpacity={0.9}
        accessibilityRole="button"
        accessibilityState={{ disabled }}
      >
        {CardContent}
      </TouchableOpacity>
    );
  }

  return CardContent;
};

// Card Header Component
export const CardHeader: React.FC<{
  title: string;
  subtitle?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  style?: ViewStyle;
}> = ({ title, subtitle, leftIcon, rightIcon, style }) => {
  const { isDark } = useTheme();
  
  return (
    <View style={[styles.header, style]}>
      <View style={styles.headerLeft}>
        {leftIcon && <View style={styles.headerIcon}>{leftIcon}</View>}
        <View style={styles.headerText}>
          <Text style={[styles.headerTitle, { color: isDark ? theme.colors.text.primary.dark : theme.colors.text.primary.light }]}>
            {title}
          </Text>
          {subtitle && (
            <Text style={[styles.headerSubtitle, { color: isDark ? theme.colors.text.secondary.dark : theme.colors.text.secondary.light }]}>
              {subtitle}
            </Text>
          )}
        </View>
      </View>
      {rightIcon && <View style={styles.headerRight}>{rightIcon}</View>}
    </View>
  );
};

// Card Content Component
export const CardContent: React.FC<{
  children: React.ReactNode;
  style?: ViewStyle;
}> = ({ children, style }) => (
  <View style={[styles.content, style]}>
    {children}
  </View>
);

// Card Footer Component
export const CardFooter: React.FC<{
  children: React.ReactNode;
  style?: ViewStyle;
}> = ({ children, style }) => {
  const { isDark } = useTheme();
  
  return (
    <View style={[styles.footer, style, { borderTopColor: isDark ? theme.colors.divider.dark : theme.colors.divider.light }]}>
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.divider.light,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  headerIcon: {
    marginRight: theme.spacing.sm,
  },
  headerText: {
    flex: 1,
  },
  headerTitle: {
    fontSize: theme.typography.fontSizes.lg,
    fontWeight: theme.typography.fontWeights.semibold,
    marginBottom: 2,
  },
  headerSubtitle: {
    fontSize: theme.typography.fontSizes.sm,
  },
  headerRight: {
    marginLeft: theme.spacing.sm,
  },
  content: {
    flex: 1,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: theme.spacing.sm,
    borderTopWidth: 1,
  },
});

export default Card;
