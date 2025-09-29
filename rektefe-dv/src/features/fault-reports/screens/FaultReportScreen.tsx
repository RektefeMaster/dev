import React from 'react';
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/context/ThemeContext';
import { useFaultReport } from '../hooks/useFaultReport';
import { 
  VehicleSelector, 
  ServiceCategorySelector, 
  FaultDescriptionInput, 
  MediaPicker, 
  PrioritySelector, 
  // LocationDisplay, // Kaldırıldı
  ProgressIndicator 
} from '../components';

const FaultReportScreen = () => {
  const navigation = useNavigation();
  const { theme } = useTheme();
  
  const {
    // Form state
    step,
    selectedVehicle,
    selectedServiceCategory,
    faultDescription,
    photos,
    videos,
    priority,
    
    // Data state
    vehicles,
    serviceCategories,
    priorityLevels,
    loading,
    submitting,
    
    // Location state kaldırıldı - artık konum bilgisi kullanılmıyor
    // location,
    // locationLoading,
    // locationAddress,
    
    // Actions
    setSelectedVehicle,
    setSelectedServiceCategory,
    setFaultDescription,
    setPriority,
    addPhoto,
    removePhoto,
    addVideo,
    removeVideo,
    nextStep,
    previousStep,
    submitReport,
    resetForm,
    // loadUserLocation, // Kaldırıldı
  } = useFaultReport();

  const renderStepContent = () => {
    switch (step) {
      case 1:
        return (
          <VehicleSelector
            vehicles={vehicles}
            selectedVehicle={selectedVehicle}
            onSelectVehicle={setSelectedVehicle}
            loading={loading}
          />
        );
      
      case 2:
        return (
          <ServiceCategorySelector
            serviceCategories={serviceCategories}
            selectedCategory={selectedServiceCategory}
            onSelectCategory={setSelectedServiceCategory}
            loading={loading}
          />
        );
      
      case 3:
        return (
          <FaultDescriptionInput
            description={faultDescription}
            onDescriptionChange={setFaultDescription}
          />
        );
      
      case 4:
        return (
          <MediaPicker
            photos={photos}
            videos={videos}
            onAddPhoto={addPhoto}
            onRemovePhoto={removePhoto}
            onAddVideo={addVideo}
            onRemoveVideo={removeVideo}
          />
        );
      
      case 5:
        return (
          <View style={styles.finalStepContainer}>
            <PrioritySelector
              priorityLevels={priorityLevels}
              selectedPriority={priority}
              onSelectPriority={(priorityId: string) => setPriority(priorityId as any)}
            />
            {/* LocationDisplay kaldırıldı - artık konum bilgisi gönderilmiyor */}
          </View>
        );
      
      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background.primary }]}>
      <KeyboardAvoidingView 
        style={styles.keyboardAvoid}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Progress Indicator */}
        <ProgressIndicator currentStep={step} totalSteps={5} />

        {/* Step Content */}
        <ScrollView 
          style={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {renderStepContent()}
        </ScrollView>

        {/* Navigation Buttons */}
        <View style={[styles.navigationContainer, { backgroundColor: theme.colors.background.primary }]}>
          <TouchableOpacity
            style={[styles.backButton, { borderColor: theme.colors.border.primary }]}
            onPress={previousStep}
          >
            <Ionicons name="arrow-back" size={20} color={theme.colors.text.primary} />
            <Text style={[styles.backButtonText, { color: theme.colors.text.primary }]}>
              Geri
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[
              styles.nextButton, 
              { backgroundColor: theme.colors.primary.main },
              submitting && styles.nextButtonDisabled
            ]}
            onPress={nextStep}
            disabled={submitting}
          >
            {submitting ? (
              <Text style={styles.nextButtonText}>Gönderiliyor...</Text>
            ) : step === 5 ? (
              <Text style={styles.nextButtonText}>Arıza Bildirimi Gönder</Text>
            ) : (
              <>
                <Text style={styles.nextButtonText}>İleri</Text>
                <Ionicons name="arrow-forward" size={20} color="#fff" />
              </>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardAvoid: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  finalStepContainer: {
    flex: 1,
  },
  navigationContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    gap: 12,
  },
  backButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 8,
    borderWidth: 1,
    gap: 8,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  nextButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 8,
    gap: 8,
  },
  nextButtonDisabled: {
    opacity: 0.6,
  },
  nextButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default FaultReportScreen;
