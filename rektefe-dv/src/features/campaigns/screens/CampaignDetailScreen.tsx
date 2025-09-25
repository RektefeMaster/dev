import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  Linking,
  Dimensions,
  ActivityIndicator
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useTheme } from '@/context/ThemeContext';
import { useCampaigns, Campaign } from '@/shared/hooks/useCampaigns';

type RootStackParamList = {
  CampaignDetail: { campaignId: number };
  Main: { screen?: string };
  BookAppointment: {
    mechanicId: string;
    mechanicName: string;
    mechanicSurname: string;
    vehicleId: string;
    serviceType: string;
    description: string;
  };
};

type NavigationProp = StackNavigationProp<RootStackParamList>;
type RouteProp = {
  key: string;
  name: string;
  params: { campaignId: number };
};

const { width } = Dimensions.get('window');

const CampaignDetailScreen = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProp>();
  const { campaignId } = route.params;
  const { theme } = useTheme();
  const { getCampaignById, loading } = useCampaigns();
  
  const [campaign, setCampaign] = useState<Campaign | null>(null);

  useEffect(() => {
    const foundCampaign = getCampaignById(campaignId);
    if (foundCampaign) {
      setCampaign(foundCampaign);
    } else {
      Alert.alert('Hata', 'Kampanya bulunamadı');
      navigation.goBack();
    }
  }, [campaignId, getCampaignById, navigation]);

  const handleCall = () => {
    if (campaign?.contactInfo.phone) {
      Linking.openURL(`tel:${campaign.contactInfo.phone}`);
    }
  };

  const handleLocation = () => {
    if (campaign?.contactInfo.address) {
      const encodedAddress = encodeURIComponent(campaign.contactInfo.address);
      Linking.openURL(`https://maps.google.com/?q=${encodedAddress}`);
    }
  };

  const handleBookAppointment = () => {
    if (campaign) {
      // Randevu oluşturma sayfasına yönlendir
      navigation.navigate('BookAppointment' as never, {
        mechanicId: campaign.id.toString(),
        mechanicName: campaign.company,
        mechanicSurname: '',
        vehicleId: '', // Bu değer seçim sayfasından gelecek
        serviceType: campaign.serviceType,
        description: campaign.description
      });
    }
  };

  if (loading || !campaign) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background.primary }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary.main} />
          <Text style={[styles.loadingText, { color: theme.colors.text.primary }]}>
            Kampanya yükleniyor...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background.primary }]}>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Header Image */}
        <View style={styles.imageContainer}>
          <Image source={{ uri: campaign.image }} style={styles.campaignImage} />
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.7)']}
            style={styles.imageGradient}
          />
          
          {/* Back Button */}
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <MaterialCommunityIcons name="arrow-left" size={24} color="#fff" />
          </TouchableOpacity>

          {/* Discount Badge */}
          <View style={styles.discountBadge}>
            <Text style={styles.discountText}>{campaign.discount}</Text>
          </View>
        </View>

        {/* Content */}
        <View style={styles.content}>
          {/* Company Info */}
          <View style={styles.companyInfo}>
            <View style={styles.companyHeader}>
              {campaign.companyLogo && (
                <Image source={{ uri: campaign.companyLogo }} style={styles.companyLogo} />
              )}
              <View style={styles.companyDetails}>
                <Text style={[styles.companyName, { color: theme.colors.text.primary }]}>
                  {campaign.company}
                </Text>
                {campaign.isVerified && (
                  <View style={styles.verifiedContainer}>
                    <MaterialCommunityIcons name="check-decagram" size={16} color="#34C759" />
                    <Text style={[styles.verifiedText, { color: theme.colors.text.secondary }]}>
                      Doğrulanmış
                    </Text>
                  </View>
                )}
              </View>
            </View>
            
            <View style={styles.ratingContainer}>
              <MaterialCommunityIcons name="star" size={16} color={theme.colors.warning.main} />
              <Text style={[styles.ratingText, { color: theme.colors.text.primary }]}>
                {campaign.rating.toFixed(1)}
              </Text>
              <Text style={[styles.reviewCount, { color: theme.colors.text.secondary }]}>
                ({campaign.reviewCount} değerlendirme)
              </Text>
            </View>
          </View>

          {/* Campaign Title */}
          <Text style={[styles.campaignTitle, { color: theme.colors.text.primary }]}>
            {campaign.title}
          </Text>

          {/* Campaign Description */}
          <Text style={[styles.campaignDescription, { color: theme.colors.text.secondary }]}>
            {campaign.description}
          </Text>

          {/* Service Type */}
          <View style={styles.serviceTypeContainer}>
            <MaterialCommunityIcons name="wrench" size={20} color={theme.colors.primary.main} />
            <Text style={[styles.serviceTypeText, { color: theme.colors.text.primary }]}>
              {campaign.serviceType}
            </Text>
          </View>

          {/* Location */}
          <View style={styles.locationContainer}>
            <MaterialCommunityIcons name="map-marker" size={20} color={theme.colors.primary.main} />
            <View style={styles.locationDetails}>
              <Text style={[styles.locationText, { color: theme.colors.text.primary }]}>
                {typeof campaign.location === 'object' ? `${campaign.location.city}, ${campaign.location.district}` : campaign.location}
              </Text>
              <Text style={[styles.addressText, { color: theme.colors.text.secondary }]}>
                {campaign.contactInfo.address}
              </Text>
            </View>
          </View>

          {/* Valid Until */}
          <View style={styles.validUntilContainer}>
            <MaterialCommunityIcons name="calendar" size={20} color={theme.colors.error.main} />
            <Text style={[styles.validUntilText, { color: theme.colors.text.primary }]}>
              Geçerlilik Tarihi: {new Date(campaign.validUntil).toLocaleDateString('tr-TR')}
            </Text>
          </View>

          {/* Conditions */}
          <View style={styles.conditionsContainer}>
            <Text style={[styles.conditionsTitle, { color: theme.colors.text.primary }]}>
              Kampanya Koşulları:
            </Text>
            {campaign.conditions.map((condition, index) => (
              <View key={index} style={styles.conditionItem}>
                <MaterialCommunityIcons name="check-circle" size={16} color={theme.colors.success.main} />
                <Text style={[styles.conditionText, { color: theme.colors.text.secondary }]}>
                  {condition}
                </Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>

      {/* Bottom Actions */}
      <View style={[styles.bottomActions, { backgroundColor: theme.colors.background.card, borderTopColor: theme.colors.border.primary }]}>
        <TouchableOpacity
          style={[styles.actionButton, styles.callButton, { backgroundColor: theme.colors.primary.main }]}
          onPress={handleCall}
        >
          <MaterialCommunityIcons name="phone" size={20} color="#fff" />
          <Text style={styles.actionButtonText}>Ara</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, styles.locationButton, { backgroundColor: theme.colors.background.secondary, borderColor: theme.colors.border.primary }]}
          onPress={handleLocation}
        >
          <MaterialCommunityIcons name="map" size={20} color={theme.colors.primary.main} />
          <Text style={[styles.actionButtonText, { color: theme.colors.primary.main }]}>Konum</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, styles.bookButton, { backgroundColor: theme.colors.success.main }]}
          onPress={handleBookAppointment}
        >
          <MaterialCommunityIcons name="calendar-plus" size={20} color="#fff" />
          <Text style={styles.actionButtonText}>Randevu Al</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
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
  },
  imageContainer: {
    position: 'relative',
    height: 250,
  },
  campaignImage: {
    width: '100%',
    height: '100%',
  },
  imageGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  backButton: {
    position: 'absolute',
    top: 16,
    left: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  discountBadge: {
    position: 'absolute',
    top: 16,
    right: 16,
    backgroundColor: '#FF2D55',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  discountText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  content: {
    padding: 20,
  },
  companyInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  companyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  companyLogo: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  companyDetails: {
    flex: 1,
  },
  companyName: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  verifiedContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  verifiedText: {
    fontSize: 12,
    marginLeft: 4,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingText: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 4,
  },
  reviewCount: {
    fontSize: 12,
    marginLeft: 4,
  },
  campaignTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 12,
    lineHeight: 32,
  },
  campaignDescription: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 20,
  },
  serviceTypeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  serviceTypeText: {
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 8,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  locationDetails: {
    flex: 1,
    marginLeft: 8,
  },
  locationText: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  addressText: {
    fontSize: 14,
    lineHeight: 20,
  },
  validUntilContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  validUntilText: {
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 8,
  },
  conditionsContainer: {
    marginBottom: 20,
  },
  conditionsTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  conditionItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  conditionText: {
    fontSize: 14,
    marginLeft: 8,
    flex: 1,
    lineHeight: 20,
  },
  bottomActions: {
    flexDirection: 'row',
    padding: 16,
    borderTopWidth: 1,
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  callButton: {
    // Styles handled by backgroundColor
  },
  locationButton: {
    borderWidth: 1,
  },
  bookButton: {
    // Styles handled by backgroundColor
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default CampaignDetailScreen;
