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
              borderLeftColor: currentColors.text.primary,
              backgroundColor: currentColors.background.card,
              borderColor: currentColors.border.light,
              shadowColor: '#000',
            }
          ]}
          onPress={() => card.isClickable && onCardPress(card)}
          activeOpacity={card.isClickable ? 0.7 : 1}
          disabled={!card.isClickable}
        >
          <View style={[styles.iconContainer, { backgroundColor: currentColors.background.secondary }]}>
            <MaterialCommunityIcons name={card.icon as any} size={22} color={currentColors.text.primary} />
          </View>
          <View style={styles.contentContainer}>
            <Text style={[styles.title, { color: currentColors.text.secondary }]}>
              {translateServiceName(card.title)}
            </Text>
            {card.title === 'Mesajlar' ? (
              <View style={styles.messageContainer}>
                <Text style={[styles.messageValue, { color: currentColors.text.primary }]}>
                  {card.value}
                </Text>
                <Text style={[styles.messageLabel, { color: currentColors.text.tertiary }]}>
                  yeni mesaj
                </Text>
              </View>
            ) : (
              <Text style={[styles.value, { color: currentColors.text.primary }]}>
                {translateServiceName(card.value)}
              </Text>
            )}
            {card.lastUpdate && (
              <Text style={[styles.lastUpdate, { color: currentColors.text.tertiary }]}>
                Son güncelleme: {new Date(card.lastUpdate).toLocaleDateString('tr-TR')}
              </Text>
            )}
          </View>
          {card.isClickable && (
            <View style={[styles.chevronContainer, { backgroundColor: currentColors.background.secondary }]}>
              <MaterialCommunityIcons 
                name="chevron-right" 
                size={18} 
                color={currentColors.text.tertiary} 
              />
            </View>
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
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 3,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 3,
  },
  clickableCard: {
    // backgroundColor artık dinamik olarak ayarlanıyor
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  contentContainer: {
    flex: 1,
  },
  title: {
    fontSize: 15,
    marginBottom: 6,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  value: {
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 4,
    letterSpacing: -0.3,
  },
  lastUpdate: {
    fontSize: 12,
    opacity: 0.8,
  },
  chevronContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
  messageContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  messageValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  messageLabel: {
    fontSize: 12,
    marginLeft: 4,
  },
}); 