import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
  RefreshControl,
  Alert,
  Modal,
  Switch,
  TextInput,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { useTheme } from '@/context/ThemeContext';
import { RootStackParamList } from '@/navigation/AppNavigator';
import ScreenHeader from '@/shared/components/ScreenHeader';
import EmptyState from '@/shared/components/NoDataCard';
import ErrorState from '@/shared/components/ErrorState';
import LoadingSkeleton from '@/shared/components/LoadingSkeleton';
import { spacing, borderRadius } from '@/theme/theme';
import notificationService from '@/features/notifications/services/notificationService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';

type RemindersScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Reminders'>;

interface Reminder {
  id: string;
  title: string;
  description: string;
  type: 'appointment' | 'maintenance' | 'custom';
  appointmentId?: string;
  date: Date;
  enabled: boolean;
  repeatType?: 'none' | 'daily' | 'weekly' | 'monthly';
  reminderTime: number; // dakika cinsinden (örn: 60 = 1 saat önce)
}

const RemindersScreen = () => {
  const navigation = useNavigation<RemindersScreenNavigationProp>();
  const { theme, isDark } = useTheme();
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingReminder, setEditingReminder] = useState<Reminder | null>(null);

  const [reminderForm, setReminderForm] = useState({
    title: '',
    description: '',
    type: 'custom' as 'appointment' | 'maintenance' | 'custom',
    date: new Date(),
    reminderTime: 60, // 1 saat önce
    repeatType: 'none' as 'none' | 'daily' | 'weekly' | 'monthly',
    enabled: true,
  });

  useEffect(() => {
    loadReminders();
  }, []);

  const loadReminders = async () => {
    try {
      setError(null);
      // Local storage'dan hatırlatıcıları yükle
      const storedReminders = await AsyncStorage.getItem('user_reminders');
      if (storedReminders) {
        try {
          const parsed = JSON.parse(storedReminders);
          if (Array.isArray(parsed)) {
            const remindersWithDates = parsed
              .filter((r: any) => r && r.date) // Geçerli reminder kontrolü
              .map((r: any) => {
                const date = new Date(r.date);
                // Invalid date kontrolü
                if (isNaN(date.getTime())) {
                  console.warn('Invalid date in reminder:', r.date);
                  return null;
                }
                return {
                  ...r,
                  date,
                };
              })
              .filter((r: any) => r !== null) as Reminder[]; // Null'ları filtrele
            setReminders(remindersWithDates);
          } else {
            setReminders([]);
          }
        } catch (parseError) {
          console.error('Error parsing reminders:', parseError);
          setReminders([]);
        }
      }
    } catch (err: any) {
      console.error('RemindersScreen: Error loading reminders:', err);
      setError('Hatırlatıcılar yüklenirken bir hata oluştu');
      setReminders([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const saveReminders = async (updatedReminders: Reminder[]) => {
    try {
      await AsyncStorage.setItem('user_reminders', JSON.stringify(updatedReminders));
      setReminders(updatedReminders);
    } catch (err) {
      console.error('Error saving reminders:', err);
      Alert.alert('Hata', 'Hatırlatıcılar kaydedilirken bir hata oluştu');
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadReminders();
  };

  const handleAddReminder = () => {
    if (!reminderForm.title.trim()) {
      Alert.alert('Hata', 'Lütfen bir başlık girin');
      return;
    }

    const newReminder: Reminder = {
      id: Date.now().toString(),
      title: reminderForm.title,
      description: reminderForm.description,
      type: reminderForm.type,
      date: reminderForm.date,
      enabled: reminderForm.enabled,
      reminderTime: reminderForm.reminderTime,
      repeatType: reminderForm.repeatType,
    };

    const updatedReminders = [...reminders, newReminder];
    saveReminders(updatedReminders);
    
    // Bildirim zamanla
    if (newReminder.enabled) {
      scheduleReminderNotification(newReminder);
    }

    setShowAddModal(false);
    resetForm();
  };

  const handleEditReminder = () => {
    if (!editingReminder || !reminderForm.title.trim()) {
      Alert.alert('Hata', 'Lütfen bir başlık girin');
      return;
    }

    const updatedReminders = reminders.map((r) =>
      r.id === editingReminder.id
        ? {
            ...r,
            ...reminderForm,
          }
        : r
    );

    saveReminders(updatedReminders);
    setShowAddModal(false);
    setEditingReminder(null);
    resetForm();
  };

  const handleDeleteReminder = (id: string) => {
    Alert.alert(
      'Hatırlatıcıyı Sil',
      'Bu hatırlatıcıyı silmek istediğinizden emin misiniz?',
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Sil',
          style: 'destructive',
          onPress: () => {
            const updatedReminders = reminders.filter((r) => r.id !== id);
            saveReminders(updatedReminders);
            // Bildirim iptal et
            notificationService.cancelNotification(id);
          },
        },
      ]
    );
  };

  const toggleReminder = (id: string) => {
    const updatedReminders = reminders.map((r) => {
      if (r.id === id) {
        const updated = { ...r, enabled: !r.enabled };
        if (updated.enabled) {
          scheduleReminderNotification(updated);
        } else {
          notificationService.cancelNotification(id);
        }
        return updated;
      }
      return r;
    });
    saveReminders(updatedReminders);
  };

  const scheduleReminderNotification = async (reminder: Reminder) => {
    try {
      const reminderDate = new Date(reminder.date);
      reminderDate.setMinutes(reminderDate.getMinutes() - reminder.reminderTime);

      if (reminderDate > new Date()) {
        await notificationService.scheduleLocalNotification(
          reminder.title,
          reminder.description || 'Hatırlatıcı',
          {
            type: 'reminder',
            reminderId: reminder.id,
          },
          { date: reminderDate } as Notifications.NotificationTriggerInput
        );
      }
    } catch (error) {
      console.error('Error scheduling reminder:', error);
    }
  };

  const resetForm = () => {
    setReminderForm({
      title: '',
      description: '',
      type: 'custom',
      date: new Date(),
      reminderTime: 60,
      repeatType: 'none',
      enabled: true,
    });
  };

  const openEditModal = (reminder: Reminder) => {
    setEditingReminder(reminder);
    setReminderForm({
      title: reminder.title,
      description: reminder.description,
      type: reminder.type,
      date: reminder.date,
      reminderTime: reminder.reminderTime,
      repeatType: reminder.repeatType || 'none',
      enabled: reminder.enabled,
    });
    setShowAddModal(true);
  };

  const getReminderIcon = (type: string) => {
    switch (type) {
      case 'appointment':
        return 'calendar-outline';
      case 'maintenance':
        return 'build-outline';
      default:
        return 'notifications-outline';
    }
  };

  const getReminderTypeText = (type: string) => {
    switch (type) {
      case 'appointment':
        return 'Randevu';
      case 'maintenance':
        return 'Bakım';
      default:
        return 'Özel';
    }
  };

  const formatReminderTime = (minutes: number) => {
    if (minutes < 60) {
      return `${minutes} dakika önce`;
    } else if (minutes < 1440) {
      const hours = Math.floor(minutes / 60);
      return `${hours} saat önce`;
    } else {
      const days = Math.floor(minutes / 1440);
      return `${days} gün önce`;
    }
  };

  const renderReminderItem = ({ item }: { item: Reminder }) => (
    <TouchableOpacity
      style={[
        styles.reminderCard,
        {
          backgroundColor: isDark ? theme.colors.background.secondary : '#FFFFFF',
          ...theme.shadows.card,
        }
      ]}
      onPress={() => openEditModal(item)}
      activeOpacity={0.7}
    >
      <View style={styles.reminderHeader}>
        <View
          style={[
            styles.reminderIconContainer,
            { backgroundColor: isDark ? theme.colors.background.tertiary : '#F5F5F5' }
          ]}
        >
          <Ionicons
            name={getReminderIcon(item.type) as any}
            size={24}
            color={theme.colors.primary.main}
          />
        </View>
        <View style={styles.reminderInfo}>
          <Text
            style={[
              styles.reminderTitle,
              { color: theme.colors.text.primary }
            ]}
          >
            {item.title}
          </Text>
          <Text
            style={[
              styles.reminderType,
              { color: theme.colors.text.secondary }
            ]}
          >
            {getReminderTypeText(item.type)}
          </Text>
        </View>
        <Switch
          value={item.enabled}
          onValueChange={() => toggleReminder(item.id)}
          trackColor={{
            false: isDark ? theme.colors.background.tertiary : '#E5E5E5',
            true: theme.colors.primary.main,
          }}
          thumbColor="#FFFFFF"
        />
      </View>

      {item.description ? (
        <Text
          style={[
            styles.reminderDescription,
            { color: theme.colors.text.secondary }
          ]}
        >
          {item.description}
        </Text>
      ) : null}

      <View style={styles.reminderDetails}>
        <View style={styles.reminderDetailRow}>
          <Ionicons
            name="time-outline"
            size={16}
            color={theme.colors.text.tertiary}
          />
          <Text
            style={[
              styles.reminderDetailText,
              { color: theme.colors.text.secondary }
            ]}
          >
            {format(item.date, 'dd MMMM yyyy, EEEE', { locale: tr })}
          </Text>
        </View>
        <View style={styles.reminderDetailRow}>
          <Ionicons
            name="notifications-outline"
            size={16}
            color={theme.colors.text.tertiary}
          />
          <Text
            style={[
              styles.reminderDetailText,
              { color: theme.colors.text.secondary }
            ]}
          >
            {formatReminderTime(item.reminderTime)} hatırlat
          </Text>
        </View>
        {item.repeatType && item.repeatType !== 'none' && (
          <View style={styles.reminderDetailRow}>
            <Ionicons
              name="repeat-outline"
              size={16}
              color={theme.colors.text.tertiary}
            />
            <Text
              style={[
                styles.reminderDetailText,
                { color: theme.colors.text.secondary }
              ]}
            >
              {item.repeatType === 'daily'
                ? 'Günlük'
                : item.repeatType === 'weekly'
                ? 'Haftalık'
                : 'Aylık'}
            </Text>
          </View>
        )}
      </View>

      <TouchableOpacity
        style={styles.deleteButton}
        onPress={() => handleDeleteReminder(item.id)}
        activeOpacity={0.7}
      >
        <Ionicons name="trash-outline" size={20} color={theme.colors.error.main} />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  if (loading && !refreshing) {
    return (
      <SafeAreaView
        style={[
          styles.container,
          { backgroundColor: isDark ? theme.colors.background.primary : '#F2F2F7' }
        ]}
      >
        <ScreenHeader title="Hatırlatıcılar" />
        <LoadingSkeleton variant="list" count={5} />
      </SafeAreaView>
    );
  }

  if (error && !refreshing) {
    return (
      <SafeAreaView
        style={[
          styles.container,
          { backgroundColor: isDark ? theme.colors.background.primary : '#F2F2F7' }
        ]}
      >
        <ScreenHeader title="Hatırlatıcılar" />
        <ErrorState message={error} onRetry={loadReminders} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[
        styles.container,
        { backgroundColor: isDark ? theme.colors.background.primary : '#F2F2F7' }
      ]}
    >
      {/* Header */}
      <ScreenHeader
        title="Hatırlatıcılar"
        rightComponent={
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => {
              resetForm();
              setEditingReminder(null);
              setShowAddModal(true);
            }}
          >
            <Ionicons name="add" size={24} color={theme.colors.primary.main} />
          </TouchableOpacity>
        }
      />

      {/* Reminders List */}
      {reminders.length === 0 ? (
        <EmptyState
          icon="notifications-outline"
          title="Hatırlatıcı Bulunamadı"
          subtitle="Henüz hatırlatıcı oluşturmadınız"
          actionText="Hatırlatıcı Oluştur"
          onActionPress={() => {
            resetForm();
            setEditingReminder(null);
            setShowAddModal(true);
          }}
        />
      ) : (
        <FlatList
          data={reminders}
          renderItem={renderReminderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={theme.colors.primary.main}
            />
          }
        />
      )}

      {/* Add/Edit Modal */}
      <Modal
        visible={showAddModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => {
          setShowAddModal(false);
          setEditingReminder(null);
          resetForm();
        }}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalContent,
              {
                backgroundColor: isDark
                  ? theme.colors.background.secondary
                  : '#FFFFFF',
              }
            ]}
          >
            <View style={styles.modalHeader}>
              <Text
                style={[
                  styles.modalTitle,
                  { color: theme.colors.text.primary }
                ]}
              >
                {editingReminder ? 'Hatırlatıcı Düzenle' : 'Yeni Hatırlatıcı'}
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setShowAddModal(false);
                  setEditingReminder(null);
                  resetForm();
                }}
              >
                <Ionicons name="close" size={24} color={theme.colors.text.primary} />
              </TouchableOpacity>
            </View>

            <View style={styles.form}>
              <View style={styles.inputGroup}>
                <Text
                  style={[
                    styles.label,
                    { color: theme.colors.text.primary }
                  ]}
                >
                  Başlık *
                </Text>
                <TextInput
                  style={[
                    styles.input,
                    {
                      backgroundColor: isDark
                        ? theme.colors.background.tertiary
                        : '#F5F5F5',
                      color: theme.colors.text.primary,
                      borderColor: theme.colors.border.primary,
                    }
                  ]}
                  value={reminderForm.title}
                  onChangeText={(text) =>
                    setReminderForm({ ...reminderForm, title: text })
                  }
                  placeholder="Hatırlatıcı başlığı"
                  placeholderTextColor={theme.colors.text.tertiary}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text
                  style={[
                    styles.label,
                    { color: theme.colors.text.primary }
                  ]}
                >
                  Açıklama
                </Text>
                <TextInput
                  style={[
                    styles.input,
                    styles.textArea,
                    {
                      backgroundColor: isDark
                        ? theme.colors.background.tertiary
                        : '#F5F5F5',
                      color: theme.colors.text.primary,
                      borderColor: theme.colors.border.primary,
                    }
                  ]}
                  value={reminderForm.description}
                  onChangeText={(text) =>
                    setReminderForm({ ...reminderForm, description: text })
                  }
                  placeholder="Hatırlatıcı açıklaması (isteğe bağlı)"
                  placeholderTextColor={theme.colors.text.tertiary}
                  multiline
                  numberOfLines={3}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text
                  style={[
                    styles.label,
                    { color: theme.colors.text.primary }
                  ]}
                >
                  Hatırlatma Zamanı
                </Text>
                <View style={styles.reminderTimeOptions}>
                  {[15, 30, 60, 120, 1440].map((minutes) => (
                    <TouchableOpacity
                      key={minutes}
                      style={[
                        styles.timeOption,
                        {
                          backgroundColor:
                            reminderForm.reminderTime === minutes
                              ? theme.colors.primary.main
                              : isDark
                              ? theme.colors.background.tertiary
                              : '#F5F5F5',
                          borderColor: theme.colors.border.primary,
                        }
                      ]}
                      onPress={() =>
                        setReminderForm({ ...reminderForm, reminderTime: minutes })
                      }
                    >
                      <Text
                        style={[
                          styles.timeOptionText,
                          {
                            color:
                              reminderForm.reminderTime === minutes
                                ? '#FFFFFF'
                                : theme.colors.text.primary,
                          }
                        ]}
                      >
                        {formatReminderTime(minutes)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.switchRow}>
                <Text
                  style={[
                    styles.label,
                    { color: theme.colors.text.primary }
                  ]}
                >
                  Aktif
                </Text>
                <Switch
                  value={reminderForm.enabled}
                  onValueChange={(value) =>
                    setReminderForm({ ...reminderForm, enabled: value })
                  }
                  trackColor={{
                    false: isDark ? theme.colors.background.tertiary : '#E5E5E5',
                    true: theme.colors.primary.main,
                  }}
                  thumbColor="#FFFFFF"
                />
              </View>

              <TouchableOpacity
                style={[
                  styles.saveButton,
                  { backgroundColor: theme.colors.primary.main }
                ]}
                onPress={editingReminder ? handleEditReminder : handleAddReminder}
              >
                <Text style={styles.saveButtonText}>
                  {editingReminder ? 'Kaydet' : 'Oluştur'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  headerRight: {
    width: 40,
  },
  addButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    padding: spacing.md,
    gap: spacing.md,
  },
  reminderCard: {
    borderRadius: borderRadius.card,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  reminderHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  reminderIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  reminderInfo: {
    flex: 1,
  },
  reminderTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  reminderType: {
    fontSize: 13,
  },
  reminderDescription: {
    fontSize: 14,
    marginBottom: spacing.sm,
    marginLeft: 56,
  },
  reminderDetails: {
    marginTop: spacing.sm,
    gap: spacing.xs,
  },
  reminderDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginLeft: 56,
  },
  reminderDetailText: {
    fontSize: 13,
  },
  deleteButton: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
    padding: spacing.xs,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: borderRadius.lg,
    borderTopRightRadius: borderRadius.lg,
    padding: spacing.lg,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
  },
  form: {
    gap: spacing.md,
  },
  inputGroup: {
    marginBottom: spacing.md,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: spacing.sm,
  },
  input: {
    borderWidth: 1,
    borderRadius: borderRadius.input,
    padding: spacing.md,
    fontSize: 16,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  reminderTimeOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  timeOption: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.button,
    borderWidth: 1,
  },
  timeOptionText: {
    fontSize: 14,
    fontWeight: '500',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  saveButton: {
    padding: spacing.md,
    borderRadius: borderRadius.button,
    alignItems: 'center',
    marginTop: spacing.md,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default RemindersScreen;

