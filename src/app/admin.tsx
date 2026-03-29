/**
 * Super Admin Panel
 * Full user management: approve, revoke, suspend, 2FA, password reset
 * Only accessible to super admins (you, Adam)
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
  Switch,
  Modal,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { colors, typography, spacing, shadows, borderRadius } from '../constants/theme';
import {
  getAdminStats,
  listAllUsers,
  approveUser,
  revokeUser,
  suspendUser,
  toggle2FA,
  forcePasswordChange,
  sendPasswordReset,
  getAdminLog,
  extendTrial,
  toggleBillingExempt,
} from '../services/adminService';

interface AdminUser {
  id: string;
  display_name: string;
  email: string | null;
  role: string;
  approval_status: string;
  is_master_account: boolean;
  is_super_admin: boolean;
  two_factor_enabled: boolean;
  require_password_change: boolean;
  joined_at: string;
  household_id: string;
  households: { name: string; subscription_status: string } | null;
}

interface AdminStats {
  total_users: number;
  pending_approval: number;
  approved: number;
  revoked: number;
  total_households: number;
}

interface AdminLogEntry {
  id: string;
  action: string;
  details: any;
  created_at: string;
  admin_member: { display_name: string } | null;
  target_member: { display_name: string } | null;
}

const STATUS_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  pending: { bg: '#FEF3C7', text: '#92400E', label: 'Pending' },
  approved: { bg: '#D1FAE5', text: '#065F46', label: 'Approved' },
  revoked: { bg: '#FEE2E2', text: '#991B1B', label: 'Revoked' },
  suspended: { bg: '#E5E7EB', text: '#374151', label: 'Suspended' },
};

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <View style={[styles.statCard, { borderLeftColor: color }]}>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function UserCard({
  user,
  onApprove,
  onRevoke,
  onSuspend,
  onToggle2FA,
  onPasswordReset,
  onSendResetEmail,
  onExtendTrial,
  onToggleBillingExempt,
}: {
  user: AdminUser;
  onApprove: () => void;
  onRevoke: () => void;
  onSuspend: () => void;
  onToggle2FA: () => void;
  onPasswordReset: () => void;
  onSendResetEmail: () => void;
  onExtendTrial: () => void;
  onToggleBillingExempt: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const status = STATUS_COLORS[user.approval_status] || STATUS_COLORS.pending;

  return (
    <TouchableOpacity
      style={styles.userCard}
      onPress={() => setExpanded(!expanded)}
      activeOpacity={0.7}
    >
      <View style={styles.userHeader}>
        <View style={styles.userAvatar}>
          <Text style={styles.userAvatarText}>
            {(user.display_name || 'U')[0].toUpperCase()}
          </Text>
        </View>
        <View style={styles.userInfo}>
          <View style={styles.userNameRow}>
            <Text style={styles.userName}>{user.display_name}</Text>
            {user.is_super_admin && (
              <View style={styles.superBadge}>
                <Text style={styles.superBadgeText}>ADMIN</Text>
              </View>
            )}
            {user.is_master_account && (
              <View style={styles.masterBadge}>
                <Text style={styles.masterBadgeText}>MASTER</Text>
              </View>
            )}
          </View>
          <Text style={styles.userEmail}>{user.email || 'No email'}</Text>
          <View style={styles.userMeta}>
            <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
              <Text style={[styles.statusText, { color: status.text }]}>{status.label}</Text>
            </View>
            <Text style={styles.userRole}>{user.role}</Text>
            <Text style={styles.userHousehold}>
              {(user.households as any)?.name || 'No household'}
            </Text>
          </View>
        </View>
        <Text style={styles.expandArrow}>{expanded ? '▼' : '›'}</Text>
      </View>

      {expanded && (
        <View style={styles.userActions}>
          <View style={styles.userDetail}>
            <Text style={styles.detailLabel}>Joined</Text>
            <Text style={styles.detailValue}>
              {new Date(user.joined_at).toLocaleDateString()}
            </Text>
          </View>
          <View style={styles.userDetail}>
            <Text style={styles.detailLabel}>2FA</Text>
            <Switch
              value={user.two_factor_enabled}
              onValueChange={onToggle2FA}
              trackColor={{ true: colors.green[500], false: colors.gray[300] }}
              thumbColor={colors.white}
            />
          </View>
          <View style={styles.userDetail}>
            <Text style={styles.detailLabel}>Password Change Required</Text>
            <Text style={[styles.detailValue, user.require_password_change && { color: colors.warning }]}>
              {user.require_password_change ? 'Yes' : 'No'}
            </Text>
          </View>
          <View style={styles.userDetail}>
            <Text style={styles.detailLabel}>Subscription</Text>
            <Text style={styles.detailValue}>
              {(user.households as any)?.subscription_status || 'free'}
            </Text>
          </View>
          <View style={styles.userDetail}>
            <Text style={styles.detailLabel}>Trial Expires</Text>
            <Text style={styles.detailValue}>
              {(user.households as any)?.trial_expires_at
                ? new Date((user.households as any).trial_expires_at).toLocaleDateString()
                : 'N/A'}
            </Text>
          </View>
          <View style={styles.userDetail}>
            <Text style={styles.detailLabel}>Billing Exempt</Text>
            <Text style={[styles.detailValue, (user.households as any)?.is_billing_exempt && { color: colors.green[600] }]}>
              {(user.households as any)?.is_billing_exempt ? 'Yes (free forever)' : 'No'}
            </Text>
          </View>

          <View style={styles.actionButtons}>
            {user.approval_status !== 'approved' && (
              <TouchableOpacity style={styles.approveBtn} onPress={onApprove}>
                <Text style={styles.approveBtnText}>Approve</Text>
              </TouchableOpacity>
            )}
            {user.approval_status === 'approved' && (
              <TouchableOpacity style={styles.suspendBtn} onPress={onSuspend}>
                <Text style={styles.suspendBtnText}>Suspend</Text>
              </TouchableOpacity>
            )}
            {user.approval_status !== 'revoked' && (
              <TouchableOpacity style={styles.revokeBtn} onPress={onRevoke}>
                <Text style={styles.revokeBtnText}>Revoke</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={styles.resetBtn} onPress={onPasswordReset}>
              <Text style={styles.resetBtnText}>Force PW Change</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.resetBtn} onPress={onSendResetEmail}>
              <Text style={styles.resetBtnText}>Send Reset Email</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.trialBtn} onPress={onExtendTrial}>
              <Text style={styles.trialBtnText}>Extend Trial +7 Days</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.exemptBtn, (user.households as any)?.is_billing_exempt && styles.exemptBtnActive]}
              onPress={onToggleBillingExempt}
            >
              <Text style={[styles.exemptBtnText, (user.households as any)?.is_billing_exempt && styles.exemptBtnTextActive]}>
                {(user.households as any)?.is_billing_exempt ? 'Remove Free Pass' : 'Grant Free Pass'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </TouchableOpacity>
  );
}

export default function AdminScreen() {
  const router = useRouter();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [logs, setLogs] = useState<AdminLogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'users' | 'pending' | 'log'>('users');
  const [showLogModal, setShowLogModal] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [statsRes, usersRes] = await Promise.all([
        getAdminStats(),
        listAllUsers(),
      ]);
      if (statsRes.success) setStats(statsRes.stats);
      if (usersRes.success) setUsers(usersRes.users);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to load admin data');
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, []);

  const loadLog = useCallback(async () => {
    try {
      const res = await getAdminLog();
      if (res.success) setLogs(res.logs);
    } catch {}
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleAction = async (
    actionFn: () => Promise<any>,
    actionName: string,
    userName: string
  ) => {
    Alert.alert(
      `${actionName} User`,
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
                Alert.alert('Success', `${userName} has been ${actionName.toLowerCase()}d.`);
                loadData();
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

  const pendingUsers = users.filter((u) => u.approval_status === 'pending');
  const filteredUsers = activeTab === 'pending' ? pendingUsers : users;

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.green[500]} />
          <Text style={styles.loadingText}>Loading admin panel...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Admin Panel</Text>
          <Text style={styles.headerSubtitle}>Super Administrator</Text>
        </View>
        <TouchableOpacity
          style={styles.logBtn}
          onPress={() => { loadLog(); setShowLogModal(true); }}
        >
          <Text style={styles.logBtnText}>📋</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} tintColor={colors.green[500]} />
        }
      >
        {/* Stats cards */}
        {stats && (
          <View style={styles.statsRow}>
            <StatCard label="Total Users" value={stats.total_users} color={colors.blue[600]} />
            <StatCard label="Pending" value={stats.pending_approval} color={colors.warning} />
            <StatCard label="Approved" value={stats.approved} color={colors.green[600]} />
            <StatCard label="Households" value={stats.total_households} color={colors.teal[600]} />
          </View>
        )}

        {/* Pending alert */}
        {pendingUsers.length > 0 && activeTab !== 'pending' && (
          <TouchableOpacity
            style={styles.pendingAlert}
            onPress={() => setActiveTab('pending')}
          >
            <Text style={styles.pendingAlertEmoji}>⚠️</Text>
            <Text style={styles.pendingAlertText}>
              {pendingUsers.length} user{pendingUsers.length !== 1 ? 's' : ''} awaiting approval
            </Text>
            <Text style={styles.pendingAlertAction}>Review →</Text>
          </TouchableOpacity>
        )}

        {/* Tab selector */}
        <View style={styles.tabs}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'users' && styles.tabActive]}
            onPress={() => setActiveTab('users')}
          >
            <Text style={[styles.tabText, activeTab === 'users' && styles.tabTextActive]}>
              All Users ({users.length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'pending' && styles.tabActive]}
            onPress={() => setActiveTab('pending')}
          >
            <Text style={[styles.tabText, activeTab === 'pending' && styles.tabTextActive]}>
              Pending ({pendingUsers.length})
            </Text>
          </TouchableOpacity>
        </View>

        {/* User list */}
        {filteredUsers.length === 0 ? (
          <Card variant="outlined" style={{ marginTop: 16 }}>
            <View style={styles.emptyState}>
              <Text style={styles.emptyEmoji}>
                {activeTab === 'pending' ? '✅' : '👥'}
              </Text>
              <Text style={styles.emptyText}>
                {activeTab === 'pending' ? 'No pending approvals' : 'No users found'}
              </Text>
            </View>
          </Card>
        ) : (
          filteredUsers.map((user) => (
            <UserCard
              key={user.id}
              user={user}
              onApprove={() => handleAction(() => approveUser(user.id), 'Approve', user.display_name)}
              onRevoke={() => handleAction(() => revokeUser(user.id), 'Revoke', user.display_name)}
              onSuspend={() => handleAction(() => suspendUser(user.id), 'Suspend', user.display_name)}
              onToggle2FA={() => {
                toggle2FA(user.id, !user.two_factor_enabled).then(() => loadData());
              }}
              onPasswordReset={() => handleAction(() => forcePasswordChange(user.id), 'Force Password Change', user.display_name)}
              onSendResetEmail={() => handleAction(() => sendPasswordReset(user.id), 'Send Password Reset', user.display_name)}
              onExtendTrial={() => handleAction(() => extendTrial(user.id, 7), 'Extend Trial (+7 days)', user.display_name)}
              onToggleBillingExempt={() => handleAction(() => toggleBillingExempt(user.id), 'Toggle Billing Exemption', user.display_name)}
            />
          ))
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Admin Log Modal */}
      <Modal visible={showLogModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Admin Activity Log</Text>
              <TouchableOpacity onPress={() => setShowLogModal(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.logList}>
              {logs.length === 0 ? (
                <Text style={styles.logEmpty}>No admin actions recorded yet.</Text>
              ) : (
                logs.map((log) => (
                  <View key={log.id} style={styles.logItem}>
                    <View style={styles.logDot} />
                    <View style={styles.logInfo}>
                      <Text style={styles.logAction}>
                        {(log.admin_member as any)?.display_name || 'Admin'} → {log.action.replace(/_/g, ' ')}
                      </Text>
                      <Text style={styles.logTarget}>
                        Target: {(log.target_member as any)?.display_name || 'N/A'}
                      </Text>
                      <Text style={styles.logTime}>
                        {new Date(log.created_at).toLocaleString()}
                      </Text>
                    </View>
                  </View>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.gray[50] },

  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loadingText: { ...typography.body, color: colors.gray[400] },

  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
    backgroundColor: colors.gray[900], borderBottomWidth: 0,
  },
  backButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  backText: { fontSize: 24, color: colors.white },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: { ...typography.h3, color: colors.white },
  headerSubtitle: { ...typography.small, color: colors.gray[400] },
  logBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  logBtnText: { fontSize: 22 },

  content: { padding: spacing.lg },

  // Stats
  statsRow: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16,
  },
  statCard: {
    flex: 1, minWidth: '46%',
    backgroundColor: colors.glass.elevated, borderRadius: borderRadius.lg,
    padding: 14, borderLeftWidth: 4,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.60)',
    ...shadows.glass,
  },
  statValue: { fontSize: 28, fontWeight: '800' },
  statLabel: { ...typography.small, color: colors.gray[500], marginTop: 2 },

  // Pending alert
  pendingAlert: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#FEF3C7', borderWidth: 1, borderColor: '#FDE68A',
    borderRadius: borderRadius.lg, padding: 14, marginBottom: 16,
  },
  pendingAlertEmoji: { fontSize: 20 },
  pendingAlertText: { ...typography.bodyBold, color: '#92400E', flex: 1 },
  pendingAlertAction: { ...typography.caption, color: '#B45309', fontWeight: '700' },

  // Tabs
  tabs: {
    flexDirection: 'row', backgroundColor: 'rgba(0,0,0,0.04)',
    borderRadius: borderRadius.lg, padding: 3, marginBottom: 16,
  },
  tab: {
    flex: 1, paddingVertical: 10, borderRadius: borderRadius.md, alignItems: 'center',
  },
  tabActive: { backgroundColor: colors.glass.elevated, ...shadows.glass },
  tabText: { ...typography.caption, fontWeight: '600', color: colors.gray[500] },
  tabTextActive: { color: colors.gray[900] },

  // User cards
  userCard: {
    backgroundColor: colors.glass.elevated, borderRadius: borderRadius.xl,
    padding: 14, marginBottom: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.60)',
    ...shadows.glass,
  },
  userHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  userAvatar: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: colors.blue[100], justifyContent: 'center', alignItems: 'center',
  },
  userAvatarText: { fontSize: 18, fontWeight: '700', color: colors.blue[700] },
  userInfo: { flex: 1 },
  userNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  userName: { ...typography.bodyBold, color: colors.gray[900] },
  superBadge: {
    backgroundColor: colors.gray[900], borderRadius: 4,
    paddingHorizontal: 5, paddingVertical: 1,
  },
  superBadgeText: { ...typography.small, color: colors.white, fontWeight: '800', fontSize: 9 },
  masterBadge: {
    backgroundColor: colors.green[600], borderRadius: 4,
    paddingHorizontal: 5, paddingVertical: 1,
  },
  masterBadgeText: { ...typography.small, color: colors.white, fontWeight: '800', fontSize: 9 },
  userEmail: { ...typography.small, color: colors.gray[400] },
  userMeta: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  statusBadge: { borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
  statusText: { fontSize: 10, fontWeight: '700' },
  userRole: { ...typography.small, color: colors.gray[400], textTransform: 'capitalize' },
  userHousehold: { ...typography.small, color: colors.gray[400] },
  expandArrow: { fontSize: 16, color: colors.gray[300] },

  // Expanded actions
  userActions: {
    marginTop: 14, paddingTop: 14, borderTopWidth: 1, borderTopColor: colors.gray[100],
  },
  userDetail: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 8,
  },
  detailLabel: { ...typography.caption, color: colors.gray[500] },
  detailValue: { ...typography.caption, color: colors.gray[800], fontWeight: '600' },

  actionButtons: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12,
  },
  approveBtn: {
    backgroundColor: colors.green[500], borderRadius: borderRadius.md,
    paddingVertical: 8, paddingHorizontal: 14,
  },
  approveBtnText: { ...typography.small, color: colors.white, fontWeight: '700' },
  suspendBtn: {
    backgroundColor: colors.warning, borderRadius: borderRadius.md,
    paddingVertical: 8, paddingHorizontal: 14,
  },
  suspendBtnText: { ...typography.small, color: colors.white, fontWeight: '700' },
  revokeBtn: {
    backgroundColor: colors.error, borderRadius: borderRadius.md,
    paddingVertical: 8, paddingHorizontal: 14,
  },
  revokeBtnText: { ...typography.small, color: colors.white, fontWeight: '700' },
  resetBtn: {
    backgroundColor: colors.gray[100], borderRadius: borderRadius.md,
    paddingVertical: 8, paddingHorizontal: 14,
  },
  resetBtnText: { ...typography.small, color: colors.gray[700], fontWeight: '600' },
  trialBtn: {
    backgroundColor: colors.blue[50], borderRadius: borderRadius.md,
    paddingVertical: 8, paddingHorizontal: 14, borderWidth: 1, borderColor: colors.blue[200],
  },
  trialBtnText: { ...typography.small, color: colors.blue[700], fontWeight: '600' },
  exemptBtn: {
    backgroundColor: colors.green[50], borderRadius: borderRadius.md,
    paddingVertical: 8, paddingHorizontal: 14, borderWidth: 1, borderColor: colors.green[200],
  },
  exemptBtnActive: { backgroundColor: colors.error, borderColor: colors.error },
  exemptBtnText: { ...typography.small, color: colors.green[700], fontWeight: '600' },
  exemptBtnTextActive: { color: colors.white },

  // Empty state
  emptyState: { alignItems: 'center', paddingVertical: 20 },
  emptyEmoji: { fontSize: 32, marginBottom: 8 },
  emptyText: { ...typography.body, color: colors.gray[400] },

  // Modal
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.white, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, maxHeight: '70%',
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
  },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16,
  },
  modalTitle: { ...typography.h2, color: colors.gray[900] },
  modalClose: { fontSize: 22, color: colors.gray[400], padding: 4 },
  logList: { flex: 1 },
  logEmpty: { ...typography.body, color: colors.gray[400], textAlign: 'center', marginTop: 20 },
  logItem: {
    flexDirection: 'row', gap: 10, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: colors.gray[100],
  },
  logDot: {
    width: 8, height: 8, borderRadius: 4, backgroundColor: colors.green[500], marginTop: 6,
  },
  logInfo: { flex: 1 },
  logAction: { ...typography.caption, color: colors.gray[800], fontWeight: '600' },
  logTarget: { ...typography.small, color: colors.gray[500] },
  logTime: { ...typography.small, color: colors.gray[400], marginTop: 2 },
});
