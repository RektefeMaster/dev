import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { TextInput, Button, Text, Chip, Switch, Card, Appbar, Avatar, HelperText } from 'react-native-paper';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../../context/AuthContext';
import { updateMechanicProfile, MechanicProfile } from '../../services/auth';
import { COLORS, SIZES, SERVICE_CATEGORIES } from '../../constants/config';
import { router } from 'expo-router';
import { useSnackbar } from '../../context/SnackbarContext';
import { VEHICLE_BRANDS } from '../../constants/vehicleBrands';

const DEFAULT_WORKING_HOURS = {
  monday: { open: '09:00', close: '18:00', isOpen: true },
  tuesday: { open: '09:00', close: '18:00', isOpen: true },
  wednesday: { open: '09:00', close: '18:00', isOpen: true },
  thursday: { open: '09:00', close: '18:00', isOpen: true },
  friday: { open: '09:00', close: '18:00', isOpen: true },
  saturday: { open: '09:00', close: '18:00', isOpen: true },
  sunday: { open: '09:00', close: '18:00', isOpen: false },
};

const DAYS = [
  { key: 'monday', label: 'Pazartesi' },
  { key: 'tuesday', label: 'Salı' },
  { key: 'wednesday', label: 'Çarşamba' },
  { key: 'thursday', label: 'Perşembe' },
  { key: 'friday', label: 'Cuma' },
  { key: 'saturday', label: 'Cumartesi' },
  { key: 'sunday', label: 'Pazar' },
];

type EditableMechanicProfile = Omit<MechanicProfile, '_id' | 'rating' | 'createdAt' | 'updatedAt'>;

export default function EditProfileScreen() {
  const { user, updateUser } = useAuth();
  const { showSnackbar } = useSnackbar();
  const [formData, setFormData] = useState<Partial<EditableMechanicProfile> | null>(null);
  const [loading, setLoading] = useState(false);
  const [profileImage, setProfileImage] = useState<string | undefined>(undefined);
  const [coverImage, setCoverImage] = useState<string | undefined>(undefined);
  const [address, setAddress] = useState<string>(formData?.location?.address || '');
  const [isAvailable, setIsAvailable] = useState(false);

  useEffect(() => {
    if (user) {
      const { _id, rating, createdAt, updatedAt, ...editableData } = user;
      setFormData({
        ...editableData,
        workingHours: user.workingHours || DEFAULT_WORKING_HOURS,
      });
      setProfileImage(user.profileImage || user.avatar);
      setCoverImage(user.cover);
      setIsAvailable(user.isAvailable || false);
    }
  }, [user]);

  if (!formData) return null;

  const handleInputChange = (field: keyof EditableMechanicProfile, value: any) => {
    setFormData(prev => prev ? ({ ...prev, [field]: value }) : null);
  };

  const handleLocationChange = (field: keyof EditableMechanicProfile['location'], value: string) => {
    setFormData(prev => {
      if (!prev || !prev.location) return null;
      return { ...prev, location: { ...prev.location, [field]: value } };
    });
  };

  const handleWorkingHourChange = (day: string, key: 'open' | 'close' | 'isOpen', value: any) => {
    setFormData(prev => {
      if (!prev) return null;
      return {
        ...prev,
        workingHours: {
          ...prev.workingHours,
          [day]: {
            ...prev.workingHours?.[day],
            [key]: value,
          },
        },
      };
    });
  };

  const toggleServiceCategory = (categoryId: string) => {
    if (!formData || !formData.serviceCategories) return;
    const currentCategories = formData.serviceCategories;
    const newCategories = currentCategories.includes(categoryId)
      ? currentCategories.filter(id => id !== categoryId)
      : [...currentCategories, categoryId];
    handleInputChange('serviceCategories', newCategories);
  };

  const handleImagePick = async (type: 'profile' | 'cover') => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (!result.canceled && result.assets && result.assets.length > 0) {
      const uri = result.assets[0].uri;
      if (type === 'profile') {
        setProfileImage(uri);
        handleInputChange('profileImage', uri);
      } else {
        setCoverImage(uri);
        handleInputChange('cover', uri);
      }
    }
  };

  const handleSaveChanges = async () => {
    if (!formData) return;
    setLoading(true);
    try {
      const updatedUser = await updateMechanicProfile({
        ...formData,
        profileImage,
        cover: coverImage,
        isAvailable,
      });
      updateUser(updatedUser);
      showSnackbar('Profil başarıyla güncellendi.', 'success');
      router.back();
    } catch (error) {
      console.error('Profil güncelleme hatası:', error);
      showSnackbar('Profil güncellenirken bir hata oluştu.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Appbar.Header>
        <Appbar.BackAction onPress={() => router.back()} />
        <Appbar.Content title="Profili Düzenle" />
      </Appbar.Header>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <Card style={styles.card}>
          <Card.Title title="Kişisel Bilgiler" />
          <Card.Content>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
              <TouchableOpacity onPress={() => handleImagePick('profile')} style={{ marginRight: 16 }}>
                {profileImage ? (
                  <Avatar.Image size={72} source={{ uri: profileImage }} />
                ) : (
                  <Avatar.Icon size={72} icon="account" />
                )}
                <Text style={styles.imageButton}>Profil Fotoğrafı</Text>
              </TouchableOpacity>
              <View style={{ flex: 1 }}>
                <TextInput
                  label="Ad"
                  value={formData.name || ''}
                  onChangeText={text => handleInputChange('name', text)}
                  mode="outlined"
                  style={styles.input}
                />
                <TextInput
                  label="Soyad"
                  value={formData.surname || ''}
                  onChangeText={text => handleInputChange('surname', text)}
                  mode="outlined"
                  style={styles.input}
                />
              </View>
            </View>
            <TextInput
              label="E-posta"
              value={formData.email || ''}
              mode="outlined"
              style={styles.input}
              editable={false}
            />
            <TextInput
              label="Telefon"
              value={formData.phone || ''}
              onChangeText={text => handleInputChange('phone', text)}
              mode="outlined"
              style={styles.input}
              keyboardType="phone-pad"
            />
          </Card.Content>
        </Card>

        <Card style={styles.card}>
          <Card.Title title="Dükkan Bilgileri" />
          <Card.Content>
            <TextInput
              label="Dükkan Adı"
              value={formData.shopName || ''}
              onChangeText={text => handleInputChange('shopName', text)}
              mode="outlined"
              style={styles.input}
            />
            <TextInput
              label="Açıklama (Kısa Tanıtım)"
              value={formData.bio || ''}
              onChangeText={text => handleInputChange('bio', text)}
              mode="outlined"
              multiline
              numberOfLines={3}
              style={styles.input}
            />
            <View style={styles.shopTypeRow}>
              <Text style={styles.shopTypeLabel}>Hizmet Durumu:</Text>
              <Switch
                value={isAvailable}
                onValueChange={setIsAvailable}
              />
              <Text style={{marginLeft: 8}}>{isAvailable ? 'Aktif' : 'Pasif'}</Text>
            </View>
          </Card.Content>
        </Card>

        <Card style={styles.card}>
          <Card.Title title="Adres" />
          <Card.Content>
            <TextInput
              label="Adres"
              value={address}
              onChangeText={text => {
                setAddress(text);
                setFormData(prev => prev ? ({
                  ...prev,
                  location: {
                    ...prev.location,
                    address: text,
                    city: '',
                    district: '',
                    neighborhood: '',
                    street: '',
                    building: '',
                    floor: '',
                    apartment: '',
                    latitude: undefined,
                    longitude: undefined
                  }
                }) : null);
              }}
              mode="outlined"
              style={styles.input}
              multiline
              numberOfLines={2}
            />
          </Card.Content>
        </Card>

        <Card style={styles.card}>
          <Card.Title title="Bakabildiğiniz Araç Markaları" />
          <Card.Content>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
              <View style={{ flexDirection: 'row', flexWrap: 'nowrap' }}>
                {VEHICLE_BRANDS.map((brand) => (
                  <Chip
                    key={brand}
                    selected={formData.vehicleBrands?.includes(brand)}
                    onPress={() => {
                      const current = formData.vehicleBrands || [];
                      const newBrands = current.includes(brand)
                        ? current.filter((b: string) => b !== brand)
                        : [...current, brand];
                      handleInputChange('vehicleBrands', newBrands);
                    }}
                    style={[styles.categoryChip, { marginRight: 8 }]}
                    textStyle={styles.categoryChipText}
                  >
                    {brand}
                  </Chip>
                ))}
              </View>
            </ScrollView>
          </Card.Content>
        </Card>

        <Card style={styles.card}>
          <Card.Title title="Hizmet Kategorileri" />
          <Card.Content>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
              <View style={{ flexDirection: 'row', flexWrap: 'nowrap' }}>
                {SERVICE_CATEGORIES.map(category => (
                  <Chip
                    key={category.id}
                    selected={formData.serviceCategories?.includes(category.id)}
                    onPress={() => toggleServiceCategory(category.id)}
                    style={[styles.categoryChip, { marginRight: 8, backgroundColor: category.color + '22' }]}
                    textStyle={styles.categoryChipText}
                    icon={category.icon}
                  >
                    {category.name}
                  </Chip>
                ))}
              </View>
            </ScrollView>
          </Card.Content>
        </Card>

        <Card style={styles.card}>
          <Card.Title title="Çalışma Saatleri" />
          <Card.Content>
            {DAYS.map(day => (
              <View key={day.key} style={styles.workingHourRow}>
                <Text style={styles.workingHourLabel}>{day.label}</Text>
                <Switch
                  value={formData.workingHours?.[day.key]?.isOpen ?? false}
                  onValueChange={val => handleWorkingHourChange(day.key, 'isOpen', val)}
                />
                <TextInput
                  label="Açılış"
                  value={formData.workingHours?.[day.key]?.open || ''}
                  onChangeText={text => handleWorkingHourChange(day.key, 'open', text)}
                  mode="outlined"
                  style={styles.workingHourInput}
                  editable={formData.workingHours?.[day.key]?.isOpen ?? false}
                />
                <TextInput
                  label="Kapanış"
                  value={formData.workingHours?.[day.key]?.close || ''}
                  onChangeText={text => handleWorkingHourChange(day.key, 'close', text)}
                  mode="outlined"
                  style={styles.workingHourInput}
                  editable={formData.workingHours?.[day.key]?.isOpen ?? false}
                />
              </View>
            ))}
          </Card.Content>
        </Card>
      </ScrollView>
      <View style={styles.bottomButtonContainer}>
        <Button
          mode="contained"
          onPress={handleSaveChanges}
          loading={loading}
          disabled={loading || !address}
          style={styles.saveButton}
          contentStyle={{ paddingVertical: 12 }}
          labelStyle={{ fontSize: 16, fontWeight: 'bold' }}
        >
          Değişiklikleri Kaydet
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContainer: {
    padding: SIZES.padding,
    paddingBottom: 100,
  },
  card: {
    marginBottom: SIZES.padding,
    borderRadius: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    backgroundColor: COLORS.surface,
  },
  input: {
    marginBottom: SIZES.small,
    backgroundColor: COLORS.surface,
  },
  imageButton: {
    fontSize: 12,
    color: COLORS.primary,
    marginTop: 4,
    textAlign: 'center',
  },
  shopTypeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 8,
  },
  shopTypeLabel: {
    fontSize: 15,
    marginRight: 8,
  },
  categoryChip: {
    marginBottom: 8,
    borderRadius: 16,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  categoryChipText: {
    fontSize: 13,
  },
  workingHourRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  workingHourLabel: {
    width: 90,
    fontSize: 13,
  },
  workingHourInput: {
    width: 70,
    marginHorizontal: 4,
  },
  saveButton: {
    marginTop: 0,
    borderRadius: 24,
    backgroundColor: COLORS.primary,
  },
  bottomButtonContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: COLORS.background,
    padding: SIZES.padding,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    alignItems: 'center',
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  label: {
    fontSize: 15,
  },
}); 