import React from 'react';
import { TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '@/context/ThemeContext';

interface BackButtonProps {
  onPress?: () => void;
  color?: string;
  size?: number;
  style?: any;
  accessibilityLabel?: string;
}

const BackButton: React.FC<BackButtonProps> = ({ 
  onPress, 
  color, 
  size = 24,
  style,
  accessibilityLabel = 'Geri'
}) => {
  const navigation = useNavigation();
  const { theme } = useTheme();

  const handlePress = () => {
    if (onPress) {
      onPress();
    } else {
      navigation.goBack();
    }
  };

  return (
    <TouchableOpacity
      style={[styles.backButton, { backgroundColor: theme.colors.background.secondary, borderColor: theme.colors.border.secondary }, style]}
      onPress={handlePress}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint="Önceki ekrana dön"
    >
      <Ionicons 
        name="chevron-back" 
        size={size} 
        color={color || theme.colors.text.primary} 
      />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  backButton: {
    width: 44, // WCAG 2.1 AA: Minimum 44x44px touch target
    height: 44,
    minWidth: 44,
    minHeight: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
  },
});

export default BackButton;
