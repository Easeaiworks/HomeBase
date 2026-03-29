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
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
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
    store_receipt: '🧾',
    search_receipts: '🔍',
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
 