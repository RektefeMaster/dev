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
  Switch,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/shared/context';
import { useAuth } from '@/shared/context';
import { Card, Button } from '@/shared/components';
import { spacing, borderRadius, typography } from '@/shared/theme';
import apiService from '@/shared/services';

interface Lane {
  name: string;
  displayName: string;
  laneNumber: number;
  parallelJobs: number;
}

export default function WashProviderSetupScreen() {
  const navigation = useNavigation();
  const { themeColors: colors } = useTheme();
  const { user } = useAuth();
  const styles = createStyles(colors);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // İşletme tipi
  const [businessType, setBusinessType] = useState<'shop' | 'mobile' | 'both'>('both');

  // Shop ayarları
  const [shopEnabled, setShopEnabled] = useState(true);
  const [hasLanes, setHasLanes] = useState(false);
  const [laneCount, setLaneCount] = useState('2');
  const [totalCapacity, setTotalCapacity] = useState('8');
  const [lanes, setLanes] = useState<Lane[]>([]);

  // Mobil ayarları
  const [mobileEnabled, setMobileEnabled] = useState(false);
  const [maxDistance, setMaxDistance] = useState('20');
  const [hasWaterTank, setHasWaterTank] = useState(false);
  const [waterCapacity, setWaterCapacity] = useState('');
  const [hasGenerator, setHasGenerator] = useState(false);
  const [generatorPower, setGeneratorPower] = useState('');
  const [hasVacuum, setHasVacuum] = useState(false);
  const [baseDistanceFee, setBaseDistanceFee] = useState('5');
  const [perKmFee, setPerKmFee] = useState('10');

  // Konum bilgileri
  const [businessName, setBusinessName] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [district, setDistrict] = useState('');

  useEffect(() => {
    loadProviderData();
  }, []);

  useEffect(() => {
    // İşletme tipine göre enabled durumlarını güncelle
    if (businessType === 'shop') {
      setShopEnabled(true);
      setMobileEnabled(false);
    } else if (businessType === 'mobile') {
      setShopEnabled(false);
      setMobileEnabled(true);
    } else {
      setShopEnabled(true);
      setMobileEnabled(true);
    }
  }, [businessType]);

  useEffect(() => {
    // Hat sayısı değiştiğinde hatları güncelle
    if (hasLanes) {
      const count = parseInt(laneCount) || 0;
      const newLanes: Lane[] = [];
      for (let i = 1; i <= count; i++) {
        const existing = lanes.find(l => l.laneNumber === i);
        newLanes.push(existing || {
          name: `lane_${i}`,
          displayName: `Hat ${i}`,
          laneNumber: i,
          parallelJobs: 1,
        });
      }
      setLanes(newLanes);
    } else {
      setLanes([]);
    }
  }, [laneCount, hasLanes]);

  const loadProviderData = async () => {
    try {
      setLoading(true);
      const response = await apiService.CarWashService.getMyWashProvider();
      
      if (response.success && response.data) {
        const provider = response.data;
        setBusinessName(provider.businessName || '');
        setBusinessType(provider.type || 'both');
        setAddress(provider.location?.address || '');
        setCity(provider.location?.city || '');
        setDistrict(provider.location?.district || '');
        
        if (provider.shop) {
          setShopEnabled(true);
          setHasLanes(provider.shop.hasLanes || false);
          setLaneCount((provider.shop.laneCount || 2).toString());
          setTotalCapacity((provider.shop.totalCapacity || 8).toString());
        }
        
        if (provider.mobile) {
          setMobileEnabled(true);
          setMaxDistance((provider.mobile.maxDistance || 20).toString());
          setHasWaterTank(provider.mobile.equipment?.hasWaterTank || false);
          setWaterCapacity((provider.mobile.equipment?.waterCapacity || '').toString());
          setHasGenerator(provider.mobile.equipment?.hasGenerator || false);
          setGeneratorPower((provider.mobile.equipment?.generatorPower || '').toString());
          setHasVacuum(provider.mobile.equipment?.hasVacuum || false);
          setBaseDistanceFee((provider.mobile.pricing?.baseDistanceFee || 5).toString());
          setPerKmFee((provider.mobile.pricing?.perKmFee || 10).toString());
        }
      }
    } catch (error) {
      console.error('Provider bilgileri yüklenemedi:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    // Validasyon
    if (!businessName.trim()) {
      Alert.alert('Eksik Bilgi', 'İşletme adı giriniz');
      return;
    }

    if (!address.trim() || !city.trim()) {
      Alert.alert('Eksik Bilgi', 'Adres bilgilerini giriniz');
      return;
    }

    if (shopEnabled && parseInt(totalCapacity) <= 0) {
      Alert.alert('Eksik Bilgi', 'Geçerli bir kapasite giriniz');
      return;
    }

    if (mobileEnabled && parseInt(maxDistance) <= 0) {
      Alert.alert('Eksik Bilgi', 'Geçerli bir maksimum mesafe giriniz');
      return;
    }

    try {
      setSaving(true);

      const providerData = {
        businessName,
        type: businessType,
        location: {
          address,
          city,
          district,
          coordinates: {
            latitude: 0, // TODO: Gerçek koordinatlar
            longitude: 0,
          },
        },
        shop: shopEnabled ? {
          hasLanes,
          laneCount: parseInt(laneCount),
          totalCapacity: parseInt(totalCapacity),
          workingHours: [], // TODO: Çalışma saatleri ekranından gelecek
        } : undefined,
        mobile: mobileEnabled ? {
          maxDistance: parseInt(maxDistance),
          equipment: {
            hasWaterTank,
            waterCapacity: waterCapacity ? parseInt(waterCapacity) : undefined,
            hasGenerator,
            generatorPower: generatorPower ? parseInt(generatorPower) : undefined,
            hasVacuum,
            hasCompressor: false,
          },
          pricing: {
            baseDistanceFee: parseInt(baseDistanceFee),
            perKmFee: parseInt(perKmFee),
          },
        } : undefined,
      };

      const response = await apiService.CarWashService.setupWashProvider(providerData);

      if (response.success) {
        Alert.alert('Başarılı', 'İşletme ayarları kaydedildi', [
          { text: 'Tamam', onPress: () => navigation.goBack() }
        ]);
      } else {
        Alert.alert('Hata', response.message || 'Kayıt başarısız');
      }

    } catch (error) {
      Alert.alert('Hata', 'Ayarlar kaydedilemedi');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
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
          Yıkama İşletmesi Ayarları
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* İşletme Bilgileri */}
        <Card style={styles.card}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            İşletme Bilgileri
          </Text>

          <View style={styles.formGroup}>
            <Text style={[styles.label, { color: colors.text }]}>İşletme Adı *</Text>
            <TextInput
              style={[styles.input, { 
                backgroundColor: colors.inputBackground,
                color: colors.text,
                borderColor: colors.border,
              }]}
              value={businessName}
              onChangeText={setBusinessName}
              placeholder="Örn: Parlak Oto Yıkama"
              placeholderTextColor={colors.textSecondary}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={[styles.label, { color: colors.text }]}>Adres *</Text>
            <TextInput
              style={[styles.textArea, { 
                backgroundColor: colors.inputBackground,
                color: colors.text,
                borderColor: colors.border,
              }]}
              value={address}
              onChangeText={setAddress}
              placeholder="Tam adres"
              placeholderTextColor={colors.textSecondary}
              multiline
              numberOfLines={2}
            />
          </View>

          <View style={styles.formRow}>
            <View style={[styles.formGroup, { flex: 1, marginRight: 8 }]}>
              <Text style={[styles.label, { color: colors.text }]}>Şehir *</Text>
              <TextInput
                style={[styles.input, { 
                  backgroundColor: colors.inputBackground,
                  color: colors.text,
                  borderColor: colors.border,
                }]}
                value={city}
                onChangeText={setCity}
                placeholder="İstanbul"
                placeholderTextColor={colors.textSecondary}
              />
            </View>

            <View style={[styles.formGroup, { flex: 1, marginLeft: 8 }]}>
              <Text style={[styles.label, { color: colors.text }]}>İlçe *</Text>
              <TextInput
                style={[styles.input, { 
                  backgroundColor: colors.inputBackground,
                  color: colors.text,
                  borderColor: colors.border,
                }]}
                value={district}
                onChangeText={setDistrict}
                placeholder="Kadıköy"
                placeholderTextColor={colors.textSecondary}
              />
            </View>
          </View>
        </Card>

        {/* İşletme Tipi */}
        <Card style={styles.card}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Hizmet Tipi
          </Text>

          <View style={styles.typeButtons}>
            {[
              { value: 'shop', label: 'Sadece İstasyon', icon: 'business' },
              { value: 'mobile', label: 'Sadece Mobil', icon: 'car' },
              { value: 'both', label: 'Her İkisi', icon: 'checkmark-done' },
            ].map((type) => (
              <TouchableOpacity
                key={type.value}
                style={[
                  styles.typeButton,
                  {
                    backgroundColor: businessType === type.value ? colors.primary : colors.inputBackground,
                    borderColor: businessType === type.value ? colors.primary : colors.border,
                  }
                ]}
                onPress={() => setBusinessType(type.value as any)}
              >
                <Ionicons
                  name={type.icon as any}
                  size={24}
                  color={businessType === type.value ? '#FFFFFF' : colors.textSecondary}
                />
                <Text style={[styles.typeButtonText, {
                  color: businessType === type.value ? '#FFFFFF' : colors.textSecondary
                }]}>
                  {type.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </Card>

        {/* Shop Ayarları */}
        {shopEnabled && (
          <Card style={styles.card}>
            <View style={styles.cardHeader}>
              <Ionicons name="business" size={20} color={colors.primary} />
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                İstasyon Ayarları
              </Text>
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: colors.text }]}>Saat Başına Kapasite *</Text>
              <TextInput
                style={[styles.input, { 
                  backgroundColor: colors.inputBackground,
                  color: colors.text,
                  borderColor: colors.border,
                }]}
                value={totalCapacity}
                onChangeText={setTotalCapacity}
                placeholder="8"
                placeholderTextColor={colors.textSecondary}
                keyboardType="numeric"
              />
              <Text style={[styles.helpText, { color: colors.textSecondary }]}>
                Bir saatte kaç araç yıkayabilirsiniz?
              </Text>
            </View>

            <View style={styles.switchRow}>
              <Text style={[styles.switchLabel, { color: colors.text }]}>
                Hat Sistemi Kullan
              </Text>
              <Switch
                value={hasLanes}
                onValueChange={setHasLanes}
                trackColor={{ false: colors.border, true: colors.primary }}
              />
            </View>

            {hasLanes && (
              <>
                <View style={styles.formGroup}>
                  <Text style={[styles.label, { color: colors.text }]}>Hat Sayısı</Text>
                  <TextInput
                    style={[styles.input, { 
                      backgroundColor: colors.inputBackground,
                      color: colors.text,
                      borderColor: colors.border,
                    }]}
                    value={laneCount}
                    onChangeText={setLaneCount}
                    placeholder="2"
                    placeholderTextColor={colors.textSecondary}
                    keyboardType="numeric"
                  />
                </View>

                {lanes.length > 0 && (
                  <View style={styles.lanesContainer}>
                    <Text style={[styles.lanesTitle, { color: colors.text }]}>
                      Hatlar
                    </Text>
                    {lanes.map((lane, index) => (
                      <View key={index} style={[styles.laneItem, { backgroundColor: colors.inputBackground }]}>
                        <View style={styles.laneInfo}>
                          <Ionicons name="git-branch" size={20} color={colors.primary} />
                          <Text style={[styles.laneName, { color: colors.text }]}>
                            {lane.displayName}
                          </Text>
                        </View>
                        <TextInput
                          style={[styles.smallInput, { 
                            backgroundColor: colors.background,
                            color: colors.text,
                            borderColor: colors.border,
                          }]}
                          value={lane.parallelJobs.toString()}
                          onChangeText={(text) => {
                            const newLanes = [...lanes];
                            newLanes[index].parallelJobs = parseInt(text) || 1;
                            setLanes(newLanes);
                          }}
                          placeholder="1"
                          keyboardType="numeric"
                        />
                      </View>
                    ))}
                  </View>
                )}
              </>
            )}
          </Card>
        )}

        {/* Mobil Ayarları */}
        {mobileEnabled && (
          <Card style={styles.card}>
            <View style={styles.cardHeader}>
              <Ionicons name="car" size={20} color={colors.primary} />
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                Mobil Hizmet Ayarları
              </Text>
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: colors.text }]}>Maksimum Mesafe (km) *</Text>
              <TextInput
                style={[styles.input, { 
                  backgroundColor: colors.inputBackground,
                  color: colors.text,
                  borderColor: colors.border,
                }]}
                value={maxDistance}
                onChangeText={setMaxDistance}
                placeholder="20"
                placeholderTextColor={colors.textSecondary}
                keyboardType="numeric"
              />
            </View>

            <Text style={[styles.subsectionTitle, { color: colors.text }]}>
              Ekipman
            </Text>

            <View style={styles.switchRow}>
              <Text style={[styles.switchLabel, { color: colors.text }]}>
                Su Tankı
              </Text>
              <Switch
                value={hasWaterTank}
                onValueChange={setHasWaterTank}
                trackColor={{ false: colors.border, true: colors.primary }}
              />
            </View>

            {hasWaterTank && (
              <View style={styles.formGroup}>
                <Text style={[styles.label, { color: colors.text }]}>Kapasite (Litre)</Text>
                <TextInput
                  style={[styles.input, { 
                    backgroundColor: colors.inputBackground,
                    color: colors.text,
                    borderColor: colors.border,
                  }]}
                  value={waterCapacity}
                  onChangeText={setWaterCapacity}
                  placeholder="200"
                  placeholderTextColor={colors.textSecondary}
                  keyboardType="numeric"
                />
              </View>
            )}

            <View style={styles.switchRow}>
              <Text style={[styles.switchLabel, { color: colors.text }]}>
                Jeneratör
              </Text>
              <Switch
                value={hasGenerator}
                onValueChange={setHasGenerator}
                trackColor={{ false: colors.border, true: colors.primary }}
              />
            </View>

            {hasGenerator && (
              <View style={styles.formGroup}>
                <Text style={[styles.label, { color: colors.text }]}>Güç (Watt)</Text>
                <TextInput
                  style={[styles.input, { 
                    backgroundColor: colors.inputBackground,
                    color: colors.text,
                    borderColor: colors.border,
                  }]}
                  value={generatorPower}
                  onChangeText={setGeneratorPower}
                  placeholder="3000"
                  placeholderTextColor={colors.textSecondary}
                  keyboardType="numeric"
                />
              </View>
            )}

            <View style={styles.switchRow}>
              <Text style={[styles.switchLabel, { color: colors.text }]}>
                Vakum
              </Text>
              <Switch
                value={hasVacuum}
                onValueChange={setHasVacuum}
                trackColor={{ false: colors.border, true: colors.primary }}
              />
            </View>

            <Text style={[styles.subsectionTitle, { color: colors.text, marginTop: 16 }]}>
              Fiyatlandırma
            </Text>

            <View style={styles.formRow}>
              <View style={[styles.formGroup, { flex: 1, marginRight: 8 }]}>
                <Text style={[styles.label, { color: colors.text }]}>İlk X km Ücretsiz</Text>
                <TextInput
                  style={[styles.input, { 
                    backgroundColor: colors.inputBackground,
                    color: colors.text,
                    borderColor: colors.border,
                  }]}
                  value={baseDistanceFee}
                  onChangeText={setBaseDistanceFee}
                  placeholder="5"
                  placeholderTextColor={colors.textSecondary}
                  keyboardType="numeric"
                />
              </View>

              <View style={[styles.formGroup, { flex: 1, marginLeft: 8 }]}>
                <Text style={[styles.label, { color: colors.text }]}>Km Başı Ücret (TL)</Text>
                <TextInput
                  style={[styles.input, { 
                    backgroundColor: colors.inputBackground,
                    color: colors.text,
                    borderColor: colors.border,
                  }]}
                  value={perKmFee}
                  onChangeText={setPerKmFee}
                  placeholder="10"
                  placeholderTextColor={colors.textSecondary}
                  keyboardType="numeric"
                />
              </View>
            </View>
          </Card>
        )}

        {/* Kaydet Butonu */}
        <View style={styles.saveButtonContainer}>
          <Button
            title={saving ? "Kaydediliyor..." : "Kaydet"}
            onPress={handleSave}
            disabled={saving}
            style={styles.saveButton}
          />
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>
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
  },
  loadingText: {
    marginTop: spacing.md,
    ...typography.body,
  },
  card: {
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    ...typography.h3,
    marginBottom: spacing.md,
  },
  subsectionTitle: {
    ...typography.bodyBold,
    marginBottom: spacing.sm,
  },
  formGroup: {
    marginBottom: spacing.md,
  },
  formRow: {
    flexDirection: 'row',
  },
  label: {
    ...typography.bodyBold,
    marginBottom: spacing.xs,
  },
  input: {
    borderWidth: 1,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    ...typography.body,
  },
  smallInput: {
    width: 60,
    borderWidth: 1,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    ...typography.body,
    textAlign: 'center',
  },
  textArea: {
    borderWidth: 1,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    ...typography.body,
    minHeight: 60,
    textAlignVertical: 'top',
  },
  helpText: {
    ...typography.caption,
    marginTop: spacing.xs,
  },
  typeButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  typeButton: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 2,
    gap: spacing.xs,
  },
  typeButtonText: {
    ...typography.caption,
    fontWeight: '600',
    textAlign: 'center',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    marginBottom: spacing.sm,
  },
  switchLabel: {
    ...typography.body,
  },
  lanesContainer: {
    marginTop: spacing.md,
  },
  lanesTitle: {
    ...typography.bodyBold,
    marginBottom: spacing.sm,
  },
  laneItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
  },
  laneInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  laneName: {
    ...typography.bodyBold,
  },
  saveButtonContainer: {
    paddingHorizontal: spacing.md,
    marginTop: spacing.lg,
  },
  saveButton: {
    marginHorizontal: 0,
  },
});

