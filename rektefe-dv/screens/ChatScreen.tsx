import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
  StatusBar,
  Image
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

import { API_URL } from '../constants/config';

type Message = {
  _id: string;
  content: string;
  messageType: string;
  createdAt: string;
  senderId: {
    _id: string;
    name: string;
    surname: string;
    avatar?: string;
  };
  receiverId: {
    _id: string;
    name: string;
    surname: string;
    avatar?: string;
  };
};

type ChatScreenProps = {
  route: {
    params: {
      conversationId: string;
      otherParticipant: {
        _id: string;
        name: string;
        surname: string;
        avatar?: string;
        userType: string;
      };
    };
  };
  navigation: any;
};

const ChatScreen = ({ route, navigation }: ChatScreenProps) => {
  const { theme } = useTheme();
  const { token, userId } = useAuth();
  const { conversationId, otherParticipant } = route.params;
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [lastMessageId, setLastMessageId] = useState<string | null>(null);
  const flatListRef = useRef<FlatList>(null);
  const inputRef = useRef<TextInput>(null);

  const fetchMessages = useCallback(async (pageNum: number = 1, append: boolean = false) => {
    // Geçici conversation ID ise mesaj çekme
    if (conversationId.startsWith('temp_')) {
      setMessages([]);
      setHasMore(false);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(
        `${API_URL}/messages/conversation/${conversationId}/messages?page=${pageNum}&limit=50`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.ok) {
        const data = await response.json();
        const newMessages = data.data.messages || [];
        
        if (append) {
          // Eski mesajları listenin sonuna ekle (inverted=true olduğu için)
          setMessages(prev => [...prev, ...newMessages]);
        } else {
          // İlk yükleme - mesajları ters çevir (en yeni altta olsun)
          setMessages([...newMessages].reverse());
        }
        
        setHasMore(data.data.pagination.page < data.data.pagination.pages);
        setPage(pageNum);
      } else {
        console.error('Mesajlar getirilemedi:', response.status);
      }
    } catch (error) {
      console.error('Mesajlar yüklenirken hata:', error);
    } finally {
      setLoading(false);
    }
  }, [conversationId, token]);

  // Yeni mesajları kontrol et
  const checkNewMessages = useCallback(async () => {
    // Geçici conversation ID ise yeni mesaj kontrol etme
    if (conversationId.startsWith('temp_') || !lastMessageId || loading) return;
    
    try {
      const response = await fetch(
        `${API_URL}/messages/conversation/${conversationId}/messages?after=${lastMessageId}&limit=10`,
        {
          headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json"
          }
        }
      );

      if (response.ok) {
        const data = await response.json();
        const newMessages = data.data.messages || [];
        
        if (newMessages.length > 0) {
          // Yeni mesajları listenin başına ekle (inverted=true olduğu için)
          setMessages(prev => [...newMessages, ...prev]);
          
          // Otomatik olarak en alta kaydır (yeni mesajlar görünsün)
          setTimeout(() => {
            flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
          }, 100);
        }
      }
    } catch (error) {
      // Sessiz hata handling
    }
  }, [conversationId, lastMessageId, loading, token]);

  const sendMessage = async () => {
    if (!newMessage.trim() || sending) return;

    try {
      setSending(true);
      const response = await fetch(`${API_URL}/messages/send`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          receiverId: otherParticipant._id,
          content: newMessage.trim(),
          messageType: 'text'
        })
      });

      if (response.ok) {
        const data = await response.json();
        const sentMessage = data.data;
        
        // Mesajı listenin başına ekle (inverted=true olduğu için)
        setMessages(prev => [{
          ...sentMessage,
          senderId: {
            _id: userId,
            name: 'Sen',
            surname: '',
            avatar: undefined
          },
          receiverId: {
            _id: otherParticipant._id,
            name: otherParticipant.name,
            surname: otherParticipant.surname,
            avatar: otherParticipant.avatar
          }
        }, ...prev]);
        
        setNewMessage('');
        
        // Otomatik olarak en alta kaydır (yeni mesaj görünsün)
        setTimeout(() => {
          flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
        }, 100);
      } else {
        Alert.alert('Hata', 'Mesaj gönderilemedi');
      }
    } catch (error) {
      console.error('Mesaj gönderilirken hata:', error);
      Alert.alert('Hata', 'Mesaj gönderilemedi');
    } finally {
      setSending(false);
    }
  };

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  useFocusEffect(
    useCallback(() => {
      fetchMessages();
      
      // Geçici conversation ID ise interval başlatma
      if (conversationId.startsWith('temp_')) {
        return;
      }
      
      // Her 3 saniyede bir yeni mesajları kontrol et
      const interval = setInterval(checkNewMessages, 3000);
      
      return () => {
        clearInterval(interval);
      };
    }, [fetchMessages, checkNewMessages, conversationId])
  );

  const loadMoreMessages = () => {
    // Geçici conversation ID ise daha fazla mesaj yükleme
    if (conversationId.startsWith('temp_') || hasMore && !loading) {
      return;
    }
    
    if (hasMore && !loading) {
      fetchMessages(page + 1, true);
    }
  };

  const formatMessageTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('tr-TR', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isOwnMessage = item.senderId._id === userId;
    
    return (
      <View style={[
        styles.messageContainer,
        isOwnMessage ? styles.ownMessage : styles.otherMessage
      ]}>
        <View style={[
          styles.messageBubble,
          isOwnMessage 
            ? [styles.ownMessageBubble, { backgroundColor: theme.colors.primary }]
            : [styles.otherMessageBubble, { backgroundColor: theme.colors.surface }]
        ]}>
          <Text style={[
            styles.messageText,
            { color: isOwnMessage ? '#FFFFFF' : theme.colors.text }
          ]}>
            {item.content}
          </Text>
          <Text style={[
            styles.messageTime,
            { color: isOwnMessage ? 'rgba(255, 255, 255, 0.7)' : theme.colors.textTertiary }
          ]}>
            {formatMessageTime(item.createdAt)}
          </Text>
        </View>
      </View>
    );
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => navigation.goBack()}
      >
        <MaterialCommunityIcons name="arrow-left" size={24} color="#FFFFFF" />
      </TouchableOpacity>
      
      <View style={styles.headerInfo}>
        <View style={styles.participantInfo}>
          {otherParticipant.avatar ? (
            <Image source={{ uri: otherParticipant.avatar }} style={styles.participantAvatar} />
          ) : (
            <View style={styles.defaultParticipantAvatar}>
              <Text style={styles.defaultParticipantAvatarText}>
                {otherParticipant.name.charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
          <View style={styles.participantDetails}>
            <Text style={styles.headerName}>
              {otherParticipant.name} {otherParticipant.surname}
            </Text>
            <Text style={styles.headerType}>
              {otherParticipant.userType === 'mechanic' ? 'Usta' : 'Müşteri'}
            </Text>
          </View>
        </View>
      </View>
      
      <TouchableOpacity
        style={styles.moreButton}
        onPress={() => {
          Alert.alert(
            'Sohbet Seçenekleri',
            'Ne yapmak istiyorsunuz?',
            [
              { text: 'İptal', style: 'cancel' },
              { 
                text: 'Sohbeti Sil', 
                style: 'destructive',
                onPress: () => {
                  Alert.alert(
                    'Sohbeti Sil',
                    'Bu sohbeti silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.',
                    [
                      { text: 'İptal', style: 'cancel' },
                      { 
                        text: 'Sil', 
                        style: 'destructive',
                        onPress: () => {
                          // TODO: Sohbeti sil
                          navigation.goBack();
                        }
                      }
                    ]
                  );
                }
              }
            ]
          );
        }}
      >
        <MaterialCommunityIcons name="dots-vertical" size={24} color="#FFFFFF" />
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <StatusBar barStyle="light-content" backgroundColor="#1F2937" />
      
      {renderHeader()}

      <KeyboardAvoidingView 
        style={styles.content}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.messagesList}
          showsVerticalScrollIndicator={false}
          inverted={true}
          onEndReached={loadMoreMessages}
          onEndReachedThreshold={0.1}
          ListHeaderComponent={
            hasMore && (
              <View style={styles.loadMoreContainer}>
                <TouchableOpacity
                  style={styles.loadMoreButton}
                  onPress={loadMoreMessages}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator size="small" color={theme.colors.primary} />
                  ) : (
                    <Text style={[styles.loadMoreText, { color: theme.colors.primary }]}>
                      Daha Fazla Mesaj Yükle
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            )
          }
          ListFooterComponent={
            messages.length > 0 && (
              <View style={styles.scrollToBottomContainer}>
                <TouchableOpacity
                  style={styles.scrollToBottomButton}
                  onPress={() => {
                    flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
                  }}
                >
                  <MaterialCommunityIcons name="arrow-down" size={20} color="#FFFFFF" />
                  <Text style={styles.scrollToBottomText}>En Alta Git</Text>
                </TouchableOpacity>
              </View>
            )
          }
        />

        <View style={styles.inputContainer}>
          <TextInput
            ref={inputRef}
            style={[styles.textInput, { 
              backgroundColor: theme.colors.surface,
              color: theme.colors.text,
              borderColor: theme.colors.border
            }]}
            placeholder="Mesajınızı yazın..."
            placeholderTextColor={theme.colors.textTertiary}
            value={newMessage}
            onChangeText={setNewMessage}
            multiline
            maxLength={1000}
            onSubmitEditing={sendMessage}
          />
          <TouchableOpacity
            style={[
              styles.sendButton,
              { 
                backgroundColor: newMessage.trim() && !sending ? theme.colors.primary : theme.colors.border 
              }
            ]}
            onPress={sendMessage}
            disabled={!newMessage.trim() || sending}
          >
            {sending ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <MaterialCommunityIcons name="send" size={20} color="#FFFFFF" />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#1F2937',
  },
  backButton: {
    marginRight: 16,
  },
  headerInfo: {
    flex: 1,
  },
  participantInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  participantAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  defaultParticipantAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  defaultParticipantAvatarText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  participantDetails: {
    flex: 1,
  },
  headerName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  headerType: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    marginTop: 2,
  },
  moreButton: {
    padding: 8,
  },
  content: {
    flex: 1,
  },
  messagesList: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  loadMoreContainer: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  loadMoreButton: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
  },
  loadMoreText: {
    fontSize: 14,
    fontWeight: '500',
  },
  messageContainer: {
    marginVertical: 4,
  },
  ownMessage: {
    alignItems: 'flex-end',
  },
  otherMessage: {
    alignItems: 'flex-start',
  },
  messageBubble: {
    maxWidth: '80%',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
  },
  ownMessageBubble: {
    borderBottomRightRadius: 4,
  },
  otherMessageBubble: {
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
    marginBottom: 4,
  },
  messageTime: {
    fontSize: 12,
    alignSelf: 'flex-end',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 12,
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    maxHeight: 100,
    fontSize: 16,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollToBottomContainer: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  scrollToBottomButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
  },
  scrollToBottomText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 8,
  },
});

export default ChatScreen;
