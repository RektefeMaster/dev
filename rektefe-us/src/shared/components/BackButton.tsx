import React from 'react';
import { TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { colors, spacing, borderRadius, shadows } from '@/shared/theme';

interface BackButtonProps {
  onPress?: () => void;
  color?: string;
  size?: number;
  style?: any;
}

const BackButton: React.FC<BackButtonProps> = ({ 
  onPress, 
  color = colors.text.primary, 
  size = 24,
  style 
}) => {
  const navigation = useNavigation();

  const handlePress = () => {
    if (onPress) {
      onPress();
    } else {
      navigation.goBack();
    }
  };

  return (
    <TouchableOpacity
      style={[styles.backButton, style]}
      onPress={handlePress}
      activeOpacity={0.7}
    >
      <Ionicons name="chevron-back" size={size} color={color} />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  backButton: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    backgroundColor: colors.background.secondary,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.small,
    borderWidth: 1,
    borderColor: colors.border.secondary,
  },
});

export default BackButton;
