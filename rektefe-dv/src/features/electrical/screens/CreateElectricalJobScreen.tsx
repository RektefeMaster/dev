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
  Switch,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { apiService } from '@/shared/services/api';
import {
  translateElectricalSystemType,
  translateElectricalProblemType,
  translateElectricalUrgencyLevel,
  getElectricalSystemIcon,
} from '@/shared/utils/electricalHelpers';

const { width } = Dimensions.get('window');

interface Vehicle {
  _id: string;
  brand: string;
  modelName?: string;
  model?: string;
  plateNumber: string;
  year?: number;
  fuelType?: string;
  transmission?: string;
}

interface Mechanic {
  _id: string;
  name: string;
  surname: string;
}

const SYSTEM_TYPES = [
  { id: 'klima', label: 'Klima', icon: 'snowflake' },
  { id: 'far', label: 'Far/Lamba', icon: 'bulb' },
  { id: 'alternator', label: 'Alternatör', icon: 'cog' },
  { id: 'batarya', label: 'Batarya/Aku', icon: 'battery-full' },
  { id: 'elektrik-araci', label: 'Elektrikli Aygıtlar', icon: 'flash' },
  { id: 'sinyal', label: 'Sinyal/Göstergeler', icon: 'speedometer' },
  { id: 'diger', label: 'Diğer', icon: 'settings' },
];

const PROBLEM_TYPES = [
  { id: 'calismiyor', label: 'Çalışmıyor' },
  { id: 'arizali-bos', label: 'Arızalı/Boş' },
  { id: 'ariza-gostergesi', label: 'Arıza Göstergesi' },
  { id: 'ses-yapiyor', label: 'Ses Yapıyor' },
  { id: 'isinma-sorunu', label: 'Isınma Sorunu' },
  { id: 'kisa-devre', label: 'Kısa Devre' },
  { id: 'tetik-atmiyor', label: 'Tetik Atmıyor' },
  { id: 'diger', label: 'Diğer' },
];

const URGENCY_LEVELS = [
  { id: 'normal', label: 'Normal', color: '#10B981', icon: 'checkmark-circle' },
  { id: 'acil', label: 'Acil', color: '#EF4444', icon: 'alert-circle' },
];

const REPAIR_TIME_HOURS = [1, 2, 3, 4, 5, 6, 8, 12, 24];

export default function CreateElectricalJobScreen() {
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
  const [systemType, setSystemType] = useState<string>('klima');
  const [problemType, setProblemType] = useState<string>('calismiyor');
  const [urgencyLevel, setUrgencyLevel] = useState<string>('normal');
  const [isRecurring, setIsRecurring] = useState<boolean>(false);
  const [lastWorkingCondition, setLastWorkingCondition] = useState<string>('');
  const [description, setDescription] = useState('');
  const [estimatedRepairTime, setEstimatedRepairTime] = useState(2); // saat
  const [photos, setPhotos] = useState<string[]>([]);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    setLoading(true);
    try {
      const vehiclesRes = await apiService.getVehicles();
      const mechanicsRes = await apiService.getMechanics({ serviceCategories: ['elektrik-elektronik', 'electrical'] });

      if (vehiclesRes.success && vehiclesRes.data) {
        const vehiclesData = Array.isArray(vehiclesRes.data)
          ? vehiclesRes.data
          : (vehiclesRes.data as { vehicles?: Vehicle[] }).vehicles;
        if (Array.isArray(vehiclesData)) {
          setVehicles(vehiclesData);
        }
      }

      if (mechanicsRes.success && mechanicsRes.data) {
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
      // Bodywork media endpoint'ini kullan, electrical için de aynı endpoint olabilir
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

  const canProceedToNextStep = () => {
    switch (currentStep) {
      case 1:
        return selectedVehicle !== '' && vehicles.length > 0;
      case 2:
        if (!systemType) {
          Alert.alert('Eksik Bilgi', 'Lütfen elektrik sistemi tipini seçin');
          return false;
        }
        if (!problemType) {
          Alert.alert('Eksik Bilgi', 'Lütfen problem tipini seçin');
          return false;
        }
        if (!urgencyLevel) {
          Alert.alert('Eksik Bilgi', 'Lütfen aciliyet seviyesini seçin');
          return false;
        }
        if (isRecurring && !lastWorkingCondition.trim()) {
          Alert.alert('Eksik Bilgi', 'Tekrarlayan arıza için son çalışma durumunu belirtmelisiniz');
          return false;
        }
        return true;
      case 3:
        if (description.trim().length < 10) {
          Alert.alert('Eksik Bilgi', 'Arıza açıklaması en az 10 karakter olmalıdır');
          return false;
        }
        if (photos.length === 0) {
          Alert.alert('Eksik Bilgi', 'Lütfen en az bir fotoğraf ekleyin');
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
      if (canProceedToNextStep()) {
        setCurrentStep(currentStep + 1);
      }
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
    if (!selectedVehicle) {
      Alert.alert('Eksik Bilgi', 'Lütfen bir araç seçin');
      return;
    }
    if (vehicles.length === 0) {
      Alert.alert('Eksik Bilgi', 'Önce bir araç eklemeniz gerekiyor');
      return;
    }
    if (!canProceedToNextStep()) {
      return;
    }

    setSubmitting(true);
    try {
      const response = await apiService.createElectricalJob({
        vehicleId: selectedVehicle,
        mechanicId: selectedMechanic || undefined,
        electricalInfo: {
          description: description.trim(),
          photos,
          systemType: systemType as any,
          problemType: problemType as any,
          urgencyLevel: urgencyLevel as any,
          isRecurring,
          lastWorkingCondition: isRecurring ? lastWorkingCondition.trim() : undefined,
          estimatedRepairTime,
        },
      });

      if (response.success) {
        Alert.alert(
          'Başarılı',
          selectedMechanic 
            ? 'Elektrik işi başarıyla oluşturuldu. Usta size teklif hazırlayacak.'
            : 'Elektrik işi başarıyla oluşturuldu. Size uygun bir usta atandığında bilgilendirileceksiniz.',
          [
            {
              text: 'Tamam',
              onPress: () => navigation.goBack(),
            },
          ]
        );
      } else {
        const errorMessage = response.message || 'Elektrik işi oluşturulamadı';
        if (errorMessage.includes('araç') || errorMessage.includes('vehicle')) {
          Alert.alert('Hata', 'Araç bilgisi bulunamadı. Lütfen tekrar deneyin.');
        } else if (errorMessage.includes('fotoğraf') || errorMessage.includes('photo')) {
          Alert.alert('Hata', 'Fotoğraf yükleme hatası. Lütfen fotoğrafları tekrar yükleyin.');
        } else {
          Alert.alert('Hata', errorMessage);
        }
      }
    } catch (error: any) {
      console.error('Create electrical job error:', error);
      if (error.response?.status === 401) {
        Alert.alert('Oturum Hatası', 'Oturumunuz sona ermiş. Lütfen tekrar giriş yapın.');
      } else if (error.response?.status === 400) {
        Alert.alert('Geçersiz Veri', 'Girdiğiniz bilgilerde hata var. Lütfen kontrol edin.');
      } else if (error.message?.includes('network') || error.message?.includes('Network')) {
        Alert.alert('Bağlantı Hatası', 'İnternet bağlantınızı kontrol edin ve tekrar deneyin.');
      } else {
        Alert.alert('Hata', 'Elektrik işi oluşturulurken bir hata oluştu. Lütfen tekrar deneyin.');
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
              Elektrik işi oluşturabilmek için önce bir araç eklemeniz gerekiyor.
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
        <Text style={styles.stepDescription}>Elektrik arızası olan aracı seçin</Text>
        
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
      <Text style={styles.stepTitle}>Elektrik Arıza Bilgileri</Text>
      <Text style={styles.stepDescription}>Arıza detaylarını belirtin</Text>
      
      <View style={styles.section}>
        <View style={styles.sectionTitleRow}>
          <Text style={styles.sectionTitle}>Elektrik Sistemi Tipi</Text>
          <Text style={styles.requiredBadge}>* Zorunlu</Text>
        </View>
        <View style={styles.optionsGrid}>
          {SYSTEM_TYPES.map((type) => (
            <TouchableOpacity
              key={type.id}
              style={[
                styles.optionButton,
                systemType === type.id && styles.optionButtonSelected,
              ]}
              onPress={() => setSystemType(type.id)}
            >
              <Ionicons 
                name={type.icon as any} 
                size={18} 
                color={systemType === type.id ? '#FFFFFF' : theme.colors.primary.main} 
                style={{ marginRight: 6 }}
              />
              <Text style={[
                styles.optionButtonText,
                systemType === type.id && styles.optionButtonTextSelected,
              ]}>
                {type.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionTitleRow}>
          <Text style={styles.sectionTitle}>Problem Tipi</Text>
          <Text style={styles.requiredBadge}>* Zorunlu</Text>
        </View>
        <View style={styles.optionsGrid}>
          {PROBLEM_TYPES.map((type) => (
            <TouchableOpacity
              key={type.id}
              style={[
                styles.optionButton,
                problemType === type.id && styles.optionButtonSelected,
              ]}
              onPress={() => setProblemType(type.id)}
            >
              <Text style={[
                styles.optionButtonText,
                problemType === type.id && styles.optionButtonTextSelected,
              ]}>
                {type.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionTitleRow}>
          <Text style={styles.sectionTitle}>Aciliyet Seviyesi</Text>
          <Text style={styles.requiredBadge}>* Zorunlu</Text>
        </View>
        <View style={styles.urgencyContainer}>
          {URGENCY_LEVELS.map((level) => (
            <TouchableOpacity
              key={level.id}
              style={[
                styles.urgencyButton,
                urgencyLevel === level.id && { borderColor: level.color, borderWidth: 2 },
                urgencyLevel === level.id && { backgroundColor: level.color + '20' },
              ]}
              onPress={() => setUrgencyLevel(level.id)}
            >
              <Ionicons 
                name={level.icon as any} 
                size={20} 
                color={urgencyLevel === level.id ? level.color : theme.colors.text.secondary} 
              />
              <Text style={[
                styles.urgencyButtonText,
                urgencyLevel === level.id && { color: level.color, fontWeight: '600' },
              ]}>
                {level.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.switchContainer}>
          <View style={styles.switchLabelContainer}>
            <Ionicons name="repeat" size={20} color={theme.colors.text.primary} />
            <Text style={styles.switchLabel}>Tekrarlayan Arıza</Text>
          </View>
          <Switch
            value={isRecurring}
            onValueChange={setIsRecurring}
            trackColor={{ false: theme.colors.border.medium, true: theme.colors.primary.main + '80' }}
            thumbColor={isRecurring ? theme.colors.primary.main : theme.colors.background.tertiary}
          />
        </View>
        {isRecurring && (
          <View style={styles.lastWorkingContainer}>
            <Text style={styles.sectionTitle}>Son Çalışma Durumu</Text>
            <Text style={styles.sectionHint}>
              Bu arızanın son çalıştığı durumu açıklayın
            </Text>
            <TextInput
              style={styles.textArea}
              placeholder="Örn: Dün akşam çalışıyordu, bugün sabah çalışmıyor..."
              value={lastWorkingCondition}
              onChangeText={setLastWorkingCondition}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
              maxLength={300}
            />
          </View>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Tahmini Onarım Süresi (Saat)</Text>
        <View style={styles.timeSelector}>
          {REPAIR_TIME_HOURS.map((hours) => (
            <TouchableOpacity
              key={hours}
              style={[
                styles.timeButton,
                estimatedRepairTime === hours && styles.timeButtonSelected,
              ]}
              onPress={() => setEstimatedRepairTime(hours)}
            >
              <Text style={[
                styles.timeButtonText,
                estimatedRepairTime === hours && styles.timeButtonTextSelected,
              ]}>
                {hours} Saat
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </View>
  );

  const renderStep3 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Arıza Açıklaması ve Fotoğraflar</Text>
      <Text style={styles.stepDescription}>Arızayı detaylı açıklayın ve fotoğraf ekleyin</Text>
      
      <View style={styles.section}>
        <View style={styles.sectionTitleRow}>
          <Text style={styles.sectionTitle}>Arıza Açıklaması</Text>
          <Text style={styles.requiredBadge}>* Zorunlu</Text>
        </View>
        <Text style={styles.sectionHint}>
          Arızanın nasıl oluştuğunu, ne zaman olduğunu ve detaylarını açıklayın
        </Text>
        <TextInput
          style={[
            styles.textArea,
            description.length > 0 && description.length < 10 && styles.textAreaError
          ]}
          placeholder="Örn: Araç çalışırken klima aniden durdu. Hava üflemiyor, kontrol lambası yanıyor..."
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
          Arızanın görüldüğü fotoğrafları ekleyin. Net ve farklı açılardan çekilmiş fotoğraflar daha iyi olur.
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
    </View>
  );

  const renderStep4 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Usta Seçimi (Opsiyonel)</Text>
      <Text style={styles.stepDescription}>Elektrik ustası seçebilir veya sonra seçebilirsiniz</Text>
      
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
              <Text style={styles.mechanicSubtext}>Elektrik Ustası</Text>
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
    const steps = ['Araç', 'Arıza', 'Detay', 'Usta'];
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
          <Text style={styles.headerTitle}>Yeni Elektrik İşi</Text>
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
              (!canProceedToNextStep() || submitting) && styles.buttonDisabled,
            ]}
            onPress={handleNext}
            disabled={!canProceedToNextStep() || submitting}
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
    flexDirection: 'row',
    alignItems: 'center',
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
  urgencyContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  urgencyButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border.medium,
    backgroundColor: colors.background.secondary,
    gap: 8,
  },
  urgencyButtonText: {
    fontSize: 14,
    color: colors.text.primary,
    fontWeight: '500',
  },
  switchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: colors.background.secondary,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border.medium,
    marginBottom: 12,
  },
  switchLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  switchLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.text.primary,
  },
  lastWorkingContainer: {
    marginTop: 12,
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

