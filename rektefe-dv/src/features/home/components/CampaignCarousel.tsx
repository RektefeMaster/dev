import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Dimensions } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

interface Campaign {
  id: number;
  title: string;
  description: string;
  image: string;
  company: string;
  companyLogo?: string;
  validUntil: string;
  discount: string;
  conditions: string[];
  serviceType: string;
  location: {
    city: string;
    district: string;
  };
  contactInfo: {
    phone: string;
    address: string;
  };
  rating: number;
  reviewCount: number;
  isVerified: boolean;
}

interface CampaignCarouselProps {
  campaigns: Campaign[];
  onCampaignPress: (campaign: Campaign) => void;
}

export const CampaignCarousel: React.FC<CampaignCarouselProps> = ({ campaigns, onCampaignPress }) => {
  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {campaigns.map((campaign) => (
          <TouchableOpacity
            key={campaign.id}
            style={styles.campaignCard}
            onPress={() => onCampaignPress(campaign)}
            activeOpacity={0.9}
          >
            <Image source={{ uri: campaign.image }} style={styles.campaignImage} />
            <LinearGradient
              colors={['transparent', 'rgba(0,0,0,0.8)']}
              style={styles.gradient}
            >
              <View style={styles.campaignContent}>
                <View style={styles.companyInfo}>
                  {campaign.companyLogo && (
                    <Image source={{ uri: campaign.companyLogo }} style={styles.companyLogo} />
                  )}
                  <Text style={styles.companyName}>{campaign.company}</Text>
                  {campaign.isVerified && (
                    <MaterialCommunityIcons name="check-decagram" size={16} color="#34C759" style={styles.verifiedIcon} />
                  )}
                </View>
                <Text style={styles.campaignTitle}>{campaign.title}</Text>
                <Text style={styles.campaignDescription} numberOfLines={2}>
                  {campaign.description}
                </Text>
                <View style={styles.campaignFooter}>
                  <View style={styles.ratingContainer}>
                    <MaterialCommunityIcons name="star" size={14} color="#FFD700" />
                    <Text style={styles.ratingText}>{campaign.rating}</Text>
                    <Text style={styles.reviewCount}>({campaign.reviewCount})</Text>
                  </View>
                  <View style={styles.discountBadge}>
                    <Text style={styles.discountText}>{campaign.discount}</Text>
                  </View>
                </View>
                <Text style={styles.validUntil}>
                  Son Geçerlilik: {campaign.validUntil}
                </Text>
              </View>
            </LinearGradient>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: 24,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  campaignCard: {
    width: width * 0.8,
    height: 200,
    borderRadius: 16,
    marginRight: 16,
    overflow: 'hidden',
    backgroundColor: '#23242a',
  },
  campaignImage: {
    width: '100%',
    height: '100%',
    position: 'absolute',
  },
  gradient: {
    flex: 1,
    justifyContent: 'flex-end',
    padding: 16,
  },
  campaignContent: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  companyInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  companyLogo: {
    width: 24,
    height: 24,
    borderRadius: 12,
    marginRight: 8,
  },
  companyName: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  verifiedIcon: {
    marginLeft: 4,
  },
  campaignTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  campaignDescription: {
    color: '#fff',
    fontSize: 14,
    opacity: 0.9,
    marginBottom: 8,
  },
  campaignFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
  },
  reviewCount: {
    color: '#fff',
    fontSize: 12,
    opacity: 0.7,
    marginLeft: 4,
  },
  discountBadge: {
    backgroundColor: '#FF2D55',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  discountText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  validUntil: {
    color: '#fff',
    fontSize: 12,
    opacity: 0.7,
  },
}); 