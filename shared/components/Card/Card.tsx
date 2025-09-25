import React from 'react';
import {
  View,
  ViewStyle,
  StyleSheet,
} from 'react-native';

export interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  padding?: 'none' | 'small' | 'medium' | 'large';
  shadow?: boolean;
  border?: boolean;
}

const Card: React.FC<CardProps> = ({
  children,
  style,
  padding = 'medium',
  shadow = true,
  border = false,
}) => {
  const getCardStyle = (): ViewStyle => {
    const baseStyle: ViewStyle = {
      backgroundColor: '#FFFFFF',
      borderRadius: 12,
    };

    const paddingStyles: Record<string, ViewStyle> = {
      none: {},
      small: { padding: 8 },
      medium: { padding: 16 },
      large: { padding: 24 },
    };

    const shadowStyle: ViewStyle = shadow ? {
      shadowColor: '#000',
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: 0.1,
      shadowRadius: 3.84,
      elevation: 5,
    } : {};

    const borderStyle: ViewStyle = border ? {
      borderWidth: 1,
      borderColor: '#E5E5E5',
    } : {};

    return {
      ...baseStyle,
      ...paddingStyles[padding],
      ...shadowStyle,
      ...borderStyle,
    };
  };

  return (
    <View style={[getCardStyle(), style]}>
      {children}
    </View>
  );
};

export default Card;
