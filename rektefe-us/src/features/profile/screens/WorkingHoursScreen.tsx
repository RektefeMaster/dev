import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Modal,
  Alert,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/shared/context';
import { colors, typography, borderRadius, spacing, shadows } from '@/shared/theme';
import BackButton from '@/shared/components/BackButton';
import Button from '@/shared/components/Button';

interface WorkingHours {
  [key: string]: {
    isOpen: boolean;
    start: string;
    end: string;
  };
}

const defaultWorkingHours: WorkingHours = {
  monday: { isOpen: true, start: '09:00', end: '18:00' },
  tuesday: { isOpen: true, start: '09:00', end: '18:00' },
  wednesday: { isOpen: true, start: '09:00', end: '18:00' },
  thursday: { isOpen: true, start: '09:00', end: '18:00' },
  friday: { isOpen: true, start: '09:00', end: '18:00' },
  saturday: { isOpen: true, start: '10:00', end: '16:00' },
  sunday: { isOpen: false, start: '09:00', end: '18:00' },
};

const dayNames = {
  monday: 'Pazartesi',
  tuesday: 'Salı',
  wednesday: 'Çarşamba',
  thursday: 'Perşembe',
  friday: 'Cuma',
  saturday: 'Cumartesi',
  sunday: 'Pazar',
};

export default function WorkingHoursScreen() {
  const { user, updateUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [workingHours, setWorkingHours] = useState<WorkingHours>(defaultWorkingHours);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [selectedDay, setSelectedDay] = useState<string>('');
  const [selectedTimeType, setSelectedTimeType] = useState<'start' | 'end'>('start');
  const [selectedTime, setSelectedTime] = useState('09:00');

  useEffect(() => {
    if (user?.workingHours) {
      try {
        const parsedHours = JSON.parse(user.workingHours) as WorkingHours;
        const mergedHours = { ...defaultWorkingHours };
        Object.keys(parsedHours).forEach(day => {
          const dayData = parsedHours[day];
          if (dayData && typeof dayData === 'object') {
            mergedHours[day] = {
              isOpen: dayData.isOpen !== undefined ? dayData.isOpen : defaultWorkingHours[day].isOpen,
              start: dayData.start || defaultWorkingHours[day].start,
              end: dayData.end || defaultWorkingHours[day].end
            };
          }
        });
        setWorkingHours(mergedHours);
      } catch (error) {
        setWorkingHours(defaultWorkingHours);
      }
    } else {
      setWorkingHours(defaultWorkingHours);
    }
  }, [user]);

  const handleDayToggle = (day: string) => {
    setWorkingHours(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        isOpen: !prev[day].isOpen
      }
    }));
  };

  const handleTimeChange = (day: string, field: 'start' | 'end', time: string) => {
    setWorkingHours(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        [field]: time
      }
    }));
  };

  const openTimePicker = (day: string, type: 'start' | 'end') => {
    setSelectedDay(day);
    setSelectedTimeType(type);
    setSelectedTime(workingHours[day][type]);
    setShowTimePicker(true);
  };

  const confirmTimeChange = () => {
    handleTimeChange(selectedDay, selectedTimeType, selectedTime);
    setShowTimePicker(false);
  };

  const generateTimeOptions = () => {
    const times = [];
    for (let hour = 0; hour < 24; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        times.push(timeString);
      }
    }
    return times;
  };

  const saveWorkingHours = async () => {
    try {
      setLoading(true);
      await updateUser({
        workingHours: JSON.stringify(workingHours)
      } as any);
      
      Alert.alert('Başarılı', 'Çalışma saatleri kaydedildi');
    } catch (error) {
      Alert.alert('Hata', 'Bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const getDayStatus = (day: string) => {
    const dayData = workingHours[day];
    
    if (!dayData.isOpen) {
      return { text: 'Kapalı', color: colors.text.secondary, icon: 'close-circle-outline' };
    }
    
    // Switch açıksa her zaman "Açık" göster
    return { text: 'Açık', color: '#34C759', icon: 'checkmark-circle-outline' };
  };

  const renderTimePicker = (day: string, field: 'start' | 'end') => {
    const time = workingHours[day][field];
    
    return (
      <TouchableOpacity
        style={styles.timeButton}
        onPress={() => openTimePicker(day, field)}
      >
        <Text style={styles.timeButtonText}>{time}</Text>
        <Ionicons name="chevron-down" size={16} color={colors.text.secondary} />
      </TouchableOpacity>
    );
  };

  const renderDayRow = (day: string) => {
    const dayName = dayNames[day as keyof typeof dayNames];
    const isOpen = workingHours[day].isOpen;
    const status = getDayStatus(day);
    
    return (
      <View key={day} style={styles.dayCard}>
        <View style={styles.dayHeader}>
          <View style={styles.dayInfo}>
            <Text style={styles.dayName}>{dayName}</Text>
            <View style={styles.statusContainer}>
              <Ionicons 
                name={status.icon as any} 
                size={14} 
                color={status.color} 
                style={styles.statusIcon}
              />
              <Text style={[styles.statusText, { color: status.color }]}>
                {status.text}
              </Text>
            </View>
          </View>
          <Switch
            value={isOpen}
            onValueChange={() => handleDayToggle(day)}
            trackColor={{ false: '#E5E7EB', true: '#4B6382' }}
            thumbColor={isOpen ? '#FFFFFF' : '#9CA3AF'}
          />
        </View>
        
        {isOpen && (
          <View style={styles.timeRow}>
            <View style={styles.timeSection}>
              <Text style={styles.timeLabel}>Başlangıç</Text>
              {renderTimePicker(day, 'start')}
            </View>
            
            <View style={styles.timeSection}>
              <Text style={styles.timeLabel}>Bitiş</Text>
              {renderTimePicker(day, 'end')}
            </View>
          </View>
        )}
      </View>
    );
  };

  const renderTimePickerModal = () => (
    <Modal
      visible={showTimePicker}
      transparent
      animationType="slide"
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Saat Seçin</Text>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setShowTimePicker(false)}
            >
              <Ionicons name="close" size={24} color={colors.text.primary} />
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.timeList} showsVerticalScrollIndicator={false}>
            {generateTimeOptions().map((time) => (
              <TouchableOpacity
                key={time}
                style={[
                  styles.timeOption,
                  selectedTime === time && styles.selectedTimeOption
                ]}
                onPress={() => setSelectedTime(time)}
              >
                <Text style={[
                  styles.timeOptionText,
                  selectedTime === time && styles.selectedTimeOptionText
                ]}>
                  {time}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          
          <View style={styles.modalActions}>
            <Button
              title="İptal"
              onPress={() => setShowTimePicker(false)}
              variant="outline"
              style={styles.cancelButton}
            />
            <Button
              title="Onayla"
              onPress={confirmTimeChange}
              style={styles.confirmButton}
            />
          </View>
        </View>
      </View>
    </Modal>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <BackButton />
        <Text style={styles.headerTitle}>Çalışma Saatleri</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Info Card */}
        <View style={styles.infoCard}>
          <View style={styles.infoHeader}>
            <Ionicons name="time-outline" size={20} color={colors.text.primary} />
            <Text style={styles.infoTitle}>Çalışma Saatleri</Text>
          </View>
          <Text style={styles.infoText}>
            Müşterileriniz hangi saatlerde size ulaşabileceğini görebilecek. 
            Bu bilgiler randevu alımında ve müsaitlik durumunuzda kullanılacak.
          </Text>
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Hızlı Ayarlar</Text>
          <View style={styles.quickActions}>
            <TouchableOpacity
              style={styles.quickButton}
              onPress={() => {
                const weekdays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
                const newHours = { ...workingHours };
                weekdays.forEach(day => {
                  newHours[day] = { isOpen: true, start: '09:00', end: '18:00' };
                });
                setWorkingHours(newHours);
              }}
            >
              <Ionicons name="business-outline" size={18} color={colors.text.primary} />
              <Text style={styles.quickButtonText}>Hafta İçi</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickButton}
              onPress={() => {
                const weekend = ['saturday', 'sunday'];
                const newHours = { ...workingHours };
                weekend.forEach(day => {
                  newHours[day] = { isOpen: day === 'saturday', start: '10:00', end: '16:00' };
                });
                setWorkingHours(newHours);
              }}
            >
              <Ionicons name="calendar-outline" size={18} color={colors.text.primary} />
              <Text style={styles.quickButtonText}>Hafta Sonu</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickButton}
              onPress={() => {
                const newHours = { ...workingHours };
                Object.keys(newHours).forEach(day => {
                  newHours[day] = { isOpen: false, start: '09:00', end: '18:00' };
                });
                setWorkingHours(newHours);
              }}
            >
              <Ionicons name="pause-circle-outline" size={18} color={colors.text.secondary} />
              <Text style={styles.quickButtonText}>Tümünü Kapat</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Weekly Schedule */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Haftalık Program</Text>
          <View style={styles.scheduleContainer}>
            {Object.keys(dayNames).map(day => renderDayRow(day))}
          </View>
        </View>

        {/* Summary */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryHeader}>
            <Ionicons name="analytics-outline" size={18} color={colors.text.primary} />
            <Text style={styles.summaryTitle}>Özet</Text>
          </View>
          
          <View style={styles.summaryGrid}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryNumber}>
                {Object.values(workingHours).filter(day => day.isOpen).length}
              </Text>
              <Text style={styles.summaryLabel}>Açık Gün</Text>
            </View>
            
            <View style={styles.summaryItem}>
              <Text style={styles.summaryNumber}>
                {(() => {
                  const openDays = Object.values(workingHours).filter(day => day.isOpen);
                  if (openDays.length === 0) return '0';
                  const totalMinutes = openDays.reduce((acc, day) => {
                    const start = parseInt(day.start.replace(':', ''));
                    const end = parseInt(day.end.replace(':', ''));
                    return acc + (end - start);
                  }, 0);
                  const totalHours = Math.round(totalMinutes / 100);
                  return totalHours;
                })()}
              </Text>
              <Text style={styles.summaryLabel}>Haftalık Saat</Text>
            </View>
            
            <View style={styles.summaryItem}>
              <Text style={styles.summaryNumber}>
                {(() => {
                  const openDays = Object.values(workingHours).filter(day => day.isOpen);
                  if (openDays.length === 0) return '0';
                  const totalMinutes = openDays.reduce((acc, day) => {
                    const start = parseInt(day.start.replace(':', ''));
                    const end = parseInt(day.end.replace(':', ''));
                    return acc + (end - start);
                  }, 0);
                  const avgHours = Math.round(totalMinutes / openDays.length / 100);
                  return avgHours;
                })()}
              </Text>
              <Text style={styles.summaryLabel}>Günlük Ort.</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Save Button */}
      <View style={styles.buttonContainer}>
        <Button
          title={loading ? 'Kaydediliyor...' : 'Çalışma Saatlerini Kaydet'}
          onPress={saveWorkingHours}
          disabled={loading}
          style={styles.saveButton}
        />
      </View>

      {renderTimePickerModal()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.primary,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text.primary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  
  // Info Card
  infoCard: {
    backgroundColor: colors.background.secondary,
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
    marginBottom: spacing.lg,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border.primary,
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
    marginLeft: spacing.sm,
  },
  infoText: {
    fontSize: 14,
    color: colors.text.secondary,
    lineHeight: 20,
  },
  
  // Section
  section: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: spacing.md,
  },
  
  // Quick Actions
  quickActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  quickButton: {
    flex: 1,
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border.primary,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  quickButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text.primary,
  },
  
  // Schedule
  scheduleContainer: {
    gap: spacing.sm,
  },
  dayCard: {
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border.primary,
  },
  dayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dayInfo: {
    flex: 1,
  },
  dayName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusIcon: {
    marginRight: spacing.xs,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border.primary,
  },
  timeSection: {
    flex: 1,
    alignItems: 'center',
  },
  timeLabel: {
    fontSize: 12,
    color: colors.text.secondary,
    marginBottom: spacing.sm,
  },
  timeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.primary,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border.primary,
    minWidth: 80,
    justifyContent: 'center',
    gap: spacing.xs,
  },
  timeButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text.primary,
  },
  
  // Summary
  summaryCard: {
    backgroundColor: colors.background.secondary,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border.primary,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
    marginLeft: spacing.sm,
  },
  summaryGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  summaryItem: {
    alignItems: 'center',
    flex: 1,
  },
  summaryNumber: {
    fontSize: 20,
    fontWeight: '700',
    color: '#4B6382',
    marginBottom: spacing.xs,
  },
  summaryLabel: {
    fontSize: 12,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  
  // Button Container
  buttonContainer: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    backgroundColor: colors.background.primary,
    borderTopWidth: 1,
    borderTopColor: colors.border.primary,
  },
  saveButton: {
    backgroundColor: '#4B6382',
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
  },
  
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: colors.background.primary,
    borderRadius: borderRadius.lg,
    width: '80%',
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.primary,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text.primary,
  },
  closeButton: {
    padding: spacing.sm,
  },
  timeList: {
    maxHeight: 300,
  },
  timeOption: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.primary,
  },
  selectedTimeOption: {
    backgroundColor: '#4B6382' + '10',
  },
  timeOptionText: {
    fontSize: 16,
    color: colors.text.primary,
  },
  selectedTimeOptionText: {
    color: '#4B6382',
    fontWeight: '600',
  },
  modalActions: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    gap: spacing.md,
  },
  cancelButton: {
    flex: 1,
  },
  confirmButton: {
    flex: 1,
  },
});