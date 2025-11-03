import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
  RefreshControl,
  ActivityIndicator,
  Image,
  Dimensions,
  FlatList,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '@/shared/context';
import { useAuth } from '@/shared/context';
import { Card, Button } from '@/shared/components';
import { spacing, borderRadius, shadows, dimensions, typography } from '@/shared/theme';
import apiService from '@/shared/services';
import {
  translateElectricalSystemType,
  translateElectricalProblemType,
  translateElectricalUrgencyLevel,
  getUrgencyLevelBadgeStyle,
  getRecurringBadgeStyle,
  getUrgencyLevelIcon,
  getElectricalSystemIcon
} from '@/shared/utils/electricalHelpers';
import { ElectricalJob } from '@/shared/types';

const { width } = Dimensions.get('window');

export default function ElectricalScreen() {
  const navigation = useNavigation();
  const { themeColors: colors } = useTheme();
  const { user, isAuthenticated } = useAuth();
  const styles = createStyles(colors);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [jobs, setJobs] = useState<ElectricalJob[]>([]);
  const [activeTab, setActiveTab] = useState<'active' | 'completed'>('active');
  
  // Modal states
  const [showCreateJobModal, setShowCreateJobModal] = useState(false);
  const [showQuoteModal, setShowQuoteModal] = useState(false);
  const [showWorkflowModal, setShowWorkflowModal] = useState(false);
  const [selectedJob, setSelectedJob] = useState<ElectricalJob | null>(null);
  const [showCustomerSelectModal, setShowCustomerSelectModal] = useState(false);
  
  // Customer selection
  const [customers, setCustomers] = useState<any[]>([]);
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<any | null>(null);
  const [customerVehicles, setCustomerVehicles] = useState<any[]>([]);
  const [loadingCustomers, setLoadingCustomers] = useState(false);

  // Photo upload
  const [uploadingStagePhoto, setUploadingStagePhoto] = useState<string | null>(null);
  const [showPhotoOptions, setShowPhotoOptions] = useState<string | null>(null);

  // Create job form
  const [createJobForm, setCreateJobForm] = useState({
    customerId: '',
    vehicleId: '',
    description: '',
    systemType: 'klima' as 'klima' | 'far' | 'alternator' | 'batarya' | 'elektrik-araci' | 'sinyal' | 'diger',
    problemType: 'calismiyor' as 'calismiyor' | 'arizali-bos' | 'ariza-gostergesi' | 'ses-yapiyor' | 'isinma-sorunu' | 'kisa-devre' | 'tetik-atmiyor' | 'diger',
    urgencyLevel: 'normal' as 'normal' | 'acil',
    isRecurring: false,
    lastWorkingCondition: '',
    estimatedRepairTime: 0,
    photos: [] as string[]
  });

  // Quote form
  const [quoteForm, setQuoteForm] = useState({
    partsToReplace: [] as Array<{
      partName: string;
      brand: string;
      quantity: number;
      unitPrice: number;
    }>,
    partsToRepair: [] as Array<{
      partName: string;
      laborHours: number;
      laborRate: number;
    }>,
    diagnosisCost: 0,
    testingCost: 0,
    validityDays: 30
  });

  // Ustanın hizmet kategorilerini kontrol et
  const userServiceCategories = useMemo(() => {
    return user?.serviceCategories || [];
  }, [user?.serviceCategories]);

  const hasElectricalServiceAccess = useMemo(() => {
    if (!userServiceCategories || userServiceCategories.length === 0) return false;
    return userServiceCategories.some(cat => 
      ['elektrik-elektronik', 'electrical', 'Elektrik & Elektronik'].includes(cat)
    );
  }, [userServiceCategories]);

  // Eğer usta bu kategoride hizmet vermiyorsa, ekranı gösterme ve geri yönlendir
  useFocusEffect(
    React.useCallback(() => {
      if (!hasElectricalServiceAccess && isAuthenticated && user) {
        navigation.goBack();
        return;
      }
    }, [hasElectricalServiceAccess, isAuthenticated, user, navigation])
  );

  useEffect(() => {
    if (hasElectricalServiceAccess) {
      fetchElectricalJobs();
    }
  }, [hasElectricalServiceAccess]);

  // Müşterileri yükle
  useEffect(() => {
    if (showCustomerSelectModal) {
      fetchCustomers();
    }
  }, [showCustomerSelectModal]);

  // Seçili müşterinin araçlarını yükle
  useEffect(() => {
    if (selectedCustomer?._id) {
      fetchCustomerVehicles(selectedCustomer._id);
    }
  }, [selectedCustomer]);

  const fetchElectricalJobs = async () => {
    try {
      setLoading(true);
      const response = await apiService.ElectricalService.getElectricalJobs();
      if (response.success) {
        setJobs(response.data || []);
      } else {
        Alert.alert('Hata', 'Elektrik işleri yüklenemedi');
      }
    } catch (error) {
      Alert.alert('Hata', 'Elektrik işleri yüklenirken bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchElectricalJobs();
    setRefreshing(false);
  };

  const fetchCustomers = async () => {
    try {
      setLoadingCustomers(true);
      const response = await apiService.CustomerService.getMechanicCustomers();
      if (response.success && response.data) {
        setCustomers(response.data.customers || []);
      }
    } catch (error) {
      console.error('Müşteri listesi yüklenirken hata:', error);
      Alert.alert('Hata', 'Müşteri listesi yüklenirken bir hata oluştu');
    } finally {
      setLoadingCustomers(false);
    }
  };

  const fetchCustomerVehicles = async (customerId: string) => {
    try {
      const response = await apiService.CustomerService.getCustomerDetails(customerId);
      if (response.success && response.data) {
        setCustomerVehicles(response.data.vehicles || []);
      }
    } catch (error) {
      console.error('Müşteri araçları yüklenirken hata:', error);
      setCustomerVehicles([]);
    }
  };

  const filteredCustomers = customers.filter(customer =>
    customer.name?.toLowerCase().includes(customerSearchQuery.toLowerCase()) ||
    customer.surname?.toLowerCase().includes(customerSearchQuery.toLowerCase()) ||
    customer.phone?.includes(customerSearchQuery)
  );

  const handleSelectCustomer = (customer: any) => {
    setSelectedCustomer(customer);
    setCreateJobForm(prev => ({ ...prev, customerId: customer._id }));
    setShowCustomerSelectModal(false);
    setCustomerSearchQuery('');
  };

  const handleRemoveCustomer = () => {
    setSelectedCustomer(null);
    setCreateJobForm(prev => ({ ...prev, customerId: '', vehicleId: '' }));
    setCustomerVehicles([]);
  };

  const handleCreateJob = async () => {
    try {
      if (!createJobForm.customerId || !createJobForm.vehicleId || !createJobForm.description) {
        Alert.alert('Hata', 'Lütfen tüm gerekli alanları doldurun');
        return;
      }

      const response = await apiService.ElectricalService.createElectricalJob({
        customerId: createJobForm.customerId,
        vehicleId: createJobForm.vehicleId,
        electricalInfo: {
          description: createJobForm.description,
          photos: createJobForm.photos,
          systemType: createJobForm.systemType,
          problemType: createJobForm.problemType,
          urgencyLevel: createJobForm.urgencyLevel,
          isRecurring: createJobForm.isRecurring,
          lastWorkingCondition: createJobForm.lastWorkingCondition || undefined,
          estimatedRepairTime: createJobForm.estimatedRepairTime
        }
      });

      if (response.success) {
        Alert.alert('Başarılı', 'Elektrik işi başarıyla oluşturuldu');
        setShowCreateJobModal(false);
        resetCreateJobForm();
        await fetchElectricalJobs();
      } else {
        Alert.alert('Hata', response.message || 'Elektrik işi oluşturulamadı');
      }
    } catch (error) {
      Alert.alert('Hata', 'Elektrik işi oluşturulurken bir hata oluştu');
    }
  };

  const handlePrepareQuote = async () => {
    try {
      if (!selectedJob) return;

      const response = await apiService.ElectricalService.prepareQuote(selectedJob._id, quoteForm);
      if (response.success) {
        Alert.alert('Başarılı', 'Teklif başarıyla hazırlandı');
        setShowQuoteModal(false);
        resetQuoteForm();
        await fetchElectricalJobs();
      } else {
        Alert.alert('Hata', response.message || 'Teklif hazırlanamadı');
      }
    } catch (error) {
      Alert.alert('Hata', 'Teklif hazırlanırken bir hata oluştu');
    }
  };

  const handleSendQuote = async (jobId: string) => {
    try {
      const response = await apiService.ElectricalService.sendQuote(jobId);
      if (response.success) {
        Alert.alert('Başarılı', 'Teklif müşteriye gönderildi');
        await fetchElectricalJobs();
      } else {
        Alert.alert('Hata', response.message || 'Teklif gönderilemedi');
      }
    } catch (error) {
      Alert.alert('Hata', 'Teklif gönderilirken bir hata oluştu');
    }
  };

  const handleUpdateWorkflowStage = async (jobId: string, stage: string, status: string, photos?: string[]) => {
    try {
      const response = await apiService.ElectricalService.updateWorkflowStage(jobId, {
        stage,
        status: status as any,
        notes: '',
        photos: photos || []
      });

      if (response.success) {
        Alert.alert('Başarılı', 'İş akışı aşaması güncellendi');
        await fetchElectricalJobs();
        if (selectedJob?._id === jobId) {
          const updatedJobs = jobs.map(job => job._id === jobId ? response.data : job);
          setJobs(updatedJobs);
          setSelectedJob(response.data);
        }
      } else {
        Alert.alert('Hata', response.message || 'İş akışı güncellenemedi');
      }
    } catch (error) {
      Alert.alert('Hata', 'İş akışı güncellenirken bir hata oluştu');
    }
  };

  const resetCreateJobForm = () => {
    setCreateJobForm({
      customerId: '',
      vehicleId: '',
      description: '',
      systemType: 'klima',
      problemType: 'calismiyor',
      urgencyLevel: 'normal',
      isRecurring: false,
      lastWorkingCondition: '',
      estimatedRepairTime: 0,
      photos: []
    });
    setSelectedCustomer(null);
    setCustomerVehicles([]);
  };

  const resetQuoteForm = () => {
    setQuoteForm({
      partsToReplace: [],
      partsToRepair: [],
      diagnosisCost: 0,
      testingCost: 0,
      validityDays: 30
    });
  };

  const getStatusText = (status: string) => {
    const statuses: Record<string, string> = {
      quote_preparation: 'Teklif Hazırlanıyor',
      quote_sent: 'Teklif Gönderildi',
      quote_accepted: 'Teklif Kabul Edildi',
      work_started: 'İş Başladı',
      in_progress: 'Devam Ediyor',
      completed: 'Tamamlandı',
      cancelled: 'İptal Edildi',
      pending_mechanic: 'Usta Bekleniyor'
    };
    return statuses[status] || status;
  };

  const getStatusColor = (status: string) => {
    const colorsMap: Record<string, string> = {
      quote_preparation: '#FF9800',
      quote_sent: '#2196F3',
      quote_accepted: '#4CAF50',
      work_started: '#4CAF50',
      in_progress: '#4CAF50',
      completed: '#4CAF50',
      cancelled: '#F44336',
      pending_mechanic: '#9E9E9E'
    };
    return colorsMap[status] || '#666';
  };

  const getStageText = (stage: string) => {
    const stages: Record<string, string> = {
      quote_preparation: 'Teklif Hazırlama',
      diagnosis: 'Teşhis/Kontrol',
      part_ordering: 'Parça Siparişi',
      repair: 'Onarım',
      replacement: 'Parça Değişimi',
      testing: 'Test/Kontrol',
      quality_check: 'Kalite Kontrol',
      completed: 'Tamamlandı'
    };
    return stages[stage] || stage;
  };

  const getStageStatusText = (status: string) => {
    const statuses: Record<string, string> = {
      pending: 'Bekliyor',
      in_progress: 'Devam Ediyor',
      completed: 'Tamamlandı',
      skipped: 'Atlandı'
    };
    return statuses[status] || status;
  };

  const getStageStatusColor = (status: string) => {
    const colorsMap: Record<string, string> = {
      pending: '#9E9E9E',
      in_progress: '#2196F3',
      completed: '#4CAF50',
      skipped: '#FF9800'
    };
    return colorsMap[status] || '#666';
  };

  const getQuoteStatusText = (status: string) => {
    const statuses: Record<string, string> = {
      draft: 'Taslak',
      sent: 'Gönderildi',
      accepted: 'Kabul Edildi',
      rejected: 'Reddedildi',
      expired: 'Süresi Doldu'
    };
    return statuses[status] || status;
  };

  const renderActiveJobs = () => {
    const activeJobs = jobs.filter(job => ['quote_preparation', 'quote_sent', 'quote_accepted', 'work_started', 'in_progress'].includes(job.status));
    
    if (activeJobs.length === 0) {
      return (
        <View style={styles.emptyStateContainer}>
          <View style={styles.emptyStateContent}>
            <View style={styles.emptyStateIconContainer}>
              <Ionicons name="flash-outline" size={64} color={colors.text.tertiary} />
            </View>
            <Text style={styles.emptyStateTitle}>Aktif İş Yok</Text>
            <Text style={styles.emptyStateDescription}>
              Henüz aktif elektrik-elektronik işiniz bulunmuyor. Yeni bir iş oluşturmak için yukarıdaki butonu kullanın.
            </Text>
            <Button
              title="Yeni İş Oluştur"
              onPress={() => setShowCreateJobModal(true)}
              style={styles.emptyStateButton}
              icon="add-circle"
            />
          </View>
        </View>
      );
    }

    return (
      <View style={styles.tabContent}>
        {activeJobs.map((job) => {
          const urgencyBadgeStyle = getUrgencyLevelBadgeStyle(job.electricalInfo.urgencyLevel);
          const recurringBadgeStyle = getRecurringBadgeStyle();
          
          return (
            <Card key={job._id} variant="elevated" style={styles.jobCard} onPress={() => {
              (navigation as any).navigate('ElectricalJobDetail', { jobId: job._id });
            }}>
              <View style={styles.jobCardHeader}>
                <View style={styles.jobCardHeaderLeft}>
                  <View style={styles.jobCardAvatar}>
                    <Ionicons name="flash" size={20} color={colors.primary.main} />
                  </View>
                  <View style={styles.jobCardInfo}>
                    <Text style={styles.jobCustomer}>
                      {job.customer?.name || 'Müşteri'} {job.customer?.surname || ''}
                    </Text>
                    <View style={styles.jobVehicleRow}>
                      <Ionicons name="car" size={14} color={colors.text.secondary} />
                      <Text style={styles.jobVehicle}>
                        {job.vehicle?.brand || ''} {job.vehicle?.modelName || ''}
                      </Text>
                      <Text style={styles.jobVehiclePlate}>{job.vehicle?.plateNumber || ''}</Text>
                    </View>
                  </View>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(job.status) + '20', borderColor: getStatusColor(job.status) }]}>
                  <View style={[styles.statusDot, { backgroundColor: getStatusColor(job.status) }]} />
                  <Text style={[styles.statusText, { color: getStatusColor(job.status) }]}>
                    {getStatusText(job.status)}
                  </Text>
                </View>
              </View>

              <View style={styles.jobCardBody}>
                <View style={styles.jobMetaRow}>
                  <View style={[styles.metaBadge, { backgroundColor: colors.background.tertiary }]}>
                    <Ionicons name={getElectricalSystemIcon(job.electricalInfo.systemType) as any} size={14} color={colors.primary.main} />
                    <Text style={styles.metaBadgeText}>{translateElectricalSystemType(job.electricalInfo.systemType)}</Text>
                  </View>
                  <View style={[styles.metaBadge, { backgroundColor: colors.background.tertiary }]}>
                    <Ionicons name="construct-outline" size={14} color={colors.text.secondary} />
                    <Text style={styles.metaBadgeText}>{translateElectricalProblemType(job.electricalInfo.problemType)}</Text>
                  </View>
                  {job.electricalInfo.urgencyLevel === 'acil' && (
                    <View style={[styles.urgencyBadge, urgencyBadgeStyle]}>
                      <Ionicons name={getUrgencyLevelIcon(job.electricalInfo.urgencyLevel) as any} size={12} color={urgencyBadgeStyle.color} />
                      <Text style={[styles.urgencyBadgeText, { color: urgencyBadgeStyle.color }]}>
                        Acil
                      </Text>
                    </View>
                  )}
                  {job.electricalInfo.isRecurring && (
                    <View style={[styles.recurringBadge, recurringBadgeStyle]}>
                      <Ionicons name="repeat" size={12} color={recurringBadgeStyle.color} />
                      <Text style={[styles.recurringBadgeText, { color: recurringBadgeStyle.color }]}>
                        Tekrarlayan
                      </Text>
                    </View>
                  )}
                </View>

                {job.electricalInfo.description && (
                  <Text style={styles.jobDescription} numberOfLines={2}>
                    {job.electricalInfo.description}
                  </Text>
                )}

                {job.electricalInfo.photos.length > 0 && (
                  <View style={styles.photosContainer}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.photosScrollContent}>
                      {job.electricalInfo.photos.slice(0, 3).map((photo, index) => (
                        <View key={index} style={styles.photoThumbnailWrapper}>
                          <Image source={{ uri: photo }} style={styles.photoThumbnail} />
                          {index === 2 && job.electricalInfo.photos.length > 3 && (
                            <View style={styles.photoOverlay}>
                              <Text style={styles.photoCountText}>+{job.electricalInfo.photos.length - 3}</Text>
                            </View>
                          )}
                        </View>
                      ))}
                    </ScrollView>
                  </View>
                )}

                <View style={styles.jobCardFooter}>
                  {job.quote.totalAmount > 0 && (
                    <View style={styles.quoteInfo}>
                      <Text style={styles.quoteLabel}>Teklif</Text>
                      <Text style={styles.quoteAmount}>{job.quote.totalAmount.toLocaleString('tr-TR')} ₺</Text>
                      <View style={[styles.quoteStatusBadge, { backgroundColor: job.quote.status === 'accepted' ? colors.success.main + '20' : colors.warning?.main + '20' || '#F59E0B20' }]}>
                        <Text style={[styles.quoteStatusText, { color: job.quote.status === 'accepted' ? colors.success.main : colors.warning?.main || '#F59E0B' }]}>
                          {getQuoteStatusText(job.quote.status)}
                        </Text>
                      </View>
                    </View>
                  )}
                  
                  <View style={styles.workflowInfo}>
                    <Ionicons name="list" size={14} color={colors.text.secondary} />
                    <Text style={styles.workflowText}>{getStageText(job.workflow.currentStage)}</Text>
                  </View>
                </View>
              </View>

              <View style={styles.jobCardActions}>
                <Button
                  title="Detayları Gör"
                  onPress={() => {
                    (navigation as any).navigate('ElectricalJobDetail', { jobId: job._id });
                  }}
                  variant="primary"
                  size="medium"
                  icon="eye"
                  style={styles.actionButton}
                />
              </View>
            </Card>
          );
        })}
      </View>
    );
  };

  const renderCompletedJobs = () => {
    const completedJobs = jobs.filter(job => job.status === 'completed');
    
    if (completedJobs.length === 0) {
      return (
        <View style={styles.emptyStateContainer}>
          <View style={styles.emptyStateContent}>
            <View style={styles.emptyStateIconContainer}>
              <Ionicons name="checkmark-done-circle-outline" size={64} color={colors.text.tertiary} />
            </View>
            <Text style={styles.emptyStateTitle}>Tamamlanan İş Yok</Text>
            <Text style={styles.emptyStateDescription}>
              Henüz tamamlanmış elektrik-elektronik işiniz bulunmuyor. Tamamlanan işler burada görüntülenecek.
            </Text>
          </View>
        </View>
      );
    }

    return (
      <View style={styles.tabContent}>
        {completedJobs.map((job) => (
          <Card key={job._id} variant="elevated" style={styles.jobCard}>
            <View style={styles.jobCardHeader}>
              <View style={styles.jobCardHeaderLeft}>
                <View style={[styles.jobCardAvatar, { backgroundColor: colors.success.main + '20' }]}>
                  <Ionicons name="checkmark-circle" size={20} color={colors.success.main} />
                </View>
                <View style={styles.jobCardInfo}>
                  <Text style={styles.jobCustomer}>
                    {job.customer?.name || 'Müşteri'} {job.customer?.surname || ''}
                  </Text>
                  <View style={styles.jobVehicleRow}>
                    <Ionicons name="car" size={14} color={colors.text.secondary} />
                    <Text style={styles.jobVehicle}>
                      {job.vehicle?.brand || ''} {job.vehicle?.modelName || ''}
                    </Text>
                    <Text style={styles.jobVehiclePlate}>{job.vehicle?.plateNumber || ''}</Text>
                  </View>
                </View>
              </View>
              <View style={[styles.statusBadge, { backgroundColor: colors.success.main + '20', borderColor: colors.success.main }]}>
                <View style={[styles.statusDot, { backgroundColor: colors.success.main }]} />
                <Text style={[styles.statusText, { color: colors.success.main }]}>
                  {getStatusText(job.status)}
                </Text>
              </View>
            </View>

            <View style={styles.jobCardBody}>
              {job.electricalInfo.description && (
                <Text style={styles.jobDescription} numberOfLines={2}>
                  {job.electricalInfo.description}
                </Text>
              )}
              
              <View style={styles.completedJobFooter}>
                <View style={styles.completedJobInfo}>
                  <Text style={styles.completedJobLabel}>Toplam Tutar</Text>
                  <Text style={styles.completedJobAmount}>{job.quote.totalAmount.toLocaleString('tr-TR')} ₺</Text>
                </View>
                <View style={styles.completedJobInfo}>
                  <Text style={styles.completedJobLabel}>Tamamlanma</Text>
                  <Text style={styles.completedJobDate}>
                    {job.workflow.actualCompletionDate 
                      ? new Date(job.workflow.actualCompletionDate).toLocaleDateString('tr-TR', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric'
                        })
                      : new Date(job.workflow.estimatedCompletionDate).toLocaleDateString('tr-TR', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric'
                        })}
                  </Text>
                </View>
              </View>
            </View>
          </Card>
        ))}
      </View>
    );
  };

  // Photo handlers
  const handlePickPhoto = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('İzin Gerekli', 'Fotoğraf seçmek için galeri erişim izni gereklidir.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setCreateJobForm(prev => ({ ...prev, photos: [...prev.photos, result.assets[0].uri] }));
      }
    } catch (error) {
      console.error('Fotoğraf seçme hatası:', error);
      Alert.alert('Hata', 'Fotoğraf seçilemedi');
    }
  };

  const handleTakePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('İzin Gerekli', 'Fotoğraf çekmek için kamera erişim izni gereklidir.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setCreateJobForm(prev => ({ ...prev, photos: [...prev.photos, result.assets[0].uri] }));
      }
    } catch (error) {
      console.error('Fotoğraf çekme hatası:', error);
      Alert.alert('Hata', 'Fotoğraf çekilemedi');
    }
  };

  const handleRemovePhoto = (index: number) => {
    setCreateJobForm(prev => ({ ...prev, photos: prev.photos.filter((_, i) => i !== index) }));
  };

  const handlePickStagePhoto = async (jobId: string, stage: string) => {
    try {
      setUploadingStagePhoto(stage);
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('İzin Gerekli', 'Fotoğraf seçmek için galeri erişim izni gereklidir.');
        setUploadingStagePhoto(null);
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        // TODO: Upload photo and add to stage
        // await handleUpdateWorkflowStage(jobId, stage, 'in_progress', [result.assets[0].uri]);
      }
      setUploadingStagePhoto(null);
    } catch (error) {
      console.error('Fotoğraf seçme hatası:', error);
      Alert.alert('Hata', 'Fotoğraf seçilemedi');
      setUploadingStagePhoto(null);
    }
  };

  const handleTakeStagePhoto = async (jobId: string, stage: string) => {
    try {
      setUploadingStagePhoto(stage);
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('İzin Gerekli', 'Fotoğraf çekmek için kamera erişim izni gereklidir.');
        setUploadingStagePhoto(null);
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        // TODO: Upload photo and add to stage
        // await handleUpdateWorkflowStage(jobId, stage, 'in_progress', [result.assets[0].uri]);
      }
      setUploadingStagePhoto(null);
    } catch (error) {
      console.error('Fotoğraf çekme hatası:', error);
      Alert.alert('Hata', 'Fotoğraf çekilemedi');
      setUploadingStagePhoto(null);
    }
  };

  // Render modals - MUST be before return statement (arrow functions are not hoisted)
  const renderCreateJobModal = () => (
    <Modal visible={showCreateJobModal} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Yeni Elektrik İşi</Text>
          <TouchableOpacity onPress={() => setShowCreateJobModal(false)}>
            <Ionicons name="close" size={24} color={colors.text.primary} />
          </TouchableOpacity>
        </View>
        
        <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>Müşteri Seçimi *</Text>
            {selectedCustomer ? (
              <View style={styles.selectedCustomerCard}>
                <View style={styles.selectedCustomerInfo}>
                  <Ionicons name="person-circle" size={24} color={colors.primary.main} />
                  <View style={styles.selectedCustomerDetails}>
                    <Text style={styles.selectedCustomerName}>
                      {selectedCustomer.name} {selectedCustomer.surname}
                    </Text>
                    {selectedCustomer.phone && (
                      <Text style={styles.selectedCustomerPhone}>{selectedCustomer.phone}</Text>
                    )}
                  </View>
                </View>
                <TouchableOpacity onPress={handleRemoveCustomer}>
                  <Ionicons name="close-circle" size={24} color={colors.text.secondary} />
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.selectButton}
                onPress={() => setShowCustomerSelectModal(true)}
              >
                <Ionicons name="person-add" size={20} color={colors.primary.main} />
                <Text style={styles.selectButtonText}>Müşteri Seç</Text>
              </TouchableOpacity>
            )}
          </View>
          
          {selectedCustomer && (
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Araç Seçimi *</Text>
              {customerVehicles.length > 0 ? (
                <ScrollView style={styles.vehicleSelectContainer}>
                  {customerVehicles.map((vehicle) => (
                    <TouchableOpacity
                      key={vehicle._id}
                      style={[
                        styles.vehicleSelectCard,
                        createJobForm.vehicleId === vehicle._id && styles.vehicleSelectCardActive
                      ]}
                      onPress={() => setCreateJobForm(prev => ({ ...prev, vehicleId: vehicle._id }))}
                    >
                      <Ionicons
                        name="car"
                        size={20}
                        color={createJobForm.vehicleId === vehicle._id ? colors.primary.main : colors.text.secondary}
                      />
                      <View style={styles.vehicleSelectInfo}>
                        <Text style={styles.vehicleSelectName}>
                          {vehicle.brand} {vehicle.modelName}
                        </Text>
                        <Text style={styles.vehicleSelectPlate}>{vehicle.plateNumber}</Text>
                      </View>
                      {createJobForm.vehicleId === vehicle._id && (
                        <Ionicons name="checkmark-circle" size={20} color={colors.primary.main} />
                      )}
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              ) : (
                <Text style={styles.noVehiclesText}>
                  Bu müşteri için kayıtlı araç bulunamadı
                </Text>
              )}
            </View>
          )}

          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>Elektrik Sistemi Tipi *</Text>
            <View style={styles.damageTypeSelector}>
              {['klima', 'far', 'alternator', 'batarya', 'elektrik-araci', 'sinyal', 'diger'].map((type) => (
                <TouchableOpacity
                  key={type}
                  style={[styles.damageTypeButton, createJobForm.systemType === type && styles.damageTypeButtonActive]}
                  onPress={() => setCreateJobForm(prev => ({ ...prev, systemType: type as any }))}
                >
                  <Text style={[styles.damageTypeButtonText, createJobForm.systemType === type && styles.damageTypeButtonTextActive]}>
                    {translateElectricalSystemType(type)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>Problem Tipi *</Text>
            <View style={styles.damageTypeSelector}>
              {['calismiyor', 'arizali-bos', 'ariza-gostergesi', 'ses-yapiyor', 'isinma-sorunu', 'kisa-devre', 'tetik-atmiyor', 'diger'].map((type) => (
                <TouchableOpacity
                  key={type}
                  style={[styles.damageTypeButton, createJobForm.problemType === type && styles.damageTypeButtonActive]}
                  onPress={() => setCreateJobForm(prev => ({ ...prev, problemType: type as any }))}
                >
                  <Text style={[styles.damageTypeButtonText, createJobForm.problemType === type && styles.damageTypeButtonTextActive]}>
                    {translateElectricalProblemType(type)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>Aciliyet Seviyesi</Text>
            <View style={styles.severitySelector}>
              {['normal', 'acil'].map((level) => (
                <TouchableOpacity
                  key={level}
                  style={[styles.severityButton, createJobForm.urgencyLevel === level && styles.severityButtonActive]}
                  onPress={() => setCreateJobForm(prev => ({ ...prev, urgencyLevel: level as any }))}
                >
                  <Ionicons 
                    name={level === 'acil' ? 'warning' : 'time-outline'} 
                    size={16} 
                    color={createJobForm.urgencyLevel === level ? colors.text.inverse : colors.text.secondary} 
                  />
                  <Text style={[styles.severityButtonText, createJobForm.urgencyLevel === level && styles.severityButtonTextActive]}>
                    {translateElectricalUrgencyLevel(level)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.formGroup}>
            <View style={styles.switchContainer}>
              <View style={styles.switchLabelContainer}>
                <Ionicons name="repeat" size={20} color={colors.text.primary} />
                <Text style={styles.switchLabel}>Tekrarlayan Arıza</Text>
              </View>
              <Switch
                value={createJobForm.isRecurring}
                onValueChange={(value) => setCreateJobForm(prev => ({ ...prev, isRecurring: value }))}
                trackColor={{ false: colors.border.medium, true: colors.primary.main + '80' }}
                thumbColor={createJobForm.isRecurring ? colors.primary.main : colors.background.tertiary}
              />
            </View>
          </View>

          {createJobForm.isRecurring && (
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Son Çalışma Durumu</Text>
              <TextInput
                style={[styles.formInput, styles.formTextArea]}
                value={createJobForm.lastWorkingCondition}
                onChangeText={(text) => setCreateJobForm(prev => ({ ...prev, lastWorkingCondition: text }))}
                placeholder="Son çalışma durumunu açıklayın..."
                multiline
                numberOfLines={3}
              />
            </View>
          )}
          
          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>Arıza Açıklaması *</Text>
            <TextInput
              style={[styles.formInput, styles.formTextArea]}
              value={createJobForm.description}
              onChangeText={(text) => setCreateJobForm(prev => ({ ...prev, description: text }))}
              placeholder="Arıza detaylarını açıklayın..."
              multiline
              numberOfLines={4}
            />
          </View>
          
          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>Tahmini Onarım Süresi (Saat)</Text>
            <TextInput
              style={styles.formInput}
              value={createJobForm.estimatedRepairTime.toString()}
              onChangeText={(text) => setCreateJobForm(prev => ({ ...prev, estimatedRepairTime: parseInt(text) || 0 }))}
              placeholder="0"
              keyboardType="numeric"
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>Fotoğraflar</Text>
            <View style={styles.photoButtonsContainer}>
              <TouchableOpacity
                style={styles.photoButton}
                onPress={handlePickPhoto}
              >
                <Ionicons name="image" size={20} color={colors.primary.main} />
                <Text style={styles.photoButtonText}>Galeriden Seç</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.photoButton}
                onPress={handleTakePhoto}
              >
                <Ionicons name="camera" size={20} color={colors.primary.main} />
                <Text style={styles.photoButtonText}>Fotoğraf Çek</Text>
              </TouchableOpacity>
            </View>
            {createJobForm.photos.length > 0 && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photosPreviewContainer}>
                {createJobForm.photos.map((photo, index) => (
                  <View key={index} style={styles.photoPreviewWrapper}>
                    <Image source={{ uri: photo }} style={styles.photoPreview} />
                    <TouchableOpacity
                      style={styles.removePhotoButton}
                      onPress={() => handleRemovePhoto(index)}
                    >
                      <Ionicons name="close-circle" size={24} color={colors.error?.main || '#EF4444'} />
                    </TouchableOpacity>
                  </View>
                ))}
              </ScrollView>
            )}
          </View>
        </ScrollView>
        
        <View style={styles.modalFooter}>
          <Button
            title="İptal"
            onPress={() => {
              setShowCreateJobModal(false);
              resetCreateJobForm();
            }}
            style={[styles.modalButton, styles.cancelButton]}
            textStyle={styles.cancelButtonText}
          />
          <Button
            title="Oluştur"
            onPress={handleCreateJob}
            style={[styles.modalButton, styles.confirmButton]}
          />
        </View>
      </SafeAreaView>
    </Modal>
  );

  const renderQuoteModal = () => (
    <Modal visible={showQuoteModal} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Teklif Hazırla</Text>
          <TouchableOpacity onPress={() => setShowQuoteModal(false)}>
            <Ionicons name="close" size={24} color={colors.text.primary} />
          </TouchableOpacity>
        </View>
        
        <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
          <Text style={styles.quoteSectionTitle}>Değişecek Parçalar</Text>
          <Button
            title="Parça Ekle"
            onPress={() => {
              const newPart = {
                partName: '',
                brand: '',
                quantity: 1,
                unitPrice: 0
              };
              setQuoteForm(prev => ({
                ...prev,
                partsToReplace: [...prev.partsToReplace, newPart]
              }));
            }}
            style={styles.addButton}
          />
          
          {quoteForm.partsToReplace.map((part, index) => (
            <View key={index} style={styles.partItem}>
              <TextInput
                style={styles.partInput}
                value={part.partName}
                onChangeText={(text) => {
                  const newParts = [...quoteForm.partsToReplace];
                  newParts[index].partName = text;
                  setQuoteForm(prev => ({ ...prev, partsToReplace: newParts }));
                }}
                placeholder="Parça adı"
              />
              <TextInput
                style={styles.partInput}
                value={part.brand}
                onChangeText={(text) => {
                  const newParts = [...quoteForm.partsToReplace];
                  newParts[index].brand = text;
                  setQuoteForm(prev => ({ ...prev, partsToReplace: newParts }));
                }}
                placeholder="Marka"
              />
              <TextInput
                style={styles.partInput}
                value={part.quantity.toString()}
                onChangeText={(text) => {
                  const newParts = [...quoteForm.partsToReplace];
                  newParts[index].quantity = parseInt(text) || 1;
                  setQuoteForm(prev => ({ ...prev, partsToReplace: newParts }));
                }}
                placeholder="Adet"
                keyboardType="numeric"
              />
              <TextInput
                style={styles.partInput}
                value={part.unitPrice.toString()}
                onChangeText={(text) => {
                  const newParts = [...quoteForm.partsToReplace];
                  newParts[index].unitPrice = parseFloat(text) || 0;
                  setQuoteForm(prev => ({ ...prev, partsToReplace: newParts }));
                }}
                placeholder="Birim fiyat"
                keyboardType="numeric"
              />
              <TouchableOpacity
                style={styles.removePartButton}
                onPress={() => {
                  setQuoteForm(prev => ({
                    ...prev,
                    partsToReplace: prev.partsToReplace.filter((_, i) => i !== index)
                  }));
                }}
              >
                <Ionicons name="trash-outline" size={20} color={colors.error?.main || '#EF4444'} />
              </TouchableOpacity>
            </View>
          ))}

          <Text style={styles.quoteSectionTitle}>Onarılacak Parçalar</Text>
          <Button
            title="Onarım Ekle"
            onPress={() => {
              const newRepair = {
                partName: '',
                laborHours: 0,
                laborRate: 0
              };
              setQuoteForm(prev => ({
                ...prev,
                partsToRepair: [...prev.partsToRepair, newRepair]
              }));
            }}
            style={styles.addButton}
          />

          {quoteForm.partsToRepair.map((repair, index) => (
            <View key={index} style={styles.partItem}>
              <TextInput
                style={styles.partInput}
                value={repair.partName}
                onChangeText={(text) => {
                  const newRepairs = [...quoteForm.partsToRepair];
                  newRepairs[index].partName = text;
                  setQuoteForm(prev => ({ ...prev, partsToRepair: newRepairs }));
                }}
                placeholder="Parça adı"
              />
              <TextInput
                style={styles.partInput}
                value={repair.laborHours.toString()}
                onChangeText={(text) => {
                  const newRepairs = [...quoteForm.partsToRepair];
                  newRepairs[index].laborHours = parseFloat(text) || 0;
                  setQuoteForm(prev => ({ ...prev, partsToRepair: newRepairs }));
                }}
                placeholder="İşçilik saati"
                keyboardType="numeric"
              />
              <TextInput
                style={styles.partInput}
                value={repair.laborRate.toString()}
                onChangeText={(text) => {
                  const newRepairs = [...quoteForm.partsToRepair];
                  newRepairs[index].laborRate = parseFloat(text) || 0;
                  setQuoteForm(prev => ({ ...prev, partsToRepair: newRepairs }));
                }}
                placeholder="Saatlik ücret"
                keyboardType="numeric"
              />
              <TouchableOpacity
                style={styles.removePartButton}
                onPress={() => {
                  setQuoteForm(prev => ({
                    ...prev,
                    partsToRepair: prev.partsToRepair.filter((_, i) => i !== index)
                  }));
                }}
              >
                <Ionicons name="trash-outline" size={20} color={colors.error?.main || '#EF4444'} />
              </TouchableOpacity>
            </View>
          ))}

          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>Teşhis Ücreti (₺)</Text>
            <TextInput
              style={styles.formInput}
              value={quoteForm.diagnosisCost.toString()}
              onChangeText={(text) => setQuoteForm(prev => ({ ...prev, diagnosisCost: parseFloat(text) || 0 }))}
              placeholder="0"
              keyboardType="numeric"
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>Test/Kontrol Ücreti (₺)</Text>
            <TextInput
              style={styles.formInput}
              value={quoteForm.testingCost.toString()}
              onChangeText={(text) => setQuoteForm(prev => ({ ...prev, testingCost: parseFloat(text) || 0 }))}
              placeholder="0"
              keyboardType="numeric"
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>Teklif Geçerlilik Süresi (Gün)</Text>
            <TextInput
              style={styles.formInput}
              value={quoteForm.validityDays.toString()}
              onChangeText={(text) => setQuoteForm(prev => ({ ...prev, validityDays: parseInt(text) || 30 }))}
              placeholder="30"
              keyboardType="numeric"
            />
          </View>

          <View style={styles.quoteSummary}>
            <Text style={styles.quoteSummaryTitle}>Özet</Text>
            <View style={styles.quoteSummaryRow}>
              <Text style={styles.quoteSummaryLabel}>Parça Değişimi:</Text>
              <Text style={styles.quoteSummaryValue}>
                {quoteForm.partsToReplace.reduce((sum, part) => sum + (part.quantity * part.unitPrice), 0).toLocaleString('tr-TR')} ₺
              </Text>
            </View>
            <View style={styles.quoteSummaryRow}>
              <Text style={styles.quoteSummaryLabel}>Onarım İşçilik:</Text>
              <Text style={styles.quoteSummaryValue}>
                {quoteForm.partsToRepair.reduce((sum, repair) => sum + (repair.laborHours * repair.laborRate), 0).toLocaleString('tr-TR')} ₺
              </Text>
            </View>
            <View style={styles.quoteSummaryRow}>
              <Text style={styles.quoteSummaryLabel}>Teşhis Ücreti:</Text>
              <Text style={styles.quoteSummaryValue}>{quoteForm.diagnosisCost.toLocaleString('tr-TR')} ₺</Text>
            </View>
            <View style={styles.quoteSummaryRow}>
              <Text style={styles.quoteSummaryLabel}>Test/Kontrol Ücreti:</Text>
              <Text style={styles.quoteSummaryValue}>{quoteForm.testingCost.toLocaleString('tr-TR')} ₺</Text>
            </View>
            <View style={[styles.quoteSummaryRow, styles.quoteSummaryTotal]}>
              <Text style={styles.quoteSummaryTotalLabel}>Toplam:</Text>
              <Text style={styles.quoteSummaryTotalValue}>
                {(
                  quoteForm.partsToReplace.reduce((sum, part) => sum + (part.quantity * part.unitPrice), 0) +
                  quoteForm.partsToRepair.reduce((sum, repair) => sum + (repair.laborHours * repair.laborRate), 0) +
                  quoteForm.diagnosisCost +
                  quoteForm.testingCost
                ).toLocaleString('tr-TR')} ₺
              </Text>
            </View>
          </View>
        </ScrollView>
        
        <View style={styles.modalFooter}>
          <Button
            title="İptal"
            onPress={() => {
              setShowQuoteModal(false);
              resetQuoteForm();
            }}
            style={[styles.modalButton, styles.cancelButton]}
            textStyle={styles.cancelButtonText}
          />
          <Button
            title="Teklif Hazırla"
            onPress={handlePrepareQuote}
            style={[styles.modalButton, styles.confirmButton]}
          />
        </View>
      </SafeAreaView>
    </Modal>
  );

  const renderWorkflowModal = () => (
    <Modal visible={showWorkflowModal} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>İş Akışı</Text>
          <TouchableOpacity onPress={() => setShowWorkflowModal(false)}>
            <Ionicons name="close" size={24} color={colors.text.primary} />
          </TouchableOpacity>
        </View>
        
        <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
          {selectedJob?.workflow.stages.map((stage, index) => (
            <View key={index} style={styles.workflowStage}>
              <View style={styles.stageHeader}>
                <View style={[styles.stageIcon, { backgroundColor: getStageStatusColor(stage.status) }]}>
                  {stage.status === 'completed' && (
                    <Ionicons name="checkmark" size={16} color={colors.text.inverse} />
                  )}
                </View>
                <Text style={styles.stageName}>{getStageText(stage.stage)}</Text>
                <Text style={[styles.stageStatus, { color: getStageStatusColor(stage.status) }]}>
                  {getStageStatusText(stage.status)}
                </Text>
              </View>
              
              <View style={styles.stagePhotosSection}>
                <View style={styles.stagePhotosHeader}>
                  <Text style={styles.stagePhotosTitle}>Aşama Fotoğrafları</Text>
                  {(stage.status === 'in_progress' || stage.status === 'completed') && (
                    <TouchableOpacity
                      style={styles.addPhotoButton}
                      onPress={() => setShowPhotoOptions(showPhotoOptions === stage.stage ? null : stage.stage)}
                      disabled={uploadingStagePhoto === `${selectedJob?._id}-${stage.stage}`}
                    >
                      {uploadingStagePhoto === `${selectedJob?._id}-${stage.stage}` ? (
                        <ActivityIndicator size="small" color={colors.primary.main} />
                      ) : (
                        <Ionicons name="camera" size={20} color={colors.primary.main} />
                      )}
                    </TouchableOpacity>
                  )}
                </View>

                {showPhotoOptions === stage.stage && (
                  <View style={styles.photoOptionsContainer}>
                    <TouchableOpacity
                      style={styles.photoOptionButton}
                      onPress={() => handlePickStagePhoto(selectedJob._id, stage.stage)}
                    >
                      <Ionicons name="image" size={20} color={colors.primary.main} />
                      <Text style={styles.photoOptionText}>Galeriden Seç</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.photoOptionButton}
                      onPress={() => handleTakeStagePhoto(selectedJob._id, stage.stage)}
                    >
                      <Ionicons name="camera" size={20} color={colors.primary.main} />
                      <Text style={styles.photoOptionText}>Fotoğraf Çek</Text>
                    </TouchableOpacity>
                  </View>
                )}

                {stage.photos && stage.photos.length > 0 ? (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.stagePhotos}>
                    {stage.photos.map((photo, photoIndex) => (
                      <View key={photoIndex} style={styles.stagePhotoContainer}>
                        <Image source={{ uri: photo }} style={styles.stagePhoto} />
                      </View>
                    ))}
                  </ScrollView>
                ) : (
                  <Text style={styles.noPhotosText}>Henüz fotoğraf eklenmemiş</Text>
                )}
              </View>
              
              {stage.notes && (
                <Text style={styles.stageNotes}>{stage.notes}</Text>
              )}
              
              <View style={styles.stageActions}>
                {stage.status === 'pending' && (
                  <Button
                    title="Başlat"
                    onPress={() => handleUpdateWorkflowStage(selectedJob._id, stage.stage, 'in_progress')}
                    style={styles.stageButton}
                  />
                )}
                {stage.status === 'in_progress' && (
                  <Button
                    title="Tamamla"
                    onPress={() => handleUpdateWorkflowStage(selectedJob._id, stage.stage, 'completed')}
                    style={styles.stageButton}
                  />
                )}
              </View>
            </View>
          ))}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );

  const renderCustomerSelectModal = () => (
    <Modal visible={showCustomerSelectModal} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Müşteri Seç</Text>
          <TouchableOpacity onPress={() => setShowCustomerSelectModal(false)}>
            <Ionicons name="close" size={24} color={colors.text.primary} />
          </TouchableOpacity>
        </View>
        <View style={styles.searchContainer}>
          <View style={styles.searchInputWrapper}>
            <Ionicons name="search" size={20} color={colors.text.secondary} />
            <TextInput
              style={styles.searchInput}
              placeholder="Müşteri ara..."
              value={customerSearchQuery}
              onChangeText={setCustomerSearchQuery}
            />
          </View>
        </View>
        <FlatList
          data={filteredCustomers}
          keyExtractor={(item) => item._id}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.customerItem}
              onPress={() => handleSelectCustomer(item)}
            >
              <View style={styles.customerItemContent}>
                <Ionicons name="person-circle" size={32} color={colors.primary.main} />
                <View style={styles.customerItemInfo}>
                  <Text style={styles.customerItemName}>
                    {item.name} {item.surname}
                  </Text>
                  {item.phone && (
                    <Text style={styles.customerItemPhone}>{item.phone}</Text>
                  )}
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.text.secondary} />
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyTitle}>Müşteri bulunamadı</Text>
              <Text style={styles.emptyDescription}>
                {customerSearchQuery ? 'Arama kriterlerinize uygun müşteri bulunamadı' : 'Henüz müşteri eklenmemiş'}
              </Text>
            </View>
          }
        />
      </SafeAreaView>
    </Modal>
  );

  // Eğer usta bu kategoride hizmet vermiyorsa hiçbir şey gösterme
  if (!hasElectricalServiceAccess) {
    return null;
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary.main} />
          <Text style={styles.loadingText}>Elektrik işleri yükleniyor...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Modern Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity 
            onPress={() => navigation.goBack()}
            style={styles.headerIconButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>Elektrik-Elektronik İşleri</Text>
            <Text style={styles.headerSubtitle}>
              {activeTab === 'active' && `${jobs.filter(job => ['quote_preparation', 'quote_sent', 'quote_accepted', 'work_started', 'in_progress'].includes(job.status)).length} aktif iş`}
              {activeTab === 'completed' && `${jobs.filter(job => job.status === 'completed').length} tamamlanan`}
            </Text>
          </View>
        </View>
        <TouchableOpacity 
          onPress={() => setShowCreateJobModal(true)}
          style={styles.headerActionButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="add-circle" size={28} color={colors.primary.main} />
        </TouchableOpacity>
      </View>

      {/* Modern Tab Navigation */}
      <View style={styles.tabNavigation}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabScrollContent}
        >
          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'active' && styles.tabButtonActive]}
            onPress={() => setActiveTab('active')}
          >
            <View style={styles.tabButtonContent}>
              <Ionicons 
                name={activeTab === 'active' ? 'flash' : 'flash-outline'} 
                size={18} 
                color={activeTab === 'active' ? colors.text.inverse : colors.text.secondary} 
              />
              <Text style={[styles.tabButtonText, activeTab === 'active' && styles.tabButtonTextActive]}>
                Aktif
              </Text>
            </View>
            {activeTab === 'active' && jobs.filter(job => ['quote_preparation', 'quote_sent', 'quote_accepted', 'work_started', 'in_progress'].includes(job.status)).length > 0 && (
              <View style={styles.tabBadge}>
                <Text style={styles.tabBadgeText}>
                  {jobs.filter(job => ['quote_preparation', 'quote_sent', 'quote_accepted', 'work_started', 'in_progress'].includes(job.status)).length}
                </Text>
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'completed' && styles.tabButtonActive]}
            onPress={() => setActiveTab('completed')}
          >
            <View style={styles.tabButtonContent}>
              <Ionicons 
                name={activeTab === 'completed' ? 'checkmark-done-circle' : 'checkmark-done-circle-outline'} 
                size={18} 
                color={activeTab === 'completed' ? colors.text.inverse : colors.text.secondary} 
              />
              <Text style={[styles.tabButtonText, activeTab === 'completed' && styles.tabButtonTextActive]}>
                Tamamlanan
              </Text>
            </View>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* Content */}
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh}
            tintColor={colors.primary.main}
            colors={[colors.primary.main]}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {activeTab === 'active' && renderActiveJobs()}
        {activeTab === 'completed' && renderCompletedJobs()}
      </ScrollView>

      {/* Modals */}
      {renderCreateJobModal()}
      {renderQuoteModal()}
      {renderWorkflowModal()}
      {renderCustomerSelectModal()}
    </SafeAreaView>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: typography.fontSize.md,
    color: colors.text.secondary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.background.primary,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  headerIconButton: {
    padding: spacing.xs,
    marginRight: spacing.sm,
  },
  headerTitleContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: 2,
  },
  headerSubtitle: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
  },
  headerActionButton: {
    padding: spacing.xs,
    marginLeft: spacing.sm,
  },
  tabNavigation: {
    backgroundColor: colors.background.primary,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  tabScrollContent: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.xs,
  },
  tabButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    marginRight: spacing.xs,
    backgroundColor: colors.background.secondary,
    borderWidth: 1,
    borderColor: colors.border.light,
    minWidth: 100,
  },
  tabButtonActive: {
    backgroundColor: colors.primary.main,
    borderColor: colors.primary.main,
  },
  tabButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  tabButtonText: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    fontWeight: '500',
  },
  tabButtonTextActive: {
    color: colors.text.inverse,
    fontWeight: '600',
  },
  tabBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: colors.error?.main || '#EF4444',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    paddingHorizontal: 6,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.background.primary,
  },
  tabBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: spacing.xl,
  },
  tabContent: {
    padding: spacing.md,
    gap: spacing.md,
  },
  emptyStateContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.xxxl,
    paddingHorizontal: spacing.lg,
  },
  emptyStateContent: {
    alignItems: 'center',
    maxWidth: 300,
  },
  emptyStateIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.background.secondary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  emptyStateTitle: {
    fontSize: typography.fontSize.xl,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  emptyStateDescription: {
    fontSize: typography.fontSize.md,
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: spacing.xl,
    lineHeight: 22,
  },
  emptyStateButton: {
    marginTop: spacing.md,
  },
  jobCard: {
    marginBottom: spacing.md,
    overflow: 'hidden',
  },
  jobCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  jobCardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  jobCardAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary.main + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  jobCardInfo: {
    flex: 1,
  },
  jobCustomer: {
    fontSize: typography.fontSize.md,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  jobVehicleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  jobVehicle: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
  },
  jobVehiclePlate: {
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
    color: colors.text.secondary,
    backgroundColor: colors.background.tertiary,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: 4,
  },
  jobCardBody: {
    marginBottom: spacing.md,
  },
  jobMetaRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.sm,
    flexWrap: 'wrap',
  },
  metaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    gap: spacing.xs,
  },
  metaBadgeText: {
    fontSize: typography.fontSize.xs,
    fontWeight: '500',
    color: colors.text.primary,
  },
  urgencyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    gap: spacing.xs,
  },
  urgencyBadgeText: {
    fontSize: typography.fontSize.xs,
    fontWeight: '600',
  },
  recurringBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    gap: spacing.xs,
  },
  recurringBadgeText: {
    fontSize: typography.fontSize.xs,
    fontWeight: '600',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    gap: spacing.xs,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: typography.fontSize.xs,
    fontWeight: '600',
  },
  jobDescription: {
    fontSize: 14,
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  photosContainer: {
    marginBottom: spacing.md,
  },
  photosScrollContent: {
    gap: spacing.sm,
  },
  photoThumbnailWrapper: {
    position: 'relative',
  },
  photoThumbnail: {
    width: 80,
    height: 80,
    borderRadius: borderRadius.md,
    backgroundColor: colors.background.secondary,
  },
  photoOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoCountText: {
    fontSize: typography.fontSize.md,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  jobCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border.light,
    marginTop: spacing.sm,
  },
  quoteInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  quoteLabel: {
    fontSize: typography.fontSize.xs,
    color: colors.text.secondary,
    fontWeight: '500',
  },
  quoteAmount: {
    fontSize: typography.fontSize.lg,
    fontWeight: '700',
    color: colors.primary.main,
  },
  quoteStatusBadge: {
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: borderRadius.xs,
  },
  quoteStatusText: {
    fontSize: typography.fontSize.xs,
    fontWeight: '600',
  },
  workflowInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  workflowText: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    fontWeight: '500',
  },
  completedJobFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border.light,
  },
  completedJobInfo: {
    flex: 1,
  },
  completedJobLabel: {
    fontSize: typography.fontSize.xs,
    color: colors.text.secondary,
    marginBottom: spacing.xs,
  },
  completedJobAmount: {
    fontSize: typography.fontSize.lg,
    fontWeight: '700',
    color: colors.success.main,
  },
  completedJobDate: {
    fontSize: typography.fontSize.sm,
    color: colors.text.primary,
    fontWeight: '500',
  },
  jobCardActions: {
    marginTop: spacing.sm,
  },
  actionButton: {
    width: '100%',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text.primary,
  },
  modalContent: {
    flex: 1,
    padding: spacing.lg,
  },
  formGroup: {
    marginBottom: spacing.lg,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  formInput: {
    borderWidth: 1,
    borderColor: colors.border.medium,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: 16,
    color: colors.text.primary,
    backgroundColor: colors.background.secondary,
  },
  formTextArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  modalFooter: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border.light,
  },
  modalButton: {
    flex: 1,
    marginHorizontal: spacing.sm,
  },
  cancelButton: {
    backgroundColor: colors.background.secondary,
    borderWidth: 1,
    borderColor: colors.border.medium,
  },
  cancelButtonText: {
    color: colors.text.secondary,
  },
  confirmButton: {
    backgroundColor: colors.primary.main,
  },
  searchContainer: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  searchInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  searchInput: {
    flex: 1,
    paddingVertical: spacing.sm,
    fontSize: typography.fontSize.md,
    color: colors.text.primary,
  },
  customerList: {
    padding: spacing.md,
  },
  customerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  customerItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  customerItemInfo: {
    marginLeft: spacing.md,
    flex: 1,
  },
  customerItemName: {
    fontSize: typography.fontSize.md,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 4,
  },
  customerItemPhone: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    marginBottom: 2,
  },
  customerItemStats: {
    fontSize: typography.fontSize.xs,
    color: colors.text.secondary,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxxl,
    paddingHorizontal: spacing.lg,
  },
  emptyTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: '600',
    color: colors.text.primary,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  emptyDescription: {
    fontSize: typography.fontSize.md,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  selectedCustomerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border.medium,
  },
  selectedCustomerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  selectedCustomerDetails: {
    marginLeft: spacing.md,
    flex: 1,
  },
  selectedCustomerName: {
    fontSize: typography.fontSize.md,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 4,
  },
  selectedCustomerPhone: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
  },
  selectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.md,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: colors.border.medium,
    gap: spacing.sm,
  },
  selectButtonText: {
    fontSize: typography.fontSize.md,
    color: colors.primary.main,
    fontWeight: '500',
  },
  vehicleSelectContainer: {
    maxHeight: 200,
  },
  vehicleSelectCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
    borderWidth: 2,
    borderColor: 'transparent',
    gap: spacing.sm,
  },
  vehicleSelectCardActive: {
    borderColor: colors.primary.main,
    backgroundColor: colors.primary.light + '20',
  },
  vehicleSelectInfo: {
    flex: 1,
    marginLeft: spacing.sm,
  },
  vehicleSelectName: {
    fontSize: typography.fontSize.md,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 2,
  },
  vehicleSelectPlate: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
  },
  noVehiclesText: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    fontStyle: 'italic',
    textAlign: 'center',
    padding: spacing.md,
  },
  quoteSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  addButton: {
    marginBottom: spacing.md,
  },
  partItem: {
    flexDirection: 'row',
    marginBottom: spacing.sm,
    gap: spacing.xs,
  },
  partInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border.medium,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    fontSize: 14,
    color: colors.text.primary,
    backgroundColor: colors.background.secondary,
  },
  workflowStage: {
    marginBottom: spacing.lg,
    padding: spacing.md,
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.md,
  },
  stageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  stageIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  stageName: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
  },
  stageStatus: {
    fontSize: 14,
    fontWeight: '600',
  },
  stageNotes: {
    fontSize: 14,
    color: colors.text.secondary,
    marginBottom: spacing.sm,
  },
  stageActions: {
    marginTop: spacing.sm,
  },
  stageButton: {
    marginBottom: spacing.sm,
  },
  stagePhotosSection: {
    marginTop: spacing.md,
  },
  stagePhotosHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  stagePhotosTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.primary,
  },
  addPhotoButton: {
    padding: spacing.xs,
  },
  photoOptionsContainer: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  photoOptionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.sm,
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.border.medium,
    gap: spacing.xs,
  },
  photoOptionText: {
    fontSize: 14,
    color: colors.text.primary,
  },
  stagePhotos: {
    flexDirection: 'row',
  },
  stagePhoto: {
    width: 80,
    height: 80,
    borderRadius: borderRadius.sm,
  },
  stagePhotoContainer: {
    marginRight: spacing.sm,
  },
  noPhotosText: {
    fontSize: 14,
    color: colors.text.secondary,
    fontStyle: 'italic',
    textAlign: 'center',
    padding: spacing.md,
  },
  // Photo buttons
  photoButtonsContainer: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  photoButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border.medium,
    gap: spacing.xs,
  },
  photoButtonText: {
    fontSize: typography.fontSize.sm,
    color: colors.text.primary,
    fontWeight: '500',
  },
  photosPreviewContainer: {
    marginTop: spacing.sm,
  },
  photoPreviewWrapper: {
    position: 'relative',
    marginRight: spacing.sm,
  },
  photoPreview: {
    width: 100,
    height: 100,
    borderRadius: borderRadius.md,
    backgroundColor: colors.background.secondary,
  },
  removePhotoButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: colors.background.primary,
    borderRadius: 12,
  },
  // Switch styles
  switchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border.medium,
  },
  switchLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  switchLabel: {
    fontSize: typography.fontSize.md,
    color: colors.text.primary,
    fontWeight: '500',
  },
  // Quote summary
  quoteSummary: {
    marginTop: spacing.lg,
    padding: spacing.md,
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  quoteSummaryTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: spacing.md,
  },
  quoteSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  quoteSummaryLabel: {
    fontSize: typography.fontSize.md,
    color: colors.text.secondary,
  },
  quoteSummaryValue: {
    fontSize: typography.fontSize.md,
    fontWeight: '600',
    color: colors.text.primary,
  },
  quoteSummaryTotal: {
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border.medium,
  },
  quoteSummaryTotalLabel: {
    fontSize: typography.fontSize.lg,
    fontWeight: '700',
    color: colors.text.primary,
  },
  quoteSummaryTotalValue: {
    fontSize: typography.fontSize.lg,
    fontWeight: '700',
    color: colors.primary.main,
  },
  // Remove part button
  removePartButton: {
    padding: spacing.xs,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Damage type selector (used for systemType and problemType)
  damageTypeSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  damageTypeButton: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.border.medium,
    backgroundColor: colors.background.secondary,
  },
  damageTypeButtonActive: {
    backgroundColor: colors.primary.main,
    borderColor: colors.primary.main,
  },
  damageTypeButtonText: {
    fontSize: typography.fontSize.xs,
    color: colors.text.secondary,
    fontWeight: '500',
  },
  damageTypeButtonTextActive: {
    color: colors.text.inverse,
    fontWeight: '600',
  },
  // Severity selector (used for urgencyLevel)
  severitySelector: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  severityButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border.medium,
    backgroundColor: colors.background.secondary,
    gap: spacing.xs,
  },
  severityButtonActive: {
    backgroundColor: colors.primary.main,
    borderColor: colors.primary.main,
  },
  severityButtonText: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    fontWeight: '500',
  },
  severityButtonTextActive: {
    color: colors.text.inverse,
    fontWeight: '600',
  },
});

