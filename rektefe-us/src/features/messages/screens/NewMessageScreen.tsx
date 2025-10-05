import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Image,
  StatusBar
} from 'react-native';
import { useAuth } from '@/shared/context';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography, spacing, borderRadius, shadows } from '@/shared/theme';
import apiService from '@/shared/services';

type Customer = {
  _id: string;
  name: string;
  surname: string;
  email: string;
  phone: string;
  avatar?: string;
  totalJobs: number;
  totalSpent: number;
  lastVisit: string;
  firstVisit: string;
  loyaltyScore: 'low' | 'medium' | 'high';
};

const NewMessageScreen = ({ navigation, route }: any) => {
  const { token } = useAuth();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);

  useEffect(() => {
    // Route params'tan selectedUser'ı al
    if (route.params?.selectedUser) {
      setSelectedUser(route.params.selectedUser);
    }
    fetchCustomers();
  }, [route.params]);

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      // Ustanın müşterilerini getir - sadece iş yapmış müşteriler
      const response = await apiService.getMechanicCustomers();
      
      if (response.success && response.data) {
        setCustomers(response.data);
      } else {
        setCustomers([]);
      }
    } catch (error) {
      console.error('Müşteri listesi yüklenirken hata:', error);
      setCustomers([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredCustomers = customers.filter(customer =>
    customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    customer.surname.toLowerCase().includes(searchQuery.toLowerCase()) ||
    customer.phone.includes(searchQuery)
  );

  const startConversation = (customer: Customer) => {
    navigation.navigate('ChatScreen', {
      conversationId: `temp_${customer._id}`,
      otherParticipant: {
        _id: customer._id,
        name: customer.name,
        surname: customer.surname,
        avatar: customer.avatar,
        userType: 'driver' // ✅ Müşteri şöför olarak işaretli
      }
    });
  };

  // Seçili kullanıcı ile sohbet başlat
  const startConversationWithSelectedUser = () => {
    if (selectedUser) {
      navigation.navigate('ChatScreen', {
        conversationId: `temp_${selectedUser._id}`,
        otherParticipant: selectedUser
      });
    }
  };

  const renderCustomerItem = ({ item }: { item: Customer }) => (
    <TouchableOpacity
      style={styles.driverItem}
      onPress={() => startConversation(item)}
    >
      <View style={styles.avatarContainer}>
        {item.avatar ? (
          <Image source={{ uri: item.avatar }} style={styles.avatar} />
        ) : (
          <View style={[styles.defaultAvatar, { backgroundColor: colors.primary.main }]}>
            <Text style={styles.defaultAvatarText}>
              {item.name.charAt(0).toUpperCase()}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.driverInfo}>
        <Text style={styles.driverName}>
          {item.name} {item.surname}
        </Text>
        <Text style={styles.driverCity}>{item.phone}</Text>
        <View style={styles.driverStats}>
          <View style={styles.ratingContainer}>
            <Ionicons name="briefcase" size={16} color="#10B981" />
            <Text style={styles.driverRating}>{item.totalJobs} iş</Text>
          </View>
          <View style={styles.experienceContainer}>
            <Ionicons name="cash" size={16} color="#6B7280" />
            <Text style={styles.driverExperience}>{item.totalSpent}₺</Text>
          </View>
        </View>
      </View>

      <TouchableOpacity
        style={styles.messageButton}
        onPress={() => startConversation(item)}
      >
        <Ionicons name="chatbubbles" size={20} color="#FFFFFF" />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="people" size={64} color={colors.text.secondary} />
      <Text style={styles.emptyTitle}>Müşteri Bulunamadı</Text>
      <Text style={styles.emptySubtitle}>
        Henüz iş yaptığınız müşteri bulunmuyor veya arama kriterlerinize uygun müşteri bulunamadı
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1F2937" />
      
      <LinearGradient
        colors={['#1F2937', '#374151']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Yeni Mesaj</Text>
          <View style={styles.placeholder} />
        </View>
      </LinearGradient>

      <View style={styles.searchContainer}>
        <View style={[styles.searchInputContainer, { backgroundColor: colors.background.card }]}>
          <Ionicons name="search" size={20} color={colors.text.secondary} />
          <TextInput
            style={[styles.searchInput, { color: colors.text.primary }]}
            placeholder="Müşteri ara..."
            placeholderTextColor={colors.text.secondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close" size={20} color={colors.text.secondary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <FlatList
        data={filteredCustomers}
        renderItem={renderCustomerItem}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.driversList}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={renderEmptyState}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  header: {
    paddingTop: 20,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  placeholder: {
    width: 40,
  },
  searchContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 12,
  },

  searchInput: {
    flex: 1,
    fontSize: 16,
  },
  driversList: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  driverItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: colors.background.card,
    borderRadius: 16,
    marginBottom: 12,
    ...shadows.small,
  },
  avatarContainer: {
    marginRight: 16,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  defaultAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  defaultAvatarText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  driverInfo: {
    flex: 1,
  },
  driverName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 4,
  },
  driverCity: {
    fontSize: 14,
    color: colors.text.secondary,
    marginBottom: 8,
  },
  driverStats: {
    flexDirection: 'row',
    gap: 16,
  },
  driverRating: {
    fontSize: 12,
    color: colors.warning.main,
    fontWeight: '500',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  driverExperience: {
    fontSize: 12,
    color: colors.text.secondary,
    fontWeight: '500',
  },
  experienceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  messageButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary.main,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.small,
  },
  messageButtonText: {
    fontSize: 18,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },

  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    color: colors.text.secondary,
    textAlign: 'center',
    paddingHorizontal: 32,
    lineHeight: 24,
  },
});

export default NewMessageScreen;
