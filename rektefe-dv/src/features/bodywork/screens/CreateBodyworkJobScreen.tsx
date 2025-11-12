import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  SafeAreaView,
  ActivityIndicator,
  Image,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { apiService } from '@/shared/services/api';

const { width } = Dimensions.get('window');

interface Vehicle {
  _id: string;
  brand: string;
  modelName: string;
  plateNumber: string;
}

interface Mechanic {
  _id: string;
  name: string;
  surname: string;
}

const DAMAGE_TYPES = [
  { id: 'collision', label: 'Çarpışma' },
  { id: 'scratch', label: 'Çizik' },
  { id: 'dent', label: 'Göçük' },
  { id: 'rust', label: 'Pas' },
  { id: 'paint_damage', label: 'Boya Hasarı' },
  { id: 'other', label: 'Diğer' },
];

const SEVERITY_LEVELS = [
  { id: 'minor', label: 'Hafif', color: '#4CAF50' },
  { id: 'moderate', label: 'Orta', color: '#FF9800' },
  { id: 'major', label: 'Ağır', color: '#F44336' },
  { id: 'severe', label: 'Ciddi', color: '#9C27B0' },
];

const AFFECTED_AREAS = [
  { id: 'front_bumper', label: 'Ön Tampon' },
  { id: 'rear_bumper', label: 'Arka Tampon' },
  { id: 'left_door', label: 'Sol Kapı' },
  { id: 'right_door', label: 'Sağ Kapı' },
  { id: 'front_left_fender', label: 'Ön Sol Çamurluk' },
  { id: 'front_right_fender', label: 'Ön Sağ Çamurluk' },
  { id: 'rear_left_fender', label: 'Arka Sol Çamurluk' },
  { id: 'rear_right_fender', label: 'Arka Sağ Çamurluk' },
  { id: 'hood', label: 'Kaput' },
  { id: 'trunk', label: 'Bagaj Kapağı' },
  { id: 'roof', label: 'Tavan' },
  { id: 'left_mirror', label: 'Sol Ayna' },
  { id: 'right_mirror', label: 'Sağ Ayna' },
];

export default function CreateBodyworkJobScreen() {
  const navigation = useNavigation();
  const { theme } = useTheme();
  const { userId } = useAuth();
  const styles = createStyles(theme.colors);

  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  
  // Form data
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [mechanics, setMechanics] = useState<Mechanic[]>([]);
  const [selectedVehicle, setSelectedVehicle] = useState<string>('');
  const [selectedMechanic, setSelectedMechanic] = useState<string>('');
  const [damageType, setDamageType] = useState<string>('collision');
  const [severity, setSeverity] = useState<string>('minor');
  const [affectedAreas, setAffectedAreas] = useState<string[]>([]);
  const [description, setDescription] = useState('');
  const [estimatedRepairTime, setEstimatedRepairTime] = useState(7); // gün
  const [photos, setPhotos] = useState<string[]>([]);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    setLoading(true);
    try {
      const vehiclesRes = await apiService.getVehicles();
      const mechanicsRes = await apiService.getMechanics({ serviceCategories: ['bodywork'] });

      if (vehiclesRes.success && vehiclesRes.data) {
        setVehicles(vehiclesRes.data);
      }

      if (mechanicsRes.success && mechanicsRes.data) {
        // getMechanics response format: { mechanics: [...] } veya direkt array
        const mechanicsList = Array.isArray(mechanicsRes.data) 
          ? mechanicsRes.data 
          : (mechanicsRes.data.mechanics || []);
        setMechanics(mechanicsList);
      }
    } catch (error) {
      console.error('Initial data load error:', error);
      Alert.alert('Hata', 'Veriler yüklenirken bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const requestPermissions = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('İzin Gerekli', 'Fotoğraf eklemek için galeri erişim izni gereklidir.');
      return false;
    }
    return true;
  };

  const pickImage = async () => {
    if (photos.length >= 10) {
      Alert.alert('Uyarı', 'En fazla 10 fotoğraf ekleyebilirsiniz.');
      return;
    }

    const hasPermission = await requestPermissions();
    if (!hasPermission) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      await uploadPhoto(result.assets[0].uri);
    }
  };

  const takePhoto = async () => {
    if (photos.length >= 10) {
      Alert.alert('Uyarı', 'En fazla 10 fotoğraf ekleyebilirsiniz.');
      return;
    }

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
      await uploadPhoto(result.assets[0].uri);
    }
  };

  const uploadPhoto = async (uri: string) => {
    try {
      setUploadingPhotos(true);
      const response = await apiService.uploadBodyworkMedia(uri, 'image');
      
      if (response.success && response.data?.url) {
        setPhotos([...photos, response.data.url]);
      } else {
        Alert.alert('Hata', 'Fotoğraf yüklenemedi');
      }
    } catch (error) {
      console.error('Upload photo error:', error);
      Alert.alert('Hata', 'Fotoğraf yüklenirken bir hata oluştu');
    } finally {
      setUploadingPhotos(false);
    }
  };

  const removePhoto = (index: number) => {
    setPhotos(photos.filter((_, i) => i !== index));
  };

  const toggleAffectedArea = (areaId: string) => {
    if (affectedAreas.includes(areaId)) {
      setAffectedAreas(affectedAreas.filter(id => id !== areaId));
    } else {
      setAffectedAreas([...affectedAreas, areaId]);
    }
  };

  const canProceedToNextStep = (shouldAlert = false) => {
    switch (currentStep) {
      case 1:
        return selectedVehicle !== '' && vehicles.length > 0;
      case 2:
        if (!damageType) {
          if (shouldAlert) {
            Alert.alert('Eksik Bilgi', 'Lütfen hasar türünü seçin');
          }
          return false;
        }
        if (!severity) {
          if (shouldAlert) {
            Alert.alert('Eksik Bilgi', 'Lütfen hasar şiddetini seçin');
          }
          return false;
        }
        if (affectedAreas.length === 0) {
          if (shouldAlert) {
            Alert.alert('Eksik Bilgi', 'Lütfen en az bir etkilenen alan seçin');
          }
          return false;
        }
        return true;
      case 3:
        if (description.trim().length < 10) {
          if (shouldAlert) {
            Alert.alert('Eksik Bilgi', 'Hasar açıklaması en az 10 karakter olmalıdır');
          }
          return false;
        }
        if (photos.length === 0) {
          if (shouldAlert) {
            Alert.alert('Eksik Bilgi', 'Lütfen en az bir fotoğraf ekleyin');
          }
          return false;
        }
        return true;
      case 4:
        return true; // Usta seçimi opsiyonel
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (currentStep < 4) {
      if (canProceedToNextStep(true)) {
        setCurrentStep(currentStep + 1);
      }
      // canProceedToNextStep içinde zaten Alert gösteriliyor
    } else {
      handleSubmit();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async () => {
    // Validasyon kontrolleri
    if (!selectedVehicle) {
      Alert.alert('Eksik Bilgi', 'Lütfen bir araç seçin');
      return;
    }
    if (vehicles.length === 0) {
      Alert.alert('Eksik Bilgi', 'Önce bir araç eklemeniz gerekiyor');
      return;
    }
    if (!canProceedToNextStep(true)) {
      return; // canProceedToNextStep zaten Alert gösteriyor
    }

    setSubmitting(true);
    try {
      const response = await apiService.createBodyworkJob({
        vehicleId: selectedVehicle,
        mechanicId: selectedMechanic || undefined,
        damageInfo: {
          description: description.trim(),
          photos,
          damageType: damageType as any,
          severity: severity as any,
          affectedAreas,
          estimatedRepairTime,
        },
      });

      if (response.success) {
        Alert.alert(
          'Başarılı',
          selectedMechanic 
            ? 'Kaporta işi başarıyla oluşturuldu. Usta size teklif hazırlayacak.'
            : 'Kaporta işi başarıyla oluşturuldu. Size uygun bir usta atandığında bilgilendirileceksiniz.',
          [
            {
              text: 'Tamam',
              onPress: () => navigation.goBack(),
            },
          ]
        );
      } else {
        const errorMessage = response.message || 'Kaporta işi oluşturulamadı';
        if (errorMessage.includes('araç') || errorMessage.includes('vehicle')) {
          Alert.alert('Hata', 'Araç bilgisi bulunamadı. Lütfen tekrar deneyin.');
        } else if (errorMessage.includes('fotoğraf') || errorMessage.includes('photo')) {
          Alert.alert('Hata', 'Fotoğraf yükleme hatası. Lütfen fotoğrafları tekrar yükleyin.');
        } else {
          Alert.alert('Hata', errorMessage);
        }
      }
    } catch (error: any) {
      console.error('Create bodywork job error:', error);
      if (error.response?.status === 401) {
        Alert.alert('Oturum Hatası', 'Oturumunuz sona ermiş. Lütfen tekrar giriş yapın.');
      } else if (error.response?.status === 400) {
        Alert.alert('Geçersiz Veri', 'Girdiğiniz bilgilerde hata var. Lütfen kontrol edin.');
      } else if (error.message?.includes('network') || error.message?.includes('Network')) {
        Alert.alert('Bağlantı Hatası', 'İnternet bağlantınızı kontrol edin ve tekrar deneyin.');
      } else {
        Alert.alert('Hata', 'Kaporta işi oluşturulurken bir hata oluştu. Lütfen tekrar deneyin.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const renderStep1 = () => {
    if (vehicles.length === 0) {
      return (
        <View style={styles.stepContainer}>
          <View style={styles.emptyStateContainer}>
            <Ionicons name="car-outline" size={64} color={theme.colors.text.secondary} />
            <Text style={styles.emptyStateTitle}>Kayıtlı Araç Bulunamadı</Text>
            <Text style={styles.emptyStateDescription}>
              Kaporta işi oluşturabilmek için önce bir araç eklemeniz gerekiyor.
            </Text>
            <TouchableOpacity
              style={[styles.addVehicleButton, { backgroundColor: theme.colors.primary.main }]}
              onPress={() => navigation.navigate('Garage' as never)}
            >
              <Ionicons name="add" size={20} color="#FFFFFF" />
              <Text style={styles.addVehicleButtonText}>Araç Ekle</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    return (
      <View style={styles.stepContainer}>
        <Text style={styles.stepTitle}>Araç Seçimi</Text>
        <Text style={styles.stepDescription}>Hasar gören aracı seçin</Text>
        
        <ScrollView style={styles.vehiclesList}>
          {vehicles.map((vehicle) => (
            <TouchableOpacity
              key={vehicle._id}
              style={[
                styles.vehicleCard,
                selectedVehicle === vehicle._id && styles.vehicleCardSelected,
              ]}
              onPress={() => setSelectedVehicle(vehicle._id)}
            >
              <Ionicons
                name="car"
                size={24}
                color={selectedVehicle === vehicle._id ? theme.colors.primary.main : theme.colors.text.secondary}
              />
              <View style={styles.vehicleInfo}>
                <Text style={[
                  styles.vehicleName,
                  selectedVehicle === vehicle._id && styles.vehicleNameSelected,
                ]}>
                  {vehicle.brand} {vehicle.modelName}
                </Text>
                <Text style={styles.vehiclePlate}>{vehicle.plateNumber}</Text>
                {vehicle.year && (
                  <Text style={styles.vehicleYear}>{vehicle.year} Model</Text>
                )}
              </View>
              {selectedVehicle === vehicle._id && (
                <Ionicons name="checkmark-circle" size={24} color={theme.colors.primary.main} />
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    );
  };

  const renderStep2 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Hasar Bilgileri</Text>
      <Text style={styles.stepDescription}>Hasar türü ve şiddetini belirtin</Text>
      
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Hasar Türü</Text>
        <View style={styles.optionsGrid}>
          {DAMAGE_TYPES.map((type) => (
            <TouchableOpacity
              key={type.id}
              style={[
                styles.optionButton,
                damageType === type.id && styles.optionButtonSelected,
              ]}
              onPress={() => setDamageType(type.id)}
            >
              <Text style={[
                styles.optionButtonText,
                damageType === type.id && styles.optionButtonTextSelected,
              ]}>
                {type.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Hasar Şiddeti</Text>
        <View style={styles.optionsGrid}>
          {SEVERITY_LEVELS.map((level) => (
            <TouchableOpacity
              key={level.id}
              style={[
                styles.optionButton,
                severity === level.id && styles.optionButtonSelected,
                severity === level.id && { borderColor: level.color, borderWidth: 2 },
              ]}
              onPress={() => setSeverity(level.id)}
            >
              <View style={[styles.severityIndicator, { backgroundColor: level.color }]} />
              <Text style={[
                styles.optionButtonText,
                severity === level.id && styles.optionButtonTextSelected,
              ]}>
                {level.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionTitleRow}>
          <Text style={styles.sectionTitle}>Etkilenen Alanlar</Text>
          <Text style={styles.requiredBadge}>* Zorunlu</Text>
        </View>
        <Text style={styles.sectionHint}>
          Hasar gören alanları seçin (birden fazla seçilebilir)
        </Text>
        <View style={styles.affectedAreasGrid}>
          {AFFECTED_AREAS.map((area) => (
            <TouchableOpacity
              key={area.id}
              style={[
                styles.areaChip,
                affectedAreas.includes(area.id) && styles.areaChipSelected,
              ]}
              onPress={() => toggleAffectedArea(area.id)}
            >
              <Text style={[
                styles.areaChipText,
                affectedAreas.includes(area.id) && styles.areaChipTextSelected,
              ]}>
                {area.label}
              </Text>
              {affectedAreas.includes(area.id) && (
                <Ionicons name="checkmark" size={14} color="#FFFFFF" style={{ marginLeft: 4 }} />
              )}
            </TouchableOpacity>
          ))}
        </View>
        {affectedAreas.length === 0 && (
          <Text style={styles.warningText}>En az bir alan seçmelisiniz</Text>
        )}
      </View>
    </View>
  );

  const renderStep3 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Hasar Açıklaması ve Fotoğraflar</Text>
      <Text style={styles.stepDescription}>Hasarı detaylı açıklayın ve fotoğraf ekleyin</Text>
      
      <View style={styles.section}>
        <View style={styles.sectionTitleRow}>
          <Text style={styles.sectionTitle}>Hasar Açıklaması</Text>
          <Text style={styles.requiredBadge}>* Zorunlu</Text>
        </View>
        <Text style={styles.sectionHint}>
          Hasarın nasıl oluştuğunu, ne zaman olduğunu ve detaylarını açıklayın
        </Text>
        <TextInput
          style={[
            styles.textArea,
            description.length > 0 && description.length < 10 && styles.textAreaError
          ]}
          placeholder="Örn: Park halindeyken arka tampona çarptılar. Orta şiddette çizikler ve göçük var. 2 gün önce oldu..."
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={5}
          textAlignVertical="top"
          maxLength={500}
        />
        <View style={styles.charCountRow}>
          <Text style={[
            styles.charCount,
            description.length < 10 && description.length > 0 && styles.charCountError
          ]}>
            {description.length < 10 ? `En az ${10 - description.length} karakter daha gerekli` : `${description.length}/500 karakter`}
          </Text>
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.photosHeader}>
          <View>
            <Text style={styles.sectionTitle}>Fotoğraflar</Text>
            <Text style={styles.requiredBadge}>* Zorunlu (En az 1)</Text>
          </View>
          <Text style={styles.photoCount}>{photos.length}/10</Text>
        </View>
        <Text style={styles.sectionHint}>
          Hasarın görüldüğü fotoğrafları ekleyin. Net ve farklı açılardan çekilmiş fotoğraflar daha iyi olur.
        </Text>
        
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photosContainer}>
          {photos.map((photo, index) => (
            <View key={index} style={styles.photoItem}>
              <Image source={{ uri: photo }} style={styles.photoThumbnail} />
              <TouchableOpacity
                style={styles.removePhotoButton}
                onPress={() => removePhoto(index)}
              >
                <Ionicons name="close-circle" size={24} color="#FF0000" />
              </TouchableOpacity>
            </View>
          ))}
          
          {photos.length < 10 && (
            <TouchableOpacity 
              style={styles.addPhotoButton} 
              onPress={showPhotoOptions}
              disabled={uploadingPhotos}
            >
              {uploadingPhotos ? (
                <ActivityIndicator size="small" color={theme.colors.primary.main} />
              ) : (
                <>
                  <Ionicons name="add" size={32} color={theme.colors.text.secondary} />
                  <Text style={styles.addPhotoText}>Fotoğraf Ekle</Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </ScrollView>

        {uploadingPhotos && (
          <View style={styles.uploadingContainer}>
            <ActivityIndicator size="small" color={theme.colors.primary.main} />
            <Text style={styles.uploadingText}>Fotoğraf yükleniyor, lütfen bekleyin...</Text>
          </View>
        )}
        {photos.length === 0 && (
          <Text style={styles.warningText}>En az bir fotoğraf eklemelisiniz</Text>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Tahmini Onarım Süresi (Gün)</Text>
        <View style={styles.timeSelector}>
          {[3, 5, 7, 10, 14, 21, 30].map((days) => (
            <TouchableOpacity
              key={days}
              style={[
                styles.timeButton,
                estimatedRepairTime === days && styles.timeButtonSelected,
              ]}
              onPress={() => setEstimatedRepairTime(days)}
            >
              <Text style={[
                styles.timeButtonText,
                estimatedRepairTime === days && styles.timeButtonTextSelected,
              ]}>
                {days} Gün
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </View>
  );

  const renderStep4 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Usta Seçimi (Opsiyonel)</Text>
      <Text style={styles.stepDescription}>Kaporta ustası seçebilir veya sonra seçebilirsiniz</Text>
      
      <ScrollView style={styles.mechanicsList}>
        <TouchableOpacity
          style={[
            styles.mechanicCard,
            selectedMechanic === '' && styles.mechanicCardSelected,
          ]}
          onPress={() => setSelectedMechanic('')}
        >
          <Ionicons name="close-circle" size={24} color={theme.colors.text.secondary} />
          <View style={styles.mechanicInfo}>
            <Text style={styles.mechanicName}>Usta Seçmeyi Sonraya Bırak</Text>
            <Text style={styles.mechanicSubtext}>Usta daha sonra seçilebilir</Text>
          </View>
          {selectedMechanic === '' && (
            <Ionicons name="checkmark-circle" size={24} color={theme.colors.primary.main} />
          )}
        </TouchableOpacity>

        {mechanics.map((mechanic) => (
          <TouchableOpacity
            key={mechanic._id}
            style={[
              styles.mechanicCard,
              selectedMechanic === mechanic._id && styles.mechanicCardSelected,
            ]}
            onPress={() => setSelectedMechanic(mechanic._id)}
          >
            <Ionicons
              name="person-circle"
              size={24}
              color={selectedMechanic === mechanic._id ? theme.colors.primary.main : theme.colors.text.secondary}
            />
            <View style={styles.mechanicInfo}>
              <Text style={[
                styles.mechanicName,
                selectedMechanic === mechanic._id && styles.mechanicNameSelected,
              ]}>
                {mechanic.name} {mechanic.surname}
              </Text>
              <Text style={styles.mechanicSubtext}>Kaporta Ustası</Text>
            </View>
            {selectedMechanic === mechanic._id && (
              <Ionicons name="checkmark-circle" size={24} color={theme.colors.primary.main} />
            )}
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  const showPhotoOptions = () => {
    Alert.alert(
      'Fotoğraf Ekle',
      'Fotoğrafı nereden eklemek istiyorsunuz?',
      [
        { text: 'İptal', style: 'cancel' },
        { text: 'Galeri', onPress: pickImage },
        { text: 'Kamera', onPress: takePhoto },
      ]
    );
  };

  const renderProgress = () => {
    const steps = ['Araç', 'Hasar', 'Detay', 'Usta'];
    return (
      <View style={styles.progressContainer}>
        {steps.map((step, index) => (
          <React.Fragment key={index}>
            <View style={styles.progressItem}>
              <View style={[
                styles.progressCircle,
                index + 1 <= currentStep && styles.progressCircleActive,
              ]}>
                {index + 1 < currentStep ? (
                  <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                ) : (
                  <Text style={[
                    styles.progressNumber,
                    index + 1 <= currentStep && styles.progressNumberActive,
                  ]}>
                    {index + 1}
                  </Text>
                )}
              </View>
              <Text style={[
                styles.progressLabel,
                index + 1 <= currentStep && styles.progressLabelActive,
              ]}>
                {step}
              </Text>
            </View>
            {index < steps.length - 1 && (
              <View style={[
                styles.progressLine,
                index + 1 < currentStep && styles.progressLineActive,
              ]} />
            )}
          </React.Fragment>
        ))}
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary.main} />
          <Text style={styles.loadingText}>Yükleniyor...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color={theme.colors.text.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Yeni Kaporta İşi</Text>
          <View style={{ width: 24 }} />
        </View>

        {/* Progress */}
        {renderProgress()}

        {/* Content */}
        <ScrollView
          style={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {currentStep === 1 && renderStep1()}
          {currentStep === 2 && renderStep2()}
          {currentStep === 3 && renderStep3()}
          {currentStep === 4 && renderStep4()}
        </ScrollView>

        {/* Navigation Buttons */}
        <View style={styles.navigationContainer}>
          <TouchableOpacity
            style={[styles.navButton, styles.backButton]}
            onPress={handlePrevious}
            disabled={currentStep === 1}
          >
            <Ionicons name="arrow-back" size={20} color={theme.colors.text.primary} />
            <Text style={styles.backButtonText}>Geri</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.navButton,
              styles.nextButton,
              { backgroundColor: theme.colors.primary.main },
              (!canProceedToNextStep(false) || submitting) && styles.buttonDisabled,
            ]}
            onPress={handleNext}
            disabled={!canProceedToNextStep(false) || submitting}
          >
            {submitting ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Text style={styles.nextButtonText}>
                  {currentStep === 4 ? 'Oluştur' : 'İleri'}
                </Text>
                {currentStep < 4 && (
                  <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
                )}
              </>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  keyboardView: {
    flex: 1,
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
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 20,
    backgroundColor: colors.background.secondary,
  },
  progressItem: {
    alignItems: 'center',
  },
  progressCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.border.medium,
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressCircleActive: {
    backgroundColor: colors.primary.main,
  },
  progressNumber: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.secondary,
  },
  progressNumberActive: {
    color: '#FFFFFF',
  },
  progressLabel: {
    fontSize: 12,
    marginTop: 4,
    color: colors.text.secondary,
  },
  progressLabelActive: {
    color: colors.primary.main,
    fontWeight: '600',
  },
  progressLine: {
    flex: 1,
    height: 2,
    backgroundColor: colors.border.medium,
    marginHorizontal: 8,
    marginTop: -16,
  },
  progressLineActive: {
    backgroundColor: colors.primary.main,
  },
  content: {
    flex: 1,
  },
  stepContainer: {
    padding: 20,
  },
  stepTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: 8,
  },
  stepDescription: {
    fontSize: 14,
    color: colors.text.secondary,
    marginBottom: 24,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  requiredBadge: {
    fontSize: 12,
    color: '#F44336',
    fontWeight: '600',
  },
  sectionHint: {
    fontSize: 13,
    color: colors.text.secondary,
    marginBottom: 12,
    lineHeight: 18,
  },
  warningText: {
    fontSize: 12,
    color: '#FF9800',
    marginTop: 8,
    fontWeight: '500',
  },
  vehiclesList: {
    maxHeight: 400,
  },
  vehicleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: colors.background.secondary,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  vehicleCardSelected: {
    borderColor: colors.primary.main,
    backgroundColor: colors.primary.light + '20',
  },
  vehicleInfo: {
    flex: 1,
    marginLeft: 12,
  },
  vehicleName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 4,
  },
  vehicleNameSelected: {
    color: colors.primary.main,
  },
  vehiclePlate: {
    fontSize: 14,
    color: colors.text.secondary,
    marginBottom: 2,
  },
  vehicleYear: {
    fontSize: 12,
    color: colors.text.secondary,
  },
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  optionButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border.medium,
    backgroundColor: colors.background.secondary,
  },
  optionButtonSelected: {
    backgroundColor: colors.primary.main,
    borderColor: colors.primary.main,
  },
  optionButtonText: {
    fontSize: 14,
    color: colors.text.primary,
  },
  optionButtonTextSelected: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  severityIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  affectedAreasGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  areaChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: colors.background.secondary,
    borderWidth: 1,
    borderColor: colors.border.medium,
  },
  areaChipSelected: {
    backgroundColor: colors.primary.main,
    borderColor: colors.primary.main,
  },
  areaChipText: {
    fontSize: 13,
    color: colors.text.primary,
  },
  areaChipTextSelected: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  textArea: {
    minHeight: 120,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border.medium,
    backgroundColor: colors.background.secondary,
    fontSize: 14,
    color: colors.text.primary,
  },
  textAreaError: {
    borderColor: '#F44336',
    borderWidth: 2,
  },
  charCountRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 4,
  },
  charCount: {
    fontSize: 12,
    color: colors.text.secondary,
    textAlign: 'right',
  },
  charCountError: {
    color: '#F44336',
    fontWeight: '600',
  },
  photosHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  photoCount: {
    fontSize: 12,
    color: colors.text.secondary,
  },
  photosContainer: {
    marginBottom: 12,
  },
  photoItem: {
    marginRight: 12,
    position: 'relative',
  },
  photoThumbnail: {
    width: 100,
    height: 100,
    borderRadius: 8,
    backgroundColor: colors.background.secondary,
  },
  removePhotoButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
  },
  addPhotoButton: {
    width: 100,
    height: 100,
    borderRadius: 8,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: colors.border.medium,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background.secondary,
  },
  addPhotoText: {
    fontSize: 11,
    color: colors.text.secondary,
    marginTop: 4,
    textAlign: 'center',
  },
  uploadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  uploadingText: {
    fontSize: 12,
    color: colors.text.secondary,
    marginLeft: 8,
  },
  timeSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  timeButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border.medium,
    backgroundColor: colors.background.secondary,
  },
  timeButtonSelected: {
    backgroundColor: colors.primary.main,
    borderColor: colors.primary.main,
  },
  timeButtonText: {
    fontSize: 14,
    color: colors.text.primary,
  },
  timeButtonTextSelected: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  mechanicsList: {
    maxHeight: 400,
  },
  mechanicCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: colors.background.secondary,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  mechanicCardSelected: {
    borderColor: colors.primary.main,
    backgroundColor: colors.primary.light + '20',
  },
  mechanicInfo: {
    flex: 1,
    marginLeft: 12,
  },
  mechanicName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 4,
  },
  mechanicNameSelected: {
    color: colors.primary.main,
  },
  mechanicSubtext: {
    fontSize: 14,
    color: colors.text.secondary,
  },
  navigationContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border.light,
    backgroundColor: colors.background.primary,
    gap: 12,
  },
  navButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 8,
    gap: 8,
  },
  backButton: {
    borderWidth: 1,
    borderColor: colors.border.medium,
    backgroundColor: colors.background.secondary,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
  },
  nextButton: {
    backgroundColor: colors.primary.main,
  },
  nextButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  emptyStateContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text.primary,
    marginTop: 20,
    marginBottom: 12,
    textAlign: 'center',
  },
  emptyStateDescription: {
    fontSize: 14,
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 20,
  },
  addVehicleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 8,
    gap: 8,
  },
  addVehicleButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

