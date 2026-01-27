import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, FlatList, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Send } from 'lucide-react-native';
import { ChatService } from '../services/chatService';
import { UserService } from '../services/userService';
import { useAuth } from '../auth/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { ChatMessage, User } from '../types';

type RootStackParamList = {
  Chat: { userId: string; userName?: string };
};

type ChatScreenRouteProp = RouteProp<RootStackParamList, 'Chat'>;

export const ChatScreen = () => {
  const route = useRoute<ChatScreenRouteProp>();
  const navigation = useNavigation();
  const { userId, userName: initialUserName } = route.params;
  const { user: currentUser } = useAuth();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const [chatUser, setChatUser] = useState<User | null>(null);
  
  const flatListRef = useRef<FlatList<ChatMessage>>(null);

  useEffect(() => {
    fetchChatUser();
    fetchMessages();
    const interval = setInterval(fetchMessages, 3000); // Poll every 3s
    return () => clearInterval(interval);
  }, [userId]);

  const fetchChatUser = async () => {
    if (initialUserName) return;
    try {
      const userData = await UserService.getById(userId);
      setChatUser(userData);
    } catch (error) {
      console.error('Failed to fetch chat user', error);
    }
  };

  const fetchMessages = async () => {
    try {
      const data = await ChatService.getMessages(userId);
      setMessages(data);
      // Mark as read
      await ChatService.markAsRead(userId);
    } catch (error) {
      console.error('Failed to fetch messages', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async () => {
    if (!inputText.trim()) return;
    
    const tempText = inputText;
    setInputText(''); // Optimistic clear
    setSending(true);

    try {
      await ChatService.sendMessage(userId, tempText);
      await fetchMessages();
    } catch (error) {
      console.error('Failed to send message', error);
      setInputText(tempText); // Restore on error
    } finally {
      setSending(false);
    }
  };

  const renderItem = ({ item }: { item: ChatMessage }) => {
    const isMe = item.senderId === currentUser?.id;
    const date = item.createdAt ? new Date(item.createdAt) : new Date();
    const isValidDate = !isNaN(date.getTime());

    return (
      <View style={[
        styles.messageBubble, 
        isMe ? { backgroundColor: theme.primary, borderBottomRightRadius: 2 } : { backgroundColor: theme.card, borderBottomLeftRadius: 2 },
        isMe ? styles.myMessage : styles.otherMessage
      ]}>
        <Text style={[styles.messageText, { color: isMe ? '#fff' : theme.text }]}>{item.content}</Text>
        <Text style={[styles.timestamp, isMe ? { color: 'rgba(255, 255, 255, 0.7)' } : { color: theme.subtext }]}>
          {isValidDate ? date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
        </Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top', 'left', 'right']}>
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <ArrowLeft color={theme.text} size={24} />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={[styles.headerTitle, { color: theme.text }]}>{chatUser?.name || initialUserName || 'Chat'}</Text>
          <Text style={[styles.headerSubtitle, { color: theme.subtext }]}>{chatUser?.profile || 'Usuário'}</Text>
        </View>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <View style={[styles.content, { paddingBottom: insets.bottom }]}>
          {loading ? (
            <View style={styles.center}>
              <ActivityIndicator size="large" color={theme.primary} />
            </View>
          ) : (
            <FlatList
              ref={flatListRef}
              data={messages}
              renderItem={renderItem}
              keyExtractor={item => item.id}
              contentContainerStyle={styles.list}
              inverted={false}
              onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
              onLayout={() => flatListRef.current?.scrollToEnd({ animated: true })}
            />
          )}

          <View style={[styles.inputContainer, { backgroundColor: theme.background, borderTopColor: theme.border }]}>
            <TextInput
              style={[styles.input, { backgroundColor: theme.card, color: theme.text }]}
              value={inputText}
              onChangeText={setInputText}
              placeholder="Digite sua mensagem..."
              placeholderTextColor={theme.subtext}
              multiline
            />
            <TouchableOpacity
              style={[styles.sendButton, { backgroundColor: theme.primary }, (!inputText.trim() || sending) && styles.disabledSend]}
              onPress={handleSend}
              disabled={!inputText.trim() || sending}
            >
              {sending ? <ActivityIndicator color="#fff" size="small" /> : <Send color="#fff" size={20} />}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111827',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1f2937',
    gap: 12,
  },
  backButton: {
    padding: 4,
  },
  headerInfo: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#9ca3af',
  },
  content: {
    flex: 1,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  list: {
    padding: 16,
    gap: 12,
    flexGrow: 1,
    justifyContent: 'flex-end',
  },
  messageBubble: {
    padding: 12,
    borderRadius: 12,
    maxWidth: '80%',
    marginBottom: 4,
  },
  myMessage: {
    backgroundColor: '#3b82f6',
    alignSelf: 'flex-end',
    borderBottomRightRadius: 2,
  },
  otherMessage: {
    backgroundColor: '#374151',
    alignSelf: 'flex-start',
    borderBottomLeftRadius: 2,
  },
  messageText: {
    color: '#fff',
    fontSize: 14,
    lineHeight: 20,
  },
  timestamp: {
    fontSize: 10,
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  myTimestamp: {
    color: 'rgba(255, 255, 255, 0.7)',
  },
  otherTimestamp: {
    color: '#9ca3af',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: '#1f2937',
    backgroundColor: '#111827',
    gap: 12,
  },
  input: {
    flex: 1,
    backgroundColor: '#1f2937',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    color: '#fff',
    maxHeight: 100,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#3b82f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  disabledSend: {
    opacity: 0.5,
  },
});
