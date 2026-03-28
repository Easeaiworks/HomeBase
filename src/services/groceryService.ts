/**
 * Grocery Service
 * Real-time grocery list management with Supabase
 */
import { supabase } from '../lib/supabase';

export interface GroceryItem {
  id: string;
  list_id: string;
  name: string;
  quantity: string | null;
  category: string | null;
  is_checked: boolean;
  added_by: string;
  deals: any | null;
  created_at: string;
}

export interface GroceryList {
  id: string;
  household_id: string;
  name: string;
  is_active: boolean;
  created_at: string;
}

/**
 * Get the active grocery list for the household
 */
export async function getActiveList(householdId: string): Promise<GroceryList | null> {
  const { data, error } = await supabase
    .from('grocery_lists')
    .select('*')
    .eq('household_id', householdId)
    .eq('is_active', true)
    .limit(1)
    .single();

  if (error || !data) return null;
  return data as unknown as GroceryList;
}

/**
 * Get all items from the active grocery list
 */
export async function getGroceryItems(listId: string): Promise<GroceryItem[]> {
  const { data, error } = await supabase
    .from('grocery_items')
    .select('*')
    .eq('list_id', listId)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return (data || []) as unknown as GroceryItem[];
}

/**
 * Add an item to the grocery list
 */
export async function addGroceryItem(
  listId: string,
  memberId: string,
  name: string,
  quantity?: string,
  category?: string
): Promise<GroceryItem> {
  const { data, error } = await supabase
    .from('grocery_items')
    .insert({
      list_id: listId,
      added_by: memberId,
      name,
      quantity: quantity || null,
      category: category || null,
    } as any)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as unknown as GroceryItem;
}

/**
 * Toggle an item's checked status
 */
export async function toggleGroceryItem(itemId: string, isChecked: boolean): Promise<void> {
  const { error } = await supabase
    .from('grocery_items')
    .update({ is_checked: isChecked } as any)
    .eq('id', itemId);

  if (error) throw new Error(error.message);
}

/**
 * Delete a grocery item
 */
export async function deleteGroceryItem(itemId: string): Promise<void> {
  const { error } = await supabase
    .from('grocery_items')
    .delete()
    .eq('id', itemId);

  if (error) throw new Error(error.message);
}

/**
 * Clear all checked items from the list
 */
export async function clearCheckedItems(listId: string): Promise<void> {
  const { error } = await supabase
    .from('grocery_items')
    .delete()
    .eq('list_id', listId)
    .eq('is_checked', true);

  if (error) throw new Error(error.message);
}

/**
 * Subscribe to real-time grocery list changes
 */
export function subscribeToGroceryItems(
  listId: string,
  onInsert: (item: GroceryItem) => void,
  onUpdate: (item: GroceryItem) => void,
  onDelete: (id: string) => void
) {
  const channel = supabase
    .channel(`grocery-items-${listId}`)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'grocery_items', filter: `list_id=eq.${listId}` },
      (payload) => onInsert(payload.new as unknown as GroceryItem)
    )
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'grocery_items', filter: `list_id=eq.${listId}` },
      (payload) => onUpdate(payload.new as unknown as GroceryItem)
    )
    .on(
      'postgres_changes',
      { event: 'DELETE', schema: 'public', table: 'grocery_items', filter: `list_id=eq.${listId}` },
      (payload) => onDelete((payload.old as any).id)
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
