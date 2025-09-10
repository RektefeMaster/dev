import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  RefreshControl,
  StatusBar,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography, spacing, borderRadius, shadows, dimensions as themeDimensions } from '../theme/theme';
import { Button, Card, LoadingSpinner, EmptyState, Input } from '../components';
import { apiService } from '../services/api';

type Conversation = {
  _id: string;
  otherParticipant: {
    _id: string;
    name: string;
    surname: string;
    avatar?: string;
    userType: string;
  };
  lastMessage?: {
    content: string;
    messageType: string;
    createdAt: string;
  };
  lastMessageAt?: string;
  unreadCount: number;
  createdAt: string;
};

const MessagesScreen = ({ navigation }: any) => {
  const { token, userId } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchConversations = useCallback(async () => {
    try {
      console.log('🔄 fetchConversations: Sohbetler yükleniyor...');
      setLoading(true);
      const response = await apiService.getConversations();

      console.log('📡 fetchConversations: API Response:', response);

      if (response.success) {
        console.log('✅ fetchConversations: Sohbetler yüklendi, sayı:', response.data?.length || 0);
        setConversations(response.data || []);
      } else {
        console.log('❌ fetchConversations: API success false:', response);
        setConversations([]);
      }
    } catch (error) {
      console.error('❌ fetchConversations: Hata:', error);
      setConversations([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchConversations();
    setRefreshing(false);
  }, [fetchConversations]);

  useEffect(() => {
    fetchConversations();
  }, []); // Sadece component mount olduğunda çalışsın

  useFocusEffect(
    useCallback(() => {
      // Sadece focus olduğunda bir kez çalışsın
      fetchConversations();
    }, []) // fetchConversations dependency'sini kaldır
  );

  const filteredConversations = conversations.filter(conv => {
    console.log('🔍 Filtering conversation:', {
      _id: conv._id,
      otherParticipant: conv.otherParticipant,
      hasName: !!conv.otherParticipant?.name,
      hasSurname: !!conv.otherParticipant?.surname,
      searchQuery: searchQuery
    });
    
    const isValid = conv.otherParticipant && 
      conv.otherParticipant.name && 
      conv.otherParticipant.surname &&
      (conv.otherParticipant.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
       conv.otherParticipant.surname.toLowerCase().includes(searchQuery.toLowerCase()));
    
    console.log('🔍 Conversation filter result:', isValid);
    return isValid;
  });

  console.log('📊 Conversations state:', {
    total: conversations.length,
    filtered: filteredConversations.length,
    searchQuery: searchQuery
  });

  const formatLastMessageTime = (dateString?: string) => {
    if (!dateString) return '';
    
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 1) return 'Az önce';
    if (diffInHours < 24) return `${Math.floor(diffInHours)}s`;
    if (diffInHours < 48) return 'Dün';
    return date.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit' });
  };

  const handleConversationPress = (conversation: Conversation) => {
    navigation.navigate('ChatScreen', {
      conversationId: conversation._id,
      otherParticipant: conversation.otherParticipant,
    });
  };

  const handleNewMessage = () => {
    navigation.navigate('NewMessage');
  };

  const renderConversation = ({ item }: { item: Conversation }) => {
    console.log('🎨 Rendering conversation:', {
      _id: item._id,
      otherParticipant: item.otherParticipant,
      lastMessage: item.lastMessage,
      unreadCount: item.unreadCount
    });
    
    return (
      <TouchableOpacity
        style={styles.conversationCard}
        onPress={() => handleConversationPress(item)}
        activeOpacity={0.7}
      >
        <View style={styles.avatarContainer}>
          {item.otherParticipant.avatar ? (
            <Image source={{ uri: item.otherParticipant.avatar }} style={styles.avatar} />
          ) : (
            <View style={styles.defaultAvatar}>
              <Ionicons name="person" size={24} color={colors.text.tertiary} />
            </View>
          )}
          {item.unreadCount > 0 && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadBadgeText}>
                {item.unreadCount > 99 ? '99+' : item.unreadCount}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.conversationContent}>
          <View style={styles.conversationHeader}>
            <Text style={styles.participantName}>
              {item.otherParticipant.name} {item.otherParticipant.surname}
            </Text>
            <Text style={styles.lastMessageTime}>
              {formatLastMessageTime(item.lastMessageAt)}
            </Text>
          </View>

          {item.lastMessage ? (
            <View style={styles.lastMessageContainer}>
              <Text style={styles.lastMessageText} numberOfLines={2}>
                {item.lastMessage.content}
              </Text>
              {item.unreadCount > 0 && (
                <View style={styles.unreadIndicator} />
              )}
            </View>
          ) : (
            <Text style={styles.noMessageText}>Henüz mesaj yok</Text>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <LoadingSpinner />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background.primary} />
      
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Mesajlar</Text>
        <TouchableOpacity
          style={styles.newMessageButton}
          onPress={handleNewMessage}
          activeOpacity={0.7}
        >
          <Ionicons name="add" size={24} color={colors.primary.main} />
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <Input
          placeholder="Sohbet ara..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          leftIcon="search"
        />
      </View>

      {/* Conversations List */}
      {(() => {
        console.log('🎯 FlatList render decision:', {
          filteredConversationsLength: filteredConversations.length,
          conversationsLength: conversations.length,
          searchQuery: searchQuery,
          willShowFlatList: filteredConversations.length > 0
        });
        
        return filteredConversations.length > 0 ? (
          <FlatList
            data={filteredConversations}
            renderItem={renderConversation}
            keyExtractor={(item) => item._id}
            style={styles.conversationsList}
            contentContainerStyle={styles.conversationsContainer}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
          />
        ) : (
          <View style={styles.emptyContainer}>
            {searchQuery ? (
              <EmptyState
                icon="search"
                title="Sonuç Bulunamadı"
                subtitle={`"${searchQuery}" için sohbet bulunamadı`}
                actionText="Aramayı Temizle"
                onActionPress={() => setSearchQuery('')}
              />
            ) : (
              <EmptyState
                icon="chatbubbles-outline"
                title="Henüz Mesaj Yok"
                subtitle="Müşterilerinizle sohbet etmeye başlayın"
                actionText="Yeni Mesaj"
                onActionPress={handleNewMessage}
              />
            )}
          </View>
        );
      })()}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: themeDimensions.screenPadding,
    paddingVertical: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.primary,
  },
  headerTitle: {
    fontSize: typography.h2.fontSize,
    fontWeight: '700',
    color: colors.text.primary as any,
  },
  newMessageButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary.ultraLight,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.primary.main,
  },
  searchContainer: {
    paddingHorizontal: themeDimensions.screenPadding,
    paddingVertical: spacing.md,
  },
  conversationsList: {
    flex: 1,
  },
  conversationsContainer: {
    paddingHorizontal: themeDimensions.screenPadding,
    paddingBottom: spacing.lg,
  },
  conversationCard: {
    flexDirection: 'row',
    backgroundColor: colors.background.card,
    borderRadius: borderRadius.card,
    padding: spacing.md,
    marginBottom: spacing.sm,
    ...shadows.card,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: spacing.md,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
  } as any,
  defaultAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: colors.background.secondary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border.secondary,
  },
  unreadBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: colors.error.main,
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xs,
  },
  unreadBadgeText: {
    color: colors.text.inverse,
    fontSize: typography.caption.small.fontSize,
    fontWeight: '700',
  },
  conversationContent: {
    flex: 1,
  },
  conversationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  participantName: {
    fontSize: typography.body1.fontSize,
    fontWeight: '600',
    color: colors.text.primary as any,
  },
  lastMessageTime: {
    fontSize: typography.caption.large.fontSize,
    color: colors.text.tertiary,
  },
  lastMessageContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  lastMessageText: {
    flex: 1,
    fontSize: typography.body2.fontSize,
    color: colors.text.secondary,
    lineHeight: 20,
  },
  unreadIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary.main,
    marginLeft: spacing.sm,
  },
  noMessageText: {
    fontSize: typography.body2.fontSize,
    color: colors.text.tertiary,
    fontStyle: 'italic',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: themeDimensions.screenPadding,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background.primary,
  },
});

export default MessagesScreen;
