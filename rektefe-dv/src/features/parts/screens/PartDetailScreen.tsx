import React, { useState, useEffect, useCallback } from 'react';
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
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
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
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'transfer' | 'wallet'>('cash');
  const [reserving, setReserving] = useState(false);
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [cardInfo, setCardInfo] = useState({
    cardNumber: '',
    cardHolderName: '',
    expiryMonth: '',
    expiryYear: '',
    cvv: '',
  });
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [loadingVehicles, setLoadingVehicles] = useState(false);
  const [userReservation, setUserReservation] = useState<any>(null);
  const [loadingReservation, setLoadingReservation] = useState(false);

  useEffect(() => {
    fetchPartDetail();
    fetchVehicles();
  }, [partId]);

  const fetchUserReservation = useCallback(async () => {
    if (!partId) return;
    
    try {
      setLoadingReservation(true);
      const response = await apiService.getMyPartsReservations();
      
      if (response.success && response.data) {
        const reservations = Array.isArray(response.data) ? response.data : [];
        // Bu parça için aktif (pending veya confirmed) rezervasyonu bul
        const activeReservation = reservations.find(
          (res: any) => {
            const resPartId = res.partId?._id || res.partId;
            return resPartId === partId && (res.status === 'pending' || res.status === 'confirmed');
          }
        );
        setUserReservation(activeReservation || null);
      }
    } catch (error) {
      console.error('Rezervasyon kontrolü hatası:', error);
      // Hata durumunda sessizce devam et
    } finally {
      setLoadingReservation(false);
    }
  }, [partId]);

  useEffect(() => {
    fetchUserReservation();
  }, [fetchUserReservation]);

  // Ekran odaklandığında rezervasyonu güncelle
  useFocusEffect(
    useCallback(() => {
      fetchUserReservation();
    }, [fetchUserReservation])
  );

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
    if (!part || !part.stock || (part.stock.available ?? 0) <= 0) {
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

    // Card/Transfer için cardInfo validasyonu
    if ((paymentMethod === 'card' || paymentMethod === 'transfer') && !cardInfo.cardNumber.trim()) {
      Alert.alert('Uyarı', 'Kart bilgilerini giriniz');
      return;
    }

    // Card info validasyonu
    if ((paymentMethod === 'card' || paymentMethod === 'transfer')) {
      if (!cardInfo.cardNumber.trim() || !cardInfo.cardHolderName.trim() || 
          !cardInfo.expiryMonth || !cardInfo.expiryYear || !cardInfo.cvv) {
        Alert.alert('Uyarı', 'Tüm kart bilgilerini eksiksiz giriniz');
        return;
      }
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
          ...(paymentMethod === 'card' || paymentMethod === 'transfer' ? { cardInfo } : {}),
        },
      });

      if (response.success) {
        // Rezervasyonu güncelle
        await fetchUserReservation();
        Alert.alert(
          'Başarılı',
          'Rezervasyonunuz oluşturuldu. Usta onayı bekleniyor.',
          [
            {
              text: 'Tamam',
              onPress: () => {
                setShowReserveModal(false);
                setDeliveryAddress('');
                setCardInfo({
                  cardNumber: '',
                  cardHolderName: '',
                  expiryMonth: '',
                  expiryYear: '',
                  cvv: '',
                });
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

  const handleViewReservation = () => {
    navigation.navigate('PartsReservations' as never);
  };

  const getReservationStatusText = () => {
    if (!userReservation) return null;
    
    switch (userReservation.status) {
      case 'pending':
        return 'Rezervasyon Bekliyor';
      case 'confirmed':
        return 'Rezervasyon Onaylandı';
      default:
        return null;
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
          <Text style={[styles.headerTitle, { color: theme.colors.text.primary }]} numberOfLines={1}>
            {part.partName || 'Parça Detayı'}
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
              <View style={[styles.photoPlaceholder, { backgroundColor: theme.colors.background.secondary }]}>
                <Ionicons name="cube-outline" size={80} color={theme.colors.text.secondary} />
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
                <Text 
                  style={[styles.partName, { color: theme.colors.text.primary }]}
                  numberOfLines={2}
                  ellipsizeMode="tail"
                >
                  {part.partName || 'İsimsiz Parça'}
                </Text>
                {part.brand && (
                  <Text 
                    style={[styles.partBrand, { color: theme.colors.text.secondary }]}
                    numberOfLines={1}
                    ellipsizeMode="tail"
                  >
                    {part.brand}
                  </Text>
                )}
              </View>
              {(part.stock && part.stock.available !== undefined) && (
                <View style={[styles.stockBadge, {
                  backgroundColor: (part.stock.available ?? 0) > 0 
                    ? theme.colors.success.light + '50'
                    : theme.colors.error.light + '50',
                  borderColor: (part.stock.available ?? 0) > 0 
                    ? theme.colors.success.main + '40'
                    : theme.colors.error.main + '40'
                }]}>
                  <Ionicons 
                    name={(part.stock.available ?? 0) > 0 ? "checkmark-circle" : "close-circle"} 
                    size={22} 
                    color={(part.stock.available ?? 0) > 0 ? theme.colors.success.main : theme.colors.error.main} 
                  />
                  <Text 
                    style={[
                      styles.stockText,
                      { color: (part.stock.available ?? 0) > 0 ? theme.colors.success.main : theme.colors.error.main }
                    ]}
                    numberOfLines={1}
                    ellipsizeMode="tail"
                  >
                    {(part.stock.available ?? 0) > 0 ? `${part.stock.available} Adet` : 'Stokta Yok'}
                  </Text>
                </View>
              )}
            </View>

            {/* Badges */}
            <View style={styles.badgeContainer}>
              {part.category && (
                <View style={[styles.badge, { backgroundColor: theme.colors.primary.light + '40' }]}>
                  <Text 
                    style={[styles.badgeText, { color: theme.colors.primary.main }]}
                    numberOfLines={1}
                    ellipsizeMode="tail"
                  >
                    {getCategoryLabel(part.category) || 'Bilinmeyen'}
                  </Text>
                </View>
              )}
              {part.condition && (
                <View style={[styles.badge, { backgroundColor: theme.colors.success.light + '40' }]}>
                  <Text 
                    style={[styles.badgeText, { color: theme.colors.success.main }]}
                    numberOfLines={1}
                    ellipsizeMode="tail"
                  >
                    {getConditionLabel(part.condition) || 'Bilinmeyen'}
                  </Text>
                </View>
              )}
              {part.partNumber && (
                <View style={[styles.badge, { 
                  backgroundColor: theme.colors.background.secondary,
                  borderWidth: 1,
                  borderColor: theme.colors.border.primary,
                }]}>
                  <Text 
                    style={[styles.badgeText, { color: theme.colors.text.secondary }]}
                    numberOfLines={1}
                    ellipsizeMode="tail"
                  >
                    No: {part.partNumber}
                  </Text>
                </View>
              )}
            </View>

            {/* Price */}
            {part.pricing && (
              <View style={styles.priceContainer}>
                <View style={styles.priceLeft}>
                  <Text 
                    style={[styles.price, { color: theme.colors.text.primary }]}
                    numberOfLines={1}
                    ellipsizeMode="tail"
                    adjustsFontSizeToFit={false}
                  >
                    {typeof part.pricing.unitPrice === 'number' 
                      ? `${part.pricing.unitPrice.toLocaleString('tr-TR')} ${part.pricing.currency || 'TRY'}`
                      : 'Fiyat belirtilmemiş'}
                  </Text>
                  {part.pricing.oldPrice && typeof part.pricing.oldPrice === 'number' && (
                    <Text 
                      style={[styles.oldPrice, { color: theme.colors.text.secondary }]}
                      numberOfLines={1}
                      ellipsizeMode="tail"
                      adjustsFontSizeToFit={false}
                    >
                      {part.pricing.oldPrice.toLocaleString('tr-TR')} {part.pricing.currency || 'TRY'}
                    </Text>
                  )}
                </View>
                {part.pricing.isNegotiable && (
                  <View style={styles.negotiableBadgeContainer}>
                    <View style={[styles.negotiableBadge, { backgroundColor: theme.colors.warning.light + '60' }]}>
                      <Ionicons name="chatbubbles-outline" size={12} color={theme.colors.warning.main} style={{ flexShrink: 0 }} />
                      <Text 
                        style={[styles.negotiableText, { color: theme.colors.warning.main }]}
                        numberOfLines={1}
                        ellipsizeMode="tail"
                        adjustsFontSizeToFit={false}
                      >
                        Pazarlık
                      </Text>
                    </View>
                  </View>
                )}
              </View>
            )}

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
            {part.compatibility && (
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: theme.colors.text.primary }]}>
                  Uyumluluk
                </Text>
                {part.compatibility.makeModel && Array.isArray(part.compatibility.makeModel) && part.compatibility.makeModel.length > 0 && (
                  <View style={styles.compatibilityRow}>
                    <Ionicons name="car" size={16} color={theme.colors.text.secondary} />
                    <Text 
                      style={[styles.compatibilityText, { color: theme.colors.text.secondary }]}
                      numberOfLines={2}
                      ellipsizeMode="tail"
                    >
                      {part.compatibility.makeModel.join(', ')}
                    </Text>
                  </View>
                )}
                {part.compatibility.years && (
                  <View style={styles.compatibilityRow}>
                    <Ionicons name="calendar" size={16} color={theme.colors.text.secondary} />
                    <Text 
                      style={[styles.compatibilityText, { color: theme.colors.text.secondary }]}
                      numberOfLines={1}
                    >
                      {part.compatibility.years.start || '?'} - {part.compatibility.years.end || '?'}
                    </Text>
                  </View>
                )}
                {part.compatibility.engine && Array.isArray(part.compatibility.engine) && part.compatibility.engine.length > 0 && (
                  <View style={styles.compatibilityRow}>
                    <Ionicons name="settings" size={16} color={theme.colors.text.secondary} />
                    <Text 
                      style={[styles.compatibilityText, { color: theme.colors.text.secondary }]}
                      numberOfLines={2}
                      ellipsizeMode="tail"
                    >
                      Motor: {part.compatibility.engine.join(', ')}
                    </Text>
                  </View>
                )}
                {part.compatibility.notes && (
                  <Text 
                    style={[styles.compatibilityNotes, { color: theme.colors.text.secondary }]}
                    numberOfLines={3}
                    ellipsizeMode="tail"
                  >
                    {part.compatibility.notes}
                  </Text>
                )}
              </View>
            )}

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
            {part.mechanicId && (
              <View style={styles.sellerSection}>
                <View style={styles.sellerInfo}>
                  <View style={[styles.sellerAvatar, { backgroundColor: theme.colors.primary.main }]}>
                    <Ionicons name="storefront-outline" size={28} color="#fff" />
                  </View>
                  <View style={styles.sellerDetails}>
                    <Text 
                      style={[styles.sellerName, { color: theme.colors.text.primary }]}
                      numberOfLines={1}
                      ellipsizeMode="tail"
                    >
                      {part.mechanicId?.shopName || `${part.mechanicId?.name || ''} ${part.mechanicId?.surname || ''}`.trim() || 'Bilinmeyen Satıcı'}
                    </Text>
                    {part.mechanicId?.rating !== undefined && part.mechanicId.rating !== null && (
                      <View style={styles.ratingRow}>
                        <Ionicons name="star" size={15} color="#FBBF24" />
                        <Text 
                          style={[styles.ratingText, { color: theme.colors.text.secondary }]}
                          numberOfLines={1}
                        >
                          {typeof part.mechanicId.rating === 'number' 
                            ? `${part.mechanicId.rating.toFixed(1)} (${part.mechanicId.ratingCount || 0})`
                            : '0.0 (0)'}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
                {part.mechanicId?.phone && (
                  <TouchableOpacity
                    style={[styles.phoneButton, { 
                      borderColor: theme.colors.primary.main,
                      backgroundColor: theme.colors.primary.light + '30',
                    }]}
                    onPress={handleCallMechanic}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="call-outline" size={20} color={theme.colors.primary.main} />
                  </TouchableOpacity>
                )}
              </View>
            )}
          </Card>

          {/* Quantity Selector */}
          {part.stock && (part.stock.available ?? 0) > 0 && part.pricing && typeof part.pricing.unitPrice === 'number' && (
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
                  onPress={() => setQuantity(Math.min(part.stock?.available ?? 0, quantity + 1))}
                  disabled={quantity >= (part.stock?.available ?? 0)}
                >
                  <Ionicons name="add" size={20} color={theme.colors.text.primary} />
                </TouchableOpacity>
              </View>
              <Text style={[styles.totalPrice, { color: theme.colors.text.primary }]}>
                Toplam: {(part.pricing.unitPrice * quantity).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {part.pricing.currency || 'TRY'}
              </Text>
            </Card>
          )}
        </ScrollView>

        {/* Fixed Bottom Button */}
        {part.stock && (part.stock.available ?? 0) > 0 && part.pricing && typeof part.pricing.unitPrice === 'number' && (
          <View style={[styles.bottomContainer, { backgroundColor: theme.colors.background.primary }]}>
            {userReservation ? (
              // Aktif rezervasyon varsa durumu göster
              <>
                <View style={styles.priceTotal}>
                  <Text style={[styles.priceTotalLabel, { color: theme.colors.text.secondary }]}>
                    {getReservationStatusText()}
                  </Text>
                  <Text style={[styles.priceTotalValue, { 
                    color: userReservation.status === 'confirmed' 
                      ? theme.colors.success.main 
                      : theme.colors.warning.main 
                  }]}>
                    {userReservation.status === 'confirmed' 
                      ? 'Onaylandı' 
                      : 'Bekliyor'}
                  </Text>
                </View>
                <Button
                  title="Rezervasyonu Görüntüle"
                  onPress={handleViewReservation}
                  style={styles.reserveButton}
                  variant={userReservation.status === 'confirmed' ? 'primary' : 'outline'}
                />
              </>
            ) : (
              // Rezervasyon yoksa normal buton
              <>
                <View style={styles.priceTotal}>
                  <Text style={[styles.priceTotalLabel, { color: theme.colors.text.secondary }]}>
                    Toplam
                  </Text>
                  <Text style={[styles.priceTotalValue, { color: theme.colors.text.primary }]}>
                    {(part.pricing.unitPrice * quantity).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {part.pricing.currency || 'TRY'}
                  </Text>
                </View>
                <Button
                  title="Rezerve Et"
                  onPress={handleReserve}
                  style={styles.reserveButton}
                  disabled={(part.stock.available ?? 0) <= 0}
                />
              </>
            )}
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
                      onPress={() => setQuantity(Math.min(part.stock?.available ?? 0, quantity + 1))}
                      disabled={quantity >= (part.stock?.available ?? 0)}
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
                  {['cash', 'wallet', 'card', 'transfer'].map((method) => (
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
                          method === 'wallet' ? 'wallet-outline' :
                          method === 'card' ? 'card-outline' : 'card-outline'
                        }
                        size={24}
                        color={paymentMethod === method ? theme.colors.primary.main : theme.colors.text.secondary}
                      />
                      <Text style={[
                        styles.optionText,
                        { color: paymentMethod === method ? theme.colors.primary.main : theme.colors.text.primary }
                      ]}>
                        {method === 'cash' ? 'Kapıda Nakit' :
                         method === 'wallet' ? 'Cüzdan' :
                         method === 'card' ? 'Kredi Kartı' : 'Havale/EFT'}
                      </Text>
                    </TouchableOpacity>
                  ))}
                  
                  {/* Card Info Form (Card/Transfer için) */}
                  {(paymentMethod === 'card' || paymentMethod === 'transfer') && (
                    <View style={styles.cardInfoContainer}>
                      <Text style={[styles.inputLabel, { color: theme.colors.text.primary, marginTop: 16 }]}>
                        Kart Bilgileri
                      </Text>
                      
                      <TextInput
                        style={[
                          styles.cardInput,
                          {
                            borderColor: theme.colors.border.primary,
                            color: theme.colors.text.primary,
                            backgroundColor: theme.colors.background.secondary,
                          }
                        ]}
                        placeholder="Kart Numarası"
                        placeholderTextColor={theme.colors.text.secondary}
                        value={cardInfo.cardNumber}
                        onChangeText={(text) => {
                          // Sadece sayıları al ve 16 haneye sınırla
                          const numbers = text.replace(/\D/g, '').slice(0, 16);
                          setCardInfo({ ...cardInfo, cardNumber: numbers });
                        }}
                        keyboardType="numeric"
                        maxLength={16}
                      />
                      
                      <TextInput
                        style={[
                          styles.cardInput,
                          {
                            borderColor: theme.colors.border.primary,
                            color: theme.colors.text.primary,
                            backgroundColor: theme.colors.background.secondary,
                          }
                        ]}
                        placeholder="Kart Üzerindeki İsim"
                        placeholderTextColor={theme.colors.text.secondary}
                        value={cardInfo.cardHolderName}
                        onChangeText={(text) => setCardInfo({ ...cardInfo, cardHolderName: text })}
                        autoCapitalize="words"
                      />
                      
                      <View style={styles.cardRow}>
                        <View style={styles.cardInputHalf}>
                          <TextInput
                            style={[
                              styles.cardInput,
                              {
                                borderColor: theme.colors.border.primary,
                                color: theme.colors.text.primary,
                                backgroundColor: theme.colors.background.secondary,
                              }
                            ]}
                            placeholder="Ay (MM)"
                            placeholderTextColor={theme.colors.text.secondary}
                            value={cardInfo.expiryMonth}
                            onChangeText={(text) => {
                              const numbers = text.replace(/\D/g, '').slice(0, 2);
                              setCardInfo({ ...cardInfo, expiryMonth: numbers });
                            }}
                            keyboardType="numeric"
                            maxLength={2}
                          />
                        </View>
                        <View style={styles.cardInputHalf}>
                          <TextInput
                            style={[
                              styles.cardInput,
                              {
                                borderColor: theme.colors.border.primary,
                                color: theme.colors.text.primary,
                                backgroundColor: theme.colors.background.secondary,
                              }
                            ]}
                            placeholder="Yıl (YYYY)"
                            placeholderTextColor={theme.colors.text.secondary}
                            value={cardInfo.expiryYear}
                            onChangeText={(text) => {
                              const numbers = text.replace(/\D/g, '').slice(0, 4);
                              setCardInfo({ ...cardInfo, expiryYear: numbers });
                            }}
                            keyboardType="numeric"
                            maxLength={4}
                          />
                        </View>
                        <View style={styles.cardInputHalf}>
                          <TextInput
                            style={[
                              styles.cardInput,
                              {
                                borderColor: theme.colors.border.primary,
                                color: theme.colors.text.primary,
                                backgroundColor: theme.colors.background.secondary,
                              }
                            ]}
                            placeholder="CVV"
                            placeholderTextColor={theme.colors.text.secondary}
                            value={cardInfo.cvv}
                            onChangeText={(text) => {
                              const numbers = text.replace(/\D/g, '').slice(0, 3);
                              setCardInfo({ ...cardInfo, cvv: numbers });
                            }}
                            keyboardType="numeric"
                            maxLength={3}
                            secureTextEntry
                          />
                        </View>
                      </View>
                    </View>
                  )}
                </View>

                {/* Total */}
                {part.pricing && typeof part.pricing.unitPrice === 'number' && (
                  <View style={styles.totalSection}>
                    <Text style={[styles.totalLabel, { color: theme.colors.text.secondary }]}>
                      Toplam Tutar
                    </Text>
                    <Text style={[styles.totalAmount, { color: theme.colors.text.primary }]}>
                      {(part.pricing.unitPrice * quantity).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {part.pricing.currency || 'TRY'}
                    </Text>
                  </View>
                )}
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
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border.primary,
    backgroundColor: theme.colors.background.primary,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    flex: 1,
    textAlign: 'center',
    letterSpacing: 0.3,
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
    height: 320,
  },
  photoScroll: {
    height: 320,
  },
  photoContainer: {
    width: SCREEN_WIDTH,
    height: 320,
  },
  photoImage: {
    width: '100%',
    height: '100%',
    backgroundColor: theme.colors.background.secondary,
  },
  photoPlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoPlaceholderText: {
    marginTop: 12,
    fontSize: 14,
    fontWeight: '500',
    opacity: 0.6,
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
    padding: 18,
    borderRadius: 14,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
    minHeight: 0,
  },
  titleLeft: {
    flex: 1,
    marginRight: 12,
    minWidth: 0,
  },
  partName: {
    fontSize: 21,
    fontWeight: '700',
    marginBottom: 5,
    flexShrink: 1,
    letterSpacing: 0.3,
    lineHeight: 28,
  },
  partBrand: {
    fontSize: 15,
    marginBottom: 0,
    flexShrink: 1,
    fontWeight: '500',
    opacity: 0.7,
  },
  stockBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 20,
    flexShrink: 0,
    marginLeft: 10,
    borderWidth: 1.5,
    gap: 7,
  },
  stockText: {
    fontSize: 13,
    fontWeight: '700',
    flexShrink: 1,
    letterSpacing: 0.2,
  },
  badgeContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 18,
    minHeight: 0,
    gap: 8,
  },
  badge: {
    paddingHorizontal: 13,
    paddingVertical: 7,
    borderRadius: 10,
    marginRight: 0,
    marginBottom: 0,
    maxWidth: '100%',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    flexShrink: 1,
    letterSpacing: 0.2,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 18,
    minHeight: 0,
    paddingBottom: 18,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border.primary,
  },
  priceLeft: {
    flex: 1,
    marginRight: 12,
    minWidth: 0,
    flexShrink: 1,
  },
  price: {
    fontSize: 26,
    fontWeight: '700',
    letterSpacing: 0.3,
    lineHeight: 32,
    flexShrink: 1,
  },
  oldPrice: {
    fontSize: 14,
    textDecorationLine: 'line-through',
    marginTop: 5,
    opacity: 0.5,
    fontWeight: '500',
    flexShrink: 1,
  },
  negotiableBadgeContainer: {
    flexShrink: 0,
    marginTop: 4,
    marginLeft: 8,
  },
  negotiableBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 10,
    gap: 4,
    maxWidth: 75,
    minWidth: 55,
  },
  negotiableText: {
    fontSize: 11,
    fontWeight: '700',
    flexShrink: 1,
    letterSpacing: 0.2,
    minWidth: 0,
  },
  section: {
    marginBottom: 18,
    paddingBottom: 18,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border.primary,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 10,
    letterSpacing: 0.2,
  },
  sectionContent: {
    fontSize: 14,
    lineHeight: 22,
    fontWeight: '400',
    opacity: 0.8,
  },
  compatibilityRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
    gap: 8,
    minHeight: 0,
  },
  compatibilityText: {
    fontSize: 14,
    flex: 1,
    minWidth: 0,
    flexShrink: 1,
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
    paddingTop: 18,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border.primary,
  },
  sellerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  sellerAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  sellerDetails: {
    flex: 1,
    minWidth: 0,
  },
  sellerName: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 5,
    flexShrink: 1,
    letterSpacing: 0.2,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingText: {
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 5,
    opacity: 0.8,
  },
  phoneButton: {
    width: 46,
    height: 46,
    borderRadius: 23,
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
  cardInfoContainer: {
    marginTop: 12,
  },
  cardInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    marginBottom: 12,
  },
  cardRow: {
    flexDirection: 'row',
    gap: 8,
  },
  cardInputHalf: {
    flex: 1,
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

