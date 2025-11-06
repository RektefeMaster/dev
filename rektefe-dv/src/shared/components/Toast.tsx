import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  Dimensions,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/context/ThemeContext';

// Spacing ve borderRadius'u doğrudan import et (modül yükleme sırasından bağımsız)
const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  xxxl: 64,
  screenPadding: 20,
  cardPadding: 16,
  buttonPadding: 12,
  iconSpacing: 8,
};

const borderRadius = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  round: 50,
  card: 16,
  button: 12,
  input: 12,
  modal: 20,
  avatar: 25,
  full: 9999,
};

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastProps {
  message: string;
  type?: ToastType;
  duration?: number;
  onClose?: () => void;
  visible: boolean;
}

const Toast: React.FC<ToastProps> = ({
  message,
  type = 'info',
  duration = 3000,
  onClose,
  visible,
}) => {
  const { theme, isDark } = useTheme();
  const translateY = useRef(new Animated.Value(-100)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      // Show animation
      Animated.parallel([
        Animated.spring(translateY, {
          toValue: 0,
          useNativeDriver: true,
          tension: 65,
          friction: 11,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();

      // Auto hide after duration
      const timer = setTimeout(() => {
        hideToast();
      }, duration);

      return () => clearTimeout(timer);
    } else {
      hideToast();
    }
  }, [visible, duration]);

  const hideToast = () => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: -100,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onClose?.();
    });
  };

  const getIcon = () => {
    switch (type) {
      case 'success':
        return 'checkmark-circle';
      case 'error':
        return 'close-circle';
      case 'warning':
        return 'warning';
      case 'info':
      default:
        return 'information-circle';
    }
  };

  const getColor = () => {
    switch (type) {
      case 'success':
        return theme.colors.success.main;
      case 'error':
        return theme.colors.error.main;
      case 'warning':
        return theme.colors.warning.main;
      case 'info':
      default:
        return theme.colors.info.main;
    }
  };

  const getBackgroundColor = () => {
    const color = getColor();
    return isDark 
      ? `${color}20` // 20% opacity for dark mode
      : `${color}15`; // 15% opacity for light mode
  };

  if (!visible) return null;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ translateY }],
          opacity,
        },
      ]}
      pointerEvents="box-none"
    >
      <View
        style={[
          styles.toast,
          {
            backgroundColor: isDark
              ? theme.colors.background.secondary
              : '#FFFFFF',
            borderLeftColor: getColor(),
            borderLeftWidth: 4,
          },
        ]}
      >
        <View style={[styles.iconContainer, { backgroundColor: getBackgroundColor() }]}>
          <Ionicons name={getIcon() as any} size={24} color={getColor()} />
        </View>
        <Text style={[styles.message, { color: theme.colors.text.primary }]} numberOfLines={2}>
          {message}
        </Text>
        <TouchableOpacity
          onPress={hideToast}
          style={styles.closeButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons
            name="close"
            size={20}
            color={theme.colors.text.tertiary}
          />
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
};

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 40,
    left: spacing.md,
    right: spacing.md,
    zIndex: 9999,
    alignItems: 'center',
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    minHeight: 56,
    maxWidth: width - spacing.md * 2,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  message: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 20,
  },
  closeButton: {
    padding: spacing.xs,
    marginLeft: spacing.sm,
  },
});

export default Toast;

