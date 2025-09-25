import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
} from 'react-native';
import { colors, typography, spacing } from '@/theme/theme';

export interface LoadingSpinnerProps {
  size?: 'small' | 'large';
  color?: string;
  text?: string;
  showText?: boolean;
  style?: ViewStyle;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'large',
  color = colors.primary.main,
  text = 'Yükleniyor...',
  showText = true,
  style,
}) => {
  return (
    <View style={[styles.container, style]}>
      <ActivityIndicator size={size} color={color} />
      {showText && (
        <Text style={[styles.text, { color }]}>
          {text}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  text: {
    marginTop: spacing.md,
    fontSize: typography.body2.fontSize,
    fontWeight: '500',
    textAlign: 'center',
  },
});

export default LoadingSpinner;
