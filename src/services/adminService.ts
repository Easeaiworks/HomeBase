/**
 * Admin Service
 * Communicates with the admin-api Edge Function
 */
import { supabase } from '../lib/supabase';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://urimknobwngrsdfxnawe.supabase.co';

async function adminRequest(action: string, params: Record<string, any> = {}) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Not authenticated');

  const response = await fetch(`${SUPABASE_URL}/functions/v1/admin-api`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({ action, ...params }),
  });

  const data = await response.json();
  if (!response.ok || data.error) {
    throw new Error(data.error || `Request failed: ${response.status}`);
  }
  return data;
}

// ===== Super Admin APIs =====

export async function checkAdminStatus() {
  return adminRequest('check_admin_status');
}

export async function getAdminStats() {
  return adminRequest('get_admin_stats');
}

export async function listAllUsers() {
  return adminRequest('list_all_users');
}

export async function approveUser(memberId: string) {
  return adminRequest('approve_user', { member_id: memberId });
}

export async function revokeUser(memberId: string) {
  return adminRequest('revoke_user', { member_id: memberId });
}

export async function suspendUser(memberId: string) {
  return adminRequest('suspend_user', { member_id: memberId });
}

export async function toggle2FA(memberId: string, enable: boolean) {
  return adminRequest('toggle_2fa', { member_id: memberId, enable });
}

export async function forcePasswordChange(memberId: string) {
  return adminRequest('force_password_change', { member_id: memberId });
}

export async function sendPasswordReset(memberId: string) {
  return adminRequest('send_password_reset', { member_id: memberId });
}

export async function toggleSuperAdmin(memberId: string, enable: boolean) {
  return adminRequest('toggle_super_admin', { member_id: memberId, enable });
}

export async function getAdminLog() {
  return adminRequest('get_admin_log');
}

// ===== Parent APIs =====

export async function listHouseholdMembers() {
  return adminRequest('list_household_members');
}

export async function parentApprove(memberId: string) {
  return adminRequest('parent_approve', { member_id: memberId });
}

export async function parentRevoke(memberId: string) {
  return adminRequest('parent_revoke', { member_id: memberId });
}

export async function parentSuspend(memberId: string) {
  return adminRequest('parent_suspend', { member_id: memberId });
}
