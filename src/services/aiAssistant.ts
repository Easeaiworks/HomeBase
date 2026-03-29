/**
 * AI Assistant Service
 * Handles communication with the ai-assistant Edge Function
 * Uses supabase.functions.invoke() for automatic JWT refresh
 * Always refreshes session proactively to avoid 401 errors
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
 * Ensure a fresh, valid session exists before making API calls.
 * Always attempts a refresh to avoid stale JWT issues.
 */
async function ensureFreshSession(): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    const { error } = await supabase.auth.refreshSession();
    if (error) throw new Error('Not authenticated. Please sign in again.');
    return;
  }

  const expiresAt = session.expires_at;
  const now = Math.floor(Date.now() / 1000);
  if (expiresAt && (expiresAt - now) < 60) {
    const { error } = await supabase.auth.refreshSession();
    if (error) {
      console.warn('Session refresh failed, continuing with existing token:', error.message);
    }
  }
}

/**
 * Invoke an edge function with automatic retry on 401
 */
async function invokeWithRetry(
  functionName: string,
  body: Record<string, any>
): Promise<any> {
  await ensureFreshSession();

  const { data, error } = await supabase.functions.invoke(functionName, { body });

  if (error) {
    const msg = error.message || '';
    if (msg.includes('401') || msg.toLowerCase().includes('unauthorized') || msg.toLowerCase().includes('jwt')) {
      console.warn('Got auth error, refreshing session and retrying...');
      const { error: refreshError } = await supabase.auth.refreshSession();
      if (refreshError) throw new Error('Session expired. Please sign in again.');

      const retry = await supabase.functions.invoke(functionName, { body });
      if (retry.error) {
        throw new Error(retry.error.message || 'Request failed after retry');
      }
      return retry.data;
    }
    throw new Error(msg || 'Request failed');
  }

  return data;
}

/**
 * Send a text message to the AI assistant
 */
export async function sendMessage(
  message: string,
  conversationHistory: AIMessage[] = []
): Promise<AIResponse> {
  const data = await invokeWithRetry('ai-assistant', {
    message,
    conversation_history: conversationHistory,
  });

  return data as AIResponse;
}

/**
 * Send an image (receipt) to the AI assistant for scanning
 */
export async function scanReceipt(
  imageBase64: string,
  message?: string
): Promise<AIResponse> {
  const data = await invokeWithRetry('ai-assistant', {
    message: message || 'Please scan this receipt and extract the vendor, items, amounts, and total. Then log it as an expense.',
    image_base64: imageBase64,
  });

  return data as AIResponse;
}
