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
  StatusBar,
  Image,
  Animated,
  Modal,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography, spacing, borderRadius, shadows, dimensions as themeDimensions } from '../theme/theme';

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
  const [showOptionsModal, setShowOptionsModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const inputRef = useRef<TextInput>(null);
  
  // Animasyon değerleri
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  const fetchMessages = useCallback(async () => {
    // Geçici conversation ID ise mesaj çekme
    if (conversationId.startsWith('temp_')) {
      setMessages([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(
        `${API_URL}/message/conversations/${conversationId}/messages?page=1&limit=50`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data) {
          const newMessages = Array.isArray(data.data) ? data.data : (data.data.messages || []);
          
          // Mesajları tarihe göre sırala (en eski üstte, en yeni altta)
          const sortedMessages = [...newMessages].sort((a, b) => {
            const dateA = new Date(a.createdAt || a.created_at || 0);
            const dateB = new Date(b.createdAt || b.created_at || 0);
            return dateA.getTime() - dateB.getTime();
          });
          
          setMessages(sortedMessages);
          
          // Mesajları okundu olarak işaretle
          markMessagesAsRead();
        } else {
          console.error('API response formatı hatalı:', data);
        }
      } else {
        console.error('Mesajlar getirilemedi:', response.status);
      }
    } catch (error) {
      console.error('Mesajlar yüklenirken hata:', error);
    } finally {
      setLoading(false);
    }
  }, [conversationId]); // ✅ Sadece conversationId değiştiğinde çalışsın

  // Mesajları okundu olarak işaretle
  const markMessagesAsRead = async () => {
    try {
      const response = await fetch(`${API_URL}/message/mark-read`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          conversationId: conversationId,
          userId: userId
        })
      });

      if (response.ok) {
        console.log('✅ Mesajlar okundu olarak işaretlendi');
      }
    } catch (error) {
      console.error('❌ Mesajları okundu olarak işaretlerken hata:', error);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || sending) return;

    try {
      setSending(true);
      const response = await fetch(`${API_URL}/message/send`, {
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
        const sentMessage = await response.json();
        if (sentMessage.success) {
          // Yeni mesajı listeye ekle
          const newMessageObj: Message = {
            _id: sentMessage.data._id,
            content: newMessage,
            messageType: 'text',
            createdAt: sentMessage.data.createdAt,
            senderId: {
              _id: userId!,
              name: 'Şöför', // ✅ Doğru etiket
              surname: ''
            },
            receiverId: {
              _id: otherParticipant._id,
              name: otherParticipant.name,
              surname: otherParticipant.surname
            }
          };
          
          setMessages(prev => [...prev, newMessageObj]);
          setNewMessage('');
          
          // Mesajı okundu olarak işaretle
          markMessagesAsRead();
        }
      }
    } catch (error) {
      console.error('Mesaj gönderilirken hata:', error);
      Alert.alert('Hata', 'Mesaj gönderilemedi');
    } finally {
      setSending(false);
    }
  };

  const deleteConversation = async () => {
    try {
      setDeleting(true);
      setShowOptionsModal(false);
      
      const response = await fetch(`${API_URL}/message/conversations/${conversationId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        Alert.alert(
          'Sohbet Silindi',
          'Sohbet başarıyla silindi',
          [
            {
              text: 'Tamam',
              onPress: () => navigation.goBack()
            }
          ]
        );
      } else {
        Alert.alert('Hata', 'Sohbet silinirken hata oluştu');
      }
    } catch (error) {
      console.error('Sohbet silinirken hata:', error);
      Alert.alert('Hata', 'Sohbet silinirken hata oluştu');
    } finally {
      setDeleting(false);
    }
  };

  const showDeleteConfirmation = () => {
    Alert.alert(
      'Sohbeti Sil',
      'Bu sohbeti silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.',
      [
        {
          text: 'İptal',
          style: 'cancel'
        },
        {
          text: 'Sil',
          style: 'destructive',
          onPress: deleteConversation
        }
      ]
    );
  };

  useEffect(() => {
    fetchMessages();
    
    // Giriş animasyonu
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (!conversationId.startsWith('temp_')) {
        fetchMessages();
      }
    }, []) // ✅ Dependency array'i boş bırak - sadece ekran odaklandığında çalışsın
  );

  const formatMessageTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('tr-TR', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const renderMessage = ({ item, index }: { item: Message; index: number }) => {
    const isOwnMessage = item.senderId._id === userId;
    
    return (
      <Animated.View 
        style={[
          styles.messageContainer,
          isOwnMessage ? styles.ownMessage : styles.otherMessage,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          }
        ]}
      >
        <View style={[
          styles.messageBubble,
          isOwnMessage ? styles.ownBubble : styles.otherBubble
        ]}>
          <Text style={[
            styles.messageText,
            isOwnMessage ? styles.ownMessageText : styles.otherMessageText
          ]}>
            {item.content}
          </Text>
          <View style={styles.messageFooter}>
            <Text style={[
              styles.messageTime,
              isOwnMessage ? styles.ownMessageTime : styles.otherMessageTime
            ]}>
              {formatMessageTime(item.createdAt)}
            </Text>
            {isOwnMessage && (
              <View style={styles.readIndicator}>
                <Ionicons 
                  name="checkmark-done" 
                  size={14} 
                  color={colors.primary.main} 
                />
              </View>
            )}
          </View>
        </View>
      </Animated.View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Mesajlar yükleniyor...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background.primary} />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-back" size={24} color={colors.text.primary as any} />
        </TouchableOpacity>
        
        <View style={styles.headerInfo}>
          {otherParticipant.avatar ? (
            <Image source={{ uri: otherParticipant.avatar }} style={styles.headerAvatar} />
          ) : (
            <View style={styles.headerDefaultAvatar}>
              <Ionicons name="person" size={20} color={colors.text.tertiary} />
            </View>
          )}
          <View style={styles.headerText}>
            <Text style={styles.headerName}>
              {otherParticipant.name} {otherParticipant.surname}
            </Text>
            <View style={styles.userTypeContainer}>
              <Text style={[
                styles.userTypeText,
                otherParticipant.userType === 'usta' || otherParticipant.userType === 'mechanic' ? styles.mechanicType : styles.driverType
              ]}>
                {otherParticipant.userType === 'usta' || otherParticipant.userType === 'mechanic' ? 'Usta' : 'Usta'}
              </Text>
            </View>
          </View>
        </View>
        
        <TouchableOpacity 
          style={styles.moreButton} 
          activeOpacity={0.7}
          onPress={() => setShowOptionsModal(true)}
        >
          <Ionicons name="ellipsis-vertical" size={20} color={colors.text.secondary} />
        </TouchableOpacity>
      </View>

      {/* Messages */}
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item) => item._id}
        style={styles.messagesList}
        contentContainerStyle={styles.messagesContainer}
        showsVerticalScrollIndicator={false}

      />

      {/* Input */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.inputContainer}
      >
        <View style={styles.inputWrapper}>
          <TextInput
            ref={inputRef}
            style={styles.textInput}
            value={newMessage}
            onChangeText={setNewMessage}
            placeholder="Mesajınızı yazın..."
            placeholderTextColor={colors.text.tertiary}
            multiline
            maxLength={1000}
            onSubmitEditing={sendMessage}
          />
          
          <TouchableOpacity
            style={[
              styles.sendButton, 
              !newMessage.trim() && styles.sendButtonDisabled,
              sending && styles.sendButtonSending
            ]}
            onPress={sendMessage}
            disabled={!newMessage.trim() || sending}
            activeOpacity={0.8}
          >
            {sending ? (
              <View style={styles.sendingIndicator} />
            ) : (
              <Ionicons 
                name="send" 
                size={20} 
                color={newMessage.trim() ? colors.primary.main as any : colors.text.tertiary as any} 
              />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* Options Modal */}
      <Modal
        visible={showOptionsModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowOptionsModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowOptionsModal(false)}
        >
          <View style={styles.optionsModal}>
            <TouchableOpacity
              style={styles.optionItem}
              onPress={showDeleteConfirmation}
              activeOpacity={0.7}
            >
              <Ionicons name="trash-outline" size={20} color={colors.error.main} />
              <Text style={[styles.optionText, styles.deleteOptionText]}>
                Sohbeti Sil
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.optionItem}
              onPress={() => setShowOptionsModal(false)}
              activeOpacity={0.7}
            >
              <Ionicons name="close" size={20} color={colors.text.secondary} />
              <Text style={styles.optionText}>
                İptal
              </Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: typography.body2.fontSize,
    color: colors.text.secondary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: themeDimensions.screenPadding,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.primary,
    backgroundColor: colors.background.primary,
    shadowColor: colors.shadow.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.background.secondary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
    borderWidth: 1,
    borderColor: colors.border.secondary,
  },
  headerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  headerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: spacing.sm,
  },
  headerDefaultAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.background.secondary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border.secondary,
  },
  headerText: {
    flex: 1,
  },
  headerName: {
    fontSize: typography.body2.fontSize,
    fontWeight: '600',
    color: colors.text.primary as any,
    marginBottom: spacing.xs,
  },
  userTypeContainer: {
    marginTop: spacing.xs,
  },
  userTypeText: {
    fontSize: typography.caption.small.fontSize,
    fontWeight: '500',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    overflow: 'hidden',
    textAlign: 'center',
    alignSelf: 'flex-start',
  },
  mechanicType: {
    backgroundColor: colors.primary.ultraLight,
    color: colors.primary.main,
    borderWidth: 1,
    borderColor: colors.primary.main,
  },
  driverType: {
    backgroundColor: colors.success.background,
    color: colors.success.main,
    borderWidth: 1,
    borderColor: colors.success.main,
  },
  moreButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.background.secondary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border.secondary,
  },
  messagesList: {
    flex: 1,
  },
  messagesContainer: {
    paddingHorizontal: themeDimensions.screenPadding,
    paddingVertical: spacing.md,
  },
  messageContainer: {
    marginBottom: spacing.sm,
    flexDirection: 'row',
  },
  ownMessage: {
    justifyContent: 'flex-end',
  },
  otherMessage: {
    justifyContent: 'flex-start',
  },
  messageBubble: {
    maxWidth: '80%',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.lg,
    shadowColor: colors.shadow.primary,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  ownBubble: {
    backgroundColor: colors.primary.main,
    borderBottomRightRadius: borderRadius.sm,
  },
  otherBubble: {
    backgroundColor: colors.background.secondary,
    borderBottomLeftRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.border.secondary,
  },
  messageText: {
    fontSize: typography.body3.fontSize,
    lineHeight: 20,
    marginBottom: spacing.xs,
  },
  ownMessageText: {
    color: colors.text.inverse,
  },
  otherMessageText: {
    color: colors.text.primary as any,
  },
  messageFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  messageTime: {
    fontSize: typography.caption.small.fontSize,
    marginRight: spacing.xs,
  },
  ownMessageTime: {
    color: colors.text.inverse,
    opacity: 0.8,
  },
  otherMessageTime: {
    color: colors.text.tertiary,
  },
  readIndicator: {
    marginLeft: spacing.xs,
  },

  inputContainer: {
    borderTopWidth: 1,
    borderTopColor: colors.border.primary,
    backgroundColor: colors.background.primary,
    shadowColor: colors.shadow.primary,
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: themeDimensions.screenPadding,
    paddingVertical: spacing.md,
  },
  textInput: {
    flex: 1,
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginRight: spacing.sm,
    fontSize: typography.body2.fontSize,
    color: colors.text.primary as any,
    maxHeight: 100,
    borderWidth: 1,
    borderColor: colors.border.secondary,
    shadowColor: colors.shadow.primary,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary.ultraLight,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.primary.main,
    shadowColor: colors.shadow.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  sendButtonDisabled: {
    backgroundColor: colors.background.tertiary,
    borderColor: colors.border.secondary,
    shadowOpacity: 0,
    elevation: 0,
  },
  sendButtonSending: {
    backgroundColor: colors.background.tertiary,
    borderColor: colors.border.secondary,
  },
  sendingIndicator: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: colors.primary.main,
    borderTopColor: 'transparent',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionsModal: {
    backgroundColor: colors.background.primary,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    minWidth: 200,
    shadowColor: colors.shadow.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.md,
    marginBottom: spacing.xs,
  },
  optionText: {
    fontSize: typography.body2.fontSize,
    color: colors.text.primary as any,
    marginLeft: spacing.sm,
    fontWeight: '500',
  },
  deleteOptionText: {
    color: colors.error.main,
  },
});

export default ChatScreen;
