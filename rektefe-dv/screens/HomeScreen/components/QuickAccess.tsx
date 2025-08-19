import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../../../context/ThemeContext';
import { translateServiceName } from '../../../utils/serviceTranslator';

export interface QuickAccessCard {
  title: string;
  value: string;
  icon: string;
  color: string;
  lastUpdate?: string;
  isClickable?: boolean;
}

interface QuickAccessProps {
  cards: QuickAccessCard[];
  onCardPress: (card: QuickAccessCard) => void;
}

export const QuickAccess: React.FC<QuickAccessProps> = ({ 
  cards, 
  onCardPress
}) => {
  const { isDark } = useTheme();
  
  // Professional Color Palette
  const colors = {
    // Primary Colors
    primary: {
      main: '#2563EB',      // Blue 600
      light: '#3B82F6',     // Blue 500
      dark: '#1D4ED8',      // Blue 700
      contrast: '#FFFFFF',
    },
    secondary: {
      main: '#7C3AED',      // Violet 600
      light: '#8B5CF6',     // Violet 500
      dark: '#6D28D9',      // Violet 700
      contrast: '#FFFFFF',
    },
    success: {
      main: '#059669',      // Emerald 600
      light: '#10B981',     // Emerald 500
      dark: '#047857',      // Emerald 700
      contrast: '#FFFFFF',
    },
    warning: {
      main: '#D97706',      // Amber 600
      light: '#F59E0B',     // Amber 500
      dark: '#B45309',      // Amber 700
      contrast: '#FFFFFF',
    },
    error: {
      main: '#DC2626',      // Red 600
      light: '#EF4444',     // Red 500
      dark: '#B91C1C',      // Red 700
      contrast: '#FFFFFF',
    },
    
    // Neutral Colors
    neutral: {
      50: '#F8FAFC',        // Slate 50
      100: '#F1F5F9',       // Slate 100
      200: '#E2E8F0',       // Slate 200
      300: '#CBD5E1',       // Slate 300
      400: '#94A3B8',       // Slate 400
      500: '#64748B',       // Slate 500
      600: '#475569',       // Slate 600
      700: '#334155',       // Slate 700
      800: '#1E293B',       // Slate 800
      900: '#0F172A',       // Slate 900
    },
    
    // Text Colors
    text: {
      primary: '#1E293B',   // Slate 800
      secondary: '#475569', // Slate 600
      tertiary: '#64748B',  // Slate 500
      disabled: '#94A3B8',  // Slate 400
      inverse: '#FFFFFF',   // White
    },
    
    // Background Colors
    background: {
      primary: '#FFFFFF',   // White
      secondary: '#F8FAFC', // Slate 50
      tertiary: '#F1F5F9', // Slate 100
      card: '#FFFFFF',      // White
      surface: '#F8FAFC',   // Slate 50
    },
    
    // Border Colors
    border: {
      light: '#E2E8F0',     // Slate 200
      medium: '#CBD5E1',    // Slate 300
      dark: '#94A3B8',      // Slate 400
    }
  };

  // Dark Mode Colors
  const darkColors = {
    // Primary Colors (same for consistency)
    primary: colors.primary,
    secondary: colors.secondary,
    success: colors.success,
    warning: colors.warning,
    error: colors.error,
    
    // Neutral Colors
    neutral: {
      50: '#0F172A',        // Slate 900
      100: '#1E293B',       // Slate 800
      200: '#334155',       // Slate 700
      300: '#475569',       // Slate 600
      400: '#64748B',       // Slate 500
      500: '#94A3B8',       // Slate 400
      600: '#CBD5E1',       // Slate 300
      700: '#E2E8F0',       // Slate 200
      800: '#F1F5F9',       // Slate 100
      900: '#F8FAFC',       // Slate 50
    },
    
    // Text Colors
    text: {
      primary: '#F8FAFC',   // Slate 50
      secondary: '#E2E8F0', // Slate 200
      tertiary: '#CBD5E1',  // Slate 300
      disabled: '#64748B',  // Slate 500
      inverse: '#0F172A',   // Slate 900
    },
    
    // Background Colors
    background: {
      primary: '#0F172A',   // Slate 900
      secondary: '#1E293B', // Slate 800
      tertiary: '#334155',  // Slate 700
      card: '#1E293B',      // Slate 800
      surface: '#334155',   // Slate 700
    },
    
    // Border Colors
    border: {
      light: '#475569',     // Slate 600
      medium: '#64748B',    // Slate 500
      dark: '#94A3B8',      // Slate 400
    }
  };

  const currentColors = isDark ? darkColors : colors;

  return (
    <View style={styles.container}>
      {cards.map((card, index) => (
        <TouchableOpacity
          key={index}
          style={[
            styles.card,
            card.isClickable && styles.clickableCard,
            { 
              borderLeftColor: card.color,
              backgroundColor: currentColors.background.card,
              borderColor: currentColors.border.light
            }
          ]}
          onPress={() => card.isClickable && onCardPress(card)}
          activeOpacity={card.isClickable ? 0.7 : 1}
          disabled={!card.isClickable}
        >
          <View style={[styles.iconContainer, { backgroundColor: card.color + '20' }]}>
            <MaterialCommunityIcons name={card.icon as any} size={24} color={card.color} />
          </View>
          <View style={styles.contentContainer}>
            <Text style={[styles.title, { color: currentColors.text.secondary }]}>
              {translateServiceName(card.title)}
            </Text>
            <Text style={[styles.value, { color: currentColors.text.primary }]}>
              {translateServiceName(card.value)}
            </Text>
            {card.lastUpdate && (
              <Text style={[styles.lastUpdate, { color: currentColors.text.tertiary }]}>
                Son güncelleme: {new Date(card.lastUpdate).toLocaleDateString('tr-TR')}
              </Text>
            )}
          </View>
          {card.isClickable && (
            <MaterialCommunityIcons 
              name="chevron-right" 
              size={20} 
              color={currentColors.text.tertiary} 
              style={styles.chevron}
            />
          )}
        </TouchableOpacity>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    padding: 16,
    borderLeftWidth: 4,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  clickableCard: {
    // backgroundColor artık dinamik olarak ayarlanıyor
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  contentContainer: {
    flex: 1,
  },
  title: {
    fontSize: 14,
    marginBottom: 4,
    fontWeight: '500',
  },
  value: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  lastUpdate: {
    fontSize: 12,
    opacity: 0.8,
  },
  chevron: {
    marginLeft: 8,
  },
}); 