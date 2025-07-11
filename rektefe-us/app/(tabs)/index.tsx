import React from 'react';
import { StyleSheet, View, ScrollView, RefreshControl } from 'react-native';
import { Text } from 'react-native-paper';
import { useAuth } from '../../context/AuthContext';
import { COLORS, SIZES } from '../../constants/config';

export default function HomeScreen() {
  const { user } = useAuth();
  const [refreshing, setRefreshing] = React.useState(false);

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    // Burada veri yenileme fonksiyonları çağrılacak.
    setTimeout(() => setRefreshing(false), 1000);
  }, []);

  return (
    <ScrollView 
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />
      }
    >
      <View style={styles.header}>
        <Text style={styles.title}>Hoş Geldin, {user?.name || 'Usta'}!</Text>
        <Text style={styles.subtitle}>İşte bugünün özeti</Text>
      </View>

      {/* İstatistik Kartları */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>5</Text>
          <Text style={styles.statLabel}>Bugünkü Randevu</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>₺1,250</Text>
          <Text style={styles.statLabel}>Günlük Kazanç</Text>
        </View>
      </View>

      {/* Yaklaşan Randevular */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Yaklaşan Randevular</Text>
        <View style={styles.appointmentCard}>
          <Text style={styles.appointmentTime}>14:30</Text>
          <View style={styles.appointmentDetails}>
            <Text style={styles.appointmentService}>Genel Bakım</Text>
            <Text style={styles.appointmentUser}>Ahmet Yılmaz</Text>
          </View>
        </View>
        <View style={styles.appointmentCard}>
          <Text style={styles.appointmentTime}>16:00</Text>
          <View style={styles.appointmentDetails}>
            <Text style={styles.appointmentService}>Lastik Değişimi</Text>
            <Text style={styles.appointmentUser}>Ayşe Kaya</Text>
          </View>
        </View>
    </View>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  contentContainer: {
    padding: SIZES.padding,
  },
  header: {
    marginBottom: SIZES.padding * 2,
  },
  title: {
    fontSize: SIZES.extraLarge,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  subtitle: {
    fontSize: SIZES.medium,
    color: COLORS.textSecondary,
    marginTop: SIZES.base,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SIZES.padding * 2,
  },
  statCard: {
    backgroundColor: COLORS.surface,
    borderRadius: SIZES.radius,
    padding: SIZES.padding,
    width: '48%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 3,
  },
  statNumber: {
    fontSize: SIZES.extraLarge,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  statLabel: {
    fontSize: SIZES.font,
    color: COLORS.textSecondary,
    marginTop: SIZES.base,
  },
  section: {
    marginBottom: SIZES.padding * 2,
  },
  sectionTitle: {
    fontSize: SIZES.large,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: SIZES.padding,
  },
  appointmentCard: {
    backgroundColor: COLORS.surface,
    borderRadius: SIZES.radius,
    padding: SIZES.padding,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SIZES.small,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 3,
  },
  appointmentTime: {
    fontSize: SIZES.medium,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginRight: SIZES.padding,
  },
  appointmentDetails: {
    flex: 1,
  },
  appointmentService: {
    fontSize: SIZES.medium,
    fontWeight: '500',
    color: COLORS.text,
  },
  appointmentUser: {
    fontSize: SIZES.font,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
});
