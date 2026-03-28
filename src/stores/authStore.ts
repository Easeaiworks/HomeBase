import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import type { Session, User } from '@supabase/supabase-js';

interface HouseholdMember {
  id: string;
  household_id: string;
  user_id: string;
  role: 'parent' | 'teen' | 'child';
  display_name: string;
  avatar_url: string | null;
  permissions: Record<string, boolean>;
  // Admin fields
  approval_status: 'pending' | 'approved' | 'revoked' | 'suspended';
  is_super_admin: boolean;
  is_master_account: boolean;
  require_password_change: boolean;
  two_factor_enabled: boolean;
}

interface Household {
  id: string;
  name: string;
  invite_code: string;
}

interface AuthState {
  session: Session | null;
  user: User | null;
  member: HouseholdMember | null;
  household: Household | null;
  isLoading: boolean;
  isOnboarded: boolean;
  isApproved: boolean;
  isPendingApproval: boolean;
  isSuperAdmin: boolean;

  // Actions
  setSession: (session: Session | null) => void;
  loadMemberAndHousehold: () => Promise<void>;
  signUp: (email: string, password: string, displayName: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  createHousehold: (name: string) => Promise<{ error: Error | null }>;
  joinHousehold: (inviteCode: string, displayName: string, role: 'parent' | 'teen' | 'child') => Promise<{ error: Error | null }>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  session: null,
  user: null,
  member: null,
  household: null,
  isLoading: true,
  isOnboarded: false,
  isApproved: false,
  isPendingApproval: false,
  isSuperAdmin: false,

  setSession: (session) => {
    set({ session, user: session?.user ?? null });
    if (session?.user) {
      get().loadMemberAndHousehold();
    } else {
      set({
        member: null, household: null, isOnboarded: false, isLoading: false,
        isApproved: false, isPendingApproval: false, isSuperAdmin: false,
      });
    }
  },

  loadMemberAndHousehold: async () => {
    const user = get().user;
    if (!user) return;

    try {
      const { data: memberData } = await supabase
        .from('household_members')
        .select('*, households(*)')
        .eq('user_id', user.id)
        .single() as { data: any };

      if (memberData) {
        const household = memberData.households;
        const approvalStatus = memberData.approval_status || 'approved';

        set({
          member: {
            id: memberData.id,
            household_id: memberData.household_id,
            user_id: memberData.user_id,
            role: memberData.role,
            display_name: memberData.display_name,
            avatar_url: memberData.avatar_url,
            permissions: (memberData.permissions as Record<string, boolean>) || {},
            approval_status: approvalStatus,
            is_super_admin: memberData.is_super_admin || false,
            is_master_account: memberData.is_master_account || false,
            require_password_change: memberData.require_password_change || false,
            two_factor_enabled: memberData.two_factor_enabled || false,
          },
          household: household
            ? { id: household.id, name: household.name, invite_code: household.invite_code }
            : null,
          isOnboarded: true,
          isApproved: approvalStatus === 'approved',
          isPendingApproval: approvalStatus === 'pending',
          isSuperAdmin: memberData.is_super_admin || false,
          isLoading: false,
        });
      } else {
        set({
          member: null, household: null, isOnboarded: false, isLoading: false,
          isApproved: false, isPendingApproval: false, isSuperAdmin: false,
        });
      }
    } catch {
      set({ isLoading: false });
    }
  },

  signUp: async (email, password, displayName) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { display_name: displayName } },
    });
    return { error: error ? new Error(error.message) : null };
  },

  signIn: async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error ? new Error(error.message) : null };
  },

  signOut: async () => {
    await supabase.auth.signOut();
    set({
      session: null, user: null, member: null, household: null,
      isOnboarded: false, isApproved: false, isPendingApproval: false, isSuperAdmin: false,
    });
  },

  createHousehold: async (name) => {
    const user = get().user;
    if (!user) return { error: new Error('Not authenticated') };

    const displayName = user.user_metadata?.display_name || user.email?.split('@')[0] || 'Parent';

    const { data, error } = await (supabase.rpc as any)('create_household_with_member', {
      household_name: name,
      member_display_name: displayName,
      member_role: 'parent',
    });

    if (!error) {
      await get().loadMemberAndHousehold();
    }
    return { error: error ? new Error(error.message) : null };
  },

  joinHousehold: async (inviteCode, displayName, role) => {
    const user = get().user;
    if (!user) return { error: new Error('Not authenticated') };

    const { data: household, error: lookupError } = await supabase
      .from('households')
      .select('id')
      .eq('invite_code', inviteCode.toUpperCase())
      .single() as { data: any; error: any };

    if (lookupError || !household) {
      return { error: new Error('Invalid invite code') };
    }

    const { error } = await supabase.from('household_members').insert({
      household_id: household.id,
      user_id: user.id,
      display_name: displayName,
      role,
    } as any);

    if (!error) {
      await get().loadMemberAndHousehold();
    }
    return { error: error ? new Error(error.message) : null };
  },
}));
