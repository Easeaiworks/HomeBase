/**
 * useGroceryList Hook
 * Real-time grocery list management with Supabase sync
 */
import { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '../stores/authStore';
import {
  getActiveList,
  getGroceryItems,
  addGroceryItem,
  toggleGroceryItem,
  deleteGroceryItem,
  clearCheckedItems,
  subscribeToGroceryItems,
  type GroceryItem,
  type GroceryList,
} from '../services/groceryService';

export function useGroceryList() {
  const { member, household } = useAuthStore();
  const [list, setList] = useState<GroceryList | null>(null);
  const [items, setItems] = useState<GroceryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load active list and items
  const loadList = useCallback(async () => {
    if (!household?.id) return;

    try {
      setIsLoading(true);
      const activeList = await getActiveList(household.id);
      if (activeList) {
        setList(activeList);
        const listItems = await getGroceryItems(activeList.id);
        setItems(listItems);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [household?.id]);

  // Initial load
  useEffect(() => {
    loadList();
  }, [loadList]);

  // Real-time subscription
  useEffect(() => {
    if (!list?.id) return;

    const unsubscribe = subscribeToGroceryItems(
      list.id,
      // On insert - add to local state (avoid duplicates from own inserts)
      (newItem) => {
        setItems((prev) => {
          if (prev.find((i) => i.id === newItem.id)) return prev;
          return [newItem, ...prev];
        });
      },
      // On update
      (updatedItem) => {
        setItems((prev) =>
          prev.map((i) => (i.id === updatedItem.id ? updatedItem : i))
        );
      },
      // On delete
      (deletedId) => {
        setItems((prev) => prev.filter((i) => i.id !== deletedId));
      }
    );

    return unsubscribe;
  }, [list?.id]);

  const addItem = useCallback(
    async (name: string, quantity?: string, category?: string) => {
      if (!list?.id || !member?.id) return;

      try {
        const newItem = await addGroceryItem(list.id, member.id, name, quantity, category);
        setItems((prev) => [newItem, ...prev]);
      } catch (err: any) {
        setError(err.message);
      }
    },
    [list?.id, member?.id]
  );

  const toggleItem = useCallback(async (itemId: string) => {
    const item = items.find((i) => i.id === itemId);
    if (!item) return;

    // Optimistic update
    setItems((prev) =>
      prev.map((i) => (i.id === itemId ? { ...i, is_checked: !i.is_checked } : i))
    );

    try {
      await toggleGroceryItem(itemId, !item.is_checked);
    } catch (err: any) {
      // Revert on error
      setItems((prev) =>
        prev.map((i) => (i.id === itemId ? { ...i, is_checked: item.is_checked } : i))
      );
      setError(err.message);
    }
  }, [items]);

  const removeItem = useCallback(async (itemId: string) => {
    const prev = items;
    setItems((current) => current.filter((i) => i.id !== itemId));

    try {
      await deleteGroceryItem(itemId);
    } catch (err: any) {
      setItems(prev);
      setError(err.message);
    }
  }, [items]);

  const clearChecked = useCallback(async () => {
    if (!list?.id) return;

    const prev = items;
    setItems((current) => current.filter((i) => !i.is_checked));

    try {
      await clearCheckedItems(list.id);
    } catch (err: any) {
      setItems(prev);
      setError(err.message);
    }
  }, [list?.id, items]);

  const uncheckedItems = items.filter((i) => !i.is_checked);
  const checkedItems = items.filter((i) => i.is_checked);

  return {
    list,
    items,
    uncheckedItems,
    checkedItems,
    isLoading,
    error,
    addItem,
    toggleItem,
    removeItem,
    clearChecked,
    refresh: loadList,
  };
}
