import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/context/ThemeContext';
import { useMechanicDetail } from '../hooks/useMechanicDetail';
import { 
  StarRating, 
  ReviewCard, 
  MechanicHeader, 
  MechanicInfo, 
  ReviewsList 
} from '../components';

interface MechanicDetailProps {
  route: {
    params: {
      mechanic: {
        id: string;
        name: string;
        surname: string;
        rating: number;
        experience: number;
        totalJobs: number;
        specialties: string[];
        city: string;
        isAvailable: boolean;
        avatar?: string;
        bio?: string;
        ratingCount: number;
        // ... diğer alanlar
      };
    };
  };
  navigation: any;
}

const MechanicDetailScreen: React.FC<MechanicDetailProps> = ({ route, navigation }) => {
  const { theme } = useTheme();
  const { mechanic } = route.params;
  
  const {
    reviews,
    averageRating,
    totalReviews,
    loading,
    mechanicDetails,
    showAllSpecialties,
    showAllCarBrands,
    showAllEngineTypes,
    showAllTransmissionTypes,
    showAllReviews,
    setShowAllSpecialties,
    setShowAllCarBrands,
    setShowAllEngineTypes,
    setShowAllTransmissionTypes,
    setShowAllReviews,
    fetchMechanicReviews,
    handleBecomeCustomer,
    handleRemoveCustomer,
  } = useMechanicDetail(mechanic);

  const handleBookAppointment = () => {
    navigation.navigate('BookAppointment' as never, {
      mechanicId: mechanic.id,
      mechanicName: mechanic.name,
      mechanicSurname: mechanic.surname
    });
  };

  const handleMessage = () => {
    // Message logic burada
    navigation.navigate('ChatScreen' as never, {
      otherParticipant: {
        _id: mechanic.id,
        name: mechanic.name,
        surname: mechanic.surname,
        avatar: mechanic.avatar,
        userType: 'mechanic'
      }
    });
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background.primary }]}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header Component */}
        <MechanicHeader 
          mechanic={mechanicDetails}
          averageRating={averageRating}
          totalReviews={totalReviews}
          onBack={() => navigation.goBack()}
        />

        {/* Info Component */}
        <MechanicInfo
          mechanic={mechanicDetails}
          showAllSpecialties={showAllSpecialties}
          showAllCarBrands={showAllCarBrands}
          showAllEngineTypes={showAllEngineTypes}
          showAllTransmissionTypes={showAllTransmissionTypes}
          onToggleSpecialties={() => setShowAllSpecialties(!showAllSpecialties)}
          onToggleCarBrands={() => setShowAllCarBrands(!showAllCarBrands)}
          onToggleEngineTypes={() => setShowAllEngineTypes(!showAllEngineTypes)}
          onToggleTransmissionTypes={() => setShowAllTransmissionTypes(!showAllTransmissionTypes)}
          onBecomeCustomer={handleBecomeCustomer}
          onRemoveCustomer={handleRemoveCustomer}
        />

        {/* Reviews Component */}
        <ReviewsList
          reviews={reviews}
          showAllReviews={showAllReviews}
          onToggleShowAll={() => setShowAllReviews(!showAllReviews)}
          onRefresh={fetchMechanicReviews}
          loading={loading}
        />

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          {/* Bu kısım da ayrı bir component olabilir */}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  actionButtons: {
    padding: 20,
    gap: 12,
  },
});

export default MechanicDetailScreen;
