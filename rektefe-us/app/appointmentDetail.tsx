import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import React from 'react';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Text, Card, Avatar, Button, Chip, Divider } from 'react-native-paper';
import { Appointment, confirmAppointment, completeAppointment, rejectAppointment } from '../services/appointments';
import { COLORS, SIZES, SERVICE_CATEGORIES } from '../constants/config';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { useSnackbar } from '../context/SnackbarContext';

export default function AppointmentDetailModal() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { showSnackbar } = useSnackbar();
  const [appointment, setAppointment] = React.useState<Appointment | null>(null);
  const [loadingAction, setLoadingAction] = React.useState<'confirm' | 'complete' | 'reject' | null>(null);

  React.useEffect(() => {
    if (params.appointment) {
      setAppointment(JSON.parse(params.appointment as string));
    }
  }, [params]);

  if (!appointment) {
    return (
      <View style={styles.container}>
        <Text>Randevu bilgileri yüklenemedi.</Text>
      </View>
    );
  }

  const getServiceDetails = (serviceId: string) => {
    return SERVICE_CATEGORIES.find((s: any) => s.id === serviceId);
  };
  
  const handleUpdateStatus = async (action: 'confirm' | 'complete' | 'reject') => {
    setLoadingAction(action);
    try {
        let updatedAppointment: Appointment | null = null;
        switch (action) {
            case 'confirm':
                updatedAppointment = await confirmAppointment(appointment._id);
                break;
            case 'complete':
                updatedAppointment = await completeAppointment(appointment._id);
                break;
            case 'reject':
                updatedAppointment = await rejectAppointment(appointment._id);
                break;
        }
        if (updatedAppointment) {
            setAppointment(updatedAppointment);
        }
        
        const successMessage = `Randevu başarıyla ${action === 'confirm' ? 'onaylandı' : action === 'complete' ? 'tamamlandı' : 'reddedildi'}.`;
        showSnackbar(successMessage, 'success');
        router.back();

    } catch (err) {
        showSnackbar('İşlem sırasında bir hata oluştu.', 'error');
    } finally {
        setLoadingAction(null);
    }
  };


  return (
    <ScrollView style={styles.container}>
      <Stack.Screen options={{ title: 'Randevu Detayı', presentation: 'modal' }} />
      
      <Card style={styles.card}>
        <Card.Title
          title={appointment.userId.name}
          subtitle="Müşteri Bilgileri"
          left={(props) => <Avatar.Image {...props} source={appointment.userId.avatar ? { uri: appointment.userId.avatar } : require('../assets/images/default_avatar.png')} />}
        />
      </Card>
      
      <Card style={styles.card}>
        <Card.Title
          title="Araç Bilgileri"
          left={(props) => <Avatar.Icon {...props} icon="car" />}
        />
        <Card.Content>
            <Text style={styles.detailText}>Marka/Model: {appointment.vehicleId.brand} {appointment.vehicleId.modelName}</Text>
            <Text style={styles.detailText}>Plaka: {appointment.vehicleId.plateNumber}</Text>
            {appointment.vehicleId.year && <Text style={styles.detailText}>Yıl: {appointment.vehicleId.year}</Text>}
        </Card.Content>
      </Card>
      
      <Card style={styles.card}>
        <Card.Title
          title="Randevu Bilgileri"
          left={(props) => <Avatar.Icon {...props} icon="calendar-clock" />}
        />
        <Card.Content>
            <Text style={styles.dateText}>
                {format(new Date(appointment.appointmentDate), 'dd MMMM yyyy, EEEE HH:mm', { locale: tr })}
            </Text>
            <Divider style={styles.divider} />
            <Text style={styles.subheader}>Talep Edilen Hizmetler</Text>
            <View style={styles.serviceChips}>
                {appointment.serviceTypes.map((id: string) => {
                    const service = getServiceDetails(id);
                    return service ? (
                    <Chip key={id} icon={service.icon} style={styles.chip}>{service.name}</Chip>
                    ) : null;
                })}
            </View>
             {appointment.notes && (
                <>
                    <Divider style={styles.divider} />
                    <Text style={styles.subheader}>Müşteri Notu</Text>
                    <Text style={styles.notes}>{appointment.notes}</Text>
                </>
             )}
        </Card.Content>
      </Card>

      <View style={styles.actionsContainer}>
        {appointment.status === 'pending' && (
            <>
                <Button mode="outlined" onPress={() => handleUpdateStatus('reject')} disabled={!!loadingAction} loading={loadingAction === 'reject'} style={styles.rejectButton}>Reddet</Button>
                <Button mode="contained" onPress={() => handleUpdateStatus('confirm')} disabled={!!loadingAction} loading={loadingAction === 'confirm'} style={styles.confirmButton}>Onayla</Button>
            </>
        )}
        {appointment.status === 'confirmed' && (
            <Button mode="contained" onPress={() => handleUpdateStatus('complete')} disabled={!!loadingAction} loading={loadingAction === 'complete'} icon="check-all" style={styles.completeButton}>
                Randevuyu Tamamla
            </Button>
        )}
      </View>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  card: {
    margin: SIZES.padding,
    marginTop: 0,
    marginBottom: SIZES.padding,
  },
  detailText: {
    fontSize: SIZES.medium,
    lineHeight: SIZES.medium * 1.5,
  },
  dateText: {
    fontSize: SIZES.medium,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginBottom: SIZES.small,
  },
  divider: {
    marginVertical: SIZES.small,
  },
  subheader: {
    fontSize: SIZES.medium,
    fontWeight: 'bold',
    marginBottom: SIZES.small,
  },
  serviceChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SIZES.base,
  },
  chip: {
    backgroundColor: COLORS.border,
  },
  notes: {
    fontSize: SIZES.font,
    fontStyle: 'italic',
    color: COLORS.textSecondary,
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: SIZES.padding,
  },
  confirmButton: {
    flex: 1,
    marginLeft: SIZES.base,
  },
  rejectButton: {
    flex: 1,
    marginRight: SIZES.base,
  },
  completeButton: {
    flex: 1,
    backgroundColor: COLORS.success,
  }
}); 