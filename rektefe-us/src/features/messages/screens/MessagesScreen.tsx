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
import { useAuth } from '@/shared/context';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, colorStrings, typography, spacing, borderRadius, shadows, dimensions as themeDimensions } from '@/shared/theme';
import { Button, Card, LoadingSpinner, EmptyState, Input, BackButton } from '@/shared/components';
import apiService from '@/shared/services';

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
  const { token, userId, isAuthenticated } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchConversations = useCallback(async () => {
    try {
      setLoading(true);
      const response = await apiService.MessageService.getConversations();

      if (response.success) {
        setConversations(response.data?.conversations || []);
      } else {
        setConversations([]);
      }
    } catch (error) {
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
    if (isAuthenticated) {
      fetchConversations();
    }
  }, [isAuthenticated]); // isAuthenticated değiştiğinde çalışsın

  useFocusEffect(
    useCallback(() => {
      // Focus olduğunda veri yükle
      if (isAuthenticated) {
        fetchConversations();
      }
    }, [isAuthenticated, fetchConversations])
  );

  // Her 30 saniyede bir conversation'ları yenile (daha az sıklıkta)
  useEffect(() => {
    if (!isAuthenticated) return;
    
    const interval = setInterval(() => {
      fetchConversations();
    }, 30000); // 30 saniye
    
    return () => clearInterval(interval);
  }, [isAuthenticated, fetchConversations]);

  const filteredConversations = conversations.filter(conv =>
    conv.otherParticipant && 
    conv.otherParticipant.name && 
    conv.otherParticipant.surname &&
    (conv.otherParticipant.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
     conv.otherParticipant.surname.toLowerCase().includes(searchQuery.toLowerCase()))
  );

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
    navigation.navigate('Chat', {
      conversationId: conversation._id,
      otherParticipant: conversation.otherParticipant,
    });
  };

  const renderConversationItem = ({ item }: { item: Conversation }) => {
    // otherParticipant null check
    if (!item.otherParticipant || !item.otherParticipant.name || !item.otherParticipant.surname) {
      return null;
    }

    const hasUnread = item.unreadCount > 0;
    
    return (
      <TouchableOpacity
        onPress={() => handleConversationPress(item)}
        style={styles.conversationCard}
        activeOpacity={0.7}
      >
        <View style={styles.conversationContent}>
          {/* Avatar */}
          <View style={styles.avatarContainer}>
            {item.otherParticipant.avatar ? (
              <Image
                source={{ uri: item.otherParticipant.avatar }}
                style={styles.avatar}
              />
            ) : (
              <View style={styles.defaultAvatar}>
                <Ionicons name="person" size={20} color={colorStrings.text.tertiary} />
              </View>
            )}
            {hasUnread && <View style={styles.unreadIndicator} />}
          </View>

          {/* Content */}
          <View style={styles.contentContainer}>
            <View style={styles.headerRow}>
              <Text style={styles.participantName}>
                {item.otherParticipant.name} {item.otherParticipant.surname}
              </Text>
              <Text style={styles.lastMessageTime}>
                {formatLastMessageTime(item.lastMessageAt)}
              </Text>
            </View>
            
            <Text style={[
              styles.lastMessage,
              hasUnread && styles.unreadMessage
            ]} numberOfLines={2}>
              {item.lastMessage?.content || 'Henüz mesaj yok'}
            </Text>
          </View>

          {/* Unread Count */}
          {hasUnread && (
            <View style={styles.unreadCountContainer}>
              <Text style={styles.unreadCountText}>
                {item.unreadCount > 99 ? '99+' : item.unreadCount}
              </Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <LoadingSpinner />
          <Text style={styles.loadingText}>Mesajlar yükleniyor...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={colorStrings.background.primary} />
      
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <BackButton />
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>Mesajlar</Text>
          </View>
          <TouchableOpacity
            style={styles.newMessageButton}
            onPress={() => navigation.navigate('NewMessage')}
          >
            <Ionicons name="add" size={24} color={colorStrings.primary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <Input
          placeholder="Mesajlarda ara..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          leftIcon="search"
          style={styles.searchInput}
        />
      </View>

      {/* Conversations List */}
      {filteredConversations.length > 0 ? (
        <FlatList
          data={filteredConversations}
          renderItem={renderConversationItem}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
            colors={[colorStrings.primary]}
            tintColor={colorStrings.primary}
            />
          }
        />
      ) : (
        <View style={styles.emptyContainer}>
          <EmptyState
            icon="chatbubbles-outline"
            title={searchQuery ? 'Sonuç bulunamadı' : 'Henüz mesaj yok'}
            subtitle={
              searchQuery 
                ? 'Arama kriterlerinize uygun mesaj bulunamadı'
                : 'Müşterilerle sohbet etmeye başlayın'
            }
            actionText="Yeni Mesaj"
            onActionPress={() => navigation.navigate('NewMessage')}
          />
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colorStrings.background.primary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: typography.body2.fontSize,
    color: colorStrings.text.secondary,
    marginTop: spacing.md,
  },
  header: {
    paddingHorizontal: themeDimensions.screenPadding,
    paddingVertical: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colorStrings.border.primary,
    backgroundColor: colorStrings.background.primary,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerContent: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: typography.h1.fontSize,
    fontWeight: '700',
    color: colorStrings.text.primary,
  },
  newMessageButton: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.round,
    backgroundColor: colorStrings.background.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colorStrings.primary,
  },
  searchContainer: {
    paddingHorizontal: themeDimensions.screenPadding,
    paddingVertical: spacing.md,
    backgroundColor: colorStrings.background.primary,
  },
  searchInput: {
    marginBottom: 0,
  },
  listContainer: {
    paddingHorizontal: themeDimensions.screenPadding,
    paddingBottom: spacing.xxl,
  },
  conversationCard: {
    backgroundColor: colorStrings.background.secondary,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    marginHorizontal: themeDimensions.screenPadding,
    borderWidth: 1,
    borderColor: colorStrings.border.secondary,
    shadowColor: colorStrings.shadow.primary,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  conversationContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    position: 'relative',
    marginRight: spacing.md,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.avatar,
  },
  defaultAvatar: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.avatar,
    backgroundColor: colorStrings.background.tertiary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colorStrings.border.primary,
  },
  unreadIndicator: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colorStrings.primary,
    borderWidth: 2,
    borderColor: colorStrings.background.primary,
  },
  contentContainer: {
    flex: 1,
    marginRight: spacing.sm,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  participantName: {
    fontSize: typography.body2.fontSize,
    fontWeight: '600',
    color: colorStrings.text.primary,
    flex: 1,
  },
  lastMessageTime: {
    fontSize: typography.caption.large.fontSize,
    color: colorStrings.text.tertiary,
  },
  lastMessage: {
    fontSize: typography.body3.fontSize,
    color: colorStrings.text.secondary,
    lineHeight: 20,
  },
  unreadMessage: {
    color: colorStrings.text.primary,
    fontWeight: '500',
  },
  unreadCountContainer: {
    backgroundColor: colorStrings.primary,
    borderRadius: borderRadius.round,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xs,
  },
  unreadCountText: {
    fontSize: typography.caption.small.fontSize,
    fontWeight: '700',
    color: colorStrings.text.inverse,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: themeDimensions.screenPadding,
  },
});

export default MessagesScreen;
