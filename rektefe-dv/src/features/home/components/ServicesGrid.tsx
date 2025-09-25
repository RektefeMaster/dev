import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '@/context/ThemeContext';
import { translateServiceName } from '@/shared/utils/serviceTranslator';

interface Service {
  id?: string;
  title: string;
  icon: string;
  color: string;
  description?: string;
  subServices?: string[];
}

interface ServicesGridProps {
  services: Service[];
  onServicePress: (service: Service) => void;
}

export const ServicesGrid: React.FC<ServicesGridProps> = ({ 
  services, 
  onServicePress
}) => {
  const { isDark } = useTheme();
  
  // Services prop'unun undefined olma durumunu kontrol et
  if (!services || !Array.isArray(services)) {
    return null; // veya loading state göster
  }
  
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
      <View style={styles.grid}>
        {services.map((service, index) => (
          <TouchableOpacity
            key={service.id || index}
            style={[styles.gridItem, { 
              backgroundColor: currentColors.background.card,
              borderColor: currentColors.border.light,
              borderWidth: 1,
              borderRadius: 16,
              padding: 16,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.08,
              shadowRadius: 8,
              elevation: 4,
            }]}
            onPress={() => onServicePress(service)}
            activeOpacity={0.7}
          >
            <View style={[styles.iconWrap, { 
              backgroundColor: service.color + '20',
              borderColor: service.color,
              borderWidth: 2
            }]}>
              <MaterialCommunityIcons name={service.icon as any} size={32} color={service.color} />
            </View>
            <Text style={[styles.title, { color: currentColors.text.primary, marginTop: 8 }]}>
              {translateServiceName(service.title)}
            </Text>
            {service.description && (
              <Text style={[styles.description, { color: currentColors.text.secondary, marginTop: 4 }]}>
                {service.description}
              </Text>
            )}
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
    marginLeft: 20,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    gap: 16,
  },
  gridItem: {
    width: '47%',
    alignItems: 'center',
    marginBottom: 16,
  },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  description: {
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 16,
  },
}); 