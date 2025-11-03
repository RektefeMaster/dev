import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  Modal,
  TextInput,
  RefreshControl,
  ActivityIndicator,
  Image,
  Dimensions,
  FlatList,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '@/shared/context';
import { useAuth } from '@/shared/context';
import { Card, Button } from '@/shared/components';
import { spacing, borderRadius, shadows, dimensions, typography } from '@/shared/theme';
import apiService from '@/shared/services';

const { width } = Dimensions.get('window');

interface BodyworkJob {
  _id: string;
  customerId: {
    _id: string;
    name: string;
    surname: string;
    phone: string;
  };
  vehicleId: {
    _id: string;
    brand: string;
    modelName: string;
    plateNumber: string;
    year: number;
  };
  damageInfo: {
    description: string;
    photos: string[];
    damageType: 'collision' | 'scratch' | 'dent' | 'rust' | 'paint_damage' | 'other';
    severity: 'minor' | 'moderate' | 'major' | 'severe';
    affectedAreas: string[];
    estimatedRepairTime: number;
  };
  quote: {
    totalAmount: number;
    breakdown: {
      partsToReplace: Array<{
        partName: string;
        brand: string;
        quantity: number;
        unitPrice: number;
        totalPrice: number;
      }>;
      partsToRepair: Array<{
        partName: string;
        laborHours: number;
        laborRate: number;
        totalPrice: number;
      }>;
      paintMaterials: Array<{
        materialName: string;
        quantity: number;
        unitPrice: number;
        totalPrice: number;
      }>;
      laborCost: number;
      materialCost: number;
      totalCost: number;
    };
    status: 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired';
  };
  workflow: {
    currentStage: string;
    stages: Array<{
      stage: string;
      status: 'pending' | 'in_progress' | 'completed' | 'skipped';
      startDate?: string;
      endDate?: string;
      photos: string[];
      notes?: string;
    }>;
    estimatedCompletionDate: string;
  };
  status: string;
  createdAt: string;
}

export default function BodyworkScreen() {
  const navigation = useNavigation();
  const { themeColors: colors } = useTheme();
  const { user, isAuthenticated } = useAuth();
  const styles = createStyles(colors);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [jobs, setJobs] = useState<BodyworkJob[]>([]);
  const [activeTab, setActiveTab] = useState<'active' | 'completed' | 'templates'>('active');
  
  // Modal states
  const [showCreateJobModal, setShowCreateJobModal] = useState(false);
  const [showQuoteModal, setShowQuoteModal] = useState(false);
  const [showWorkflowModal, setShowWorkflowModal] = useState(false);
  const [selectedJob, setSelectedJob] = useState<BodyworkJob | null>(null);
  const [showCustomerSelectModal, setShowCustomerSelectModal] = useState(false);
  
  // Customer selection
  const [customers, setCustomers] = useState<any[]>([]);
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<any | null>(null);
  const [customerVehicles, setCustomerVehicles] = useState<any[]>([]);
  const [loadingCustomers, setLoadingCustomers] = useState(false);

  // Photo upload
  const [uploadingStagePhoto, setUploadingStagePhoto] = useState<string | null>(null);
  const [showPhotoOptions, setShowPhotoOptions] = useState<string | null>(null); // stage ID

  // Templates
  const [templates, setTemplates] = useState<any[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<any | null>(null);
  
  // Template wizard state
  const [templateWizardStep, setTemplateWizardStep] = useState(1);
  const [editingWorkflowStage, setEditingWorkflowStage] = useState<number | null>(null);
  const [newWorkflowStage, setNewWorkflowStage] = useState({
    stage: '',
    stageName: '',
    estimatedHours: 2,
    requiredPhotos: 1,
    description: '',
    order: 1
  });
  
  // Template form
  const [templateForm, setTemplateForm] = useState({
    name: '',
    description: '',
    damageType: 'collision' as 'collision' | 'scratch' | 'dent' | 'rust' | 'paint_damage' | 'other',
    severity: 'minor' as 'minor' | 'moderate' | 'major' | 'severe',
    workflowTemplate: [] as Array<{
      stage: string;
      stageName: string;
      estimatedHours: number;
      requiredPhotos: number;
      description: string;
      order: number;
    }>,
    standardParts: [] as Array<{
      partName: string;
      partNumber?: string;
      brand: string;
      estimatedPrice: number;
      notes?: string;
    }>,
    standardMaterials: [] as Array<{
      materialName: string;
      estimatedQuantity: number;
      estimatedPrice: number;
      notes?: string;
    }>,
    laborRates: {
      hourlyRate: 0,
      overtimeRate: 0,
      weekendRate: 0
    }
  });

  // Ustanın hizmet kategorilerini kontrol et
  const userServiceCategories = useMemo(() => {
    return user?.serviceCategories || [];
  }, [user?.serviceCategories]);

  const hasBodyworkServiceAccess = useMemo(() => {
    if (!userServiceCategories || userServiceCategories.length === 0) return false;
    return userServiceCategories.some(cat => 
      ['bodywork', 'kaporta', 'Kaporta & Boya'].includes(cat)
    );
  }, [userServiceCategories]);

  // Eğer usta bu kategoride hizmet vermiyorsa, ekranı gösterme ve geri yönlendir
  useFocusEffect(
    React.useCallback(() => {
      if (!hasBodyworkServiceAccess && isAuthenticated && user) {
        navigation.goBack();
        return;
      }
    }, [hasBodyworkServiceAccess, isAuthenticated, user, navigation])
  );
  
  // Create job form
  const [createJobForm, setCreateJobForm] = useState({
    customerId: '',
    vehicleId: '',
    description: '',
    damageType: 'collision' as 'collision' | 'scratch' | 'dent' | 'rust' | 'paint_damage' | 'other',
    severity: 'minor' as 'minor' | 'moderate' | 'major' | 'severe',
    affectedAreas: [] as string[],
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
    paintMaterials: [] as Array<{
      materialName: string;
      quantity: number;
      unitPrice: number;
    }>,
    validityDays: 30
  });

  useEffect(() => {
    if (hasBodyworkServiceAccess) {
      fetchBodyworkJobs();
    }
  }, [hasBodyworkServiceAccess]);

  // Şablonları yükle
  useEffect(() => {
    if (activeTab === 'templates' && hasBodyworkServiceAccess) {
      fetchTemplates();
    }
  }, [activeTab, hasBodyworkServiceAccess]);

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

  const fetchBodyworkJobs = async () => {
    try {
      setLoading(true);
      const response = await apiService.getBodyworkJobs();
      if (response.success) {
        setJobs(response.data || []);
      } else {
        Alert.alert('Hata', 'Kaporta işleri yüklenemedi');
      }
    } catch (error) {
      Alert.alert('Hata', 'Kaporta işleri yüklenirken bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchBodyworkJobs();
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
      // Müşteri detaylarını getir, içinde vehicles bilgisi olabilir
      const response = await apiService.CustomerService.getCustomerDetails(customerId);
      if (response.success && response.data) {
        // Müşteri detaylarında vehicles varsa kullan, yoksa boş array
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

  const fetchTemplates = async () => {
    try {
      setLoadingTemplates(true);
      console.log('🔄 [BodyworkScreen] fetchTemplates çağrılıyor...');
      const response = await apiService.BodyworkService.getTemplates();
      console.log('📦 [BodyworkScreen] fetchTemplates response:', {
        success: response.success,
        dataType: typeof response.data,
        isArray: Array.isArray(response.data),
        dataLength: Array.isArray(response.data) ? response.data.length : 'N/A'
      });
      
      if (response.success) {
        // Response.data bir array olabilir veya { data: [...] } formatında olabilir
        const templatesData = Array.isArray(response.data) 
          ? response.data 
          : (response.data?.data || []);
        console.log('✅ [BodyworkScreen] Templates set ediliyor:', templatesData.length);
        setTemplates(templatesData);
      } else {
        console.error('❌ [BodyworkScreen] Fetch templates error:', response.message);
        setTemplates([]);
      }
    } catch (error: any) {
      console.error('❌ [BodyworkScreen] Şablonlar yüklenirken hata:', error);
      setTemplates([]);
      // Hata durumunda kullanıcıyı rahatsız etme, sadece logla
    } finally {
      setLoadingTemplates(false);
    }
  };

  const handleDeleteTemplate = async (templateId: string) => {
    Alert.alert(
      'Şablonu Sil',
      'Bu şablonu silmek istediğinizden emin misiniz?',
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Sil',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await apiService.BodyworkService.deleteTemplate(templateId);
              if (response.success) {
                Alert.alert('Başarılı', 'Şablon silindi');
                fetchTemplates();
              } else {
                Alert.alert('Hata', response.message || 'Şablon silinemedi');
              }
            } catch (error) {
              Alert.alert('Hata', 'Şablon silinirken bir hata oluştu');
            }
          }
        }
      ]
    );
  };

  const handleUseTemplate = (template: any) => {
    // Şablonu kullanarak formu otomatik doldur
    setCreateJobForm(prev => ({
      ...prev,
      damageType: template.damageType,
      severity: template.severity,
      affectedAreas: [], // Kullanıcı seçmeli
      description: `${template.description}\n\nŞablon: ${template.name}`,
      estimatedRepairTime: template.workflowTemplate?.reduce((sum: number, stage: any) => sum + (stage.estimatedHours || 0), 0) || 7
    }));
    setSelectedTemplate(template);
    setShowCreateJobModal(true);
  };

  const handleCreateJob = async () => {
    try {
      if (!createJobForm.customerId || !createJobForm.vehicleId || !createJobForm.description) {
        Alert.alert('Hata', 'Lütfen tüm gerekli alanları doldurun');
        return;
      }

      const response = await apiService.createBodyworkJob({
        customerId: createJobForm.customerId,
        vehicleId: createJobForm.vehicleId,
        damageInfo: {
          description: createJobForm.description,
          photos: createJobForm.photos,
          damageType: createJobForm.damageType,
          severity: createJobForm.severity,
          affectedAreas: createJobForm.affectedAreas,
          estimatedRepairTime: createJobForm.estimatedRepairTime
        }
      });

      if (response.success) {
        Alert.alert('Başarılı', 'Kaporta işi başarıyla oluşturuldu');
        setShowCreateJobModal(false);
        resetCreateJobForm();
        await fetchBodyworkJobs();
      } else {
        Alert.alert('Hata', response.message || 'Kaporta işi oluşturulamadı');
      }
    } catch (error) {
      Alert.alert('Hata', 'Kaporta işi oluşturulurken bir hata oluştu');
    }
  };

  const handlePrepareQuote = async () => {
    try {
      if (!selectedJob) return;

      const response = await apiService.prepareQuote(selectedJob._id, quoteForm);
      if (response.success) {
        Alert.alert('Başarılı', 'Teklif başarıyla hazırlandı');
        setShowQuoteModal(false);
        resetQuoteForm();
        await fetchBodyworkJobs();
      } else {
        Alert.alert('Hata', response.message || 'Teklif hazırlanamadı');
      }
    } catch (error) {
      Alert.alert('Hata', 'Teklif hazırlanırken bir hata oluştu');
    }
  };

  const handleSendQuote = async (jobId: string) => {
    try {
      const response = await apiService.sendQuote(jobId);
      if (response.success) {
        Alert.alert('Başarılı', 'Teklif müşteriye gönderildi');
        await fetchBodyworkJobs();
      } else {
        Alert.alert('Hata', response.message || 'Teklif gönderilemedi');
      }
    } catch (error) {
      Alert.alert('Hata', 'Teklif gönderilirken bir hata oluştu');
    }
  };

  const handleUpdateWorkflowStage = async (jobId: string, stage: string, status: string, photos?: string[]) => {
    try {
      const response = await apiService.updateWorkflowStage(jobId, {
        stage,
        status: status as any,
        notes: '',
        photos: photos || []
      });

      if (response.success) {
        Alert.alert('Başarılı', 'İş akışı aşaması güncellendi');
        await fetchBodyworkJobs();
        if (selectedJob?._id === jobId) {
          // Modal'daki job'ı güncelle
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

  const handlePickStagePhoto = async (jobId: string, stage: string) => {
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
        await uploadStagePhoto(jobId, stage, result.assets[0].uri);
      }
    } catch (error) {
      console.error('Fotoğraf seçme hatası:', error);
      Alert.alert('Hata', 'Fotoğraf seçilemedi');
    }
  };

  const handleTakeStagePhoto = async (jobId: string, stage: string) => {
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
        await uploadStagePhoto(jobId, stage, result.assets[0].uri);
      }
    } catch (error) {
      console.error('Fotoğraf çekme hatası:', error);
      Alert.alert('Hata', 'Fotoğraf çekilemedi');
    }
  };

  const uploadStagePhoto = async (jobId: string, stage: string, photoUri: string) => {
    try {
      setUploadingStagePhoto(`${jobId}-${stage}`);
      setShowPhotoOptions(null);

      // Fotoğrafı yükle
      const uploadResponse = await apiService.BodyworkService.uploadBodyworkMedia(photoUri, 'image');
      
      if (uploadResponse.success && uploadResponse.data?.url) {
        // Mevcut stage'in fotoğraflarını al
        const currentJob = jobs.find(j => j._id === jobId);
        const currentStage = currentJob?.workflow.stages.find(s => s.stage === stage);
        const existingPhotos = currentStage?.photos || [];
        const newPhotos = [...existingPhotos, uploadResponse.data.url];

        // Stage'i fotoğraflarla güncelle
        await handleUpdateWorkflowStage(jobId, stage, currentStage?.status || 'in_progress', newPhotos);
      } else {
        Alert.alert('Hata', 'Fotoğraf yüklenemedi');
      }
    } catch (error) {
      console.error('Fotoğraf yükleme hatası:', error);
      Alert.alert('Hata', 'Fotoğraf yüklenirken bir hata oluştu');
    } finally {
      setUploadingStagePhoto(null);
    }
  };

  const resetCreateJobForm = () => {
    setCreateJobForm({
      customerId: '',
      vehicleId: '',
      description: '',
      damageType: 'collision',
      severity: 'minor',
      affectedAreas: [],
      estimatedRepairTime: 0,
      photos: []
    });
  };

  const resetQuoteForm = () => {
    setQuoteForm({
      partsToReplace: [],
      partsToRepair: [],
      paintMaterials: [],
      validityDays: 30
    });
  };

  const getDamageTypeText = (type: string) => {
    const types = {
      collision: 'Çarpışma',
      scratch: 'Çizik',
      dent: 'Göçük',
      rust: 'Pas',
      paint_damage: 'Boya Hasarı',
      other: 'Diğer'
    };
    return types[type as keyof typeof types] || type;
  };

  const getSeverityText = (severity: string) => {
    const severities = {
      minor: 'Hafif',
      moderate: 'Orta',
      major: 'Ağır',
      severe: 'Ciddi'
    };
    return severities[severity as keyof typeof severities] || severity;
  };

  const getSeverityColor = (severity: string) => {
    const colors = {
      minor: '#4CAF50',
      moderate: '#FF9800',
      major: '#F44336',
      severe: '#9C27B0'
    };
    return colors[severity as keyof typeof colors] || '#666';
  };

  const getStatusText = (status: string) => {
    const statuses = {
      quote_preparation: 'Teklif Hazırlanıyor',
      quote_sent: 'Teklif Gönderildi',
      quote_accepted: 'Teklif Kabul Edildi',
      work_started: 'İş Başladı',
      in_progress: 'Devam Ediyor',
      completed: 'Tamamlandı',
      cancelled: 'İptal Edildi'
    };
    return statuses[status as keyof typeof statuses] || status;
  };

  const getStatusColor = (status: string) => {
    const colors = {
      quote_preparation: '#FF9800',
      quote_sent: '#2196F3',
      quote_accepted: '#4CAF50',
      work_started: '#4CAF50',
      in_progress: '#4CAF50',
      completed: '#4CAF50',
      cancelled: '#F44336'
    };
    return colors[status as keyof typeof colors] || '#666';
  };

  const getStageText = (stage: string) => {
    const stages = {
      quote_preparation: 'Teklif Hazırlama',
      disassembly: 'Söküm',
      repair: 'Düzeltme',
      putty: 'Macun',
      primer: 'Astar',
      paint: 'Boya',
      assembly: 'Montaj',
      quality_check: 'Kalite Kontrol',
      completed: 'Tamamlandı'
    };
    return stages[stage as keyof typeof stages] || stage;
  };

  const getStageStatusText = (status: string) => {
    const statuses = {
      pending: 'Bekliyor',
      in_progress: 'Devam Ediyor',
      completed: 'Tamamlandı',
      skipped: 'Atlandı'
    };
    return statuses[status as keyof typeof statuses] || status;
  };

  const getStageStatusColor = (status: string) => {
    const colors = {
      pending: '#9E9E9E',
      in_progress: '#2196F3',
      completed: '#4CAF50',
      skipped: '#FF9800'
    };
    return colors[status as keyof typeof colors] || '#666';
  };

  const getQuoteStatusText = (status: string) => {
    const statuses = {
      draft: 'Taslak',
      sent: 'Gönderildi',
      accepted: 'Kabul Edildi',
      rejected: 'Reddedildi',
      expired: 'Süresi Doldu'
    };
    return statuses[status as keyof typeof statuses] || status;
  };

  const renderActiveJobs = () => (
    <View style={styles.tabContent}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {jobs.filter(job => ['quote_preparation', 'quote_sent', 'quote_accepted', 'work_started', 'in_progress'].includes(job.status)).map((job) => (
          <Card key={job._id} style={styles.jobCard}>
            <View style={styles.jobHeader}>
              <View style={styles.jobInfo}>
                <Text style={styles.jobCustomer}>
                  {job.customerId.name} {job.customerId.surname}
                </Text>
                <Text style={styles.jobVehicle}>
                  {job.vehicleId.brand} {job.vehicleId.modelName} - {job.vehicleId.plateNumber}
                </Text>
              </View>
              <View style={[styles.statusBadge, { backgroundColor: getStatusColor(job.status) }]}>
                <Text style={styles.statusText}>{getStatusText(job.status)}</Text>
              </View>
            </View>

            <View style={styles.jobDetails}>
              <View style={styles.detailRow}>
                <Ionicons name="warning" size={16} color={colors.text.secondary} />
                <Text style={styles.detailText}>{getDamageTypeText(job.damageInfo.damageType)}</Text>
                <View style={[styles.severityBadge, { backgroundColor: getSeverityColor(job.damageInfo.severity) }]}>
                  <Text style={styles.severityText}>{getSeverityText(job.damageInfo.severity)}</Text>
                </View>
              </View>

              <Text style={styles.jobDescription}>{job.damageInfo.description}</Text>

              {job.damageInfo.photos.length > 0 && (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photosContainer}>
                  {job.damageInfo.photos.map((photo, index) => (
                    <Image key={index} source={{ uri: photo }} style={styles.photoThumbnail} />
                  ))}
                </ScrollView>
              )}

              {job.quote.totalAmount > 0 && (
                <View style={styles.quoteInfo}>
                  <Text style={styles.quoteAmount}>{job.quote.totalAmount.toLocaleString()}₺</Text>
                  <Text style={styles.quoteStatus}>{getQuoteStatusText(job.quote.status)}</Text>
                </View>
              )}

              <View style={styles.workflowPreview}>
                <Text style={styles.workflowTitle}>İş Akışı:</Text>
                <Text style={styles.currentStage}>{getStageText(job.workflow.currentStage)}</Text>
              </View>
            </View>

            <View style={styles.jobActions}>
              {job.status === 'quote_preparation' && (
                <Button
                  title="Teklif Hazırla"
                  onPress={() => {
                    setSelectedJob(job);
                    setShowQuoteModal(true);
                  }}
                  style={styles.actionButton}
                />
              )}
              
              {job.status === 'quote_sent' && (
                <Button
                  title="Teklifi Yeniden Gönder"
                  onPress={() => handleSendQuote(job._id)}
                  style={styles.actionButton}
                />
              )}
              
              {['quote_accepted', 'work_started', 'in_progress'].includes(job.status) && (
                <Button
                  title="İş Akışını Görüntüle"
                  onPress={() => {
                    setSelectedJob(job);
                    setShowWorkflowModal(true);
                  }}
                  style={styles.actionButton}
                />
              )}
            </View>
          </Card>
        ))}
      </ScrollView>
    </View>
  );

  const renderCompletedJobs = () => (
    <View style={styles.tabContent}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {jobs.filter(job => job.status === 'completed').map((job) => (
          <Card key={job._id} style={styles.jobCard}>
            <View style={styles.jobHeader}>
              <View style={styles.jobInfo}>
                <Text style={styles.jobCustomer}>
                  {job.customerId.name} {job.customerId.surname}
                </Text>
                <Text style={styles.jobVehicle}>
                  {job.vehicleId.brand} {job.vehicleId.modelName} - {job.vehicleId.plateNumber}
                </Text>
              </View>
              <View style={[styles.statusBadge, { backgroundColor: getStatusColor(job.status) }]}>
                <Text style={styles.statusText}>{getStatusText(job.status)}</Text>
              </View>
            </View>

            <View style={styles.jobDetails}>
              <Text style={styles.jobDescription}>{job.damageInfo.description}</Text>
              
              <View style={styles.quoteInfo}>
                <Text style={styles.quoteAmount}>{job.quote.totalAmount.toLocaleString()}₺</Text>
                <Text style={styles.completionDate}>
                  Tamamlanma: {new Date(job.workflow.estimatedCompletionDate).toLocaleDateString('tr-TR')}
                </Text>
              </View>
            </View>
          </Card>
        ))}
      </ScrollView>
    </View>
  );

  const renderTemplates = () => {
    if (loadingTemplates) {
      return (
        <View style={styles.tabContent}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary.main} />
            <Text style={styles.loadingText}>Şablonlar yükleniyor...</Text>
          </View>
        </View>
      );
    }

    return (
      <View style={styles.tabContent}>
        <View style={styles.templatesHeader}>
          <Text style={styles.templatesTitle}>İş Şablonları</Text>
          <Button
            title="Yeni Şablon"
            onPress={() => setShowTemplateModal(true)}
            style={styles.addTemplateButton}
          />
        </View>

        {templates.length === 0 ? (
          <Card style={styles.emptyTemplateCard}>
            <Ionicons name="document-text-outline" size={48} color={colors.text.secondary} />
            <Text style={styles.emptyTemplateTitle}>Henüz Şablon Yok</Text>
            <Text style={styles.emptyTemplateDescription}>
              Sık kullanılan hasar türleri için şablonlar oluşturun ve hızlı iş oluşturun.
            </Text>
            <Button
              title="İlk Şablonu Oluştur"
              onPress={() => setShowTemplateModal(true)}
              style={styles.primaryButton}
            />
          </Card>
        ) : (
          <ScrollView showsVerticalScrollIndicator={false}>
            {templates.map((template) => (
              <Card key={template._id} style={styles.templateCard}>
                <View style={styles.templateHeader}>
                  <View style={styles.templateInfo}>
                    <Text style={styles.templateName}>{template.name}</Text>
                    <Text style={styles.templateDescription}>{template.description}</Text>
                    <View style={styles.templateTags}>
                      <View style={styles.templateTag}>
                        <Text style={styles.templateTagText}>
                          {getDamageTypeText(template.damageType)}
                        </Text>
                      </View>
                      <View style={styles.templateTag}>
                        <Text style={styles.templateTagText}>
                          {getSeverityText(template.severity)}
                        </Text>
                      </View>
                    </View>
                  </View>
                  <View style={styles.templateActions}>
                    <TouchableOpacity
                      style={styles.templateActionButton}
                      onPress={() => handleUseTemplate(template)}
                    >
                      <Ionicons name="play" size={20} color={colors.primary.main} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.templateActionButton}
                      onPress={() => Alert.alert('Bilgi', 'Şablon düzenleme yakında eklenecek')}
                    >
                      <Ionicons name="create-outline" size={20} color={colors.text.secondary} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.templateActionButton}
                      onPress={() => handleDeleteTemplate(template._id)}
                    >
                      <Ionicons name="trash-outline" size={20} color={colors.error.main} />
                    </TouchableOpacity>
                  </View>
                </View>
                <View style={styles.templateDetails}>
                  <Text style={styles.templateDetailLabel}>
                    İş Akışı: {template.workflowTemplate?.length || 0} aşama
                  </Text>
                  <Text style={styles.templateDetailLabel}>
                    Parçalar: {template.standardParts?.length || 0} adet
                  </Text>
                  <Text style={styles.templateDetailLabel}>
                    Malzemeler: {template.standardMaterials?.length || 0} adet
                  </Text>
                </View>
              </Card>
            ))}
          </ScrollView>
        )}
      </View>
    );
  };

  const renderCreateJobModal = () => (
    <Modal
      visible={showCreateJobModal}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <SafeAreaView style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Yeni Kaporta İşi</Text>
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
            <Text style={styles.formLabel}>Hasar Türü</Text>
            <View style={styles.damageTypeSelector}>
              {['collision', 'scratch', 'dent', 'rust', 'paint_damage', 'other'].map((type) => (
                <TouchableOpacity
                  key={type}
                  style={[styles.damageTypeButton, createJobForm.damageType === type && styles.damageTypeButtonActive]}
                  onPress={() => setCreateJobForm(prev => ({ ...prev, damageType: type as any }))}
                >
                  <Text style={[styles.damageTypeButtonText, createJobForm.damageType === type && styles.damageTypeButtonTextActive]}>
                    {getDamageTypeText(type)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          
          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>Hasar Şiddeti</Text>
            <View style={styles.severitySelector}>
              {['minor', 'moderate', 'major', 'severe'].map((severity) => (
                <TouchableOpacity
                  key={severity}
                  style={[styles.severityButton, createJobForm.severity === severity && styles.severityButtonActive]}
                  onPress={() => setCreateJobForm(prev => ({ ...prev, severity: severity as any }))}
                >
                  <Text style={[styles.severityButtonText, createJobForm.severity === severity && styles.severityButtonTextActive]}>
                    {getSeverityText(severity)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          
          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>Hasar Açıklaması</Text>
            <TextInput
              style={[styles.formInput, styles.formTextArea]}
              value={createJobForm.description}
              onChangeText={(text) => setCreateJobForm(prev => ({ ...prev, description: text }))}
              placeholder="Hasar detaylarını açıklayın..."
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
        </ScrollView>
        
        <View style={styles.modalFooter}>
          <Button
            title="İptal"
            onPress={() => setShowCreateJobModal(false)}
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
    <Modal
      visible={showQuoteModal}
      animationType="slide"
      presentationStyle="pageSheet"
    >
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

          <Text style={styles.quoteSectionTitle}>Boya Malzemeleri</Text>
          <Button
            title="Malzeme Ekle"
            onPress={() => {
              const newMaterial = {
                materialName: '',
                quantity: 0,
                unitPrice: 0
              };
              setQuoteForm(prev => ({
                ...prev,
                paintMaterials: [...prev.paintMaterials, newMaterial]
              }));
            }}
            style={styles.addButton}
          />
        </ScrollView>
        
        <View style={styles.modalFooter}>
          <Button
            title="İptal"
            onPress={() => setShowQuoteModal(false)}
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
    <Modal
      visible={showWorkflowModal}
      animationType="slide"
      presentationStyle="pageSheet"
    >
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
                  <Ionicons name="checkmark" size={16} color={colors.text.inverse} />
                </View>
                <Text style={styles.stageName}>{getStageText(stage.stage)}</Text>
                <Text style={[styles.stageStatus, { color: getStageStatusColor(stage.status) }]}>
                  {getStageStatusText(stage.status)}
                </Text>
              </View>
              
              {/* Fotoğraflar */}
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

                {stage.photos.length > 0 ? (
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

  const handleCreateTemplate = async () => {
    try {
      // Validation
      if (!templateForm.name || !templateForm.description) {
        Alert.alert('Eksik Bilgi', 'Lütfen şablon adı ve açıklama girin');
        return;
      }

      if (templateForm.workflowTemplate.length === 0) {
        Alert.alert('Eksik Bilgi', 'En az bir iş akışı aşaması eklemelisiniz');
        return;
      }

      if (templateForm.laborRates.hourlyRate <= 0) {
        Alert.alert('Eksik Bilgi', 'Normal saatlik ücret 0\'dan büyük olmalıdır');
        return;
      }

      setLoadingTemplates(true);
      const response = await apiService.BodyworkService.createTemplate(templateForm);
      
      if (response.success) {
        Alert.alert('Başarılı', 'Şablon başarıyla oluşturuldu!', [
          {
            text: 'Tamam',
            onPress: () => {
              setShowTemplateModal(false);
              resetTemplateForm();
              fetchTemplates();
            }
          }
        ]);
      } else {
        Alert.alert('Hata', response.message || 'Şablon oluşturulamadı');
        setLoadingTemplates(false);
      }
    } catch (error: any) {
      console.error('Template creation error:', error);
      Alert.alert('Hata', error.response?.data?.message || 'Şablon oluşturulurken bir hata oluştu');
      setLoadingTemplates(false);
    }
  };

  const resetTemplateForm = () => {
    setTemplateForm({
      name: '',
      description: '',
      damageType: 'collision',
      severity: 'minor',
      workflowTemplate: [],
      standardParts: [],
      standardMaterials: [],
      laborRates: {
        hourlyRate: 0,
        overtimeRate: 0,
        weekendRate: 0
      }
    });
    setTemplateWizardStep(1);
    setEditingWorkflowStage(null);
    setNewWorkflowStage({
      stage: '',
      stageName: '',
      estimatedHours: 2,
      requiredPhotos: 1,
      description: '',
      order: 1
    });
  };

  const addWorkflowStage = () => {
    if (!newWorkflowStage.stageName || !newWorkflowStage.stage) {
      Alert.alert('Hata', 'Aşama adı ve aşama kodu gereklidir');
      return;
    }
    
    const order = templateForm.workflowTemplate.length + 1;
    setTemplateForm(prev => ({
      ...prev,
      workflowTemplate: [...prev.workflowTemplate, {
        ...newWorkflowStage,
        order
      }]
    }));
    
    setNewWorkflowStage({
      stage: '',
      stageName: '',
      estimatedHours: 2,
      requiredPhotos: 1,
      description: '',
      order: order + 1
    });
    setEditingWorkflowStage(null);
  };

  const removeWorkflowStage = (index: number) => {
    Alert.alert(
      'Aşamayı Sil',
      'Bu aşamayı silmek istediğinizden emin misiniz?',
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Sil',
          style: 'destructive',
          onPress: () => {
            const newStages = templateForm.workflowTemplate.filter((_, i) => i !== index);
            setTemplateForm(prev => ({
              ...prev,
              workflowTemplate: newStages.map((stage, i) => ({ ...stage, order: i + 1 }))
            }));
          }
        }
      ]
    );
  };

  const renderTemplateModal = () => {
    const totalSteps = 4;
    const stepTitles = ['Temel Bilgiler', 'Hasar Detayları', 'İş Akışı', 'İşçilik Ücretleri'];
    
    return (
      <Modal
        visible={showTemplateModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => {
              if (templateWizardStep > 1) {
                setTemplateWizardStep(prev => prev - 1);
              } else {
                setShowTemplateModal(false);
                resetTemplateForm();
              }
            }}>
              <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
            </TouchableOpacity>
            <View style={styles.modalHeaderCenter}>
              <Text style={styles.modalTitle}>Yeni Şablon</Text>
              <Text style={styles.modalSubtitle}>
                Adım {templateWizardStep}/{totalSteps}
              </Text>
            </View>
            <TouchableOpacity onPress={() => {
              Alert.alert(
                'İptal',
                'Şablon oluşturma işlemini iptal etmek istediğinize emin misiniz?',
                [
                  { text: 'Hayır', style: 'cancel' },
                  {
                    text: 'Evet',
                    style: 'destructive',
                    onPress: () => {
                      setShowTemplateModal(false);
                      resetTemplateForm();
                    }
                  }
                ]
              );
            }}>
              <Ionicons name="close" size={24} color={colors.text.primary} />
            </TouchableOpacity>
          </View>

          {/* Progress Bar */}
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${(templateWizardStep / totalSteps) * 100}%` }]} />
            </View>
            <View style={styles.progressSteps}>
              {stepTitles.map((title, index) => (
                <View key={index} style={styles.progressStep}>
                  <View style={[
                    styles.progressStepDot,
                    templateWizardStep > index + 1 && styles.progressStepDotCompleted,
                    templateWizardStep === index + 1 && styles.progressStepDotActive
                  ]}>
                    {templateWizardStep > index + 1 && (
                      <Ionicons name="checkmark" size={12} color="#FFFFFF" />
                    )}
                  </View>
                  <Text style={[
                    styles.progressStepText,
                    templateWizardStep >= index + 1 && styles.progressStepTextActive
                  ]}>
                    {title}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        
        <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
          {/* Step 1: Temel Bilgiler */}
          {templateWizardStep === 1 && (
            <View style={styles.wizardStep}>
              <View style={styles.stepIconContainer}>
                <Ionicons name="document-text" size={48} color={colors.primary.main} />
              </View>
              <Text style={styles.stepTitle}>Şablon Bilgileri</Text>
              <Text style={styles.stepDescription}>
                Şablonunuz için temel bilgileri girin
              </Text>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Şablon Adı *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Örn: Ön Tampon Çarpışma"
                  value={templateForm.name}
                  onChangeText={(text) => setTemplateForm(prev => ({ ...prev, name: text }))}
                  placeholderTextColor={colors.text.secondary}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Açıklama *</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="Bu şablon ne için kullanılacak? Detaylı açıklayın..."
                  value={templateForm.description}
                  onChangeText={(text) => setTemplateForm(prev => ({ ...prev, description: text }))}
                  multiline
                  numberOfLines={4}
                  placeholderTextColor={colors.text.secondary}
                />
                <Text style={styles.formHelperText}>
                  Müşteriler bu açıklamayı görecek
                </Text>
              </View>
            </View>
          )}

          {/* Step 2: Hasar Detayları */}
          {templateWizardStep === 2 && (
            <View style={styles.wizardStep}>
              <View style={styles.stepIconContainer}>
                <Ionicons name="warning" size={48} color={colors.warning?.main || '#F59E0B'} />
              </View>
              <Text style={styles.stepTitle}>Hasar Bilgileri</Text>
              <Text style={styles.stepDescription}>
                Hasar türü ve şiddetini seçin
              </Text>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Hasar Türü *</Text>
                <View style={styles.gridContainer}>
                  {[
                    { value: 'collision', label: 'Çarpışma', icon: 'car-sport' },
                    { value: 'scratch', label: 'Çizik', icon: 'cut' },
                    { value: 'dent', label: 'Göçük', icon: 'remove-circle' },
                    { value: 'rust', label: 'Pas', icon: 'water' },
                    { value: 'paint_damage', label: 'Boya Hasarı', icon: 'brush' },
                    { value: 'other', label: 'Diğer', icon: 'ellipse' }
                  ].map((type) => (
                    <TouchableOpacity
                      key={type.value}
                      style={[
                        styles.gridOption,
                        templateForm.damageType === type.value && styles.gridOptionSelected
                      ]}
                      onPress={() => setTemplateForm(prev => ({ ...prev, damageType: type.value as any }))}
                    >
                      <Ionicons 
                        name={type.icon as any} 
                        size={24} 
                        color={templateForm.damageType === type.value ? colors.primary.main : colors.text.secondary} 
                      />
                      <Text style={[
                        styles.gridOptionText,
                        templateForm.damageType === type.value && styles.gridOptionTextSelected
                      ]}>
                        {type.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Şiddet Seviyesi *</Text>
                <View style={styles.severityContainer}>
                  {[
                    { value: 'minor', label: 'Hafif', color: '#10B981', icon: 'checkmark-circle' },
                    { value: 'moderate', label: 'Orta', color: '#F59E0B', icon: 'alert-circle' },
                    { value: 'major', label: 'Ağır', color: '#EF4444', icon: 'warning' },
                    { value: 'severe', label: 'Çok Ağır', color: '#DC2626', icon: 'alert' }
                  ].map((sev) => (
                    <TouchableOpacity
                      key={sev.value}
                      style={[
                        styles.severityOption,
                        templateForm.severity === sev.value && styles.severityOptionSelected,
                        templateForm.severity === sev.value && { borderColor: sev.color }
                      ]}
                      onPress={() => setTemplateForm(prev => ({ ...prev, severity: sev.value as any }))}
                    >
                      <Ionicons 
                        name={sev.icon as any} 
                        size={20} 
                        color={templateForm.severity === sev.value ? sev.color : colors.text.secondary} 
                      />
                      <Text style={[
                        styles.severityOptionText,
                        templateForm.severity === sev.value && { color: sev.color, fontWeight: '600' }
                      ]}>
                        {sev.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>
          )}

          {/* Step 3: İş Akışı */}
          {templateWizardStep === 3 && (
            <View style={styles.wizardStep}>
              <View style={styles.stepIconContainer}>
                <Ionicons name="list" size={48} color={colors.primary.main} />
              </View>
              <Text style={styles.stepTitle}>İş Akışı Aşamaları</Text>
              <Text style={styles.stepDescription}>
                İşin hangi aşamalardan geçeceğini belirleyin
              </Text>

              {templateForm.workflowTemplate.length === 0 ? (
                <Card style={styles.emptyWorkflowCard}>
                  <Ionicons name="add-circle-outline" size={48} color={colors.text.secondary} />
                  <Text style={styles.emptyWorkflowTitle}>Henüz Aşama Yok</Text>
                  <Text style={styles.emptyWorkflowText}>
                    Varsayılan iş akışını kullanabilir veya kendi aşamalarınızı ekleyebilirsiniz
                  </Text>
                  <Button
                    title="Varsayılan İş Akışını Kullan"
                    onPress={() => {
                      const defaultWorkflow = [
                        { stage: 'disassembly', stageName: 'Söküm', estimatedHours: 2, requiredPhotos: 2, description: 'Hasarlı parçaların sökülmesi', order: 1 },
                        { stage: 'repair', stageName: 'Düzeltme', estimatedHours: 4, requiredPhotos: 3, description: 'Gövde düzeltme işlemleri', order: 2 },
                        { stage: 'putty', stageName: 'Macun', estimatedHours: 2, requiredPhotos: 2, description: 'Macun çekme işlemleri', order: 3 },
                        { stage: 'primer', stageName: 'Astar', estimatedHours: 1, requiredPhotos: 1, description: 'Astar atma işlemi', order: 4 },
                        { stage: 'paint', stageName: 'Boya', estimatedHours: 3, requiredPhotos: 2, description: 'Boya işlemi', order: 5 },
                        { stage: 'assembly', stageName: 'Montaj', estimatedHours: 2, requiredPhotos: 1, description: 'Parçaların montajı', order: 6 },
                        { stage: 'quality_check', stageName: 'Kalite Kontrol', estimatedHours: 1, requiredPhotos: 2, description: 'Son kalite kontrolü', order: 7 }
                      ];
                      setTemplateForm(prev => ({ ...prev, workflowTemplate: defaultWorkflow }));
                    }}
                    style={styles.secondaryButton}
                  />
                </Card>
              ) : (
                <>
                  <View style={styles.workflowList}>
                    {templateForm.workflowTemplate.map((stage, index) => (
                      <Card key={index} style={styles.workflowStageCard}>
                        <View style={styles.workflowStageHeader}>
                          <View style={styles.workflowStageNumber}>
                            <Text style={styles.workflowStageNumberText}>{index + 1}</Text>
                          </View>
                          <View style={styles.workflowStageContent}>
                            <Text style={styles.workflowStageName}>{stage.stageName}</Text>
                            <Text style={styles.workflowStageDesc}>{stage.description}</Text>
                            <View style={styles.workflowStageMeta}>
                              <View style={styles.workflowStageMetaItem}>
                                <Ionicons name="time-outline" size={14} color={colors.text.secondary} />
                                <Text style={styles.workflowStageInfo}>{stage.estimatedHours} saat</Text>
                              </View>
                              <View style={styles.workflowStageMetaItem}>
                                <Ionicons name="camera-outline" size={14} color={colors.text.secondary} />
                                <Text style={styles.workflowStageInfo}>{stage.requiredPhotos} fotoğraf</Text>
                              </View>
                            </View>
                          </View>
                          <TouchableOpacity
                            onPress={() => removeWorkflowStage(index)}
                            style={styles.removeStageButton}
                          >
                            <Ionicons name="trash-outline" size={20} color={colors.error?.main || '#EF4444'} />
                          </TouchableOpacity>
                        </View>
                      </Card>
                    ))}
                  </View>
                </>
              )}
            </View>
          )}

          {/* Step 4: İşçilik Ücretleri */}
          {templateWizardStep === 4 && (
            <View style={styles.wizardStep}>
              <View style={styles.stepIconContainer}>
                <Ionicons name="cash" size={48} color={colors.success?.main || '#10B981'} />
              </View>
              <Text style={styles.stepTitle}>İşçilik Ücretleri</Text>
              <Text style={styles.stepDescription}>
                Standart işçilik ücretlerinizi belirleyin
              </Text>

              <Card style={styles.rateCard}>
                <View style={styles.formGroup}>
                  <View style={styles.rateHeader}>
                    <Ionicons name="time" size={20} color={colors.primary.main} />
                    <Text style={styles.formLabel}>Normal Çalışma Saati *</Text>
                  </View>
                  <TextInput
                    style={styles.input}
                    placeholder="Örn: 500"
                    value={templateForm.laborRates.hourlyRate > 0 ? templateForm.laborRates.hourlyRate.toString() : ''}
                    onChangeText={(text) => {
                      const numValue = text.replace(/[^0-9]/g, '');
                      setTemplateForm(prev => ({
                        ...prev,
                        laborRates: { ...prev.laborRates, hourlyRate: parseFloat(numValue) || 0 }
                      }));
                    }}
                    keyboardType="numeric"
                    placeholderTextColor={colors.text.secondary}
                  />
                  <Text style={styles.formHelperText}>Saatlik ücret (₺) - Normal çalışma saatleri için</Text>
                </View>
              </Card>

              <Card style={styles.rateCard}>
                <View style={styles.formGroup}>
                  <View style={styles.rateHeader}>
                    <Ionicons name="moon" size={20} color={colors.warning?.main || '#F59E0B'} />
                    <Text style={styles.formLabel}>Mesai Saati</Text>
                  </View>
                  <TextInput
                    style={styles.input}
                    placeholder="Örn: 750 (Opsiyonel)"
                    value={templateForm.laborRates.overtimeRate > 0 ? templateForm.laborRates.overtimeRate.toString() : ''}
                    onChangeText={(text) => {
                      const numValue = text.replace(/[^0-9]/g, '');
                      setTemplateForm(prev => ({
                        ...prev,
                        laborRates: { ...prev.laborRates, overtimeRate: parseFloat(numValue) || 0 }
                      }));
                    }}
                    keyboardType="numeric"
                    placeholderTextColor={colors.text.secondary}
                  />
                  <Text style={styles.formHelperText}>Saatlik ücret (₺) - Mesai saatleri için (opsiyonel)</Text>
                </View>
              </Card>

              <Card style={styles.rateCard}>
                <View style={styles.formGroup}>
                  <View style={styles.rateHeader}>
                    <Ionicons name="calendar" size={20} color={colors.info?.main || '#3B82F6'} />
                    <Text style={styles.formLabel}>Hafta Sonu</Text>
                  </View>
                  <TextInput
                    style={styles.input}
                    placeholder="Örn: 1000 (Opsiyonel)"
                    value={templateForm.laborRates.weekendRate > 0 ? templateForm.laborRates.weekendRate.toString() : ''}
                    onChangeText={(text) => {
                      const numValue = text.replace(/[^0-9]/g, '');
                      setTemplateForm(prev => ({
                        ...prev,
                        laborRates: { ...prev.laborRates, weekendRate: parseFloat(numValue) || 0 }
                      }));
                    }}
                    keyboardType="numeric"
                    placeholderTextColor={colors.text.secondary}
                  />
                  <Text style={styles.formHelperText}>Saatlik ücret (₺) - Cumartesi/Pazar için (opsiyonel)</Text>
                </View>
              </Card>

              {templateForm.laborRates.hourlyRate > 0 && templateForm.workflowTemplate.length > 0 && (
                <Card style={styles.summaryCard}>
                  <Text style={styles.summaryTitle}>Tahmini Maliyet Özeti</Text>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Toplam İş Akışı Süresi:</Text>
                    <Text style={styles.summaryValue}>
                      {templateForm.workflowTemplate.reduce((sum, stage) => sum + (stage.estimatedHours || 0), 0)} saat
                    </Text>
                  </View>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Tahmini İşçilik Maliyeti:</Text>
                    <Text style={styles.summaryValue}>
                      {(
                        templateForm.workflowTemplate.reduce((sum, stage) => sum + (stage.estimatedHours || 0), 0) *
                        templateForm.laborRates.hourlyRate
                      ).toLocaleString('tr-TR')} ₺
                    </Text>
                  </View>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Aşama Sayısı:</Text>
                    <Text style={styles.summaryValue}>{templateForm.workflowTemplate.length} aşama</Text>
                  </View>
                </Card>
              )}
            </View>
          )}

          {/* Navigation Buttons */}
          <View style={styles.wizardActions}>
            {templateWizardStep > 1 && (
              <Button
                title="Geri"
                onPress={() => setTemplateWizardStep(prev => prev - 1)}
                style={styles.secondaryButton}
              />
            )}
            {templateWizardStep < totalSteps ? (
              <Button
                title="İleri"
                onPress={() => {
                  // Validation
                  if (templateWizardStep === 1 && (!templateForm.name || !templateForm.description)) {
                    Alert.alert('Eksik Bilgi', 'Lütfen şablon adı ve açıklama girin');
                    return;
                  }
                  if (templateWizardStep === 3 && templateForm.workflowTemplate.length === 0) {
                    Alert.alert('Eksik Bilgi', 'En az bir iş akışı aşaması eklemelisiniz');
                    return;
                  }
                  setTemplateWizardStep(prev => prev + 1);
                }}
                style={styles.primaryButton}
              />
            ) : (
              <Button
                title={loadingTemplates ? "Oluşturuluyor..." : "Şablonu Oluştur"}
                onPress={handleCreateTemplate}
                style={styles.primaryButton}
                disabled={loadingTemplates}
              />
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
    );
  };

  const renderCustomerSelectModal = () => (
    <Modal
      visible={showCustomerSelectModal}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <SafeAreaView style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Müşteri Seç</Text>
          <TouchableOpacity onPress={() => {
            setShowCustomerSelectModal(false);
            setCustomerSearchQuery('');
          }}>
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
              placeholderTextColor={colors.text.secondary}
            />
            {customerSearchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setCustomerSearchQuery('')}>
                <Ionicons name="close-circle" size={20} color={colors.text.secondary} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {loadingCustomers ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary.main} />
            <Text style={styles.loadingText}>Müşteriler yükleniyor...</Text>
          </View>
        ) : (
          <FlatList
            data={filteredCustomers}
            keyExtractor={(item) => item._id}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.customerItem}
                onPress={() => handleSelectCustomer(item)}
              >
                <View style={styles.customerItemContent}>
                  <Ionicons name="person-circle" size={40} color={colors.primary.main} />
                  <View style={styles.customerItemInfo}>
                    <Text style={styles.customerItemName}>
                      {item.name} {item.surname}
                    </Text>
                    {item.phone && (
                      <Text style={styles.customerItemPhone}>{item.phone}</Text>
                    )}
                    {item.totalJobs > 0 && (
                      <Text style={styles.customerItemStats}>
                        {item.totalJobs} iş • {item.totalSpent?.toLocaleString() || 0}₺
                      </Text>
                    )}
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={20} color={colors.text.secondary} />
              </TouchableOpacity>
            )}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Ionicons name="people-outline" size={64} color={colors.text.secondary} />
                <Text style={styles.emptyTitle}>Müşteri Bulunamadı</Text>
                <Text style={styles.emptyDescription}>
                  {customerSearchQuery
                    ? 'Arama kriterlerinize uygun müşteri bulunamadı'
                    : 'Henüz müşteriniz bulunmuyor'}
                </Text>
              </View>
            }
            contentContainerStyle={styles.customerList}
          />
        )}
      </SafeAreaView>
    </Modal>
  );

  // Eğer usta bu kategoride hizmet vermiyorsa hiçbir şey gösterme
  if (!hasBodyworkServiceAccess) {
    return null;
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary.main} />
          <Text style={styles.loadingText}>Kaporta işleri yükleniyor...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Kaporta/Boya</Text>
        <TouchableOpacity onPress={() => setShowCreateJobModal(true)}>
          <Ionicons name="add" size={24} color={colors.text.primary} />
        </TouchableOpacity>
      </View>

      {/* Tab Navigation */}
      <View style={styles.tabNavigation}>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'active' && styles.tabButtonActive]}
          onPress={() => setActiveTab('active')}
        >
          <Text style={[styles.tabButtonText, activeTab === 'active' && styles.tabButtonTextActive]}>
            Aktif İşler
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'completed' && styles.tabButtonActive]}
          onPress={() => setActiveTab('completed')}
        >
          <Text style={[styles.tabButtonText, activeTab === 'completed' && styles.tabButtonTextActive]}>
            Tamamlanan
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'templates' && styles.tabButtonActive]}
          onPress={() => setActiveTab('templates')}
        >
          <Text style={[styles.tabButtonText, activeTab === 'templates' && styles.tabButtonTextActive]}>
            Şablonlar
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {activeTab === 'active' && renderActiveJobs()}
        {activeTab === 'completed' && renderCompletedJobs()}
        {activeTab === 'templates' && renderTemplates()}
      </ScrollView>

      {/* Modals */}
      {renderCreateJobModal()}
      {renderQuoteModal()}
      {renderWorkflowModal()}
      {renderCustomerSelectModal()}
      {renderTemplateModal()}
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
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text.primary,
  },
  tabNavigation: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  tabButton: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    borderRadius: borderRadius.sm,
    marginHorizontal: spacing.xs,
  },
  tabButtonActive: {
    backgroundColor: colors.primary.main,
  },
  tabButtonText: {
    fontSize: 14,
    color: colors.text.secondary,
  },
  tabButtonTextActive: {
    color: colors.text.inverse,
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  tabContent: {
    padding: spacing.lg,
  },
  jobCard: {
    marginBottom: spacing.lg,
  },
  jobHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  jobInfo: {
    flex: 1,
  },
  jobCustomer: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
  },
  jobVehicle: {
    fontSize: 14,
    color: colors.text.secondary,
    marginTop: spacing.xs,
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  statusText: {
    fontSize: 12,
    color: colors.text.inverse,
    fontWeight: '600',
  },
  jobDetails: {
    marginBottom: spacing.md,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  detailText: {
    fontSize: 14,
    color: colors.text.secondary,
    marginLeft: spacing.xs,
    marginRight: spacing.sm,
  },
  severityBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  severityText: {
    fontSize: 12,
    color: colors.text.inverse,
    fontWeight: '600',
  },
  jobDescription: {
    fontSize: 14,
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  photosContainer: {
    marginBottom: spacing.sm,
  },
  photoThumbnail: {
    width: 80,
    height: 80,
    borderRadius: borderRadius.sm,
    marginRight: spacing.sm,
  },
  quoteInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  quoteAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.primary.main,
  },
  quoteStatus: {
    fontSize: 14,
    color: colors.text.secondary,
  },
  completionDate: {
    fontSize: 14,
    color: colors.text.secondary,
  },
  workflowPreview: {
    marginTop: spacing.sm,
  },
  workflowTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.primary,
  },
  currentStage: {
    fontSize: 14,
    color: colors.text.secondary,
    marginTop: spacing.xs,
  },
  jobActions: {
    marginTop: spacing.md,
  },
  actionButton: {
    marginBottom: spacing.sm,
  },
  templateCard: {
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginBottom: spacing.md,
  },
  cardDescription: {
    fontSize: 14,
    color: colors.text.secondary,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  primaryButton: {
    marginTop: spacing.md,
  },
  secondaryButton: {
    marginTop: spacing.md,
    backgroundColor: colors.background.secondary,
    borderWidth: 1,
    borderColor: colors.border.medium,
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
  input: {
    borderWidth: 1,
    borderColor: colors.border.medium,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: 16,
    color: colors.text.primary,
    backgroundColor: colors.background.secondary,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
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
  damageTypeSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  damageTypeButton: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border.medium,
    borderRadius: borderRadius.sm,
    marginRight: spacing.sm,
    marginBottom: spacing.sm,
  },
  damageTypeButtonActive: {
    backgroundColor: colors.primary.main,
    borderColor: colors.primary.main,
  },
  damageTypeButtonText: {
    fontSize: 12,
    color: colors.text.secondary,
  },
  damageTypeButtonTextActive: {
    color: colors.text.inverse,
    fontWeight: '600',
  },
  severitySelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  severityButton: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border.medium,
    borderRadius: borderRadius.sm,
    marginRight: spacing.sm,
    marginBottom: spacing.sm,
  },
  severityButtonActive: {
    backgroundColor: colors.primary.main,
    borderColor: colors.primary.main,
  },
  severityButtonText: {
    fontSize: 12,
    color: colors.text.secondary,
  },
  severityButtonTextActive: {
    color: colors.text.inverse,
    fontWeight: '600',
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
    marginRight: spacing.xs,
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
  // Customer Selection Styles
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
  // Selected Customer Styles
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
  // Vehicle Selection Styles
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
  // Template styles
  templatesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    marginBottom: spacing.sm,
  },
  templatesTitle: {
    fontSize: typography.fontSize.xl,
    fontWeight: '700',
    color: colors.text.primary,
  },
  addTemplateButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  templateCard: {
    marginBottom: spacing.md,
    marginHorizontal: spacing.md,
  },
  templateHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  templateInfo: {
    flex: 1,
  },
  templateName: {
    fontSize: typography.fontSize.lg,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  templateDescription: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    marginBottom: spacing.sm,
  },
  templateTags: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  templateTag: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.sm,
  },
  templateTagText: {
    fontSize: typography.fontSize.xs,
    color: colors.text.secondary,
  },
  templateActions: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  templateActionButton: {
    padding: spacing.xs,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.background.secondary,
  },
  templateDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border.light,
  },
  templateDetailLabel: {
    fontSize: typography.fontSize.xs,
    color: colors.text.secondary,
  },
  emptyTemplateCard: {
    alignItems: 'center',
    padding: spacing.xxxl,
    margin: spacing.md,
  },
  emptyTemplateTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: '600',
    color: colors.text.primary,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  emptyTemplateDescription: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  radioGroup: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: spacing.xs,
  },
  radioOption: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border.medium,
    borderRadius: borderRadius.md,
    marginRight: spacing.sm,
    marginBottom: spacing.sm,
    backgroundColor: colors.background.secondary,
  },
  radioOptionSelected: {
    backgroundColor: colors.primary.main,
    borderColor: colors.primary.main,
  },
  radioOptionText: {
    fontSize: 14,
    color: colors.text.secondary,
  },
  radioOptionTextSelected: {
    color: colors.text.inverse,
    fontWeight: '600',
  },
  workflowList: {
    marginTop: spacing.sm,
  },
  workflowStageCard: {
    marginBottom: spacing.sm,
    padding: spacing.md,
  },
  workflowStageName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  workflowStageDesc: {
    fontSize: 14,
    color: colors.text.secondary,
    marginBottom: spacing.xs,
  },
  workflowStageInfo: {
    fontSize: 12,
    color: colors.text.tertiary,
  },
  // Wizard styles
  modalHeaderCenter: {
    flex: 1,
    alignItems: 'center',
  },
  modalSubtitle: {
    fontSize: 12,
    color: colors.text.secondary,
    marginTop: 2,
  },
  progressContainer: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    backgroundColor: colors.background.secondary,
  },
  progressBar: {
    height: 4,
    backgroundColor: colors.border.light,
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: spacing.md,
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary.main,
    borderRadius: 2,
  },
  progressSteps: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  progressStep: {
    flex: 1,
    alignItems: 'center',
  },
  progressStepDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.border.medium,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  progressStepDotActive: {
    backgroundColor: colors.primary.main,
  },
  progressStepDotCompleted: {
    backgroundColor: colors.success?.main || '#10B981',
  },
  progressStepText: {
    fontSize: 10,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  progressStepTextActive: {
    color: colors.text.primary,
    fontWeight: '600',
  },
  wizardStep: {
    padding: spacing.md,
  },
  stepIconContainer: {
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text.primary,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  stepDescription: {
    fontSize: 14,
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  formHelperText: {
    fontSize: 12,
    color: colors.text.tertiary,
    marginTop: spacing.xs,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  gridOption: {
    flex: 1,
    minWidth: '30%',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 2,
    borderColor: colors.border.medium,
    backgroundColor: colors.background.secondary,
    gap: spacing.xs,
  },
  gridOptionSelected: {
    borderColor: colors.primary.main,
    backgroundColor: colors.primary.light + '20',
  },
  gridOptionText: {
    fontSize: 12,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  gridOptionTextSelected: {
    color: colors.primary.main,
    fontWeight: '600',
  },
  severityContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  severityOption: {
    flex: 1,
    minWidth: '45%',
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 2,
    borderColor: colors.border.medium,
    backgroundColor: colors.background.secondary,
    gap: spacing.sm,
  },
  severityOptionSelected: {
    backgroundColor: colors.background.secondary,
  },
  severityOptionText: {
    fontSize: 14,
    color: colors.text.secondary,
  },
  emptyWorkflowCard: {
    alignItems: 'center',
    padding: spacing.xxxl,
    marginVertical: spacing.lg,
  },
  emptyWorkflowTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text.primary,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  emptyWorkflowText: {
    fontSize: 14,
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  workflowStageHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  workflowStageNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary.main,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  workflowStageNumberText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  workflowStageContent: {
    flex: 1,
  },
  workflowStageMeta: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.xs,
  },
  workflowStageMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  removeStageButton: {
    padding: spacing.xs,
    marginLeft: spacing.sm,
  },
  rateCard: {
    marginBottom: spacing.md,
  },
  rateHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  wizardActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.md,
    paddingBottom: spacing.xl,
  },
  // Photo upload styles
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
  summaryCard: {
    marginTop: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  summaryLabel: {
    fontSize: 14,
    color: colors.text.secondary,
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary.main,
  },
});