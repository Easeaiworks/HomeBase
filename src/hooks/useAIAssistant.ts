/**
 * useAIAssistant Hook
 * Manages conversation state with the HomeBase AI assistant
 */
import { useState, useCallback, useRef } from 'react';
import { sendMessage, scanReceipt, type AIMessage, type AIResponse, type AIToolResult } from '../services/aiAssistant';

export interface ConversationMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  actions?: AIToolResult[];
  isLoading?: boolean;
}

export function useAIAssistant() {
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const conversationHistoryRef = useRef<AIMessage[]>([]);

  const addMessage = useCallback((role: 'user' | 'assistant', content: string, actions?: AIToolResult[]) => {
    const msg: ConversationMessage = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
      role,
      content,
      timestamp: new Date(),
      actions,
    };
    setMessages((prev) => [...prev, msg]);
    return msg;
  }, []);

  const send = useCallback(async (text: string) => {
    if (!text.trim() || isLoading) return;

    setError(null);
    addMessage('user', text);
    setIsLoading(true);

    // Add a loading placeholder
    const loadingId = Date.now().toString() + '_loading';
    setMessages((prev) => [
      ...prev,
      { id: loadingId, role: 'assistant', content: '', timestamp: new Date(), isLoading: true },
    ]);

    try {
      const response = await sendMessage(text, conversationHistoryRef.current);

      // Update conversation history for context
      conversationHistoryRef.current.push(
        { role: 'user', content: text },
        { role: 'assistant', content: response.response }
      );

      // Keep history manageable (last 20 messages)
      if (conversationHistoryRef.current.length > 20) {
        conversationHistoryRef.current = conversationHistoryRef.current.slice(-20);
      }

      // Replace loading message with real response
      setMessages((prev) =>
        prev.filter((m) => m.id !== loadingId)
      );
      addMessage('assistant', response.response, response.actions_taken);

      return response;
    } catch (err: any) {
      setMessages((prev) => prev.filter((m) => m.id !== loadingId));
      const errorMsg = err.message || 'Something went wrong';
      setError(errorMsg);
      addMessage('assistant', "Sorry, I'm having trouble right now. Please try again in a moment.");
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, addMessage]);

  const sendReceipt = useCallback(async (imageBase64: string, message?: string) => {
    setError(null);
    addMessage('user', message || '📷 Scanning receipt...');
    setIsLoading(true);

    const loadingId = Date.now().toString() + '_loading';
    setMessages((prev) => [
      ...prev,
      { id: loadingId, role: 'assistant', content: '', timestamp: new Date(), isLoading: true },
    ]);

    try {
      const response = await scanReceipt(imageBase64, message);

      setMessages((prev) => prev.filter((m) => m.id !== loadingId));
      addMessage('assistant', response.response, response.actions_taken);

      return response;
    } catch (err: any) {
      setMessages((prev) => prev.filter((m) => m.id !== loadingId));
      setError(err.message || 'Failed to scan receipt');
      addMessage('assistant', "I couldn't read that receipt. Could you try taking a clearer photo?");
    } finally {
      setIsLoading(false);
    }
  }, [addMessage]);

  const clearConversation = useCallback(() => {
    setMessages([]);
    conversationHistoryRef.current = [];
    setError(null);
  }, []);

  return {
    messages,
    isLoading,
    error,
    send,
    sendReceipt,
    clearConversation,
  };
}
