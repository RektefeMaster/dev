import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';

import { colors, spacing, borderRadius, shadows, typography } from '@/shared/theme';
import { BackButton, Button } from '@/shared/components';
import apiService from '@/shared/services';
import { useAuth } from '@/shared/context';

export default function EditProfileScreen() {
  const { user, updateUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [isLocationLoading, setIsLocationLoading] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    name: user?.name || '',
    surname: user?.surname || '',
    email: user?.email || '',
    phone: user?.phone || '',
    city: user?.city || '',
    bio: user?.bio || '',
    shopName: user?.shopName || '',
    // Adres bilgileri
    district: user?.location?.district || '',
    neighborhood: user?.location?.neighborhood || '',
    street: user?.location?.street || '',
    building: user?.location?.building || '',
    floor: user?.location?.floor || '',
    apartment: user?.location?.apartment || '',
    description: user?.location?.description || '',
    coordinates: user?.location?.coordinates || null,
  });

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Gerçek zamanlı konum alma
  const getCurrentLocation = async () => {
    try {
      setIsLocationLoading(true);
      
      // Konum izni iste
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Hata', 'Konum izni verilmedi');
        return;
      }

      // Mevcut konumu al
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      // Reverse geocoding ile adres bilgilerini al
      const addressResponse = await Location.reverseGeocodeAsync({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });

      if (addressResponse.length > 0) {
        const address = addressResponse[0];
        setFormData(prev => ({
          ...prev,
          city: address.city || prev.city,
          district: address.district || prev.district,
          neighborhood: address.street || prev.neighborhood,
          coordinates: {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
          },
        }));
        
        Alert.alert('Başarılı', 'Konumunuz başarıyla alındı');
      }
    } catch (error) {
      Alert.alert('Hata', 'Konum alınamadı');
    } finally {
      setIsLocationLoading(false);
    }
  };

  // Profil bilgilerini kaydet
  const saveProfile = async () => {
    try {
      setLoading(true);
      
      // shopName boşsa API'ye gönderme
      const profileData: any = {
        name: formData.name,
        surname: formData.surname,
        phone: formData.phone,
        city: formData.city,
        bio: formData.bio,
        location: {
          city: formData.city,
          district: formData.district,
          neighborhood: formData.neighborhood,
          street: formData.street,
          building: formData.building,
          floor: formData.floor,
          apartment: formData.apartment,
          description: formData.description,
          coordinates: formData.coordinates || {
            latitude: 0,
            longitude: 0,
          },
        },
      };

      // shopName boş değilse ekle
      if (formData.shopName && formData.shopName.trim().length >= 2) {
        profileData.shopName = formData.shopName;
      }
      
      const response = await apiService.updateMechanicProfile(profileData);

      if (response.success) {
        Alert.alert('Başarılı', 'Profil bilgileri güncellendi');
        // AuthContext'i güncelle
        const userUpdateData: any = {
          name: formData.name,
          surname: formData.surname,
          phone: formData.phone,
          city: formData.city,
          bio: formData.bio,
          location: {
            city: formData.city,
            district: formData.district,
            neighborhood: formData.neighborhood,
            street: formData.street,
            building: formData.building,
            floor: formData.floor,
            apartment: formData.apartment,
            description: formData.description,
            coordinates: formData.coordinates ? formData.coordinates : {
              latitude: 0,
              longitude: 0,
            },
          },
        };

        // shopName boş değilse ekle
        if (formData.shopName && formData.shopName.trim().length >= 2) {
          userUpdateData.shopName = formData.shopName;
        }

        updateUser(userUpdateData);
      } else {
        Alert.alert('Hata', response.message || 'Güncelleme başarısız');
      }
    } catch (error) {
      Alert.alert('Hata', 'Bilgiler kaydedilemedi');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <BackButton />
        <Text style={styles.headerTitle}>Profili Düzenle</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Temel Bilgiler */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Temel Bilgiler</Text>
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Ad</Text>
            <TextInput
              style={styles.input}
              value={formData.name}
              onChangeText={(text) => handleInputChange('name', text)}
              placeholder="Adınızı girin"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Soyad</Text>
            <TextInput
              style={styles.input}
              value={formData.surname}
              onChangeText={(text) => handleInputChange('surname', text)}
              placeholder="Soyadınızı girin"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Telefon</Text>
            <TextInput
              style={styles.input}
              value={formData.phone}
              onChangeText={(text) => handleInputChange('phone', text)}
              placeholder="Telefon numaranızı girin"
              keyboardType="phone-pad"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Biyografi</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={formData.bio}
              onChangeText={(text) => handleInputChange('bio', text)}
              placeholder="Kendinizi tanıtın"
              multiline
              numberOfLines={3}
            />
          </View>
        </View>

        {/* Dükkan/İş Yeri Bilgileri */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Dükkan/İş Yeri Bilgileri</Text>
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Dükkan/İş Yeri Adı</Text>
            <TextInput
              style={styles.input}
              value={formData.shopName}
              onChangeText={(text) => handleInputChange('shopName', text)}
              placeholder="Dükkan veya iş yeri adınızı girin"
            />
            {formData.shopName && formData.shopName.trim().length > 0 && formData.shopName.trim().length < 2 && (
              <Text style={styles.errorText}>Dükkan adı en az 2 karakter olmalıdır</Text>
            )}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Şehir</Text>
            <TextInput
              style={styles.input}
              value={formData.city}
              onChangeText={(text) => handleInputChange('city', text)}
              placeholder="Şehir"
            />
          </View>
        </View>

        {/* Adres Bilgileri */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Adres Bilgileri</Text>
            <TouchableOpacity 
              style={styles.locationButton}
              onPress={getCurrentLocation}
              disabled={isLocationLoading}
            >
              {isLocationLoading ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <Ionicons name="location" size={20} color={colors.primary} />
              )}
              <Text style={styles.locationButtonText}>Konum Al</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>İlçe</Text>
            <TextInput
              style={styles.input}
              value={formData.district}
              onChangeText={(text) => handleInputChange('district', text)}
              placeholder="İlçe"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Mahalle</Text>
            <TextInput
              style={styles.input}
              value={formData.neighborhood}
              onChangeText={(text) => handleInputChange('neighborhood', text)}
              placeholder="Mahalle"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Sokak</Text>
            <TextInput
              style={styles.input}
              value={formData.street}
              onChangeText={(text) => handleInputChange('street', text)}
              placeholder="Sokak"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Bina Adı</Text>
            <TextInput
              style={styles.input}
              value={formData.building}
              onChangeText={(text) => handleInputChange('building', text)}
              placeholder="Bina adı"
            />
          </View>

          <View style={styles.row}>
            <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
              <Text style={styles.label}>Kat</Text>
              <TextInput
                style={styles.input}
                value={formData.floor}
                onChangeText={(text) => handleInputChange('floor', text)}
                placeholder="Kat"
              />
            </View>
            <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
              <Text style={styles.label}>Daire No</Text>
              <TextInput
                style={styles.input}
                value={formData.apartment}
                onChangeText={(text) => handleInputChange('apartment', text)}
                placeholder="Daire No"
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Tarif</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={formData.description}
              onChangeText={(text) => handleInputChange('description', text)}
              placeholder="Detaylı tarif (örn: tecde mahallesi hayrat sokak yakamoz kule apartmanı kat 7 no 13)"
              multiline
              numberOfLines={3}
            />
          </View>
        </View>

        {/* Kaydet Butonu */}
        <View style={styles.buttonContainer}>
          <Button
            title={loading ? 'Kaydediliyor...' : 'Kaydet'}
            onPress={saveProfile}
            disabled={loading}
            style={styles.saveButton}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.primary,
  },
  headerTitle: {
    fontSize: typography.h2.fontSize,
    fontWeight: '700',
    color: colors.text.primary.main,
  },
  scrollView: {
    flex: 1,
  },
  section: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: typography.h3.fontSize,
    fontWeight: '600',
    color: colors.text.primary.main,
    marginBottom: spacing.md,
  },
  inputGroup: {
    marginBottom: spacing.md,
  },
  label: {
    fontSize: typography.body1.fontSize,
    fontWeight: '500',
    color: colors.text.secondary,
    marginBottom: spacing.xs,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border.primary,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: typography.body1.fontSize,
    color: colors.text.primary.main,
    backgroundColor: colors.background.secondary,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  row: {
    flexDirection: 'row',
  },
  locationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.primary.light,
    borderRadius: borderRadius.md,
  },
  locationButtonText: {
    marginLeft: spacing.xs,
    fontSize: typography.body2.fontSize,
    color: colors.primary,
    fontWeight: '500',
  },
  errorText: {
    fontSize: typography.caption.fontSize,
    color: colors.error,
    marginTop: spacing.xs,
  },
  buttonContainer: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl,
    backgroundColor: colors.background.primary,
  },
  saveButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    minHeight: 50,
    shadowColor: colors.primary,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
});
