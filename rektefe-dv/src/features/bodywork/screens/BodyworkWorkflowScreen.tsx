import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  Image,
  Alert,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/context/ThemeContext';
import { apiService } from '@/shared/services/api';

interface WorkflowStage {
  stage: string;
  status: 'pending' | 'in_progress' | 'completed' | 'skipped';
  startDate?: string;
  endDate?: string;
  photos: string[];
  notes?: string;
}

interface BodyworkJob {
  _id: string;
  workflow: {
    currentStage: string;
    stages: WorkflowStage[];
    estimatedCompletionDate: string;
    actualCompletionDate?: string;
  };
  customerApprovals: Array<{
    stage: string;
    approved: boolean;
    approvedAt?: string;
    notes?: string;
  }>;
  status: string;
}

const STAGE_INFO: { [key: string]: { label: string; icon: string } } = {
  'quote_preparation': { label: 'Teklif Hazırlama', icon: 'document-text' },
  'disassembly': { label: 'Söküm', icon: 'hammer' },
  'repair': { label: 'Düzeltme', icon: 'construct' },
  'putty': { label: 'Macun', icon: 'brush' },
  'primer': { label: 'Astar', icon: 'layers' },
  'paint': { label: 'Boya', icon: 'color-palette' },
  'assembly': { label: 'Montaj', icon: 'build' },
  'quality_check': { label: 'Kalite Kontrol', icon: 'checkmark-circle' },
  'completed': { label: 'Tamamlandı', icon: 'checkmark-done-circle' },
};

export default function BodyworkWorkflowScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { theme } = useTheme();
  const styles = createStyles(theme.colors);

  const { jobId } = route.params as { jobId: string };

  const [loading, setLoading] = useState(true);
  const [job, setJob] = useState<BodyworkJob | null>(null);

  useEffect(() => {
    fetchJobDetail();
  }, [jobId]);

  const fetchJobDetail = async () => {
    try {
      setLoading(true);
      const response = await apiService.getBodyworkJobById(jobId);

      if (response.success && response.data) {
        setJob(response.data);
      } else {
        Alert.alert('Hata', 'İş akışı bilgisi yüklenemedi');
        navigation.goBack();
      }
    } catch (error) {
      console.error('Fetch workflow error:', error);
      Alert.alert('Hata', 'İş akışı bilgisi yüklenirken bir hata oluştu');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const getStageApproval = (stage: string) => {
    return job?.customerApprovals.find(approval => approval.stage === stage);
  };

  const needsApproval = (stage: WorkflowStage) => {
    // Bazı aşamalar müşteri onayı gerektirir (örnek: boya sonrası, montaj sonrası)
    return stage.status === 'completed' && 
           ['paint', 'assembly', 'quality_check'].includes(stage.stage) &&
           !getStageApproval(stage.stage)?.approved;
  };

  const handleApproveStage = async (stage: string) => {
    Alert.alert(
      'Aşamayı Onayla',
      'Bu aşamanın tamamlandığını onaylıyor musunuz?',
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Onayla',
          onPress: async () => {
            try {
              const response = await apiService.approveStage(jobId, stage, true);
              if (response.success) {
                Alert.alert('Başarılı', 'Aşama onaylandı');
                fetchJobDetail();
              } else {
                Alert.alert('Hata', response.message || 'Aşama onaylanamadı');
              }
            } catch (error) {
              Alert.alert('Hata', 'Aşama onaylanırken bir hata oluştu');
            }
          },
        },
      ]
    );
  };

  const getStageStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return 'checkmark-circle';
      case 'in_progress':
        return 'time';
      case 'skipped':
        return 'close-circle';
      default:
        return 'ellipse-outline';
    }
  };

  const getStageStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return '#4CAF50';
      case 'in_progress':
        return '#2196F3';
      case 'skipped':
        return '#FF9800';
      default:
        return '#9E9E9E';
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('tr-TR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading || !job) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary.main} />
          <Text style={styles.loadingText}>Yükleniyor...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const { workflow } = job;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>İş Akışı</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.contentContainer}
      >
        {/* Timeline Header */}
        <View style={styles.timelineHeader}>
          <View style={styles.progressInfo}>
            <Text style={styles.progressTitle}>İlerleme</Text>
            <Text style={styles.progressText}>
              {workflow.stages.filter(s => s.status === 'completed').length} / {workflow.stages.length} Aşama
            </Text>
          </View>
          <View style={styles.dateInfo}>
            <Text style={styles.dateLabel}>Tahmini Tamamlanma</Text>
            <Text style={styles.dateValue}>
              {new Date(workflow.estimatedCompletionDate).toLocaleDateString('tr-TR')}
            </Text>
          </View>
        </View>

        {/* Timeline */}
        <View style={styles.timeline}>
          {workflow.stages.map((stage, index) => {
            const stageInfo = STAGE_INFO[stage.stage] || { label: stage.stage, icon: 'ellipse' };
            const isLast = index === workflow.stages.length - 1;
            const approval = getStageApproval(stage.stage);
            const needsApprovalNow = needsApproval(stage);

            return (
              <View key={index} style={styles.timelineItem}>
                {/* Timeline Line */}
                {!isLast && (
                  <View
                    style={[
                      styles.timelineLine,
                      stage.status === 'completed' && styles.timelineLineCompleted,
                    ]}
                  />
                )}

                {/* Stage Icon */}
                <View
                  style={[
                    styles.stageIcon,
                    {
                      backgroundColor:
                        stage.status === 'completed'
                          ? '#4CAF50'
                          : stage.status === 'in_progress'
                          ? '#2196F3'
                          : '#E0E0E0',
                    },
                  ]}
                >
                  <Ionicons
                    name={stageInfo.icon as any}
                    size={24}
                    color={stage.status === 'pending' ? '#9E9E9E' : '#FFFFFF'}
                  />
                </View>

                {/* Stage Content */}
                <View style={styles.stageContent}>
                  <View style={styles.stageHeader}>
                    <View style={styles.stageInfo}>
                      <Text style={styles.stageName}>{stageInfo.label}</Text>
                      <View style={styles.stageStatusRow}>
                        <Ionicons
                          name={getStageStatusIcon(stage.status) as any}
                          size={16}
                          color={getStageStatusColor(stage.status)}
                        />
                        <Text style={[styles.stageStatus, { color: getStageStatusColor(stage.status) }]}>
                          {stage.status === 'completed'
                            ? 'Tamamlandı'
                            : stage.status === 'in_progress'
                            ? 'Devam Ediyor'
                            : stage.status === 'skipped'
                            ? 'Atlandı'
                            : 'Bekliyor'}
                        </Text>
                      </View>
                    </View>
                    {approval && approval.approved && (
                      <View style={styles.approvalBadge}>
                        <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
                        <Text style={styles.approvalText}>Onaylandı</Text>
                      </View>
                    )}
                  </View>

                  {/* Dates */}
                  <View style={styles.stageDates}>
                    {stage.startDate && (
                      <View style={styles.dateRow}>
                        <Ionicons name="play" size={14} color={theme.colors.text.secondary} />
                        <Text style={styles.dateText}>Başlangıç: {formatDate(stage.startDate)}</Text>
                      </View>
                    )}
                    {stage.endDate && (
                      <View style={styles.dateRow}>
                        <Ionicons name="stop" size={14} color={theme.colors.text.secondary} />
                        <Text style={styles.dateText}>Bitiş: {formatDate(stage.endDate)}</Text>
                      </View>
                    )}
                  </View>

                  {/* Photos */}
                  {stage.photos && stage.photos.length > 0 && (
                    <View style={styles.stagePhotos}>
                      <Text style={styles.photosTitle}>Aşama Fotoğrafları</Text>
                      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                        {stage.photos.map((photo, photoIndex) => (
                          <Image key={photoIndex} source={{ uri: photo }} style={styles.stagePhoto} />
                        ))}
                      </ScrollView>
                    </View>
                  )}

                  {/* Notes */}
                  {stage.notes && (
                    <View style={styles.stageNotes}>
                      <Text style={styles.notesTitle}>Notlar</Text>
                      <Text style={styles.notesText}>{stage.notes}</Text>
                    </View>
                  )}

                  {/* Approval Action */}
                  {needsApprovalNow && (
                    <TouchableOpacity
                      style={styles.approvalButton}
                      onPress={() => handleApproveStage(stage.stage)}
                    >
                      <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
                      <Text style={styles.approvalButtonText}>Aşamayı Onayla</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            );
          })}
        </View>

        {/* Completion Info */}
        {job.status === 'completed' && workflow.actualCompletionDate && (
          <View style={styles.completionCard}>
            <Ionicons name="checkmark-done-circle" size={48} color="#4CAF50" />
            <Text style={styles.completionTitle}>İş Tamamlandı</Text>
            <Text style={styles.completionDate}>
              {formatDate(workflow.actualCompletionDate)}
            </Text>
          </View>
        )}
      </ScrollView>
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
    marginTop: 16,
    fontSize: 16,
    color: colors.text.secondary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text.primary,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
  },
  timelineHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: colors.background.secondary,
    borderRadius: 12,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  progressInfo: {
    flex: 1,
  },
  progressTitle: {
    fontSize: 12,
    color: colors.text.secondary,
    marginBottom: 4,
  },
  progressText: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text.primary,
  },
  dateInfo: {
    flex: 1,
    alignItems: 'flex-end',
  },
  dateLabel: {
    fontSize: 12,
    color: colors.text.secondary,
    marginBottom: 4,
  },
  dateValue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary.main,
  },
  timeline: {
    position: 'relative',
  },
  timelineItem: {
    flexDirection: 'row',
    marginBottom: 32,
    position: 'relative',
  },
  timelineLine: {
    position: 'absolute',
    left: 24,
    top: 48,
    width: 2,
    height: '100%',
    backgroundColor: '#E0E0E0',
  },
  timelineLineCompleted: {
    backgroundColor: '#4CAF50',
  },
  stageIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    borderWidth: 3,
    borderColor: colors.background.primary,
  },
  stageContent: {
    flex: 1,
    backgroundColor: colors.background.secondary,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  stageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  stageInfo: {
    flex: 1,
  },
  stageName: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: 8,
  },
  stageStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  stageStatus: {
    fontSize: 14,
    fontWeight: '600',
  },
  approvalBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#E8F5E9',
    borderRadius: 12,
  },
  approvalText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2E7D32',
  },
  stageDates: {
    marginBottom: 12,
    gap: 4,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dateText: {
    fontSize: 12,
    color: colors.text.secondary,
  },
  stagePhotos: {
    marginBottom: 12,
  },
  photosTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 8,
  },
  stagePhoto: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginRight: 8,
    backgroundColor: colors.background.primary,
  },
  stageNotes: {
    marginBottom: 12,
    padding: 12,
    backgroundColor: colors.background.primary,
    borderRadius: 8,
  },
  notesTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text.secondary,
    marginBottom: 4,
  },
  notesText: {
    fontSize: 14,
    color: colors.text.primary,
    lineHeight: 20,
  },
  approvalButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4CAF50',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
    marginTop: 8,
  },
  approvalButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  completionCard: {
    alignItems: 'center',
    padding: 32,
    backgroundColor: '#E8F5E9',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#4CAF50',
    marginTop: 24,
  },
  completionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#2E7D32',
    marginTop: 16,
    marginBottom: 8,
  },
  completionDate: {
    fontSize: 14,
    color: '#4CAF50',
  },
});

