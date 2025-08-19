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
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { LinearGradient } from 'expo-linear-gradient';
import { API_URL } from '../constants/config';

type Mechanic = {
  _id: string;
  name: string;
  surname: string;
  avatar?: string;
  city: string;
  rating: number;
  experience: number;
  isAvailable: boolean;
};

const NewMessageScreen = ({ navigation, route }: any) => {
  const { theme } = useTheme();
  const { token } = useAuth();
  const [mechanics, setMechanics] = useState<Mechanic[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);

  useEffect(() => {
    // Route params'tan selectedUser'ı al
    if (route.params?.selectedUser) {
      setSelectedUser(route.params.selectedUser);
    }
    fetchMechanics();
  }, [route.params]);

  const fetchMechanics = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/mechanic/list`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setMechanics(data.data || []);
      } else {
        console.error('Mekanikler getirilemedi:', response.status);
      }
    } catch (error) {
      console.error('Mekanikler yüklenirken hata:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredMechanics = mechanics.filter(mechanic =>
    mechanic.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    mechanic.surname.toLowerCase().includes(searchQuery.toLowerCase()) ||
    mechanic.city.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const startConversation = (mechanic: Mechanic) => {
    navigation.navigate('ChatScreen', {
      conversationId: `temp_${mechanic._id}`,
      otherParticipant: {
        _id: mechanic._id,
        name: mechanic.name,
        surname: mechanic.surname,
        avatar: mechanic.avatar,
        userType: 'mechanic'
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

  const renderMechanicItem = ({ item }: { item: Mechanic }) => (
    <TouchableOpacity
      style={styles.mechanicItem}
      onPress={() => startConversation(item)}
    >
      <View style={styles.avatarContainer}>
        {item.avatar ? (
          <Image source={{ uri: item.avatar }} style={styles.avatar} />
        ) : (
          <View style={[styles.defaultAvatar, { backgroundColor: theme.colors.primary }]}>
            <Text style={styles.defaultAvatarText}>
              {item.name.charAt(0).toUpperCase()}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.mechanicInfo}>
        <Text style={[styles.mechanicName, { color: theme.colors.text }]}>
          {item.name} {item.surname}
        </Text>
        <Text style={[styles.mechanicCity, { color: theme.colors.textSecondary }]}>
          {item.city}
        </Text>
        <View style={styles.mechanicStats}>
          <View style={styles.statItem}>
            <MaterialCommunityIcons name="star" size={16} color="#F59E0B" />
            <Text style={[styles.statText, { color: theme.colors.textSecondary }]}>
              {item.rating.toFixed(1)}
            </Text>
          </View>
          <View style={styles.statItem}>
            <MaterialCommunityIcons name="briefcase" size={16} color="#3B82F6" />
            <Text style={[styles.statText, { color: theme.colors.textSecondary }]}>
              {item.experience} yıl
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.availabilityContainer}>
        <View style={[
          styles.availabilityDot,
          { backgroundColor: item.isAvailable ? '#10B981' : '#EF4444' }
        ]} />
        <Text style={[
          styles.availabilityText,
          { color: item.isAvailable ? '#10B981' : '#EF4444' }
        ]}>
          {item.isAvailable ? 'Müsait' : 'Meşgul'}
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
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
            <MaterialCommunityIcons name="arrow-left" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {selectedUser ? 'Yeni Sohbet' : 'Yeni Mesaj'}
          </Text>
          <View style={{ width: 40 }} />
        </View>
      </LinearGradient>

      {selectedUser ? (
        // Seçili kullanıcı ile sohbet başlat
        <View style={styles.selectedUserContainer}>
          <View style={styles.selectedUserInfo}>
            <View style={styles.avatarContainer}>
              {selectedUser.avatar ? (
                <Image source={{ uri: selectedUser.avatar }} style={styles.avatar} />
              ) : (
                <View style={[styles.defaultAvatar, { backgroundColor: theme.colors.primary }]}>
                  <Text style={styles.defaultAvatarText}>
                    {selectedUser.name.charAt(0).toUpperCase()}
                  </Text>
                </View>
              )}
            </View>
            <View style={styles.selectedUserDetails}>
              <Text style={[styles.selectedUserName, { color: theme.colors.text }]}>
                {selectedUser.name} {selectedUser.surname}
              </Text>
              <Text style={[styles.selectedUserType, { color: theme.colors.textSecondary }]}>
                {selectedUser.userType === 'mechanic' ? 'Usta' : 'Müşteri'}
              </Text>
            </View>
          </View>
          <TouchableOpacity
            style={[styles.startChatButton, { backgroundColor: theme.colors.primary }]}
            onPress={startConversationWithSelectedUser}
          >
            <MaterialCommunityIcons name="message" size={20} color="#FFFFFF" />
            <Text style={styles.startChatButtonText}>Sohbet Başlat</Text>
          </TouchableOpacity>
        </View>
      ) : (
        // Normal usta listesi
        <>
          <View style={styles.searchContainer}>
            <View style={[styles.searchInputContainer, { backgroundColor: theme.colors.surface }]}>
              <MaterialCommunityIcons name="magnify" size={20} color={theme.colors.textTertiary} />
              <TextInput
                style={[styles.searchInput, { color: theme.colors.text }]}
                placeholder="Usta ara..."
                placeholderTextColor={theme.colors.textTertiary}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <MaterialCommunityIcons name="close" size={20} color={theme.colors.textTertiary} />
                </TouchableOpacity>
              )}
            </View>
          </View>

          <FlatList
            data={filteredMechanics}
            renderItem={renderMechanicItem}
            keyExtractor={(item) => item._id}
            contentContainerStyle={styles.mechanicsList}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <MaterialCommunityIcons 
                  name="account-search" 
                  size={64} 
                  color={theme.colors.textTertiary} 
                />
                <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>
                  {searchQuery ? 'Usta Bulunamadı' : 'Henüz Usta Yok'}
                </Text>
                <Text style={[styles.emptySubtitle, { color: theme.colors.textSecondary }]}>
                  {searchQuery 
                    ? 'Arama kriterlerinizi değiştirmeyi deneyin'
                    : 'Sohbet başlatmak için usta bulunması gerekiyor'
                  }
                </Text>
              </View>
            }
          />
        </>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: 20,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
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
  mechanicsList: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  mechanicItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
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
  mechanicInfo: {
    flex: 1,
  },
  mechanicName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  mechanicCity: {
    fontSize: 14,
    marginBottom: 8,
  },
  mechanicStats: {
    flexDirection: 'row',
    gap: 16,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: 12,
  },
  availabilityContainer: {
    alignItems: 'center',
    gap: 4,
  },
  availabilityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  availabilityText: {
    fontSize: 12,
    fontWeight: '500',
  },
  selectedUserContainer: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginTop: 16,
    marginHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  selectedUserInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  selectedUserDetails: {
    marginLeft: 16,
  },
  selectedUserName: {
    fontSize: 18,
    fontWeight: '600',
  },
  selectedUserType: {
    fontSize: 14,
  },
  startChatButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    gap: 8,
  },
  startChatButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
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
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    textAlign: 'center',
    paddingHorizontal: 32,
    lineHeight: 24,
  },
});

export default NewMessageScreen;
