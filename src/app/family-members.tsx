/**
 * Family Members Management Screen
 * View and manage household members, invite new family members, manage roles
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { useAuthStore } from '../stores/authStore';
import { supabase } from '../lib/supabase';
import { colors, typography, spacing, shadows, borderRadius } from '../constants/theme';

interface HouseholdMemberRow {
  id: string;
  household_id: string;
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  role: 'parent' | 'teen' | 'child';
  joined_at: string;
  permissions: Record<string, boolean>;
}

const ROLE_CONFIG = {
  parent: {
    label: 'Parent',
    color: colors.green[600],
    bgColor: colors.green[50],
    description: 'Full access to all features',
  },
  teen: {
    label: 'Teen',
    color: colors.blue[600],
    bgColor: colors.blue[50],
    description: 'Limited access, no expense management',
  },
  child: {
    label: 'Child',
    color: colors.gray[600],
    bgColor: colors.gray[100],
    description: 'View-only access',
  },
};

function MemberCard({
  member,
  isCurrentUser,
  canRemove,
  onRemove,
}: {
  member: HouseholdMemberRow;
  isCurrentUser: boolean;
  canRemove: boolean;
  onRemove: () => void;
}) {
  const roleConfig = ROLE_CONFIG[member.role];

  return (
    <Card style={styles.memberCard}>
      <View style={styles.memberContent}>
        {/* Avatar and basic info */}
        <View style={styles.memberTop}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>
              {(member.display_name || 'U')[0].toUpperCase()}
            </Text>
          </View>
          <View style={styles.memberInfo}>
            <View style={styles.nameRow}>
              <Text style={styles.memberName}>{member.display_name}</Text>
              {isCurrentUser && <Text style={styles.youBadge}>You</Text>}
            </View>
            <Text style={styles.joinedDate}>
              Joined {new Date(member.joined_at).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}
            </Text>
          </View>
        </View>

        {/* Role badge and description */}
        <View style={styles.memberBottom}>
          <View style={[styles.roleBadge, { backgroundColor: roleConfig.bgColor }]}>
            <Text style={[styles.roleBadgeText, { color: roleConfig.color }]}>
              {roleConfig.label}
            </Text>
          </View>
          <Text style={styles.roleDescription}>{roleConfig.description}</Text>
        </View>

        {/* Remove button */}
        {canRemove && !isCurrentUser && (
          <TouchableOpacity style={styles.removeBtn} onPress={onRemove}>
            <Text style={styles.removeBtnText}>Remove</Text>
          </TouchableOpacity>
        )}
      </View>
    </Card>
  );
}

export default function FamilyMembersScreen() {
  const router = useRouter();
  const { member: currentMember, household } = useAuthStore();

  const [members, setMembers] = useState<HouseholdMemberRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);

  // Fetch household members
  const loadMembers = useCallback(async () => {
    if (!household) return;

    try {
      setIsLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('household_members')
        .select('*')
        .eq('household_id', household.id)
        .order('joined_at', { ascending: true });

      if (fetchError) throw fetchError;

      setMembers((data as HouseholdMemberRow[]) || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load members');
    } finally {
      setIsLoading(false);
    }
  }, [household]);

  useEffect(() => {
    loadMembers();
  }, [loadMembers]);

  const handleRemoveMember = useCallback(
    (memberId: string, memberName: string) => {
      Alert.alert('Remove Member', `Remove ${memberName} from your household?`, [
        { text: 'Cancel', onPress: () => {} },
        {
          text: 'Remove',
          onPress: async () => {
            try {
              const { error: deleteError } = await supabase
                .from('household_members')
                .delete()
                .eq('id', memberId);

              if (deleteError) throw deleteError;

              setMembers((prev) => prev.filter((m) => m.id !== memberId));
            } catch (err) {
              Alert.alert('Error', 'Failed to remove member');
            }
          },
          style: 'destructive',
        },
      ]);
    },
    []
  );

  const handleCopyInviteCode = useCallback(async () => {
    if (!household?.invite_code) return;

    try {
      // Try to use Share API to show copy option
      Share.share({
        message: `Join my HomeBase household with this code: ${household.invite_code}`,
        title: 'HomeBase Invite Code',
      }).catch(() => {
        // If Share fails, just show the code in alert
        Alert.alert('Invite Code', `Your invite code: ${household.invite_code}`);
      });
    } catch (err) {
      Alert.alert('Error', 'Failed to share invite code');
    }
  }, [household?.invite_code]);

  const isParent = currentMember?.role === 'parent';

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Back button header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <Text style={styles.backButtonText}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Family Members</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.green[600]} />
          </View>
        ) : error ? (
          <Card style={styles.errorCard}>
            <Text style={styles.errorText}>{error}</Text>
            <Button title="Try Again" onPress={loadMembers} size="sm" style={styles.retryBtn} />
          </Card>
        ) : (
          <>
            {/* Members List */}
            <Text style={styles.sectionTitle}>Household Members ({members.length})</Text>
            <View style={styles.membersList}>
              {members.map((m) => (
                <MemberCard
                  key={m.id}
                  member={m}
                  isCurrentUser={m.id === currentMember?.id}
                  canRemove={isParent && m.id !== currentMember?.id}
                  onRemove={() => handleRemoveMember(m.id, m.display_name)}
                />
              ))}
            </View>

            {/* Invite Section */}
            <Text style={styles.sectionTitle}>Invite Family Members</Text>
            <Card style={styles.inviteCard}>
              <Text style={styles.inviteLabel}>Share your invite code:</Text>
              <View style={styles.inviteCodeContainer}>
                <Text style={styles.inviteCode}>{household?.invite_code || '—'}</Text>
                <TouchableOpacity
                  style={styles.copyButton}
                  onPress={handleCopyInviteCode}
                  activeOpacity={0.7}
                >
                  <Text style={styles.copyButtonText}>
                    {copiedCode ? '✓ Copied' : 'Copy'}
                  </Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.inviteSubtext}>
                Share this code with family members so they can join your household
              </Text>
              <Button
                title="📤 Share Invite"
                onPress={() => {
                  if (household?.invite_code) {
                    Share.share({
                      message: `Join my HomeBase household! Use this invite code: ${household.invite_code}`,
                      title: 'HomeBase Household Invite',
                    });
                  }
                }}
                variant="outline"
                size="md"
                style={styles.shareBtn}
              />
            </Card>

            {/* Role Permissions Info */}
            <Text style={styles.sectionTitle}>Role Permissions</Text>
            {(['parent', 'teen', 'child'] as const).map((role) => {
              const config = ROLE_CONFIG[role];
              return (
                <Card key={role} style={styles.permissionCard}>
                  <View style={styles.permissionHeader}>
                    <View style={[styles.permissionBadge, { backgroundColor: config.bgColor }]}>
                      <Text style={[styles.permissionBadgeText, { color: config.color }]}>
                        {config.label}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.permissionDescription}>{config.description}</Text>
                  <View style={styles.permissionDetails}>
                    {role === 'parent' && (
                      <>
                        <Text style={styles.permissionItem}>✓ Add/remove family members</Text>
                        <Text style={styles.permissionItem}>✓ Full expense tracking</Text>
                        <Text style={styles.permissionItem}>✓ Access financial reports</Text>
                        <Text style={styles.permissionItem}>✓ Manage household settings</Text>
                      </>
                    )}
                    {role === 'teen' && (
                      <>
                        <Text style={styles.permissionItem}>✓ View household calendar</Text>
                        <Text style={styles.permissionItem}>✓ Add grocery items</Text>
                        <Text style={styles.permissionItem}>✗ Cannot track expenses</Text>
                        <Text style={styles.permissionItem}>✗ Cannot access financial reports</Text>
                      </>
                    )}
                    {role === 'child' && (
                      <>
                        <Text style={styles.permissionItem}>✓ View household calendar</Text>
                        <Text style={styles.permissionItem}>✓ View grocery list</Text>
                        <Text style={styles.permissionItem}>✗ Cannot add or edit items</Text>
                        <Text style={styles.permissionItem}>✗ Cannot track expenses</Text>
                      </>
                    )}
                  </View>
                </Card>
              );
            })}

            <View style={{ height: 100 }} />
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[100],
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.sm,
  },
  backButtonText: {
    fontSize: 28,
    color: colors.gray[900],
    fontWeight: '600',
  },
  headerTitle: {
    ...typography.h2,
    color: colors.gray[900],
  },

  scrollContent: { padding: spacing.lg, paddingTop: spacing.md },

  sectionTitle: {
    ...typography.bodyBold,
    color: colors.gray[700],
    marginBottom: spacing.md,
    marginTop: spacing.lg,
  },

  // Members List
  membersList: { gap: spacing.md, marginBottom: spacing.lg },
  memberCard: { marginBottom: 0 },
  memberContent: { gap: spacing.md },
  memberTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  avatarCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.green[100],
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.green[700],
  },
  memberInfo: { flex: 1, justifyContent: 'center' },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  memberName: { ...typography.bodyBold, color: colors.gray[900] },
  youBadge: {
    ...typography.small,
    backgroundColor: colors.green[100],
    color: colors.green[700],
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
    overflow: 'hidden',
    fontWeight: '600',
  },
  joinedDate: {
    ...typography.caption,
    color: colors.gray[500],
    marginTop: 2,
  },

  memberBottom: { gap: spacing.sm },
  roleBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  roleBadgeText: {
    ...typography.small,
    fontWeight: '600',
  },
  roleDescription: {
    ...typography.caption,
    color: colors.gray[500],
  },

  removeBtn: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.gray[100],
    marginHorizontal: -spacing.lg,
    marginBottom: -spacing.lg,
    marginTop: spacing.sm,
  },
  removeBtnText: {
    ...typography.body,
    color: colors.error,
    fontWeight: '600',
  },

  // Invite Section
  inviteCard: { marginBottom: spacing.lg },
  inviteLabel: {
    ...typography.bodyBold,
    color: colors.gray[900],
    marginBottom: spacing.sm,
  },
  inviteCodeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.green[50],
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.md,
  },
  inviteCode: {
    ...typography.h3,
    color: colors.green[700],
    flex: 1,
    fontFamily: 'Courier New',
    letterSpacing: 2,
  },
  copyButton: {
    backgroundColor: colors.green[600],
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  copyButtonText: {
    ...typography.small,
    color: colors.white,
    fontWeight: '600',
  },
  inviteSubtext: {
    ...typography.caption,
    color: colors.gray[500],
    marginBottom: spacing.md,
  },
  shareBtn: { marginTop: spacing.sm },

  // Role Permissions
  permissionCard: { marginBottom: spacing.md },
  permissionHeader: { marginBottom: spacing.md },
  permissionBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  permissionBadgeText: {
    ...typography.small,
    fontWeight: '600',
  },
  permissionDescription: {
    ...typography.body,
    color: colors.gray[700],
    marginBottom: spacing.sm,
  },
  permissionDetails: {
    gap: spacing.sm,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.gray[100],
  },
  permissionItem: {
    ...typography.body,
    color: colors.gray[600],
    lineHeight: 22,
  },

  // Error state
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 200,
  },
  errorCard: { marginVertical: spacing.lg },
  errorText: {
    ...typography.body,
    color: colors.error,
    marginBottom: spacing.md,
  },
  retryBtn: { alignSelf: 'flex-start' },
});
