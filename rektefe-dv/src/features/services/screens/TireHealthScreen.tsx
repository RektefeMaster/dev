import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  SafeAreaView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/context/ThemeContext';
import { RootStackParamList } from '@/navigation/AppNavigator';
import { BackButton, Card } from '@/shared/components';
import { apiService } from '@/shared/services/api';
import { typography, spacing, borderRadius } from '@/theme/theme';

type TireHealthRouteProp = RouteProp<RootStackParamList, 'TireHealth'>;

interface TireHealthRecord {
  _id: string;
  vehicleId: string;
  checkDate: string;
  treadDepth: [number, number, number, number];
  pressure: [number, number, number, number];
  condition: [string, string, string, string];
  overallCondition: 'excellent' | 'good' | 'fair' | 'poor' | 'critical';
  recommendations: string[];
  issues?: string[];
  notes?: string;
  nextCheckDate?: string;
  nextCheckKm?: number;
  mechanicId: {
    name: string;
    surname: string;
    shopName?: string;
  };
  createdAt: string;
}

interface Vehicle {
  _id: string;
  brand: string;
  modelName: string;
  year: number;
  plateNumber: string;
}

const TireHealthScreen = () => {
  const route = useRoute<TireHealthRouteProp>();
  const navigation = useNavigation();
  const { theme } = useTheme();
  const styles = createStyles(theme);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [healthHistory, setHealthHistory] = useState<TireHealthRecord[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);

  const vehicleId = route.params?.vehicleId;

  useEffect(() => {
    loadVehicles();
  }, []);

  useEffect(() => {
    if (selectedVehicle) {
      loadHealthHistory(selectedVehicle._id);
    }
  }, [selectedVehicle]);

  const loadVehicles = async () => {
    try {
      const response = await apiService.getVehicles();
      if (response.success && response.data) {
        const vehicleList = Array.isArray(response.data) ? response.data : response.data.vehicles || [];
        setVehicles(vehicleList);
        
        if (vehicleId) {
          const vehicle = vehicleList.find((v: Vehicle) => v._id === vehicleId);
          if (vehicle) {
            setSelectedVehicle(vehicle);
          }
        } else if (vehicleList.length > 0) {
          setSelectedVehicle(vehicleList[0]);
        }
      }
    } catch (error) {
      console.error('Araç listesi yükleme hatası:', error);
    }
  };

  const loadHealthHistory = async (vId: string) => {
    try {
      setLoading(true);
      const response = await apiService.getTireHealthHistory(vId);
      
      if (response.success && response.data) {
        setHealthHistory(response.data);
      } else {
        setHealthHistory([]);
      }
    } catch (error) {
      console.error('Lastik geçmişi yükleme hatası:', error);
      setHealthHistory([]);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    if (selectedVehicle) {
      setRefreshing(true);
      await loadHealthHistory(selectedVehicle._id);
      setRefreshing(false);
    }
  };

  const getConditionColor = (condition: string) => {
    const colors: Record<string, string> = {
      'excellent': '#10B981',
      'good': '#10B981',
      'fair': '#F59E0B',
      'poor': '#EF4444',
      'critical': '#DC2626',
      'new': '#10B981',
      'used': '#F59E0B',
      'damaged': '#EF4444',
      'worn': '#EF4444'
    };
    return colors[condition] || '#6B7280';
  };

  const getConditionText = (condition: string) => {
    const texts: Record<string, string> = {
      'excellent': 'Mükemmel',
      'good': 'İyi',
      'fair': 'Orta',
      'poor': 'Kötü',
      'critical': 'Kritik',
      'new': 'Yeni',
      'used': 'Kullanılmış',
      'damaged': 'Hasarlı',
      'worn': 'Aşınmış'
    };
    return texts[condition] || condition;
  };

  const getTirePositionLabel = (index: number) => {
    const labels = ['Sol Ön', 'Sağ Ön', 'Sol Arka', 'Sağ Arka'];
    return labels[index];
  };

  const renderLatestHealth = () => {
    if (healthHistory.length === 0) {
      return (
        <Card style={styles.section}>
          <View style={styles.emptyState}>
            <Ionicons name="car-outline" size={64} color={theme.colors.text.tertiary} />
            <Text style={[styles.emptyTitle, { color: theme.colors.text.primary }]}>
              Henüz Kontrol Kaydı Yok
            </Text>
            <Text style={[styles.emptySubtitle, { color: theme.colors.text.secondary }]}>
              Aracınızın lastikleri bir usta tarafından kontrol edildiğinde geçmiş burada görünecek
            </Text>
          </View>
        </Card>
      );
    }

    const latest = healthHistory[0];
    const conditionColor = getConditionColor(latest.overallCondition);

    return (
      <Card style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.colors.text.primary }]}>
          Son Kontrol Durumu
        </Text>
        
        {/* Genel Durum */}
        <View style={[styles.overallConditionCard, { backgroundColor: conditionColor + '10', borderColor: conditionColor }]}>
          <View style={styles.overallConditionHeader}>
            <View style={[styles.conditionIcon, { backgroundColor: conditionColor }]}>
              <Ionicons name="shield-checkmark" size={32} color="#FFFFFF" />
            </View>
            <View style={styles.overallConditionInfo}>
              <Text style={[styles.overallConditionLabel, { color: theme.colors.text.secondary }]}>
                Genel Durum
              </Text>
              <Text style={[styles.overallConditionValue, { color: conditionColor }]}>
                {getConditionText(latest.overallCondition)}
              </Text>
            </View>
          </View>
          <Text style={[styles.checkDate, { color: theme.colors.text.secondary }]}>
            Son Kontrol: {new Date(latest.checkDate).toLocaleDateString('tr-TR')}
          </Text>
        </View>

        {/* Lastik Detayları */}
        <View style={styles.tiresGrid}>
          {latest.treadDepth.map((depth, index) => (
            <View key={index} style={[styles.tireCard, { backgroundColor: theme.colors.background.secondary }]}>
              <View style={styles.tireHeader}>
                <Ionicons 
                  name={index < 2 ? 'radio-button-on' : 'radio-button-off'} 
                  size={24} 
                  color={getConditionColor(latest.condition[index])} 
                />
                <Text style={[styles.tirePosition, { color: theme.colors.text.primary }]}>
                  {getTirePositionLabel(index)}
                </Text>
              </View>
              
              <View style={styles.tireMetrics}>
                <View style={styles.metric}>
                  <Text style={[styles.metricLabel, { color: theme.colors.text.secondary }]}>
                    Diş Derinliği
                  </Text>
                  <Text style={[styles.metricValue, { color: theme.colors.text.primary }]}>
                    {depth} mm
                  </Text>
                </View>
                
                <View style={styles.metric}>
                  <Text style={[styles.metricLabel, { color: theme.colors.text.secondary }]}>
                    Basınç
                  </Text>
                  <Text style={[styles.metricValue, { color: theme.colors.text.primary }]}>
                    {latest.pressure[index]} bar
                  </Text>
                </View>
              </View>

              <View style={[styles.tireConditionBadge, { backgroundColor: getConditionColor(latest.condition[index]) }]}>
                <Text style={styles.tireConditionText}>
                  {getConditionText(latest.condition[index])}
                </Text>
              </View>
            </View>
          ))}
        </View>

        {/* Tavsiyeler */}
        {latest.recommendations.length > 0 && (
          <View style={[styles.recommendationsCard, { backgroundColor: theme.colors.info.main + '10' }]}>
            <View style={styles.recommendationsHeader}>
              <Ionicons name="bulb" size={24} color={theme.colors.info.main} />
              <Text style={[styles.recommendationsTitle, { color: theme.colors.text.primary }]}>
                Tavsiyeler
              </Text>
            </View>
            {latest.recommendations.map((rec, index) => (
              <View key={index} style={styles.recommendationItem}>
                <Ionicons name="checkmark-circle" size={20} color={theme.colors.info.main} />
                <Text style={[styles.recommendationText, { color: theme.colors.text.primary }]}>
                  {rec}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Sorunlar */}
        {latest.issues && latest.issues.length > 0 && (
          <View style={[styles.issuesCard, { backgroundColor: theme.colors.warning.main + '10' }]}>
            <View style={styles.issuesHeader}>
              <Ionicons name="alert-circle" size={24} color={theme.colors.warning.main} />
              <Text style={[styles.issuesTitle, { color: theme.colors.text.primary }]}>
                Tespit Edilen Sorunlar
              </Text>
            </View>
            {latest.issues.map((issue, index) => (
              <View key={index} style={styles.issueItem}>
                <Ionicons name="warning" size={20} color={theme.colors.warning.main} />
                <Text style={[styles.issueText, { color: theme.colors.text.primary }]}>
                  {issue}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Sonraki Kontrol */}
        {latest.nextCheckDate && (
          <View style={[styles.nextCheckCard, { backgroundColor: theme.colors.background.secondary }]}>
            <View style={styles.nextCheckRow}>
              <Ionicons name="calendar-outline" size={20} color={theme.colors.text.secondary} />
              <Text style={[styles.nextCheckLabel, { color: theme.colors.text.secondary }]}>
                Sonraki Kontrol:
              </Text>
              <Text style={[styles.nextCheckValue, { color: theme.colors.primary.main }]}>
                {new Date(latest.nextCheckDate).toLocaleDateString('tr-TR')}
              </Text>
            </View>
            {latest.nextCheckKm && (
              <View style={styles.nextCheckRow}>
                <Ionicons name="speedometer-outline" size={20} color={theme.colors.text.secondary} />
                <Text style={[styles.nextCheckLabel, { color: theme.colors.text.secondary }]}>
                  veya
                </Text>
                <Text style={[styles.nextCheckValue, { color: theme.colors.primary.main }]}>
                  {latest.nextCheckKm.toLocaleString('tr-TR')} km'de
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Kontrol Eden Usta */}
        <View style={[styles.mechanicInfo, { backgroundColor: theme.colors.background.secondary }]}>
          <Ionicons name="person-circle-outline" size={24} color={theme.colors.text.secondary} />
          <View style={styles.mechanicInfoText}>
            <Text style={[styles.mechanicLabel, { color: theme.colors.text.secondary }]}>
              Kontrol Eden:
            </Text>
            <Text style={[styles.mechanicName, { color: theme.colors.text.primary }]}>
              {latest.mechanicId.name} {latest.mechanicId.surname}
              {latest.mechanicId.shopName && ` - ${latest.mechanicId.shopName}`}
            </Text>
          </View>
        </View>
      </Card>
    );
  };

  const renderHistory = () => {
    if (healthHistory.length <= 1) {
      return null;
    }

    return (
      <Card style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.colors.text.primary }]}>
          Kontrol Geçmişi
        </Text>
        {healthHistory.slice(1).map((record, index) => (
          <View key={record._id} style={[styles.historyItem, { borderBottomColor: theme.colors.border.primary }]}>
            <View style={styles.historyHeader}>
              <View style={[styles.historyConditionDot, { backgroundColor: getConditionColor(record.overallCondition) }]} />
              <Text style={[styles.historyDate, { color: theme.colors.text.primary }]}>
                {new Date(record.checkDate).toLocaleDateString('tr-TR')}
              </Text>
              <Text style={[styles.historyCondition, { color: getConditionColor(record.overallCondition) }]}>
                {getConditionText(record.overallCondition)}
              </Text>
            </View>
            
            <View style={styles.historyMetrics}>
              <View style={styles.historyMetric}>
                <Text style={[styles.historyMetricLabel, { color: theme.colors.text.secondary }]}>
                  Ortalama Diş Derinliği:
                </Text>
                <Text style={[styles.historyMetricValue, { color: theme.colors.text.primary }]}>
                  {(record.treadDepth.reduce((a, b) => a + b, 0) / 4).toFixed(1)} mm
                </Text>
              </View>
              <View style={styles.historyMetric}>
                <Text style={[styles.historyMetricLabel, { color: theme.colors.text.secondary }]}>
                  Ortalama Basınç:
                </Text>
                <Text style={[styles.historyMetricValue, { color: theme.colors.text.primary }]}>
                  {(record.pressure.reduce((a, b) => a + b, 0) / 4).toFixed(1)} bar
                </Text>
              </View>
            </View>
          </View>
        ))}
      </Card>
    );
  };

  if (loading && !selectedVehicle) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background.primary }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary.main} />
          <Text style={[styles.loadingText, { color: theme.colors.text.secondary }]}>
            Lastik sağlık bilgileri yükleniyor...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background.primary }]}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header */}
        <View style={[styles.header, { backgroundColor: theme.colors.background.primary, borderBottomColor: theme.colors.border.primary }]}>
          <BackButton />
          <View style={styles.headerContent}>
            <Text style={[styles.headerTitle, { color: theme.colors.text.primary }]}>
              Lastik Sağlık Durumu
            </Text>
            {selectedVehicle && (
              <Text style={[styles.headerSubtitle, { color: theme.colors.text.secondary }]}>
                {selectedVehicle.brand} {selectedVehicle.modelName} - {selectedVehicle.plateNumber}
              </Text>
            )}
          </View>
        </View>

        {/* Araç Seçici */}
        {vehicles.length > 1 && (
          <Card style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text.primary }]}>
              Araç Seçin
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {vehicles.map((vehicle) => (
                <TouchableOpacity
                  key={vehicle._id}
                  style={[
                    styles.vehicleChip,
                    { 
                      backgroundColor: selectedVehicle?._id === vehicle._id 
                        ? theme.colors.primary.main 
                        : theme.colors.background.secondary,
                      borderColor: selectedVehicle?._id === vehicle._id
                        ? theme.colors.primary.main
                        : theme.colors.border.primary
                    }
                  ]}
                  onPress={() => setSelectedVehicle(vehicle)}
                >
                  <Ionicons 
                    name="car" 
                    size={20} 
                    color={selectedVehicle?._id === vehicle._id ? '#FFFFFF' : theme.colors.text.secondary} 
                  />
                  <Text 
                    style={[
                      styles.vehicleChipText,
                      { color: selectedVehicle?._id === vehicle._id ? '#FFFFFF' : theme.colors.text.primary }
                    ]}
                  >
                    {vehicle.brand} {vehicle.modelName}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </Card>
        )}

        {/* Son Kontrol */}
        {loading ? (
          <Card style={styles.section}>
            <ActivityIndicator size="large" color={theme.colors.primary.main} />
          </Card>
        ) : (
          renderLatestHealth()
        )}

        {/* Geçmiş */}
        {renderHistory()}

        {/* Bottom Spacing */}
        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

const createStyles = (theme: any) => StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: typography.body1.fontSize,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
  headerContent: {
    flex: 1,
    marginLeft: spacing.md,
  },
  headerTitle: {
    fontSize: typography.h2.fontSize,
    fontWeight: typography.h2.fontWeight,
  },
  headerSubtitle: {
    fontSize: typography.body2.fontSize,
    marginTop: spacing.xs,
  },
  section: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
  },
  sectionTitle: {
    fontSize: typography.h4.fontSize,
    fontWeight: typography.h4.fontWeight,
    marginBottom: spacing.md,
  },
  vehicleChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    marginRight: spacing.sm,
    borderWidth: 1,
  },
  vehicleChipText: {
    fontSize: typography.body2.fontSize,
    fontWeight: typography.body2.fontWeight,
    marginLeft: spacing.xs,
  },
  overallConditionCard: {
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 2,
    marginBottom: spacing.md,
  },
  overallConditionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  conditionIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  overallConditionInfo: {
    flex: 1,
    marginLeft: spacing.md,
  },
  overallConditionLabel: {
    fontSize: typography.body2.fontSize,
  },
  overallConditionValue: {
    fontSize: typography.h2.fontSize,
    fontWeight: typography.h2.fontWeight,
    marginTop: spacing.xs,
  },
  checkDate: {
    fontSize: typography.caption.small.fontSize,
    marginTop: spacing.sm,
  },
  tiresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -spacing.xs,
    marginBottom: spacing.md,
  },
  tireCard: {
    width: '48%',
    margin: '1%',
    padding: spacing.md,
    borderRadius: borderRadius.md,
  },
  tireHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  tirePosition: {
    fontSize: typography.body2.fontSize,
    fontWeight: typography.body2.fontWeight,
    marginLeft: spacing.xs,
  },
  tireMetrics: {
    marginVertical: spacing.sm,
  },
  metric: {
    marginBottom: spacing.xs,
  },
  metricLabel: {
    fontSize: typography.caption.small.fontSize,
  },
  metricValue: {
    fontSize: typography.body1.fontSize,
    fontWeight: typography.body1.fontWeight,
    marginTop: 2,
  },
  tireConditionBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    alignSelf: 'flex-start',
    marginTop: spacing.xs,
  },
  tireConditionText: {
    color: '#FFFFFF',
    fontSize: typography.caption.small.fontSize,
    fontWeight: typography.caption.small.fontWeight,
  },
  recommendationsCard: {
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
  },
  recommendationsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  recommendationsTitle: {
    fontSize: typography.body1.fontSize,
    fontWeight: typography.body1.fontWeight,
    marginLeft: spacing.sm,
  },
  recommendationItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: spacing.sm,
  },
  recommendationText: {
    flex: 1,
    fontSize: typography.body2.fontSize,
    marginLeft: spacing.sm,
    lineHeight: 20,
  },
  issuesCard: {
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
  },
  issuesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  issuesTitle: {
    fontSize: typography.body1.fontSize,
    fontWeight: typography.body1.fontWeight,
    marginLeft: spacing.sm,
  },
  issueItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: spacing.sm,
  },
  issueText: {
    flex: 1,
    fontSize: typography.body2.fontSize,
    marginLeft: spacing.sm,
    lineHeight: 20,
  },
  nextCheckCard: {
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
  },
  nextCheckRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  nextCheckLabel: {
    fontSize: typography.body2.fontSize,
    marginLeft: spacing.sm,
  },
  nextCheckValue: {
    fontSize: typography.body2.fontSize,
    fontWeight: typography.body2.fontWeight,
    marginLeft: spacing.xs,
  },
  mechanicInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.md,
  },
  mechanicInfoText: {
    flex: 1,
    marginLeft: spacing.sm,
  },
  mechanicLabel: {
    fontSize: typography.caption.small.fontSize,
  },
  mechanicName: {
    fontSize: typography.body2.fontSize,
    fontWeight: typography.body2.fontWeight,
    marginTop: 2,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing.xxl,
  },
  emptyTitle: {
    fontSize: typography.h3.fontSize,
    fontWeight: typography.h3.fontWeight,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: typography.body2.fontSize,
    textAlign: 'center',
    paddingHorizontal: spacing.xl,
    lineHeight: 20,
  },
  historyItem: {
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
  historyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  historyConditionDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: spacing.sm,
  },
  historyDate: {
    flex: 1,
    fontSize: typography.body1.fontSize,
    fontWeight: typography.body1.fontWeight,
  },
  historyCondition: {
    fontSize: typography.body2.fontSize,
    fontWeight: typography.body2.fontWeight,
  },
  historyMetrics: {
    marginLeft: spacing.lg + spacing.xs,
  },
  historyMetric: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  historyMetricLabel: {
    fontSize: typography.caption.small.fontSize,
    marginRight: spacing.xs,
  },
  historyMetricValue: {
    fontSize: typography.caption.small.fontSize,
    fontWeight: typography.body2.fontWeight,
  },
});

export default TireHealthScreen;

