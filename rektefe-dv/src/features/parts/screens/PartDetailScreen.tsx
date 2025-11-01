import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  Alert,
  Image,
  Dimensions,
  Modal,
  TextInput,
  Linking,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/context/ThemeContext';
import { useNavigation, useRoute } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '@/navigation/AppNavigator';
import Background from '@/shared/components/Background';
import { BackButton } from '@/shared/components';
import Button from '@/shared/components/Button';
import Card from '@/shared/components/Card';
import { apiService } from '@/shared/services/api';
import { useAuth } from '@/context/AuthContext';

type PartDetailScreenNavigationProp = StackNavigationProp<RootStackParamList, 'PartDetail'>;
type PartDetailScreenRouteProp = RouteProp<RootStackParamList, 'PartDetail'>;

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface Part {
  _id: string;
  partName: string;
  brand: string;
  partNumber?: string;
  description?: string;
  photos: string[];
  category: string;
  compatibility: {
    makeModel: string[];
    years: { start: number; end: number };
    engine?: string[];
    vinPrefix?: string[];
    notes?: string;
  };
  stock: {
    quantity: number;
    available: number;
  };
  pricing: {
    unitPrice: number;
    currency: string;
    isNegotiable: boolean;
  };
  condition: string;
  warranty?: {
    months: number;
    description: string;
  };
  mechanicId: {
    _id: string;
    name: string;
    surname: string;
    shopName?: string;
    rating?: number;
    ratingCount?: number;
    phone?: string;
  };
}

const PartDetailScreen = () => {
  const { theme } = useTheme();
  const navigation = useNavigation<PartDetailScreenNavigationProp>();
  const route = useRoute<PartDetailScreenRouteProp>();
  const { user } = useAuth();
  const styles = createStyles(theme);

  const { partId } = route.params;

  const [loading, setLoading] = useState(true);
  const [part, setPart] = useState<Part | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [showReserveModal, setShowReserveModal] = useState(false);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [selectedVehicle, setSelectedVehicle] = useState<any>(null);
  const [deliveryMethod, setDeliveryMethod] = useState<'pickup' | 'standard' | 'express'>('pickup');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'transfer'>('cash');
  const [reserving, setReserving] = useState(false);
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [loadingVehicles, setLoadingVehicles] = useState(false);

  useEffect(() => {
    fetchPartDetail();
    fetchVehicles();
  }, [partId]);

  const fetchVehicles = async () => {
    try {
      setLoadingVehicles(true);
      const response = await apiService.getVehicles();
      if (response.success && response.data) {
        const vehicleList = Array.isArray(response.data) ? response.data : (response.data.vehicles || []);
        setVehicles(vehicleList);
        // Otomatik olarak favori aracı seç
        const favorite = vehicleList.find((v: any) => v.isFavorite);
        if (favorite) {
          setSelectedVehicle(favorite);
        } else if (vehicleList.length > 0) {
          setSelectedVehicle(vehicleList[0]);
        }
      }
    } catch (error) {
      console.error('Araçlar yüklenemedi:', error);
    } finally {
      setLoadingVehicles(false);
    }
  };

  const fetchPartDetail = async () => {
    try {
      setLoading(true);
      const response = await apiService.getPartDetail(partId);
      
      if (response.success && response.data) {
        setPart(response.data);
      } else {
        Alert.alert('Hata', 'Parça detayı yüklenemedi');
        navigation.goBack();
      }
    } catch (error) {
      console.error('Parça detayı yüklenemedi:', error);
      Alert.alert('Hata', 'Parça detayı yüklenemedi');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const handleReserve = () => {
    if (!part || part.stock.available <= 0) {
      Alert.alert('Hata', 'Bu parça stokta yok');
      return;
    }

    setShowReserveModal(true);
  };

  const handleConfirmReservation = async () => {
    if (!part) return;

    // Validasyon
    if (deliveryMethod !== 'pickup' && !deliveryAddress.trim()) {
      Alert.alert('Uyarı', 'Teslimat adresi giriniz');
      return;
    }

    try {
      setReserving(true);
      const response = await apiService.createPartsReservation({
        partId: part._id,
        vehicleId: selectedVehicle?._id,
        quantity,
        delivery: {
          method: deliveryMethod,
          address: deliveryMethod !== 'pickup' ? deliveryAddress.trim() : undefined,
        },
        payment: {
          method: paymentMethod,
        },
      });

      if (response.success) {
        Alert.alert(
          'Başarılı',
          'Rezervasyonunuz oluşturuldu. Usta onayı bekleniyor.',
          [
            {
              text: 'Tamam',
              onPress: () => {
                setShowReserveModal(false);
                setDeliveryAddress('');
                navigation.navigate('PartsReservations' as never);
              },
            },
          ]
        );
      } else {
        Alert.alert('Hata', response.message || 'Rezervasyon oluşturulamadı');
      }
    } catch (error) {
      console.error('Rezervasyon hatası:', error);
      Alert.alert('Hata', 'Rezervasyon oluşturulamadı');
    } finally {
      setReserving(false);
    }
  };

  const handleCallMechanic = () => {
    if (!part?.mechanicId?.phone) return;
    
    const phoneNumber = part.mechanicId.phone.replace(/[^0-9+]/g, '');
    const url = Platform.OS === 'ios' ? `telprompt:${phoneNumber}` : `tel:${phoneNumber}`;
    
    Linking.canOpenURL(url)
      .then((supported) => {
        if (supported) {
          return Linking.openURL(url);
        } else {
          Alert.alert('Hata', 'Telefon araması desteklenmiyor');
        }
      })
      .catch((err) => {
        console.error('Arama hatası:', err);
        Alert.alert('Hata', 'Telefon araması açılamadı');
      });
  };


  const getCategoryLabel = (category: string) => {
    const categories: { [key: string]: string } = {
      engine: 'Motor',
      electrical: 'Elektrik',
      suspension: 'Süspansiyon',
      brake: 'Fren',
      body: 'Kaporta',
      interior: 'İç Donanım',
      exterior: 'Dış Donanım',
      fuel: 'Yakıt',
      cooling: 'Soğutma',
      transmission: 'Şanzıman',
      exhaust: 'Egzoz',
      other: 'Diğer',
    };
    return categories[category] || category;
  };

  const getConditionLabel = (condition: string) => {
    const conditions: { [key: string]: string } = {
      new: 'Sıfır',
      used: 'İkinci El',
      refurbished: 'Yenilenmiş',
      oem: 'Orijinal',
      aftermarket: 'Yan Sanayi',
    };
    return conditions[condition] || condition;
  };

  if (loading) {
    return (
      <Background>
        <SafeAreaView style={styles.container}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.colors.primary.main} />
          </View>
        </SafeAreaView>
      </Background>
    );
  }

  if (!part) {
    return (
      <Background>
        <SafeAreaView style={styles.container}>
          <View style={styles.header}>
            <BackButton onPress={() => navigation.goBack()} />
            <Text style={[styles.headerTitle, { color: theme.colors.text.primary }]}>
              Parça Detayı
            </Text>
            <View style={{ width: 40 }} />
          </View>
          <View style={styles.emptyContainer}>
            <Ionicons name="alert-circle" size={64} color={theme.colors.error.main} />
            <Text style={[styles.emptyText, { color: theme.colors.text.secondary }]}>
              Parça bulunamadı
            </Text>
          </View>
        </SafeAreaView>
      </Background>
    );
  }

  return (
    <Background>
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={[styles.header, { backgroundColor: theme.colors.background.primary }]}>
          <BackButton onPress={() => navigation.goBack()} />
          <Text style={[styles.headerTitle, { color: theme.colors.text.primary }]}>
            {part.partName}
          </Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {/* Photos */}
          {part.photos && part.photos.length > 0 ? (
            <View style={styles.photoScrollContainer}>
              <ScrollView
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                style={styles.photoScroll}
                onMomentumScrollEnd={(e) => {
                  const index = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
                  setCurrentPhotoIndex(index);
                }}
              >
                {part.photos.map((photo, index) => (
                  <View key={index} style={styles.photoContainer}>
                    <Image
                      source={{ uri: photo }}
                      style={styles.photoImage}
                      resizeMode="cover"
                      onError={() => {
                        console.error('Fotoğraf yüklenemedi:', photo);
                      }}
                    />
                  </View>
                ))}
              </ScrollView>
              {part.photos.length > 1 && (
                <View style={styles.photoIndicator}>
                  <Text style={[styles.photoIndicatorText, { color: '#FFFFFF' }]}>
                    {currentPhotoIndex + 1} / {part.photos.length}
                  </Text>
                </View>
              )}
            </View>
          ) : (
            <View style={styles.photoContainer}>
              <View style={styles.photoPlaceholder}>
                <Ionicons name="cube" size={80} color={theme.colors.text.secondary} />
                <Text style={[styles.photoPlaceholderText, { color: theme.colors.text.secondary }]}>
                  Fotoğraf Yok
                </Text>
              </View>
            </View>
          )}

          {/* Info Card */}
          <Card variant="elevated" style={styles.infoCard}>
            <View style={styles.titleRow}>
              <View style={styles.titleLeft}>
                <Text style={[styles.partName, { color: theme.colors.text.primary }]}>
                  {part.partName}
                </Text>
                <Text style={[styles.partBrand, { color: theme.colors.text.secondary }]}>
                  {part.brand}
                </Text>
              </View>
              <View style={[styles.stockBadge, {
                backgroundColor: part.stock.available > 0 
                  ? theme.colors.success.light 
                  : theme.colors.error.light
              }]}>
                <Ionicons 
                  name={part.stock.available > 0 ? "checkmark-circle" : "close-circle"} 
                  size={24} 
                  color={part.stock.available > 0 ? theme.colors.success.main : theme.colors.error.main} 
                />
                <Text style={[
                  styles.stockText,
                  { color: part.stock.available > 0 ? theme.colors.success.main : theme.colors.error.main }
                ]}>
                  {part.stock.available > 0 ? `${part.stock.available} Adet` : 'Stokta Yok'}
                </Text>
              </View>
            </View>

            {/* Badges */}
            <View style={styles.badgeContainer}>
              <View style={[styles.badge, { backgroundColor: theme.colors.primary.light }]}>
                <Text style={[styles.badgeText, { color: theme.colors.primary.main }]}>
                  {getCategoryLabel(part.category)}
                </Text>
              </View>
              <View style={[styles.badge, { backgroundColor: theme.colors.success.light }]}>
                <Text style={[styles.badgeText, { color: theme.colors.success.main }]}>
                  {getConditionLabel(part.condition)}
                </Text>
              </View>
              {part.partNumber && (
                <View style={[styles.badge, { backgroundColor: theme.colors.background.secondary }]}>
                  <Text style={[styles.badgeText, { color: theme.colors.text.secondary }]}>
                    No: {part.partNumber}
                  </Text>
                </View>
              )}
            </View>

            {/* Price */}
            <View style={styles.priceContainer}>
              <View style={styles.priceLeft}>
                <Text style={[styles.price, { color: theme.colors.text.primary }]}>
                  {part.pricing.unitPrice.toLocaleString('tr-TR')} {part.pricing.currency}
                </Text>
                {part.pricing.oldPrice && (
                  <Text style={[styles.oldPrice, { color: theme.colors.text.secondary }]}>
                    {part.pricing.oldPrice.toLocaleString('tr-TR')} {part.pricing.currency}
                  </Text>
                )}
              </View>
              {part.pricing.isNegotiable && (
                <View style={[styles.negotiableBadge, { backgroundColor: theme.colors.warning.light }]}>
                  <Ionicons name="chatbubbles" size={16} color={theme.colors.warning.main} />
                  <Text style={[styles.negotiableText, { color: theme.colors.warning.main }]}>
                    Pazarlık Yapılabilir
                  </Text>
                </View>
              )}
            </View>

            {/* Description */}
            {part.description && (
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: theme.colors.text.primary }]}>
                  Açıklama
                </Text>
                <Text style={[styles.sectionContent, { color: theme.colors.text.secondary }]}>
                  {part.description}
                </Text>
              </View>
            )}

            {/* Compatibility */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: theme.colors.text.primary }]}>
                Uyumluluk
              </Text>
              <View style={styles.compatibilityRow}>
                <Ionicons name="car" size={16} color={theme.colors.text.secondary} />
                <Text style={[styles.compatibilityText, { color: theme.colors.text.secondary }]}>
                  {part.compatibility.makeModel.join(', ')}
                </Text>
              </View>
              <View style={styles.compatibilityRow}>
                <Ionicons name="calendar" size={16} color={theme.colors.text.secondary} />
                <Text style={[styles.compatibilityText, { color: theme.colors.text.secondary }]}>
                  {part.compatibility.years.start} - {part.compatibility.years.end}
                </Text>
              </View>
              {part.compatibility.engine && part.compatibility.engine.length > 0 && (
                <View style={styles.compatibilityRow}>
                  <Ionicons name="settings" size={16} color={theme.colors.text.secondary} />
                  <Text style={[styles.compatibilityText, { color: theme.colors.text.secondary }]}>
                    Motor: {part.compatibility.engine.join(', ')}
                  </Text>
                </View>
              )}
              {part.compatibility.notes && (
                <Text style={[styles.compatibilityNotes, { color: theme.colors.text.secondary }]}>
                  {part.compatibility.notes}
                </Text>
              )}
            </View>

            {/* Warranty */}
            {part.warranty && (
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: theme.colors.text.primary }]}>
                  Garanti
                </Text>
                <Text style={[styles.warrantyText, { color: theme.colors.text.secondary }]}>
                  {part.warranty.months} Ay
                </Text>
                {part.warranty.description && (
                  <Text style={[styles.sectionContent, { color: theme.colors.text.secondary }]}>
                    {part.warranty.description}
                  </Text>
                )}
              </View>
            )}

            {/* Seller */}
            <View style={styles.sellerSection}>
              <View style={styles.sellerInfo}>
                <View style={[styles.sellerAvatar, { backgroundColor: theme.colors.primary.main }]}>
                  <Ionicons name="storefront" size={32} color="#fff" />
                </View>
                <View style={styles.sellerDetails}>
                  <Text style={[styles.sellerName, { color: theme.colors.text.primary }]}>
                    {part.mechanicId.shopName || `${part.mechanicId.name} ${part.mechanicId.surname}`}
                  </Text>
                  {part.mechanicId.rating && (
                    <View style={styles.ratingRow}>
                      <Ionicons name="star" size={16} color="#FBBF24" />
                      <Text style={[styles.ratingText, { color: theme.colors.text.secondary }]}>
                        {part.mechanicId.rating.toFixed(1)} ({part.mechanicId.ratingCount || 0})
                      </Text>
                    </View>
                  )}
                </View>
              </View>
              {part.mechanicId.phone && (
                <TouchableOpacity
                  style={[styles.phoneButton, { borderColor: theme.colors.primary.main }]}
                  onPress={handleCallMechanic}
                >
                  <Ionicons name="call" size={20} color={theme.colors.primary.main} />
                </TouchableOpacity>
              )}
            </View>
          </Card>

          {/* Quantity Selector */}
          {part.stock.available > 0 && (
            <Card variant="elevated" style={styles.quantityCard}>
              <Text style={[styles.sectionTitle, { color: theme.colors.text.primary }]}>
                Miktar
              </Text>
              <View style={styles.quantitySelector}>
                <TouchableOpacity
                  style={[styles.quantityButton, { borderColor: theme.colors.border.primary }]}
                  onPress={() => setQuantity(Math.max(1, quantity - 1))}
                  disabled={quantity <= 1}
                >
                  <Ionicons name="remove" size={20} color={theme.colors.text.primary} />
                </TouchableOpacity>
                <Text style={[styles.quantityValue, { color: theme.colors.text.primary }]}>
                  {quantity}
                </Text>
                <TouchableOpacity
                  style={[styles.quantityButton, { borderColor: theme.colors.border.primary }]}
                  onPress={() => setQuantity(Math.min(part.stock.available, quantity + 1))}
                  disabled={quantity >= part.stock.available}
                >
                  <Ionicons name="add" size={20} color={theme.colors.text.primary} />
                </TouchableOpacity>
              </View>
              <Text style={[styles.totalPrice, { color: theme.colors.text.primary }]}>
                Toplam: {(part.pricing.unitPrice * quantity).toFixed(2)} {part.pricing.currency}
              </Text>
            </Card>
          )}
        </ScrollView>

        {/* Fixed Bottom Button */}
        {part.stock.available > 0 && (
          <View style={[styles.bottomContainer, { backgroundColor: theme.colors.background.primary }]}>
            <View style={styles.priceTotal}>
              <Text style={[styles.priceTotalLabel, { color: theme.colors.text.secondary }]}>
                Toplam
              </Text>
              <Text style={[styles.priceTotalValue, { color: theme.colors.text.primary }]}>
                {(part.pricing.unitPrice * quantity).toFixed(2)} {part.pricing.currency}
              </Text>
            </View>
            <Button
              title="Rezerve Et"
              onPress={handleReserve}
              style={styles.reserveButton}
              disabled={part.stock.available <= 0}
            />
          </View>
        )}

        {/* Reservation Modal */}
        <Modal
          visible={showReserveModal}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setShowReserveModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: theme.colors.background.primary }]}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: theme.colors.text.primary }]}>
                  Rezervasyon Bilgileri
                </Text>
                <TouchableOpacity onPress={() => setShowReserveModal(false)}>
                  <Ionicons name="close" size={24} color={theme.colors.text.primary} />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalScroll}>
                {/* Quantity */}
                <View style={styles.modalSection}>
                  <Text style={[styles.modalSectionTitle, { color: theme.colors.text.primary }]}>
                    Miktar
                  </Text>
                  <View style={styles.quantitySelector}>
                    <TouchableOpacity
                      style={[styles.quantityButton, { borderColor: theme.colors.border.primary }]}
                      onPress={() => setQuantity(Math.max(1, quantity - 1))}
                      disabled={quantity <= 1}
                    >
                      <Ionicons name="remove" size={20} color={theme.colors.text.primary} />
                    </TouchableOpacity>
                    <Text style={[styles.quantityValue, { color: theme.colors.text.primary }]}>
                      {quantity}
                    </Text>
                    <TouchableOpacity
                      style={[styles.quantityButton, { borderColor: theme.colors.border.primary }]}
                      onPress={() => setQuantity(Math.min(part.stock.available, quantity + 1))}
                      disabled={quantity >= part.stock.available}
                    >
                      <Ionicons name="add" size={20} color={theme.colors.text.primary} />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Vehicle Selection */}
                <View style={styles.modalSection}>
                  <Text style={[styles.modalSectionTitle, { color: theme.colors.text.primary }]}>
                    Araç Seçimi (Opsiyonel)
                  </Text>
                  {loadingVehicles ? (
                    <ActivityIndicator size="small" color={theme.colors.primary.main} />
                  ) : vehicles.length > 0 ? (
                    <ScrollView style={styles.vehicleScroll} nestedScrollEnabled>
                      {vehicles.map((vehicle) => (
                        <TouchableOpacity
                          key={vehicle._id}
                          style={[
                            styles.vehicleOption,
                            {
                              borderColor: selectedVehicle?._id === vehicle._id ? theme.colors.primary.main : theme.colors.border.primary,
                              backgroundColor: selectedVehicle?._id === vehicle._id ? theme.colors.primary.light : 'transparent',
                            }
                          ]}
                          onPress={() => setSelectedVehicle(vehicle)}
                        >
                          <Ionicons
                            name="car"
                            size={20}
                            color={selectedVehicle?._id === vehicle._id ? theme.colors.primary.main : theme.colors.text.secondary}
                          />
                          <View style={styles.vehicleInfo}>
                            <Text style={[
                              styles.vehicleText,
                              { color: selectedVehicle?._id === vehicle._id ? theme.colors.primary.main : theme.colors.text.primary }
                            ]}>
                              {vehicle.brand} {vehicle.modelName} ({vehicle.year})
                            </Text>
                            {vehicle.plateNumber && (
                              <Text style={[styles.vehiclePlate, { color: theme.colors.text.secondary }]}>
                                {vehicle.plateNumber}
                              </Text>
                            )}
                          </View>
                          {selectedVehicle?._id === vehicle._id && (
                            <Ionicons name="checkmark-circle" size={20} color={theme.colors.primary.main} />
                          )}
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  ) : (
                    <Text style={[styles.emptyText, { color: theme.colors.text.secondary }]}>
                      Araç bulunamadı
                    </Text>
                  )}
                </View>

                {/* Delivery Method */}
                <View style={styles.modalSection}>
                  <Text style={[styles.modalSectionTitle, { color: theme.colors.text.primary }]}>
                    Teslimat Yöntemi
                  </Text>
                  {['pickup', 'standard', 'express'].map((method) => (
                    <TouchableOpacity
                      key={method}
                      style={[
                        styles.optionCard,
                        {
                          borderColor: deliveryMethod === method ? theme.colors.primary.main : theme.colors.border.primary,
                          backgroundColor: deliveryMethod === method ? theme.colors.primary.light : 'transparent',
                        }
                      ]}
                      onPress={() => setDeliveryMethod(method as any)}
                    >
                      <Ionicons
                        name={
                          method === 'pickup' ? 'storefront' :
                          method === 'standard' ? 'car-outline' : 'flash'
                        }
                        size={24}
                        color={deliveryMethod === method ? theme.colors.primary.main : theme.colors.text.secondary}
                      />
                      <View style={styles.optionCardContent}>
                        <Text style={[
                          styles.optionText,
                          { color: deliveryMethod === method ? theme.colors.primary.main : theme.colors.text.primary }
                        ]}>
                          {method === 'pickup' ? 'Mağazadan Al' :
                           method === 'standard' ? 'Standart Kargo' : 'Hızlı Kargo'}
                        </Text>
                        {method !== 'pickup' && (
                          <Text style={[styles.optionSubtext, { color: theme.colors.text.secondary }]}>
                            Kargo ücreti usta ile görüşülecek
                          </Text>
                        )}
                      </View>
                    </TouchableOpacity>
                  ))}
                  {deliveryMethod !== 'pickup' && (
                    <View style={styles.addressInputContainer}>
                      <Text style={[styles.inputLabel, { color: theme.colors.text.primary }]}>
                        Teslimat Adresi *
                      </Text>
                      <TextInput
                        style={[
                          styles.addressInput,
                          {
                            borderColor: theme.colors.border.primary,
                            color: theme.colors.text.primary,
                            backgroundColor: theme.colors.background.secondary,
                          }
                        ]}
                        placeholder="Adres bilgilerini giriniz"
                        placeholderTextColor={theme.colors.text.secondary}
                        value={deliveryAddress}
                        onChangeText={setDeliveryAddress}
                        multiline
                        numberOfLines={4}
                        textAlignVertical="top"
                      />
                    </View>
                  )}
                </View>

                {/* Payment Method */}
                <View style={styles.modalSection}>
                  <Text style={[styles.modalSectionTitle, { color: theme.colors.text.primary }]}>
                    Ödeme Yöntemi
                  </Text>
                  {['cash', 'card', 'transfer'].map((method) => (
                    <TouchableOpacity
                      key={method}
                      style={[
                        styles.optionCard,
                        {
                          borderColor: paymentMethod === method ? theme.colors.primary.main : theme.colors.border.primary,
                          backgroundColor: paymentMethod === method ? theme.colors.primary.light : 'transparent',
                        }
                      ]}
                      onPress={() => setPaymentMethod(method as any)}
                    >
                      <Ionicons
                        name={
                          method === 'cash' ? 'cash-outline' :
                          method === 'card' ? 'card-outline' : 'wallet-outline'
                        }
                        size={24}
                        color={paymentMethod === method ? theme.colors.primary.main : theme.colors.text.secondary}
                      />
                      <Text style={[
                        styles.optionText,
                        { color: paymentMethod === method ? theme.colors.primary.main : theme.colors.text.primary }
                      ]}>
                        {method === 'cash' ? 'Kapıda Nakit' :
                         method === 'card' ? 'Kapıda Kredi Kartı' : 'Havale/EFT'}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Total */}
                <View style={styles.totalSection}>
                  <Text style={[styles.totalLabel, { color: theme.colors.text.secondary }]}>
                    Toplam Tutar
                  </Text>
                  <Text style={[styles.totalAmount, { color: theme.colors.text.primary }]}>
                    {(part.pricing.unitPrice * quantity).toFixed(2)} {part.pricing.currency}
                  </Text>
                </View>
              </ScrollView>

              <View style={styles.modalActions}>
                <Button
                  title="İptal"
                  variant="outline"
                  onPress={() => setShowReserveModal(false)}
                  style={styles.modalButton}
                  disabled={reserving}
                />
                <Button
                  title={reserving ? 'Rezerve Ediliyor...' : 'Rezerve Et'}
                  onPress={handleConfirmReservation}
                  style={styles.modalButton}
                  disabled={reserving}
                  loading={reserving}
                />
              </View>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </Background>
  );
};

const createStyles = (theme: any) => StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border.primary,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
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
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 16,
    marginTop: 16,
    textAlign: 'center',
  },
  photoScrollContainer: {
    position: 'relative',
    height: 300,
  },
  photoScroll: {
    height: 300,
  },
  photoContainer: {
    width: SCREEN_WIDTH,
    height: 300,
  },
  photoImage: {
    width: '100%',
    height: '100%',
  },
  photoPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: theme.colors.background.secondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoPlaceholderText: {
    marginTop: 8,
    fontSize: 14,
  },
  photoIndicator: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  photoIndicatorText: {
    fontSize: 12,
    fontWeight: '600',
  },
  infoCard: {
    margin: 16,
    padding: 16,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  titleLeft: {
    flex: 1,
    marginRight: 12,
  },
  partName: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4,
  },
  partBrand: {
    fontSize: 16,
    marginBottom: 8,
  },
  stockBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  stockText: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  badgeContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
    marginBottom: 8,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  priceLeft: {
    flex: 1,
  },
  price: {
    fontSize: 24,
    fontWeight: '700',
  },
  oldPrice: {
    fontSize: 14,
    textDecorationLine: 'line-through',
    marginTop: 4,
  },
  negotiableBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  negotiableText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  sectionContent: {
    fontSize: 14,
    lineHeight: 20,
  },
  compatibilityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  compatibilityText: {
    fontSize: 14,
    flex: 1,
  },
  compatibilityNotes: {
    fontSize: 12,
    fontStyle: 'italic',
    marginTop: 4,
  },
  warrantyText: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  sellerSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border.primary,
  },
  sellerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  sellerAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  sellerDetails: {
    flex: 1,
  },
  sellerName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingText: {
    fontSize: 14,
    marginLeft: 4,
  },
  phoneButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityCard: {
    margin: 16,
    padding: 16,
  },
  quantitySelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 16,
  },
  quantityButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityValue: {
    fontSize: 24,
    fontWeight: '700',
    marginHorizontal: 24,
    minWidth: 40,
    textAlign: 'center',
  },
  totalPrice: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  bottomContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border.primary,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 8,
  },
  priceTotal: {
    flex: 1,
    marginRight: 12,
  },
  priceTotalLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  priceTotalValue: {
    fontSize: 20,
    fontWeight: '700',
  },
  reserveButton: {
    minWidth: 150,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    paddingBottom: 0,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border.primary,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
  },
  modalScroll: {
    flex: 1,
  },
  modalSection: {
    padding: 16,
  },
  modalSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  modalQuantityButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalQuantityValue: {
    fontSize: 24,
    fontWeight: '700',
    marginHorizontal: 24,
    minWidth: 40,
    textAlign: 'center',
  },
  vehicleScroll: {
    maxHeight: 150,
  },
  vehicleOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 2,
    marginBottom: 8,
    gap: 12,
  },
  vehicleInfo: {
    flex: 1,
  },
  vehicleText: {
    fontSize: 14,
    fontWeight: '600',
  },
  vehiclePlate: {
    fontSize: 12,
    marginTop: 2,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    marginBottom: 12,
    gap: 12,
  },
  optionCardContent: {
    flex: 1,
  },
  optionText: {
    fontSize: 16,
    fontWeight: '600',
  },
  optionSubtext: {
    fontSize: 12,
    marginTop: 4,
  },
  addressInputContainer: {
    marginTop: 12,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  addressInput: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    minHeight: 100,
  },
  priceInput: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    fontSize: 18,
    fontWeight: '600',
    marginTop: 8,
  },
  inputHint: {
    fontSize: 12,
    marginTop: 8,
  },
  currentPrice: {
    fontSize: 20,
    fontWeight: '600',
    marginTop: 4,
  },
  totalSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border.primary,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  totalAmount: {
    fontSize: 24,
    fontWeight: '700',
    color: theme.colors.primary.main,
  },
  modalActions: {
    flexDirection: 'row',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border.primary,
    gap: 12,
  },
  modalButton: {
    flex: 1,
  },
});

export default PartDetailScreen;

