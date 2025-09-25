import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/context/ThemeContext';

interface MechanicInfoProps {
  mechanic: any;
  showAllSpecialties: boolean;
  showAllCarBrands: boolean;
  showAllEngineTypes: boolean;
  showAllTransmissionTypes: boolean;
  onToggleSpecialties: () => void;
  onToggleCarBrands: () => void;
  onToggleEngineTypes: () => void;
  onToggleTransmissionTypes: () => void;
  onBecomeCustomer: () => Promise<any>;
  onRemoveCustomer: () => Promise<any>;
}

export const MechanicInfo: React.FC<MechanicInfoProps> = ({
  mechanic,
}) => {
  const { theme } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background.card }]}>
      <Text style={[styles.title, { color: theme.colors.text.primary }]}>
        Usta Bilgileri
      </Text>
      
      <Text style={[styles.experience, { color: theme.colors.text.secondary }]}>
        {mechanic.experience} yıl deneyim • {mechanic.totalJobs} iş tamamlandı
      </Text>
      
      {mechanic.bio && (
        <Text style={[styles.bio, { color: theme.colors.text.primary }]}>
          {mechanic.bio}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    margin: 16,
    padding: 16,
    borderRadius: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  experience: {
    fontSize: 14,
    marginBottom: 12,
  },
  bio: {
    fontSize: 14,
    lineHeight: 20,
  },
});
