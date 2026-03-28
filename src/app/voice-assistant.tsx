/**
 * Voice Assistant Screen
 * Conversational AI interface with speech-to-text and action cards
 */
import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { colors, typography, spacing, shadows, borderRadius } from '../constants/theme';
import { useAIAssistant, type ConversationMessage } from '../hooks/useAIAssistant';
import type { AIToolResult } from '../services/aiAssistant';

// Action card for tool results
function ActionCard({ action }: { action: AIToolResult }) {
  const iconMap: Record<string, string> = {
    create_event: '📅',
    add_grocery_item: '🛒',
    log_expense: '💰',
    draft_message: '✉️',
    search_recipes: '🍳',
    add_maintenance_item: '🔧',
    find_local_service: '🏪',
    check_schedule_conflicts: '⏰',
    get_budget_status: '📊',
  };

  const icon = iconMap[action.action] || '✅';
  const isSuccess = action.result?.success;

  return (
    <View style={[styles.actionCard, !isSuccess && styles.actionCardError]}>
      <Text style={styles.actionIcon}>{icon}</Text>
      <View style={styles.actionContent}>
        <Text style={styles.actionTitle}>
          {action.result?.message || action.action.replace(/_/g, ' ')}
        </Text>
        {action.result?.budget_warning && (
          <View style={styles.budgetWarning}>
            <Text style={styles.budgetWarningText}>⚠️ {action.result.budget_warning}</Text>
          </View>
        )}
        {action.result?.requires_approval && (
          <View style={styles.approvalRow}>
            <TouchableOpacity style={styles.approveBtn}>
              <Text style={styles.approveBtnText}>Approve</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.editBtn}>
              <Text style={styles.editBtnText}>Edit</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
}

// Chat bubble component
function ChatBubble({ message }: { message: ConversationMessage }) {
  const isUser = message.role === 'user';

  if (message.isLoading) {
    return (
      <View style={[styles.bubble, styles.assistantBubble]}>
        <View style={styles.typingIndicator}>
          <ActivityIndicator size="small" color={colors.green[500]} />
          <Text style={styles.typingText}>Thinking...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.messageContainer}>
      <View style={[styles.bubble, isUser ? styles.userBubble : styles.assistantBubble]}>
        <Text style={[styles.bubbleText, isUser ? styles.userText : styles.assistantText]}>
          {message.content}
        </Text>
      </View>
      {message.actions && message.actions.length > 0 && (
        <View style={styles.actionsContainer}>
          {message.actions.map((action, idx) => (
            <ActionCard key={idx} action={action} />
          ))}
        </View>
      )}
    </View>
  );
}

// Pulse animation for the mic button
function PulseMicButton({ isListening, onPress }: { isListening: boolean; onPress: () => void }) {
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (isListening) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.2, duration: 600, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [isListening, pulseAnim]);

  return (
    <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
      <TouchableOpacity
        style={[styles.micButton, isListening && styles.micButtonActive]}
        onPress={onPress}
        activeOpacity={0.7}
      >
        <Text style={styles.micEmoji}>{isListening ? '🔴' : '🎙️'}</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

export default function VoiceAssistantScreen() {
  const router = useRouter();
  const { messages, isLoading, send } = useAIAssistant();
  const [inputText, setInputText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  // Auto-scroll on new messages
  useEffect(() => {
    if (scrollRef.current) {
      setTimeout(() => {
        scrollRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages]);

  const handleSend = async () => {
    if (!inputText.trim()) return;
    const text = inputText;
    setInputText('');
    await send(text);
  };

  const handleMicPress = () => {
    // Toggle listening state — actual speech recognition integration
    // would use expo-speech or @react-native-voice/voice here
    setIsListening(!isListening);

    if (isListening) {
      // Stop listening — in real implementation, finalize speech-to-text
      // and call send() with the transcribed text
    }
  };

  // Quick action chips
  const quickActions = [
    { label: "What's on my schedule?", icon: '📅' },
    { label: 'Add to grocery list', icon: '🛒' },
    { label: "What's for dinner?", icon: '🍳' },
    { label: 'Check my budget', icon: '💰' },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>HomeBase</Text>
          <Text style={styles.headerSubtitle}>Your family assistant</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView
        style={styles.content}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        {/* Messages */}
        <ScrollView
          ref={scrollRef}
          style={styles.messagesContainer}
          contentContainerStyle={styles.messagesContent}
          showsVerticalScrollIndicator={false}
        >
          {messages.length === 0 && (
            <View style={styles.welcomeContainer}>
              <Text style={styles.welcomeEmoji}>👋</Text>
              <Text style={styles.welcomeTitle}>Hi! I'm HomeBase</Text>
              <Text style={styles.welcomeText}>
                I can help with your schedule, expenses, groceries, recipes, maintenance, and more. Just ask!
              </Text>

              {/* Quick actions */}
              <View style={styles.quickActions}>
                {quickActions.map((action, idx) => (
                  <TouchableOpacity
                    key={idx}
                    style={styles.quickChip}
                    onPress={() => send(action.label)}
                  >
                    <Text style={styles.quickChipIcon}>{action.icon}</Text>
                    <Text style={styles.quickChipText}>{action.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {messages.map((msg) => (
            <ChatBubble key={msg.id} message={msg} />
          ))}
        </ScrollView>

        {/* Input area */}
        <View style={styles.inputArea}>
          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              placeholder="Ask HomeBase anything..."
              placeholderTextColor={colors.gray[400]}
              value={inputText}
              onChangeText={setInputText}
              onSubmitEditing={handleSend}
              returnKeyType="send"
              multiline
              maxLength={1000}
            />
            {inputText.trim() ? (
              <TouchableOpacity
                style={styles.sendButton}
                onPress={handleSend}
                disabled={isLoading}
              >
                <Text style={styles.sendEmoji}>↑</Text>
              </TouchableOpacity>
            ) : (
              <PulseMicButton isListening={isListening} onPress={handleMicPress} />
            )}
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.white },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[100],
  },
  backButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  backText: { fontSize: 24, color: colors.gray[700] },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: { ...typography.h3, color: colors.green[700] },
  headerSubtitle: { ...typography.small, color: colors.gray[400] },

  content: { flex: 1 },

  messagesContainer: { flex: 1 },
  messagesContent: { padding: spacing.lg, paddingBottom: 20 },

  // Welcome state
  welcomeContainer: { alignItems: 'center', paddingTop: 40, paddingBottom: 20 },
  welcomeEmoji: { fontSize: 48, marginBottom: 12 },
  welcomeTitle: { ...typography.h2, color: colors.gray[900], marginBottom: 8 },
  welcomeText: {
    ...typography.body,
    color: colors.gray[500],
    textAlign: 'center',
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  quickActions: { width: '100%', gap: 8 },
  quickChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.gray[50],
    borderWidth: 1,
    borderColor: colors.gray[200],
    borderRadius: borderRadius.xl,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  quickChipIcon: { fontSize: 18 },
  quickChipText: { ...typography.body, color: colors.gray[700] },

  // Messages
  messageContainer: { marginBottom: 12 },
  bubble: {
    maxWidth: '85%',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: borderRadius.xl,
  },
  userBubble: {
    alignSelf: 'flex-end',
    backgroundColor: colors.green[500],
    borderBottomRightRadius: 4,
  },
  assistantBubble: {
    alignSelf: 'flex-start',
    backgroundColor: colors.gray[100],
    borderBottomLeftRadius: 4,
  },
  bubbleText: { ...typography.body },
  userText: { color: colors.white },
  assistantText: { color: colors.gray[900] },

  typingIndicator: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  typingText: { ...typography.caption, color: colors.gray[500] },

  // Action cards
  actionsContainer: { marginTop: 8, gap: 6, maxWidth: '85%' },
  actionCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: colors.green[50],
    borderWidth: 1,
    borderColor: colors.green[200],
    borderRadius: borderRadius.lg,
    padding: 12,
  },
  actionCardError: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  actionIcon: { fontSize: 20, marginTop: 2 },
  actionContent: { flex: 1 },
  actionTitle: { ...typography.caption, color: colors.gray[800], fontWeight: '600' },

  budgetWarning: {
    marginTop: 6,
    backgroundColor: '#FFFBEB',
    borderRadius: borderRadius.sm,
    padding: 8,
  },
  budgetWarningText: { ...typography.small, color: '#92400E' },

  approvalRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
  approveBtn: {
    backgroundColor: colors.green[500],
    borderRadius: borderRadius.sm,
    paddingVertical: 6,
    paddingHorizontal: 14,
  },
  approveBtnText: { ...typography.small, color: colors.white, fontWeight: '600' },
  editBtn: {
    borderWidth: 1,
    borderColor: colors.gray[300],
    borderRadius: borderRadius.sm,
    paddingVertical: 6,
    paddingHorizontal: 14,
  },
  editBtnText: { ...typography.small, color: colors.gray[600], fontWeight: '600' },

  // Input area
  inputArea: {
    borderTopWidth: 1,
    borderTopColor: colors.gray[100],
    backgroundColor: colors.white,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    paddingBottom: Platform.OS === 'ios' ? 8 : spacing.md,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    backgroundColor: colors.gray[50],
    borderRadius: borderRadius['2xl'],
    borderWidth: 1,
    borderColor: colors.gray[200],
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  input: {
    flex: 1,
    ...typography.body,
    color: colors.gray[900],
    maxHeight: 100,
    paddingVertical: 8,
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.green[500],
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 2,
  },
  sendEmoji: { fontSize: 18, color: colors.white, fontWeight: '700' },
  micButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.gray[200],
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 2,
  },
  micButtonActive: {
    backgroundColor: '#FEE2E2',
  },
  micEmoji: { fontSize: 18 },
});
