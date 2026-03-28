/**
 * AI Assistant Service
 * Handles communication with the ai-assistant Edge Function
 */
import { supabase } from '../lib/supabase';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://urimknobwngrsdfxnawe.supabase.co';

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
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Not authenticated');

  const response = await fetch(`${SUPABASE_URL}/functions/v1/ai-assistant`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({
      message,
      conversation_history: conversationHistory,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Network error' }));
    throw new Error(error.error || `Request failed: ${response.status}`);
  }

  return response.json();
}

/**
 * Send an image (receipt) to the AI assistant for scanning
 */
export async function scanReceipt(
  imageBase64: string,
  message?: string
): Promise<AIResponse> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Not authenticated');

  const response = await fetch(`${SUPABASE_URL}/functions/v1/ai-assistant`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({
      message: message || 'Please scan this receipt and extract the vendor, items, amounts, and total. Then log it as an expense.',
      image_base64: imageBase64,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Network error' }));
    throw new Error(error.error || `Request failed: ${response.status}`);
  }

  return response.json();
}
