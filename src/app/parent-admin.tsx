/**
 * Parent Admin Screen
 * Household-level member approval for parents
 * Parents can approve/revoke members in their own household
 * (after the parent themselves has been approved by super admin)
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Card } from '../components/ui/Card';
import { useAuthStore } from '../stores/authStore';
import { colors, typography, spacing, shadows, borderRadius } from '../constants/theme';
import {
  listHouseholdMembers,
  parentApprove,
  parentRevoke,
  parentSuspend,
} from '../services/adminService';

interface HouseholdMember {
  id: string;
  display_name: string;
  email: string | null;
  role: string;
  approval_status: string;
  is_master_account: boolean;
  two_factor_enabled: boolean;
  joined_at: string;
  user_id: string;
}

const STATUS_CONFIG: Record<string, { bg: string; text: string; label: string; emoji: string }> = {
  pending: { bg: '#FEF3C7', text: '#92400E', label: 'Pending Approval', emoji: '⏳' },
  approved: { bg: '#D1FAE5', text: '#065F46', label: 'Active', emoji: '✅' },
  revoked: { bg: '#FEE2E2', text: '#991B1B', label: 'Revoked', emoji: '🚫' },
  suspended: { bg: '#E5E7EB', text: '#374151', label: 'Suspended', emoji: '⏸️' },
};

const ROLE_CONFIG: Record<string, { color: string; desc: string }> = {
  parent: { color: colors.green[600], desc: 'Full access to all features' },
  teen: { color: colors.blue[600], desc: 'Limited access (no expense management)' },
  child: { color: colors.gray[500], desc: 'View-only access' },
};

export default function ParentAdminScreen() {
  const router = useRouter();
  const { member, household } = useAuthStore();
  const [members, setMembers] = useState<HouseholdMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadMembers = useCallback(async () => {
    try {
      const res = await listHouseholdMembers();
      if (res.success) setMembers(res.members);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to load members');
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadMembers();
  }, [loadMembers]);

  const handleAction = (actionFn: () => Promise<any>, actionName: string, userName: string) => {
    Alert.alert(
      `${actionName} Member`,
      `Are you sure you want to ${actionName.toLowerCase()} ${userName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: actionName,
          style: actionName === 'Approve' ? 'default' : 'destructive',
          onPress: async () => {
            try {
              const result = await actionFn();
              if (result.success) {
                Alert.alert('Done', `${userName} has been ${actionName.toLowerCase()}d.`);
                loadMembers();
              } else {
                Alert.alert('Error', result.error || 'Action failed');
              }
            } catch (err: any) {
              Alert.alert('Error', err.message);
            }
          },
        },
      ]
    );
  };

  const handleShareInvite = async () => {
    if (!household?.invite_code) return;
    try {
      await Share.share({
        message: `Join our household on HomeBase! Use invite code: ${household.invite_code}\n\nDownload HomeBase: https://homebase.easeai.ca`,
      });
    } catch {}
  };

  const pendingCount = members.filter((m) => m.approval_status === 'pending').length;
  const isMe = (m: HouseholdMember) => m.user_id === member?.user_id;

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.green[500]} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Manage Members</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadMembers(); }} tintColor={colors.green[500]} />
        }
      >
        {/* Household info */}
        <Card style={styles.householdCard}>
          <Text style={styles.householdName}>🏡 {household?.name}</Text>
          <Text style={styles.memberCount}>
            {members.length} member{members.length !== 1 ? 's' : ''} · {pendingCount} pending
          </Text>
          <View style={styles.inviteSection}>
            <View style={styles.inviteCodeBox}>
              <Text style={styles.inviteLabel}>Invite Code</Text>
              <Text style={styles.inviteCode}>{household?.invite_code}</Text>
            </View>
            <TouchableOpacity style={styles.shareBtn} onPress={handleShareInvite}>
              <Text style={styles.shareBtnText}>Share</Text>
            </TouchableOpacity>
          </View>
        </Card>

        {/* Pending alert */}
        {pendingCount > 0 && (
          <View style={styles.pendingAlert}>
            <Text style={styles.pendingText}>
              ⚠️ {pendingCount} member{pendingCount !== 1 ? 's' : ''} waiting for your approval
            </Text>
          </View>
        )}

        {/* Members list */}
        {members.map((m) => {
          const status = STATUS_CONFIG[m.approval_status] || STATUS_CONFIG.pending;
          const role = ROLE_CONFIG[m.role] || ROLE_CONFIG.child;
          const isSelf = isMe(m);

          return (
            <Card key={m.id} style={styles.memberCard}>
              <View style={styles.memberHeader}>
                <View style={[styles.avatar, isSelf && { backgroundColor: colors.green[100] }]}>
                  <Text style={[styles.avatarText, isSelf && { color: colors.green[700] }]}>
                    {(m.display_name || 'U')[0].toUpperCase()}
                  </Text>
                </View>
                <View style={styles.memberInfo}>
                  <View style={styles.nameRow}>
                    <Text style={styles.memberName}>{m.display_name}</Text>
                    {isSelf && (
                      <View style={styles.youBadge}>
                        <Text style={styles.youBadgeText}>You</Text>
                      </View>
                    )}
                    {m.is_master_account && (
                      <View style={styles.masterBadge}>
                        <Text style={styles.masterBadgeText}>Master</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.memberEmail}>{m.email || 'No email'}</Text>
                  <View style={styles.badgeRow}>
                    <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
                      <Text style={[styles.statusText, { color: status.text }]}>
                        {status.emoji} {status.label}
                      </Text>
                    </View>
                    <View style={[styles.roleBadge, { backgroundColor: role.color + '20' }]}>
                      <Text style={[styles.roleText, { color: role.color }]}>{m.role}</Text>
                    </View>
                  </View>
                </View>
              </View>

              {/* Role description */}
              <Text style={styles.roleDesc}>{role.desc}</Text>

              {/* Actions — not for self, not for master accounts */}
              {!isSelf && !m.is_master_account && (
                <View style={styles.actions}>
                  {m.approval_status === 'pending' && (
                    <TouchableOpacity
                      style={styles.approveBtn}
                      onPress={() => handleAction(() => parentApprove(m.id), 'Approve', m.display_name)}
                    >
                      <Text style={styles.approveBtnText}>Approve</Text>
                    </TouchableOpacity>
                  )}
                  {m.approval_status === 'approved' && (
                    <TouchableOpacity
                      style={styles.suspendBtn}
                      onPress={() => handleAction(() => parentSuspend(m.id), 'Suspend', m.display_name)}
                    >
                      <Text style={styles.suspendBtnText}>Suspend</Text>
                    </TouchableOpacity>
                  )}
                  {m.approval_status !== 'revoked' && (
                    <TouchableOpacity
                      style={styles.revokeBtn}
                      onPress={() => handleAction(() => parentRevoke(m.id), 'Revoke', m.display_name)}
                    >
                      <Text style={styles.revokeBtnText}>Revoke Access</Text>
                    </TouchableOpacity>
                  )}
                  {m.approval_status === 'revoked' && (
                    <TouchableOpacity
                      style={styles.approveBtn}
                      onPress={() => handleAction(() => parentApprove(m.id), 'Re-approve', m.display_name)}
                    >
                      <Text style={styles.approveBtnText}>Re-approve</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}

              {/* Joined date */}
              <Text style={styles.joinedText}>
                Joined {new Date(m.joined_at).toLocaleDateString()}
              </Text>
            </Card>
          );
        })}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },

  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
    backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.gray[100],
  },
  backButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  backText: { fontSize: 24, color: colors.gray[700] },
  headerTitle: { flex: 1, textAlign: 'center', ...typography.h3, color: colors.gray[900] },

  content: { padding: spacing.lg },

  householdCard: { marginBottom: 16, backgroundColor: colors.green[50], borderWidth: 1, borderColor: colors.green[200] },
  householdName: { ...typography.h3, color: colors.green[800] },
  memberCount: { ...typography.caption, color: colors.green[600], marginTop: 4 },
  inviteSection: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    marginTop: 14, paddingTop: 14, borderTopWidth: 1, borderTopColor: colors.green[200],
  },
  inviteCodeBox: { flex: 1 },
  inviteLabel: { ...typography.small, color: colors.green[600] },
  inviteCode: {
    ...typography.h3, color: colors.green[800],
    letterSpacing: 2, marginTop: 2,
  },
  shareBtn: {
    backgroundColor: colors.green[600], borderRadius: borderRadius.lg,
    paddingVertical: 10, paddingHorizontal: 18,
  },
  shareBtnText: { ...typography.bodyBold, color: colors.white, fontSize: 14 },

  pendingAlert: {
    backgroundColor: '#FEF3C7', borderWidth: 1, borderColor: '#FDE68A',
    borderRadius: borderRadius.lg, padding: 14, marginBottom: 16,
  },
  pendingText: { ...typography.bodyBold, color: '#92400E' },

  memberCard: { marginBottom: 12 },
  memberHeader: { flexDirection: 'row', gap: 12 },
  avatar: {
    width: 46, height: 46, borderRadius: 23,
    backgroundColor: colors.blue[100], justifyContent: 'center', alignItems: 'center',
  },
  avatarText: { fontSize: 18, fontWeight: '700', color: colors.blue[700] },
  memberInfo: { flex: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  memberName: { ...typography.bodyBold, color: colors.gray[900] },
  youBadge: {
    backgroundColor: colors.green[100], borderRadius: 4,
    paddingHorizontal: 6, paddingVertical: 1,
  },
  youBadgeText: { fontSize: 10, fontWeight: '700', color: colors.green[700] },
  masterBadge: {
    backgroundColor: colors.green[600], borderRadius: 4,
    paddingHorizontal: 5, paddingVertical: 1,
  },
  masterBadgeText: { fontSize: 10, fontWeight: '800', color: colors.white },
  memberEmail: { ...typography.small, color: colors.gray[400], marginTop: 2 },
  badgeRow: { flexDirection: 'row', gap: 6, marginTop: 6 },
  statusBadge: { borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
  statusText: { fontSize: 11, fontWeight: '700' },
  roleBadge: { borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
  roleText: { fontSize: 11, fontWeight: '700', textTransform: 'capitalize' },

  roleDesc: { ...typography.small, color: colors.gray[400], marginTop: 10 },

  actions: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 8,
    marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.gray[100],
  },
  approveBtn: {
    backgroundColor: colors.green[500], borderRadius: borderRadius.md,
    paddingVertical: 8, paddingHorizontal: 16,
  },
  approveBtnText: { ...typography.caption, color: colors.white, fontWeight: '700' },
  suspendBtn: {
    backgroundColor: colors.warning, borderRadius: borderRadius.md,
    paddingVertical: 8, paddingHorizontal: 16,
  },
  suspendBtnText: { ...typography.caption, color: colors.white, fontWeight: '700' },
  revokeBtn: {
    borderWidth: 1, borderColor: colors.error, borderRadius: borderRadius.md,
    paddingVertical: 8, paddingHorizontal: 16,
  },
  revokeBtnText: { ...typography.caption, color: colors.error, fontWeight: '700' },

  joinedText: { ...typography.small, color: colors.gray[300], marginTop: 10 },
});
