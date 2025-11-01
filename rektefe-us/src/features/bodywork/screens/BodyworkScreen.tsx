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
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/shared/context';
import { useAuth } from '@/shared/context';
import { Card, Button } from '@/shared/components';
import { spacing, borderRadius, shadows, dimensions } from '@/shared/theme';
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

  const handleUpdateWorkflowStage = async (jobId: string, stage: string, status: string) => {
    try {
      const response = await apiService.updateWorkflowStage(jobId, {
        stage,
        status: status as any,
        notes: ''
      });

      if (response.success) {
        Alert.alert('Başarılı', 'İş akışı aşaması güncellendi');
        await fetchBodyworkJobs();
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

  const renderTemplates = () => (
    <View style={styles.tabContent}>
      <Card style={styles.templateCard}>
        <Text style={styles.cardTitle}>Şablonlar</Text>
        <Text style={styles.cardDescription}>
          Sık kullanılan hasar türleri için şablonlar oluşturun ve hızlı teklif hazırlayın.
        </Text>
        <Button
          title="Yeni Şablon Oluştur"
          onPress={() => Alert.alert('Şablon', 'Şablon oluşturma özelliği yakında eklenecek')}
          style={styles.primaryButton}
        />
      </Card>
    </View>
  );

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
            <Text style={styles.formLabel}>Müşteri ID</Text>
            <TextInput
              style={styles.formInput}
              value={createJobForm.customerId}
              onChangeText={(text) => setCreateJobForm(prev => ({ ...prev, customerId: text }))}
              placeholder="Müşteri ID girin"
            />
          </View>
          
          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>Araç ID</Text>
            <TextInput
              style={styles.formInput}
              value={createJobForm.vehicleId}
              onChangeText={(text) => setCreateJobForm(prev => ({ ...prev, vehicleId: text }))}
              placeholder="Araç ID girin"
            />
          </View>
          
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
              
              {stage.photos.length > 0 && (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.stagePhotos}>
                  {stage.photos.map((photo, photoIndex) => (
                    <Image key={photoIndex} source={{ uri: photo }} style={styles.stagePhoto} />
                  ))}
                </ScrollView>
              )}
              
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
    fontSize: typography.sizes.md,
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
  stagePhotos: {
    marginBottom: spacing.sm,
  },
  stagePhoto: {
    width: 60,
    height: 60,
    borderRadius: borderRadius.sm,
    marginRight: spacing.sm,
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
});
