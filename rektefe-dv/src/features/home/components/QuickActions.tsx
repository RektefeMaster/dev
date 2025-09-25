import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '@/context/ThemeContext';

interface QuickAction {
  id: string;
  title: string;
  icon: string;
  color: string;
  onPress: () => void;
}

interface QuickActionsProps {
  actions: QuickAction[];
}

export const QuickActions: React.FC<QuickActionsProps> = ({ actions }) => {
  const { theme } = useTheme();

  return (
    <View style={styles.container}>
      <Text style={[styles.title, { color: theme.colors.text.primary }]}>Hizmetler</Text>
      <View style={styles.actionsGrid}>
        {actions.map((action, index) => (
          <TouchableOpacity
            key={action.id}
            style={[
              styles.actionButton, 
              { 
                backgroundColor: theme.colors.background.card,
                borderColor: theme.colors.border.primary,
                shadowColor: '#000',
              }
            ]}
            onPress={action.onPress}
            activeOpacity={0.7}
          >
            <View style={[styles.iconContainer, { backgroundColor: action.color + '20' }]}>
              <MaterialCommunityIcons 
                name={action.icon as any} 
                size={24} 
                color={action.color} 
              />
            </View>
            <Text style={[styles.actionText, { color: theme.colors.text.primary }]}>{action.title}</Text>
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
  title: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 16,
    letterSpacing: -0.5,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  actionButton: {
    width: '48%',
    aspectRatio: 1.2,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  actionText: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    letterSpacing: -0.1,
  },
});
