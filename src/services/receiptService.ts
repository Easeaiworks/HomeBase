/**
 * Receipt Service
 * Client-side service for browsing and searching stored receipts
 */
import { supabase } from '../lib/supabase';

export interface Receipt {
  id: string;
  vendor_name: string;
  total_amount: number;
  tax_amount: number | null;
  receipt_date: string;
  payment_method: string | null;
  line_items: Array<{
    name: string;
    qty: number;
    unit_price: number;
    total: number;
  }>;
  raw_text: string | null;
  storage_path: string;
  category_id: string | null;
  currency: string;
  notes: string | null;
  created_at: string;
}

/**
 * Get all receipts for the household, newest first
 */
export async function getReceipts(householdId: string, limit = 50): Promise<Receipt[]> {
  const { data, error } = await supabase
    .from('receipts')
    .select('*')
    .eq('household_id', householdId)
    .order('receipt_date', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data || [];
}

/**
 * Get a single receipt by ID
 */
export async function getReceipt(receiptId: string): Promise<Receipt | null> {
  const { data, error } = await supabase
    .from('receipts')
    .select('*')
    .eq('id', receiptId)
    .single();

  if (error) return null;
  return data;
}

/**
 * Get a signed URL for viewing a receipt image (1 hour expiry)
 */
export async function getReceiptImageUrl(storagePath: string): Promise<string | null> {
  if (!storagePath || storagePath.startsWith('no_image') || storagePath.startsWith('upload_failed')) {
    return null;
  }

  const { data, error } = await supabase.storage
    .from('receipts')
    .createSignedUrl(storagePath, 3600);

  if (error) return null;
  return data.signedUrl;
}

/**
 * Search receipts using the server-side search function
 */
export async function searchReceipts(
  householdId: string,
  params: {
    query?: string;
    vendor?: string;
    minAmount?: number;
    maxAmount?: number;
    startDate?: string;
    endDate?: string;
  }
): Promise<Receipt[]> {
  const { data, error } = await supabase.rpc('search_receipts', {
    p_household_id: householdId,
    p_query: params.query || null,
    p_vendor: params.vendor || null,
    p_min_amount: params.minAmount || null,
    p_max_amount: params.maxAmount || null,
    p_start_date: params.startDate || null,
    p_end_date: params.endDate || null,
    p_limit: 20,
  });

  if (error) throw error;
  return data || [];
}

/**
 * Delete a receipt and its stored image
 */
export async function deleteReceipt(receiptId: string, storagePath: string): Promise<void> {
  // Delete the image from storage first
  if (storagePath && !storagePath.startsWith('no_image') && !storagePath.startsWith('upload_failed')) {
    await supabase.storage.from('receipts').remove([storagePath]);
  }

  // Delete the receipt record
  const { error } = await supabase
    .from('receipts')
    .delete()
    .eq('id', receiptId);

  if (error) throw error;
}
