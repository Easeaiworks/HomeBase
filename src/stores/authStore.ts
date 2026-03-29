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
  subscription_status: 'trial' | 'free' | 'active' | 'past_due' | 'canceled' | 'expired';
  trial_expires_at: string | null;
  subscription_current_period_end: string | null;
  stripe_customer_id: string | null;
  is_billing_exempt: boolean;
  header_image_url: string | null;
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
  isTrialActive: boolean;
  isTrialExpired: boolean;
  isSubscribed: boolean;
  trialDaysRemaining: number;

  // Actions
  setSession: (session: Session | null) => void;
  loadMemberAndHousehold: () => Promise<void>;
  signUp: (email: string, password: string, displayName: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  createHousehold: (name: string) => Promise<{ error: Error | null }>;
  joinHousehold: (inviteCode: string, displayName: string, role: 'parent' | 'teen' | 'child') => Promise<{ error: Error | null }>;
}

function calcTrialDays(expiresAt: string | null): number {
  if (!expiresAt) return 0;
  const diff = new Date(expiresAt).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
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
  isTrialActive: false,
  isTrialExpired: false,
  isSubscribed: false,
  trialDaysRemaining: 0,

  setSession: (session) => {
    set({ session, user: session?.user ?? null });
    if (session?.user) {
      get().loadMemberAndHousehold();
    } else {
      set({
        member: null, household: null, isOnboarded: false, isLoading: false,
        isApproved: false, isPendingApproval: false, isSuperAdmin: false,
        isTrialActive: false, isTrialExpired: false, isSubscribed: false, trialDaysRemaining: 0,
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
        const h = memberData.households;
        const approvalStatus = memberData.approval_status || 'approved';

        // Calculate subscription/trial state
        const subStatus = h?.subscription_status || 'trial';
        const trialExpiresAt = h?.trial_expires_at || null;
        const trialDays = calcTrialDays(trialExpiresAt);
        const billingExempt = h?.is_billing_exempt || false;
        const isTrialActive = subStatus === 'trial' && trialDays > 0;
        const isTrialExpired = subStatus === 'trial' && trialDays <= 0 && !billingExempt;
        const isSubscribed = subStatus === 'active' || billingExempt;

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
          household: h
            ? {
                id: h.id,
                name: h.name,
                invite_code: h.invite_code,
                subscription_status: subStatus,
                trial_expires_at: trialExpiresAt,
                subscription_current_period_end: h.subscription_current_period_end || null,
                stripe_customer_id: h.stripe_customer_id || null,
                is_billing_exempt: h.is_billing_exempt || false,
                header_image_url: h.header_image_url || null,
              }
            : null,
          isOnboarded: true,
          isApproved: approvalStatus === 'approved',
          isPendingApproval: approvalStatus === 'pending',
          isSuperAdmin: memberData.is_super_admin || false,
          isTrialActive,
          isTrialExpired,
          isSubscribed,
          trialDaysRemaining: trialDays,
          isLoading: false,
        });
      } else {
        set({
          member: null, household: null, isOnboarded: false, isLoading: false,
          isApproved: false, isPendingApproval: false, isSuperAdmin: false,
          isTrialActive: false, isTrialExpired: false, isSubscribed: false, trialDaysRemaining: 0,
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
      isTrialActive: false, isTrialExpired: false, isSubscribed: false, trialDaysRemaining: 0,
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
