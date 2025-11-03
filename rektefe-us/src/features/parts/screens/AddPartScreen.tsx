import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  TextInput,
  ActivityIndicator,
  Switch,
  Image,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '@/shared/context';
import { Card, Button } from '@/shared/components';
import { spacing, borderRadius, typography } from '@/shared/theme';
import apiService from '@/shared/services';

interface PartFormData {
  partName: string;
  brand: string;
  partNumber: string;
  description: string;
  category: 'engine' | 'electrical' | 'suspension' | 'brake' | 'body' | 'interior' | 'exterior' | 'fuel' | 'cooling' | 'transmission' | 'exhaust' | 'other';
  makeModel: string; // Comma-separated
  yearStart: string;
  yearEnd: string;
  engine: string; // Comma-separated
  vinPrefix: string; // Comma-separated
  compatibilityNotes: string;
  quantity: string;
  lowThreshold: string;
  unitPrice: string;
  oldPrice: string;
  currency: 'TRY' | 'USD' | 'EUR';
  isNegotiable: boolean;
  condition: 'new' | 'used' | 'refurbished' | 'oem' | 'aftermarket';
  warrantyMonths: string;
  warrantyDescription: string;
  isPublished: boolean;
}

const categories = [
  { value: 'engine', label: 'Motor' },
  { value: 'electrical', label: 'Elektrik' },
  { value: 'suspension', label: 'Süspansiyon' },
  { value: 'brake', label: 'Fren' },
  { value: 'body', label: 'Kaporta' },
  { value: 'interior', label: 'İç Donanım' },
  { value: 'exterior', label: 'Dış Donanım' },
  { value: 'fuel', label: 'Yakıt' },
  { value: 'cooling', label: 'Soğutma' },
  { value: 'transmission', label: 'Şanzıman' },
  { value: 'exhaust', label: 'Egzoz' },
  { value: 'other', label: 'Diğer' },
];

const conditions = [
  { value: 'new', label: 'Sıfır' },
  { value: 'used', label: 'İkinci El' },
  { value: 'refurbished', label: 'Yenilenmiş' },
  { value: 'oem', label: 'Orijinal' },
  { value: 'aftermarket', label: 'Yan Sanayi' },
];

const currencies = [
  { value: 'TRY', label: 'TRY (₺)' },
  { value: 'USD', label: 'USD ($)' },
  { value: 'EUR', label: 'EUR (€)' },
];

export default function AddPartScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { themeColors: colors } = useTheme();
  const styles = createStyles(colors);

  const partId = (route.params as any)?.partId;
  const isEditMode = !!partId;

  const [loading, setLoading] = useState(false);
  const [loadingPart, setLoadingPart] = useState(false);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const [photos, setPhotos] = useState<string[]>([]);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showConditionModal, setShowConditionModal] = useState(false);
  const [showCurrencyModal, setShowCurrencyModal] = useState(false);

  const [formData, setFormData] = useState<PartFormData>({
    partName: '',
    brand: '',
    partNumber: '',
    description: '',
    category: 'other',
    makeModel: '',
    yearStart: '2000',
    yearEnd: new Date().getFullYear().toString(),
    engine: '',
    vinPrefix: '',
    compatibilityNotes: '',
    quantity: '1',
    lowThreshold: '5',
    unitPrice: '',
    oldPrice: '',
    currency: 'TRY',
    isNegotiable: false,
    condition: 'new',
    warrantyMonths: '',
    warrantyDescription: '',
    isPublished: false,
  });

  useEffect(() => {
    if (isEditMode && partId) {
      fetchPartData();
    }
  }, [partId, isEditMode]);

  const fetchPartData = async () => {
    try {
      setLoadingPart(true);
      // Önce tüm parçaları çek (getPartDetail endpoint'i yoksa)
      const response = await apiService.PartsService.getMechanicParts();
      if (response.success && response.data) {
        const partsArray = Array.isArray(response.data) ? response.data : [];
        const part = partsArray.find((p: any) => p._id === partId);
        if (part) {
          // Form verilerini doldur
          setFormData({
            partName: part.partName || '',
            brand: part.brand || '',
            partNumber: part.partNumber || '',
            description: part.description || '',
            category: part.category || 'other',
            makeModel: part.compatibility?.makeModel?.join(', ') || '',
            yearStart: part.compatibility?.years?.start?.toString() || '2000',
            yearEnd: part.compatibility?.years?.end?.toString() || new Date().getFullYear().toString(),
            engine: part.compatibility?.engine?.join(', ') || '',
            vinPrefix: part.compatibility?.vinPrefix?.join(', ') || '',
            compatibilityNotes: part.compatibility?.notes || '',
            quantity: part.stock?.quantity?.toString() || '1',
            lowThreshold: part.stock?.lowThreshold?.toString() || '5',
            unitPrice: part.pricing?.unitPrice?.toString() || '',
            oldPrice: part.pricing?.oldPrice?.toString() || '',
            currency: part.pricing?.currency || 'TRY',
            isNegotiable: part.pricing?.isNegotiable || false,
            condition: part.condition || 'new',
            warrantyMonths: part.warranty?.months?.toString() || '',
            warrantyDescription: part.warranty?.description || '',
            isPublished: part.isPublished || false,
          });
          setPhotos(part.photos || []);
        }
      }
    } catch (error) {
      console.error('Parça verileri yüklenemedi:', error);
      Alert.alert('Hata', 'Parça verileri yüklenemedi');
    } finally {
      setLoadingPart(false);
    }
  };

  const updateField = (field: keyof PartFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handlePickImage = async () => {
    try {
      setUploadingPhotos(true);

      // Kamera izinlerini kontrol et
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('İzin Gerekli', 'Fotoğraf seçmek için izin vermeniz gerekiyor');
        return;
      }

      // Görsel seçiciyi aç
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: [ImagePicker.MediaType.Images],
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
        allowsMultipleSelection: false,
      });

      if (!result.canceled && result.assets[0]) {
        const photoUri = result.assets[0].uri;
        
        // Backend'e yükle
        const uploadResponse = await apiService.PartsService.uploadPartPhoto(photoUri);
        
        if (uploadResponse.success && uploadResponse.data) {
          setPhotos(prev => [...prev, uploadResponse.data.url]);
        } else {
          Alert.alert('Hata', uploadResponse.message || 'Fotoğraf yüklenemedi');
        }
      }
    } catch (error) {
      console.error('Fotoğraf seçme hatası:', error);
      Alert.alert('Hata', 'Fotoğraf seçilemedi');
    } finally {
      setUploadingPhotos(false);
    }
  };

  const handleTakePhoto = async () => {
    try {
      setUploadingPhotos(true);

      // Kamera izinlerini kontrol et
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('İzin Gerekli', 'Kamera kullanmak için izin vermeniz gerekiyor');
        return;
      }

      // Kamerayı aç
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const photoUri = result.assets[0].uri;
        
        // Backend'e yükle
        const uploadResponse = await apiService.PartsService.uploadPartPhoto(photoUri);
        
        if (uploadResponse.success && uploadResponse.data) {
          setPhotos(prev => [...prev, uploadResponse.data.url]);
        } else {
          Alert.alert('Hata', uploadResponse.message || 'Fotoğraf yüklenemedi');
        }
      }
    } catch (error) {
      console.error('Fotoğraf çekme hatası:', error);
      Alert.alert('Hata', 'Fotoğraf çekilemedi');
    } finally {
      setUploadingPhotos(false);
    }
  };

  const handleSave = async () => {
    // Validasyon
    if (!formData.partName.trim()) {
      Alert.alert('Uyarı', 'Parça adı giriniz');
      return;
    }
    if (!formData.brand.trim()) {
      Alert.alert('Uyarı', 'Marka giriniz');
      return;
    }
    
    // Fiyat validasyonu - NaN kontrolü
    const unitPrice = parseFloat(formData.unitPrice);
    if (!formData.unitPrice || isNaN(unitPrice) || unitPrice <= 0) {
      Alert.alert('Uyarı', 'Geçerli bir fiyat giriniz');
      return;
    }
    
    // Miktar validasyonu - NaN kontrolü
    const quantity = parseInt(formData.quantity);
    if (!formData.quantity || isNaN(quantity) || quantity <= 0) {
      Alert.alert('Uyarı', 'Geçerli bir miktar giriniz');
      return;
    }
    
    // Düşük stok eşiği validasyonu
    const lowThreshold = parseInt(formData.lowThreshold);
    if (isNaN(lowThreshold) || lowThreshold < 0) {
      Alert.alert('Uyarı', 'Geçerli bir düşük stok eşiği giriniz');
      return;
    }
    
    // Yıl validasyonu
    const yearStart = parseInt(formData.yearStart);
    const yearEnd = parseInt(formData.yearEnd);
    if (isNaN(yearStart) || isNaN(yearEnd) || yearStart > yearEnd) {
      Alert.alert('Uyarı', 'Geçerli yıl aralığı giriniz');
      return;
    }
    
    if (!formData.makeModel.trim()) {
      Alert.alert('Uyarı', 'En az bir araç marka/model giriniz (virgülle ayrılmış: Toyota,Corolla)');
      return;
    }

    try {
      setLoading(true);

      // Form verilerini backend formatına çevir
      const makeModelArray = formData.makeModel.split(',').map(s => s.trim()).filter(Boolean);
      const engineArray = formData.engine ? formData.engine.split(',').map(s => s.trim()).filter(Boolean) : [];
      const vinPrefixArray = formData.vinPrefix ? formData.vinPrefix.split(',').map(s => s.trim()).filter(Boolean) : [];

      const payload: any = {
        partName: formData.partName.trim(),
        brand: formData.brand.trim(),
        partNumber: formData.partNumber.trim() || undefined,
        description: formData.description.trim() || undefined,
        photos: photos.length > 0 ? photos : undefined, // Boş array gönderme
        category: formData.category,
        compatibility: {
          makeModel: makeModelArray,
          years: {
            start: yearStart,
            end: yearEnd,
          },
          engine: engineArray.length > 0 ? engineArray : undefined,
          vinPrefix: vinPrefixArray.length > 0 ? vinPrefixArray : undefined,
          notes: formData.compatibilityNotes.trim() || undefined,
        },
        stock: {
          quantity: quantity,
          lowThreshold: lowThreshold,
          // NOT: available ve reserved backend'de otomatik hesaplanacak
        },
        pricing: {
          unitPrice: unitPrice,
          oldPrice: formData.oldPrice ? (parseFloat(formData.oldPrice) || undefined) : undefined,
          currency: formData.currency,
          isNegotiable: formData.isNegotiable,
        },
        condition: formData.condition,
        isPublished: formData.isPublished,
      };

      // Warranty bilgisi varsa ekle
      if (formData.warrantyMonths) {
        const warrantyMonths = parseInt(formData.warrantyMonths);
        if (!isNaN(warrantyMonths) && warrantyMonths > 0) {
        payload.warranty = {
            months: warrantyMonths,
          description: formData.warrantyDescription.trim() || undefined,
        };
      }
      }

      let response;
      if (isEditMode && partId) {
        response = await apiService.PartsService.updatePart(partId, payload);
      } else {
        response = await apiService.PartsService.createPart(payload);
      }
      
      if (response.success) {
        Alert.alert(
          'Başarılı',
          isEditMode ? 'Parça güncellendi' : 'Parça eklendi ve moderasyona gönderildi',
          [
            {
              text: 'Tamam',
              onPress: () => navigation.goBack(),
            },
          ]
        );
      } else {
        Alert.alert('Hata', response.message || (isEditMode ? 'Parça güncellenemedi' : 'Parça eklenemedi'));
      }
    } catch (error: any) {
      console.error('Parça ekleme hatası:', error);
      Alert.alert('Hata', error.message || 'Parça eklenemedi');
    } finally {
      setLoading(false);
    }
  };

  const renderDropdownButton = (
    label: string,
    value: string,
    onPress: () => void,
    icon: string
  ) => (
    <TouchableOpacity onPress={onPress} style={styles.dropdown}>
      <View style={styles.dropdownLeft}>
        <Ionicons name={icon as any} size={20} color={colors.primary} />
        <View style={styles.dropdownContent}>
          <Text style={[styles.dropdownLabel, { color: colors.textSecondary }]}>
            {label}
          </Text>
          <Text style={[styles.dropdownValue, { color: colors.text }]}>
            {value}
          </Text>
        </View>
      </View>
      <Ionicons name="chevron-down" size={20} color={colors.textSecondary} />
    </TouchableOpacity>
  );

  if (loadingPart) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            {isEditMode ? 'Parça Düzenle' : 'Yeni Parça Ekle'}
          </Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
            Yükleniyor...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          {isEditMode ? 'Parça Düzenle' : 'Yeni Parça Ekle'}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Temel Bilgiler */}
        <Card style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Temel Bilgiler
          </Text>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.text }]}>
              Parça Adı *
            </Text>
            <TextInput
              style={[styles.input, { borderColor: colors.border, color: colors.text }]}
              value={formData.partName}
              onChangeText={value => updateField('partName', value)}
              placeholder="Örn: Fren Balata Seti"
              placeholderTextColor={colors.textSecondary}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.text }]}>
              Marka *
            </Text>
            <TextInput
              style={[styles.input, { borderColor: colors.border, color: colors.text }]}
              value={formData.brand}
              onChangeText={value => updateField('brand', value)}
              placeholder="Örn: Mercedes-Benz"
              placeholderTextColor={colors.textSecondary}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.text }]}>
              Parça No
            </Text>
            <TextInput
              style={[styles.input, { borderColor: colors.border, color: colors.text }]}
              value={formData.partNumber}
              onChangeText={value => updateField('partNumber', value)}
              placeholder="Orijinal Parça Numarası (Opsiyonel)"
              placeholderTextColor={colors.textSecondary}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.text }]}>
              Kategori *
            </Text>
            {renderDropdownButton(
              'Kategori Seçin',
              categories.find(c => c.value === formData.category)?.label || '',
              () => setShowCategoryModal(true),
              'folder-outline'
            )}
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.text }]}>
              Açıklama
            </Text>
            <TextInput
              style={[styles.textArea, { borderColor: colors.border, color: colors.text }]}
              value={formData.description}
              onChangeText={value => updateField('description', value)}
              placeholder="Parça hakkında detaylı bilgi..."
              placeholderTextColor={colors.textSecondary}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>
        </Card>

        {/* Fotoğraflar */}
        <Card style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Fotoğraflar
          </Text>
          <Text style={[styles.hint, { color: colors.textSecondary, marginBottom: spacing.md }]}>
            Ürününüzü en iyi şekilde gösteren fotoğraflar ekleyin (En fazla 5 fotoğraf)
          </Text>

          <View style={styles.photosContainer}>
            {photos.map((photo, index) => (
              <View key={index} style={styles.photoItem}>
                <Image source={{ uri: photo }} style={styles.photoImage} />
                <TouchableOpacity
                  style={styles.removePhotoButton}
                  onPress={() => {
                    const newPhotos = photos.filter((_, i) => i !== index);
                    setPhotos(newPhotos);
                  }}
                >
                  <Ionicons name="close-circle" size={24} color="#EF4444" />
                </TouchableOpacity>
              </View>
            ))}
            
            {photos.length < 5 && (
              <>
                <TouchableOpacity
                  style={[styles.addPhotoButton, { borderColor: colors.border, backgroundColor: colors.inputBackground }]}
                  onPress={handleTakePhoto}
                  disabled={uploadingPhotos}
                >
                  {uploadingPhotos ? (
                    <ActivityIndicator size="small" color={colors.primary} />
                  ) : (
                    <>
                      <Ionicons name="camera" size={32} color={colors.textSecondary} />
                      <Text style={[styles.addPhotoText, { color: colors.textSecondary }]}>
                        Fotoğraf Çek
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.addPhotoButton, { borderColor: colors.border, backgroundColor: colors.inputBackground }]}
                  onPress={handlePickImage}
                  disabled={uploadingPhotos}
                >
                  {uploadingPhotos ? (
                    <ActivityIndicator size="small" color={colors.primary} />
                  ) : (
                    <>
                      <Ionicons name="images" size={32} color={colors.textSecondary} />
                      <Text style={[styles.addPhotoText, { color: colors.textSecondary }]}>
                        Galeriden Seç
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </>
            )}
          </View>
        </Card>

        {/* Uyumluluk */}
        <Card style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Araç Uyumluluğu
          </Text>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.text }]}>
              Marka/Model *
            </Text>
            <TextInput
              style={[styles.input, { borderColor: colors.border, color: colors.text }]}
              value={formData.makeModel}
              onChangeText={value => updateField('makeModel', value)}
              placeholder="Virgülle ayırın: Toyota,Corolla,Honda,Civic"
              placeholderTextColor={colors.textSecondary}
            />
            <Text style={[styles.hint, { color: colors.textSecondary }]}>
              Birden fazla araç için virgül kullanın
            </Text>
          </View>

          <View style={styles.rowInput}>
            <View style={[styles.inputGroup, { flex: 1, marginRight: spacing.xs }]}>
              <Text style={[styles.label, { color: colors.text }]}>
                Başlangıç Yılı
              </Text>
              <TextInput
                style={[styles.input, { borderColor: colors.border, color: colors.text }]}
                value={formData.yearStart}
                onChangeText={value => updateField('yearStart', value)}
                keyboardType="number-pad"
              />
            </View>
            <View style={[styles.inputGroup, { flex: 1, marginLeft: spacing.xs }]}>
              <Text style={[styles.label, { color: colors.text }]}>
                Bitiş Yılı
              </Text>
              <TextInput
                style={[styles.input, { borderColor: colors.border, color: colors.text }]}
                value={formData.yearEnd}
                onChangeText={value => updateField('yearEnd', value)}
                keyboardType="number-pad"
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.text }]}>
              Motor Tipi
            </Text>
            <TextInput
              style={[styles.input, { borderColor: colors.border, color: colors.text }]}
              value={formData.engine}
              onChangeText={value => updateField('engine', value)}
              placeholder="Örn: 1.6L,2.0L (Virgülle ayırın)"
              placeholderTextColor={colors.textSecondary}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.text }]}>
              Şase No Prefix (3 haneli)
            </Text>
            <TextInput
              style={[styles.input, { borderColor: colors.border, color: colors.text }]}
              value={formData.vinPrefix}
              onChangeText={value => updateField('vinPrefix', value)}
              placeholder="Örn: WDB,ABC (Virgülle ayırın)"
              placeholderTextColor={colors.textSecondary}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.text }]}>
              Uyumluluk Notları
            </Text>
            <TextInput
              style={[styles.textArea, { borderColor: colors.border, color: colors.text }]}
              value={formData.compatibilityNotes}
              onChangeText={value => updateField('compatibilityNotes', value)}
              placeholder="Ek bilgiler..."
              placeholderTextColor={colors.textSecondary}
              multiline
              numberOfLines={2}
              textAlignVertical="top"
            />
          </View>
        </Card>

        {/* Stok & Fiyat */}
        <Card style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Stok & Fiyat
          </Text>

          <View style={styles.rowInput}>
            <View style={[styles.inputGroup, { flex: 1, marginRight: spacing.xs }]}>
              <Text style={[styles.label, { color: colors.text }]}>
                Miktar *
              </Text>
              <TextInput
                style={[styles.input, { borderColor: colors.border, color: colors.text }]}
                value={formData.quantity}
                onChangeText={value => updateField('quantity', value)}
                keyboardType="number-pad"
              />
            </View>
            <View style={[styles.inputGroup, { flex: 1, marginLeft: spacing.xs }]}>
              <Text style={[styles.label, { color: colors.text }]}>
                Düşük Stok Uyarısı
              </Text>
              <TextInput
                style={[styles.input, { borderColor: colors.border, color: colors.text }]}
                value={formData.lowThreshold}
                onChangeText={value => updateField('lowThreshold', value)}
                keyboardType="number-pad"
              />
            </View>
          </View>

          <View style={styles.rowInput}>
            <View style={[styles.inputGroup, { flex: 1, marginRight: spacing.xs }]}>
              <Text style={[styles.label, { color: colors.text }]}>
                Fiyat * ({formData.currency})
              </Text>
              <TextInput
                style={[styles.input, { borderColor: colors.border, color: colors.text }]}
                value={formData.unitPrice}
                onChangeText={value => updateField('unitPrice', value)}
                keyboardType="decimal-pad"
                placeholder="0.00"
                placeholderTextColor={colors.textSecondary}
              />
            </View>
            <View style={[styles.inputGroup, { flex: 1, marginLeft: spacing.xs }]}>
              <Text style={[styles.label, { color: colors.text }]}>
                Eski Fiyat
              </Text>
              <TextInput
                style={[styles.input, { borderColor: colors.border, color: colors.text }]}
                value={formData.oldPrice}
                onChangeText={value => updateField('oldPrice', value)}
                keyboardType="decimal-pad"
                placeholder="İndirimli ise"
                placeholderTextColor={colors.textSecondary}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.text }]}>
              Para Birimi
            </Text>
            {renderDropdownButton(
              'Para Birimi Seçin',
              currencies.find(c => c.value === formData.currency)?.label || '',
              () => setShowCurrencyModal(true),
              'cash-outline'
            )}
          </View>

          <View style={styles.switchRow}>
            <View style={styles.switchLeft}>
              <Ionicons name="chatbubbles-outline" size={20} color={colors.primary} />
              <Text style={[styles.switchLabel, { color: colors.text }]}>
                Fiyat Pazarlığa Açık
              </Text>
            </View>
            <Switch
              value={formData.isNegotiable}
              onValueChange={value => updateField('isNegotiable', value)}
              trackColor={{ false: colors.border, true: colors.primary + '50' }}
              thumbColor={formData.isNegotiable ? colors.primary : '#FFFFFF'}
            />
          </View>
        </Card>

        {/* Durum */}
        <Card style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Durum & Garanti
          </Text>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.text }]}>
              Durum *
            </Text>
            {renderDropdownButton(
              'Durum Seçin',
              conditions.find(c => c.value === formData.condition)?.label || '',
              () => setShowConditionModal(true),
              'checkmark-circle-outline'
            )}
          </View>

          <View style={styles.rowInput}>
            <View style={[styles.inputGroup, { flex: 1, marginRight: spacing.xs }]}>
              <Text style={[styles.label, { color: colors.text }]}>
                Garanti Süresi (Ay)
              </Text>
              <TextInput
                style={[styles.input, { borderColor: colors.border, color: colors.text }]}
                value={formData.warrantyMonths}
                onChangeText={value => updateField('warrantyMonths', value)}
                keyboardType="number-pad"
                placeholder="0"
                placeholderTextColor={colors.textSecondary}
              />
            </View>
            <View style={[styles.inputGroup, { flex: 1, marginLeft: spacing.xs }]}>
              <Text style={[styles.label, { color: colors.text }]}>
                &nbsp;
              </Text>
              <View style={{ height: 48 }} />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.text }]}>
              Garanti Açıklaması
            </Text>
            <TextInput
              style={[styles.textArea, { borderColor: colors.border, color: colors.text }]}
              value={formData.warrantyDescription}
              onChangeText={value => updateField('warrantyDescription', value)}
              placeholder="Garanti şartları..."
              placeholderTextColor={colors.textSecondary}
              multiline
              numberOfLines={2}
              textAlignVertical="top"
            />
          </View>

          <View style={styles.switchRow}>
            <View style={styles.switchLeft}>
              <Ionicons name="storefront-outline" size={20} color={colors.primary} />
              <Text style={[styles.switchLabel, { color: colors.text }]}>
                Market'te Yayınla
              </Text>
            </View>
            <Switch
              value={formData.isPublished}
              onValueChange={value => updateField('isPublished', value)}
              trackColor={{ false: colors.border, true: colors.primary + '50' }}
              thumbColor={formData.isPublished ? colors.primary : '#FFFFFF'}
            />
          </View>
        </Card>

        <View style={{ height: spacing.xl }} />
      </ScrollView>

      {/* Footer Button */}
      <View style={[styles.footer, { borderTopColor: colors.border }]}>
        <Button
          title={loading ? (isEditMode ? 'Güncelleniyor...' : 'Kaydediliyor...') : (isEditMode ? 'Parça Güncelle' : 'Parça Ekle')}
          onPress={handleSave}
          style={styles.saveButton}
          disabled={loading || loadingPart}
        />
      </View>

      {/* Category Modal */}
      {showCategoryModal && (
        <View style={styles.modalOverlay}>
          <View style={[
            styles.modalContent, 
            { 
              backgroundColor: colors.background.primary,
            }
          ]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Kategori Seçin</Text>
              <TouchableOpacity onPress={() => setShowCategoryModal(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            <ScrollView>
              {categories.map(cat => (
                <TouchableOpacity
                  key={cat.value}
                  style={[
                    styles.modalItem,
                    formData.category === cat.value && { backgroundColor: colors.primary + '20' }
                  ]}
                  onPress={() => {
                    updateField('category', cat.value);
                    setShowCategoryModal(false);
                  }}
                >
                  <Text style={[styles.modalItemText, { color: colors.text }]}>
                    {cat.label}
                  </Text>
                  {formData.category === cat.value && (
                    <Ionicons name="checkmark" size={20} color={colors.primary} />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      )}

      {/* Condition Modal */}
      {showConditionModal && (
        <View style={styles.modalOverlay}>
          <View style={[
            styles.modalContent, 
            { 
              backgroundColor: colors.background.primary,
            }
          ]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Durum Seçin</Text>
              <TouchableOpacity onPress={() => setShowConditionModal(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            <ScrollView>
              {conditions.map(cond => (
                <TouchableOpacity
                  key={cond.value}
                  style={[
                    styles.modalItem,
                    formData.condition === cond.value && { backgroundColor: colors.primary + '20' }
                  ]}
                  onPress={() => {
                    updateField('condition', cond.value);
                    setShowConditionModal(false);
                  }}
                >
                  <Text style={[styles.modalItemText, { color: colors.text }]}>
                    {cond.label}
                  </Text>
                  {formData.condition === cond.value && (
                    <Ionicons name="checkmark" size={20} color={colors.primary} />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      )}

      {/* Currency Modal */}
      {showCurrencyModal && (
        <View style={styles.modalOverlay}>
          <View style={[
            styles.modalContent, 
            { 
              backgroundColor: colors.background.primary,
            }
          ]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Para Birimi Seçin</Text>
              <TouchableOpacity onPress={() => setShowCurrencyModal(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            <ScrollView>
              {currencies.map(curr => (
                <TouchableOpacity
                  key={curr.value}
                  style={[
                    styles.modalItem,
                    formData.currency === curr.value && { backgroundColor: colors.primary + '20' }
                  ]}
                  onPress={() => {
                    updateField('currency', curr.value);
                    setShowCurrencyModal(false);
                  }}
                >
                  <Text style={[styles.modalItemText, { color: colors.text }]}>
                    {curr.label}
                  </Text>
                  {formData.currency === curr.value && (
                    <Ionicons name="checkmark" size={20} color={colors.primary} />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: spacing.xs,
  },
  headerTitle: {
    ...typography.h2,
    flex: 1,
    textAlign: 'center',
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 100,
  },
  loadingText: {
    marginTop: 16,
    ...typography.body,
  },
  section: {
    margin: spacing.md,
  },
  sectionTitle: {
    ...typography.h3,
    marginBottom: spacing.md,
  },
  inputGroup: {
    marginBottom: spacing.md,
  },
  label: {
    ...typography.body,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  input: {
    borderWidth: 1,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    ...typography.body,
  },
  textArea: {
    borderWidth: 1,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    ...typography.body,
    minHeight: 80,
  },
  hint: {
    ...typography.caption,
    marginTop: spacing.xs,
  },
  rowInput: {
    flexDirection: 'row',
  },
  dropdown: {
    borderWidth: 1,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dropdownLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  dropdownContent: {
    marginLeft: spacing.sm,
    flex: 1,
  },
  dropdownLabel: {
    ...typography.caption,
  },
  dropdownValue: {
    ...typography.body,
    marginTop: 2,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.md,
    paddingVertical: spacing.sm,
  },
  switchLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  switchLabel: {
    ...typography.body,
    marginLeft: spacing.sm,
  },
  footer: {
    borderTopWidth: 1,
    padding: spacing.md,
  },
  saveButton: {
    marginHorizontal: 0,
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  modalContent: {
    width: '80%',
    maxHeight: '70%',
    borderRadius: borderRadius.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    borderBottomWidth: 1,
  },
  modalTitle: {
    ...typography.h3,
  },
  modalItem: {
    padding: spacing.md,
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalItemText: {
    ...typography.body,
  },
  // Photo styles
  photosContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  photoItem: {
    width: 100,
    height: 100,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    position: 'relative',
  },
  photoImage: {
    width: '100%',
    height: '100%',
    backgroundColor: '#f0f0f0',
  },
  removePhotoButton: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 12,
  },
  addPhotoButton: {
    width: 100,
    height: 100,
    borderRadius: borderRadius.md,
    borderWidth: 2,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addPhotoText: {
    ...typography.caption,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
});

