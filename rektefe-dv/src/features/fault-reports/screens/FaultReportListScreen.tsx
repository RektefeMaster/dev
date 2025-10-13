import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import axios from 'axios';
import { API_URL } from '@/constants/config';
import { useAuth } from '@/context/AuthContext';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '@/context/ThemeContext';

type RootStackParamList = {
  FaultReportList: undefined;
  FaultReportDetail: { faultReportId: string };
  Main: { screen?: string };
};

type NavigationProp = StackNavigationProp<RootStackParamList>;

const FaultReportListScreen = () => {
  const navigation = useNavigation<NavigationProp>();
  const { token } = useAuth();
  const { theme } = useTheme();
  const [faultReports, setFaultReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<string>('all');

  const statusOptions = [
    { id: 'all', name: 'Tümü', color: theme.colors.text.primary },
    { id: 'pending', name: 'Beklemede', color: theme.colors.warning.main },
    { id: 'quoted', name: 'Teklif Alındı', color: theme.colors.primary.main },
    { id: 'accepted', name: 'Kabul Edildi', color: theme.colors.success.main },
    { id: 'in_progress', name: 'İşlemde', color: theme.colors.secondary.main },
    { id: 'payment_pending', name: 'Ödeme Bekliyor', color: theme.colors.warning.main },
    { id: 'paid', name: 'Ödendi', color: theme.colors.success.main },
    { id: 'completed', name: 'Tamamlandı', color: theme.colors.success.main },
    { id: 'cancelled', name: 'İptal Edildi / Red', color: theme.colors.error.main },
  ];

  useEffect(() => {
    fetchFaultReports();
  }, [selectedStatus]);

  const fetchFaultReports = async () => {
    try {
      setLoading(true);
      const params = selectedStatus !== 'all' ? { status: selectedStatus } : {};
      const response = await axios.get(`${API_URL}/fault-reports/my-reports`, {
        headers: { Authorization: `Bearer ${token}` },
        params,
      });

      if (response.data && response.data.success) {
        setFaultReports(response.data.data);
      }
    } catch (error) {
      Alert.alert('Hata', 'Arıza bildirimleri getirilirken bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchFaultReports();
    setRefreshing(false);
  };

  const getStatusColor = (status: string) => {
    const statusOption = statusOptions.find(option => option.id === status);
    return statusOption ? statusOption.color : theme.colors.text.secondary;
  };

  const getStatusName = (status: string) => {
    const statusOption = statusOptions.find(option => option.id === status);
    return statusOption ? statusOption.name : status;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('tr-TR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const renderFaultReport = (report: any) => (
    <TouchableOpacity
      key={report._id}
      style={[styles.faultReportCard, { backgroundColor: theme.colors.background.card, borderColor: theme.colors.border.primary }]}
      onPress={() => navigation.navigate('FaultReportDetail', { faultReportId: report._id })}
    >
      <View style={styles.cardHeader}>
        <View style={styles.vehicleInfo}>
          <Text style={[styles.vehicleName, { color: theme.colors.text.primary }]}>
            {report.vehicleId?.brand} {report.vehicleId?.modelName}
          </Text>
          <Text style={[styles.vehicleDetails, { color: theme.colors.text.secondary }]}>
            {report.vehicleId?.plateNumber} • {report.vehicleId?.year}
          </Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(report.status) }]}>
          <Text style={styles.statusText}>{getStatusName(report.status)}</Text>
        </View>
      </View>

      <View style={styles.cardContent}>
        <View style={styles.serviceInfo}>
          <MaterialCommunityIcons 
            name="wrench" 
            size={16} 
            color={theme.colors.primary.main} 
          />
          <Text style={[styles.serviceCategory, { color: theme.colors.text.primary }]}>
            {report.serviceCategory}
          </Text>
        </View>

        <Text style={[styles.faultDescription, { color: theme.colors.text.secondary }]} numberOfLines={2}>
          {report.faultDescription}
        </Text>

        <View style={styles.cardFooter}>
          <View style={styles.quotesInfo}>
            <Ionicons name="cash" size={16} color={theme.colors.success.main} />
            <Text style={[styles.quotesCount, { color: theme.colors.text.secondary }]}>
              {report.quotes?.length || 0} teklif
            </Text>
          </View>
          <Text style={[styles.dateText, { color: theme.colors.text.secondary }]}>
            {formatDate(report.createdAt)}
          </Text>
        </View>

        {report.photos && report.photos.length > 0 && (
          <View style={styles.mediaInfo}>
            <Ionicons name="camera" size={16} color={theme.colors.text.secondary} />
            <Text style={[styles.mediaCount, { color: theme.colors.text.secondary }]}>
              {report.photos.length} fotoğraf
            </Text>
          </View>
        )}

        {report.videos && report.videos.length > 0 && (
          <View style={styles.mediaInfo}>
            <Ionicons name="videocam" size={16} color={theme.colors.text.secondary} />
            <Text style={[styles.mediaCount, { color: theme.colors.text.secondary }]}>
              {report.videos.length} video
            </Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background.primary }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary.main} />
          <Text style={[styles.loadingText, { color: theme.colors.text.secondary }]}>
            Arıza bildirimleri yükleniyor...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background.primary }]}>
      <View style={[styles.header, { backgroundColor: theme.colors.background.card, borderBottomColor: theme.colors.border.primary }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={theme.colors.primary.main} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.text.primary }]}>Arıza Bildirimlerim</Text>
      </View>

      {/* Status Filter */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.statusFilter}
        contentContainerStyle={styles.statusFilterContent}
      >
        {statusOptions.map((option) => (
          <TouchableOpacity
            key={option.id}
            style={[
              styles.statusOption,
              { 
                backgroundColor: selectedStatus === option.id ? option.color : theme.colors.background.card,
                borderColor: theme.colors.border.primary
              }
            ]}
            onPress={() => setSelectedStatus(option.id)}
          >
            <Text
              style={[
                styles.statusOptionText,
                { 
                  color: selectedStatus === option.id ? '#fff' : option.color 
                }
              ]}
            >
              {option.name}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[theme.colors.primary.main]}
            tintColor={theme.colors.primary.main}
          />
        }
      >
        {faultReports.length === 0 ? (
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons 
              name="alert-circle-outline" 
              size={64} 
              color={theme.colors.text.secondary} 
            />
            <Text style={[styles.emptyTitle, { color: theme.colors.text.primary }]}>
              Arıza Bildirimi Yok
            </Text>
            <Text style={[styles.emptyDescription, { color: theme.colors.text.secondary }]}>
              {selectedStatus === 'all' 
                ? 'Henüz arıza bildirimi oluşturmadınız'
                : `${statusOptions.find(s => s.id === selectedStatus)?.name} durumunda arıza bildirimi bulunmuyor`
              }
            </Text>
            <TouchableOpacity
              style={[styles.createButton, { backgroundColor: theme.colors.primary.main }]}
              onPress={() => navigation.navigate('FaultReport')}
            >
              <Text style={styles.createButtonText}>Arıza Bildir</Text>
            </TouchableOpacity>
          </View>
        ) : (
          faultReports.map(renderFaultReport)
        )}
      </ScrollView>
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
    padding: 16,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginLeft: 16,
  },
  statusFilter: {
    maxHeight: 60,
  },
  statusFilterContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  statusOption: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  statusOptionText: {
    fontSize: 14,
    fontWeight: '500',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 64,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyDescription: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
  },
  createButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  createButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  faultReportCard: {
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  vehicleInfo: {
    flex: 1,
  },
  vehicleName: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  vehicleDetails: {
    fontSize: 14,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  cardContent: {
    padding: 16,
  },
  serviceInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  serviceCategory: {
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 8,
  },
  faultDescription: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  quotesInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  quotesCount: {
    fontSize: 14,
    marginLeft: 4,
  },
  dateText: {
    fontSize: 12,
  },
  mediaInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  mediaCount: {
    fontSize: 12,
    marginLeft: 4,
  },
});

export default FaultReportListScreen;
