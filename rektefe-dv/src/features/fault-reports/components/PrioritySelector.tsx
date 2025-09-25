import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useTheme } from '@/context/ThemeContext';

interface PriorityLevel {
  id: string;
  name: string;
  color: string;
  icon: string;
  description: string;
}

interface PrioritySelectorProps {
  priorityLevels: PriorityLevel[];
  selectedPriority: string;
  onSelectPriority: (priorityId: string) => void;
}

export const PrioritySelector: React.FC<PrioritySelectorProps> = ({
  priorityLevels,
  selectedPriority,
  onSelectPriority,
}) => {
  const { theme } = useTheme();

  const renderPriorityItem = (priority: PriorityLevel) => (
    <TouchableOpacity
      key={priority.id}
      style={[
        styles.priorityItem,
        {
          backgroundColor: theme.colors.background.secondary,
          borderColor: selectedPriority === priority.id ? priority.color : theme.colors.border.primary,
        },
        selectedPriority === priority.id && styles.priorityItemSelected,
      ]}
      onPress={() => onSelectPriority(priority.id)}
      activeOpacity={0.7}
    >
      <View style={[styles.iconContainer, { backgroundColor: priority.color }]}>
        <MaterialCommunityIcons name={priority.icon as any} size={24} color="#fff" />
      </View>
      <View style={styles.textContainer}>
        <Text style={[styles.priorityName, { color: theme.colors.text.primary }]}>
          {priority.name}
        </Text>
        <Text style={[styles.priorityDescription, { color: theme.colors.text.secondary }]}>
          {priority.description}
        </Text>
      </View>
      {selectedPriority === priority.id && (
        <View style={[styles.checkmark, { backgroundColor: priority.color }]}>
          <MaterialCommunityIcons name="check" size={16} color="#fff" />
        </View>
      )}
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <Text style={[styles.title, { color: theme.colors.text.primary }]}>
        Öncelik Seviyesi
      </Text>
      <Text style={[styles.subtitle, { color: theme.colors.text.secondary }]}>
        Arızanızın ne kadar acil olduğunu belirtin
      </Text>
      
      <View style={styles.prioritiesContainer}>
        {priorityLevels.map(renderPriorityItem)}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    marginBottom: 20,
  },
  prioritiesContainer: {
    flex: 1,
  },
  priorityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    marginBottom: 12,
    borderRadius: 12,
    borderWidth: 2,
  },
  priorityItemSelected: {
    borderWidth: 2,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  textContainer: {
    flex: 1,
  },
  priorityName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  priorityDescription: {
    fontSize: 14,
    lineHeight: 18,
  },
  checkmark: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
