/**
 * AI Assistant Service
 * Handles communication with the ai-assistant Edge Function
 * Uses supabase.functions.invoke() for automatic JWT refresh
 */
import { supabase } from '../lib/supabase';

export interface AIMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface AIToolResult {
  action: string;
  result: {
    success: boolean;
    message?: string;
    budget_warning?: string | null;
    [key: string]: any;
  };
}

export interface AIResponse {
  response: string;
  tool_results: any[];
  actions_taken: AIToolResult[];
}

/**
 * Send a text message to the AI assistant
 */
export async function sendMessage(
  message: string,
  conversationHistory: AIMessage[] = []
): Promise<AIResponse> {
  // Ensure we have a valid session (refreshes token automatically)
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  if (sessionError || !session) {
    // Try refreshing explicitly
    const { error: refreshError } = await supabase.auth.refreshSession();
    if (refreshError) throw new Error('Not authenticated. Please sign in again.');
  }

  const { data, error } = await supabase.functions.invoke('ai-assistant', {
    body: {
      message,
      conversation_history: conversationHistory,
    },
  });

  if (error) {
    // FunctionsHttpError contains the response body
    const errorMessage = error.message || 'Request failed';
    throw new Error(errorMessage);
  }

  return data as AIResponse;
}

/**
 * Send an image (receipt) to the AI assistant for scanning
 */
export async function scanReceipt(
  imageBase64: string,
  message?: string
): Promise<AIResponse> {
  // Ensure we have a valid session (refreshes token automatically)
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  if (sessionError || !session) {
    const { error: refreshError } = await supabase.auth.refreshSession();
    if (refreshError) throw new Error('Not authenticated. Please sign in again.');
  }

  const { data, error } = await supabase.functions.invoke('ai-assistant', {
    body: {
      message: message || 'Please scan this receipt and extract the vendor, items, amounts, and total. Then log it as an expense.',
      image_base64: imageBase64,
    },
  });

  if (error) {
    const errorMessage = error.message || 'Failed to scan receipt';
    throw new Error(errorMessage);
  }

  return data as AIResponse;
}
