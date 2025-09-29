import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
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
  showAllSpecialties,
  showAllCarBrands,
  showAllEngineTypes,
  showAllTransmissionTypes,
  onToggleSpecialties,
  onToggleCarBrands,
  onToggleEngineTypes,
  onToggleTransmissionTypes,
  onBecomeCustomer,
  onRemoveCustomer,
}) => {
  const { theme } = useTheme();

  const renderSpecialties = () => {
    if (!mechanic.specialties || mechanic.specialties.length === 0) return null;
    
    const displaySpecialties = showAllSpecialties ? mechanic.specialties : mechanic.specialties.slice(0, 3);
    
    return (
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.colors.text.primary }]}>
          Uzmanlık Alanları
        </Text>
        <View style={styles.tagsContainer}>
          {displaySpecialties.map((specialty: string, index: number) => (
            <View key={index} style={[styles.tag, { backgroundColor: theme.colors.primary.light }]}>
              <Text style={[styles.tagText, { color: theme.colors.primary.main }]}>
                {specialty}
              </Text>
            </View>
          ))}
        </View>
        {mechanic.specialties.length > 3 && (
          <TouchableOpacity onPress={onToggleSpecialties} style={styles.showMoreButton}>
            <Text style={[styles.showMoreText, { color: theme.colors.primary.main }]}>
              {showAllSpecialties ? 'Daha Az Göster' : `${mechanic.specialties.length - 3} Daha Fazla`}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const renderContactInfo = () => (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: theme.colors.text.primary }]}>
        İletişim Bilgileri
      </Text>
      
      {mechanic.phone && (
        <View style={styles.contactItem}>
          <MaterialCommunityIcons name="phone" size={20} color={theme.colors.text.secondary} />
          <Text style={[styles.contactText, { color: theme.colors.text.secondary }]}>
            {mechanic.phone}
          </Text>
        </View>
      )}
      
      {mechanic.email && (
        <View style={styles.contactItem}>
          <MaterialCommunityIcons name="email" size={20} color={theme.colors.text.secondary} />
          <Text style={[styles.contactText, { color: theme.colors.text.secondary }]}>
            {mechanic.email}
          </Text>
        </View>
      )}
      
      {mechanic.fullAddress && (
        <View style={styles.contactItem}>
          <MaterialCommunityIcons name="map-marker" size={20} color={theme.colors.text.secondary} />
          <Text style={[styles.contactText, { color: theme.colors.text.secondary }]}>
            {mechanic.fullAddress}
          </Text>
        </View>
      )}
    </View>
  );

  const renderWorkingHours = () => {
    if (!mechanic.workingHours) return null;
    
    return (
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.colors.text.primary }]}>
          Çalışma Saatleri
        </Text>
        <View style={styles.workingHoursContainer}>
          {mechanic.workingHours.map((schedule: any, index: number) => (
            <View key={index} style={styles.workingHoursItem}>
              <Text style={[styles.dayText, { color: theme.colors.text.primary }]}>
                {schedule.day}
              </Text>
              <Text style={[styles.timeText, { color: theme.colors.text.secondary }]}>
                {schedule.hours}
              </Text>
            </View>
          ))}
        </View>
      </View>
    );
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.colors.background.card }]}>
      <Text style={[styles.title, { color: theme.colors.text.primary }]}>
        Usta Bilgileri
      </Text>
      
      <Text style={[styles.experience, { color: theme.colors.text.secondary }]}>
        {mechanic.experience || 0} yıl deneyim • {mechanic.totalJobs || 0} iş tamamlandı
      </Text>
      
      {mechanic.bio && (
        <Text style={[styles.bio, { color: theme.colors.text.primary }]}>
          {mechanic.bio}
        </Text>
      )}

      {renderSpecialties()}
      {renderContactInfo()}
      {renderWorkingHours()}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    margin: 16,
    padding: 16,
    borderRadius: 12,
    maxHeight: 400,
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
    marginBottom: 16,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  tagText: {
    fontSize: 12,
    fontWeight: '500',
  },
  showMoreButton: {
    marginTop: 8,
  },
  showMoreText: {
    fontSize: 14,
    fontWeight: '500',
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 12,
  },
  contactText: {
    fontSize: 14,
    flex: 1,
  },
  workingHoursContainer: {
    gap: 8,
  },
  workingHoursItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  dayText: {
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  timeText: {
    fontSize: 14,
  },
});
