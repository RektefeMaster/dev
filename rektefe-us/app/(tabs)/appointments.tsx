import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, FlatList, Alert, ActivityIndicator } from 'react-native';
import { Text, Button, Card, Avatar, Chip, SegmentedButtons } from 'react-native-paper';
import { getMechanicAppointments, Appointment, confirmAppointment, completeAppointment, rejectAppointment } from '../../services/appointments';
import { COLORS, SIZES, SERVICE_CATEGORIES } from '../../constants/config';
import { useFocusEffect, useRouter } from 'expo-router';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { SkeletonLoader, SkeletonItem } from '../../components/SkeletonLoader';

type AppointmentStatus = 'pending' | 'confirmed' | 'completed' | 'past';

const AppointmentSkeleton = () => (
    <View style={styles.card}>
      <SkeletonLoader>
          <View style={{ flexDirection: 'row', alignItems: 'center', padding: 16 }}>
            <SkeletonItem style={{ width: 40, height: 40, borderRadius: 20 }}/>
            <View style={{ marginLeft: 16 }}>
                <SkeletonItem style={{ width: 120, height: 20, marginBottom: 8 }}/>
                <SkeletonItem style={{ width: 180, height: 16 }}/>
            </View>
          </View>
          <View style={{ paddingHorizontal: 16, paddingBottom: 16 }}>
            <SkeletonItem style={{ width: '80%', height: 18, marginBottom: 16 }}/>
            <View style={{ flexDirection: 'row', gap: 8 }}>
                <SkeletonItem style={{ width: 100, height: 30, borderRadius: 16 }}/>
                <SkeletonItem style={{ width: 120, height: 30, borderRadius: 16 }}/>
            </View>
          </View>
      </SkeletonLoader>
    </View>
);

export default function AppointmentsScreen() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [filteredAppointments, setFilteredAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<AppointmentStatus>('pending');
  const router = useRouter();

  const fetchAppointments = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getMechanicAppointments();
      setAppointments(data);
    } catch (err) {
      setError('Randevular yüklenirken bir hata oluştu.');
      Alert.alert('Hata', 'Randevular yüklenirken bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchAppointments();
    }, [])
  );

  useEffect(() => {
    let filtered: Appointment[] = [];
    const now = new Date();

    if (activeTab === 'past') {
      filtered = appointments.filter(
        (app) => app.status === 'completed' || app.status === 'cancelled' || new Date(app.appointmentDate) < now
      );
    } else {
      filtered = appointments.filter((app) => app.status === activeTab);
    }
    setFilteredAppointments(filtered.sort((a, b) => new Date(b.appointmentDate).getTime() - new Date(a.appointmentDate).getTime()));
  }, [appointments, activeTab]);

  const handleUpdateStatus = async (id: string, action: 'confirm' | 'complete' | 'reject') => {
    const originalAppointments = [...appointments];
    try {
        let updatedAppointment: Appointment;
        
        // Optimistic UI update
        const newAppointments = appointments.map(app => {
            if (app._id === id) {
                let newStatus: Appointment['status'] = app.status;
                if(action === 'confirm') newStatus = 'confirmed';
                if(action === 'complete') newStatus = 'completed';
                if(action === 'reject') newStatus = 'rejected';
                return { ...app, status: newStatus };
            }
            return app;
        });
        setAppointments(newAppointments);

        switch (action) {
            case 'confirm':
                updatedAppointment = await confirmAppointment(id);
                break;
            case 'complete':
                updatedAppointment = await completeAppointment(id);
                break;
            case 'reject':
                updatedAppointment = await rejectAppointment(id);
                break;
        }

        // Fetch latest data to ensure consistency
        fetchAppointments();

    } catch (err) {
        setAppointments(originalAppointments);
        Alert.alert('Hata', 'Randevu durumu güncellenirken bir hata oluştu.');
    }
  };

  const getServiceDetails = (serviceId: string) => {
    return SERVICE_CATEGORIES.find(s => s.id === serviceId);
  };

  const renderAppointmentCard = ({ item }: { item: Appointment }) => (
    <Card 
        style={styles.card}
        onPress={() => router.push({ pathname: '/appointmentDetail', params: { appointment: JSON.stringify(item) } })}
    >
      <Card.Title
        title={item.userId.name}
        subtitle={`${item.vehicleId.brand} ${item.vehicleId.modelName} - ${item.vehicleId.plateNumber}`}
        left={(props) => <Avatar.Image {...props} source={item.userId.avatar ? { uri: item.userId.avatar } : require('../../assets/images/icon.png')} />}
      />
      <Card.Content>
        <View style={styles.infoRow}>
          <Text style={styles.dateText}>
            {format(new Date(item.appointmentDate), 'dd MMMM yyyy, EEEE HH:mm', { locale: tr })}
          </Text>
        </View>
        <View style={styles.serviceChips}>
          {item.serviceTypes.map(id => {
            const service = getServiceDetails(id);
            return service ? (
              <Chip key={id} icon={service.icon} style={styles.chip}>{service.name}</Chip>
            ) : null;
          })}
        </View>
        {item.notes && <Text style={styles.notes}>Not: {item.notes}</Text>}
      </Card.Content>
      {item.status === 'pending' && (
        <Card.Actions>
            <Button onPress={() => handleUpdateStatus(item._id, 'reject')} textColor={COLORS.error}>Reddet</Button>
            <Button onPress={() => handleUpdateStatus(item._id, 'confirm')}>Onayla</Button>
        </Card.Actions>
      )}
      {item.status === 'confirmed' && (
        <Card.Actions>
             <Button onPress={() => handleUpdateStatus(item._id, 'complete')} icon="check-all">Tamamla</Button>
        </Card.Actions>
      )}
    </Card>
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <SegmentedButtons
            value={activeTab}
            onValueChange={(value) => setActiveTab(value as AppointmentStatus)}
            style={styles.segmentedButtons}
            buttons={[
                { value: 'pending', label: 'Bekleyen' },
                { value: 'confirmed', label: 'Onaylanan' },
                { value: 'completed', label: 'Tamamlanan' },
                { value: 'past', label: 'Geçmiş' },
            ]}
        />
        <View style={styles.list}>
            <AppointmentSkeleton />
            <AppointmentSkeleton />
            <AppointmentSkeleton />
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Text>{error}</Text>
        <Button onPress={fetchAppointments} style={{ marginTop: 16 }}>Tekrar Dene</Button>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <SegmentedButtons
        value={activeTab}
        onValueChange={(value) => setActiveTab(value as AppointmentStatus)}
        style={styles.segmentedButtons}
        buttons={[
          { value: 'pending', label: 'Bekleyen' },
          { value: 'confirmed', label: 'Onaylanan' },
          { value: 'completed', label: 'Tamamlanan' },
          { value: 'past', label: 'Geçmiş' },
        ]}
      />
      <FlatList
        data={filteredAppointments}
        renderItem={renderAppointmentCard}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.centerContainer}>
            <Text>Bu sekmede gösterilecek randevu yok.</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SIZES.padding,
  },
  segmentedButtons: {
    margin: SIZES.padding,
  },
  list: {
    paddingHorizontal: SIZES.padding,
    paddingBottom: SIZES.padding,
  },
  card: {
    marginBottom: SIZES.padding,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SIZES.small,
  },
  dateText: {
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.primary,
  },
  serviceChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SIZES.base,
    marginBottom: SIZES.small,
  },
  chip: {
    backgroundColor: COLORS.border,
  },
  notes: {
    fontStyle: 'italic',
    color: COLORS.textSecondary,
  },
}); 