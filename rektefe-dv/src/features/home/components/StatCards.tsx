import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '@/context/ThemeContext';
import { translateServiceName } from '@/shared/utils/serviceTranslator';

interface StatCard {
  title: string;
  value: string;
  change: string;
  trend: 'up' | 'down' | 'neutral';
  icon: string;
  color: string;
  details?: string[];
  lastUpdate?: string;
}

interface StatCardsProps {
  stats: StatCard[];
}

export const StatCards: React.FC<StatCardsProps> = ({ 
  stats
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
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {stats.map((stat, index) => (
          <View key={index} style={[
            styles.card, 
            { 
              borderLeftColor: stat.color,
              backgroundColor: currentColors.background.card,
              borderColor: currentColors.border.light
            }
          ]}>
            <View style={styles.cardHeader}>
              <MaterialCommunityIcons name={stat.icon as any} size={24} color={stat.color} />
              <Text style={[styles.cardTitle, { color: currentColors.text.primary }]}>
                {translateServiceName(stat.title)}
              </Text>
            </View>
            <Text style={[styles.cardValue, { color: currentColors.text.primary }]}>{stat.value}</Text>
            {stat.change && (
              <View style={styles.changeContainer}>
                <MaterialCommunityIcons 
                  name={stat.trend === 'up' ? 'trending-up' : stat.trend === 'down' ? 'trending-down' : 'trending-neutral'} 
                  size={16} 
                  color={stat.trend === 'up' ? currentColors.success.main : stat.trend === 'down' ? currentColors.error.main : currentColors.text.tertiary} 
                />
                <Text style={[
                  styles.changeText,
                  { color: stat.trend === 'up' ? currentColors.success.main : stat.trend === 'down' ? currentColors.error.main : currentColors.text.tertiary }
                ]}>
                  {stat.change}
                </Text>
              </View>
            )}
            {stat.details && stat.details.length > 0 && (
              <View style={styles.cardDetails}>
                {stat.details.map((detail, idx) => (
                  <Text key={idx} style={[styles.cardDetailText, { color: currentColors.text.secondary }]}>{detail}</Text>
                ))}
              </View>
            )}
            {stat.lastUpdate && (
              <Text style={[styles.cardLastUpdate, { color: currentColors.text.tertiary }]}>
                Son güncelleme: {new Date(stat.lastUpdate).toLocaleDateString('tr-TR')}
              </Text>
            )}
          </View>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 24,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  card: {
    width: 200,
    borderRadius: 16,
    padding: 16,
    marginRight: 12,
    borderLeftWidth: 4,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  cardValue: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  changeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  changeText: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
  },
  cardDetails: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  cardDetailText: {
    fontSize: 14,
    marginBottom: 4,
  },
  cardLastUpdate: {
    fontSize: 12,
    marginTop: 8,
  },
}); 