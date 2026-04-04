import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { colors, spacing, borderRadius, typography, shadows } from '@/constants/design';
import {
  getGroup,
  getPlayers,
  getCurrentUser,
  getAllPlayerRatings,
  getGroupMembers,
  transferOwnership,
  leaveGroup,
  promoteToAdmin,
  demoteToPlayer,
  takeBillingOwnership,
  GroupMember,
} from '@/lib/data';
import { getRatingColor, multiSnakeDraft, computeRating } from '@/lib/ratings';
import RatingBadge from '@/components/RatingBadge';
import { useRouter } from 'expo-router';

// ── Constants ─────────────────────────────────────────────────────────────────

const POSITION_COLORS: Record<string, string> = {
  Goalkeeper: '#7C3AED',
  Defender:   '#2563EB',
  Midfielder: '#D97706',
  Striker:    '#DC2626',
  Any:        '#6B7280',
};

const TEAM_META = [
  { letter: 'A', color: '#0F2027', bg: '#E8F4F8', label: 'Team A' },
  { letter: 'B', color: '#DC2626', bg: '#FEE2E2', label: 'Team B' },
  { letter: 'C', color: '#7C3AED', bg: '#EDE9FE', label: 'Team C' },
  { letter: 'D', color: '#D97706', bg: '#FEF3C7', label: 'Team D' },
];

// ── Role badge config ─────────────────────────────────────────────────────────

const ROLE_CONFIG = {
  owner: { label: 'Owner', icon: 'trophy' as const,      bg: '#FFFBEB', text: '#D97706', border: '#FDE68A' },
  admin: { label: 'Admin', icon: 'shield' as const,      bg: '#EFF6FF', text: '#2563EB', border: '#BFDBFE' },
  player:{ label: '',      icon: 'person' as const,      bg: 'transparent', text: '#6B7280', border: 'transparent' },
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function showAlert(title: string, msg: string) {
  if (Platform.OS === 'web') {
    window.alert(`${title}\n${msg}`);
  } else {
    Alert.alert(title, msg);
  }
}

// ── Screen ────────────────────────────────────────────────────────────────────

export default function GroupScreen() {
  const router       = useRouter();
  const queryClient  = useQueryClient();

  // ── Create Teams modal state (unchanged) ──────────────────────────────────
  const [teamsModal,  setTeamsModal]  = useState(false);
  const [numTeams,    setNumTeams]    = useState<2 | 3 | 4 | null>(null);
  type GeneratedTeam = { meta: typeof TEAM_META[0]; players: { id: string; name: string; position: string; rating: number }[]; total: number };
  const [generated, setGenerated]    = useState<GeneratedTeam[] | null>(null);

  // ── Ownership / leave flow state ──────────────────────────────────────────
  const [transferModal,   setTransferModal]   = useState(false);
  const [transferStep,    setTransferStep]    = useState<'pick' | 'done'>('pick');
  const [selectedAdminId, setSelectedAdminId] = useState<string | null>(null);
  const [newOwnerName,    setNewOwnerName]    = useState('');
  const [shouldLeaveAfter,setShouldLeaveAfter]= useState(false);

  // ── Member management state (owner promotes/demotes) ─────────────────────
  const [manageModal,   setManageModal]   = useState(false);
  const [managedMember, setManagedMember] = useState<GroupMember | null>(null);

  // ── Leave confirmation ────────────────────────────────────────────────────
  const [leaveModal, setLeaveModal] = useState(false);

  // ── Billing takeover ──────────────────────────────────────────────────────
  const [billingModal, setBillingModal] = useState(false);

  // ── Queries ───────────────────────────────────────────────────────────────

  const { data: group, isLoading: groupLoading } = useQuery({
    queryKey: ['group'],
    queryFn:  getGroup,
  });

  const { data: groupMembers, isLoading: membersLoading } = useQuery({
    queryKey: ['groupMembers', group?.id],
    queryFn:  () => getGroupMembers(group!.id),
    enabled:  !!group?.id,
  });

  const { data: players, isLoading: playersLoading } = useQuery({
    queryKey: ['players'],
    queryFn:  getPlayers,
  });

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn:  getCurrentUser,
  });

  const { data: ratings } = useQuery({
    queryKey: ['allPlayerRatings'],
    queryFn:  getAllPlayerRatings,
  });

  // ── Derived values ────────────────────────────────────────────────────────

  // My membership row in this group
  const myMembership = useMemo(
    () => groupMembers?.find((m) => m.id === currentUser?.id) ?? null,
    [groupMembers, currentUser],
  );

  const myRole     = myMembership?.role ?? null;
  const isOwner    = myRole === 'owner';
  const isAdmin    = myRole === 'admin' || myRole === 'owner';

  const isPaidPlan = group?.subscription_plan === 'pro' || group?.subscription_plan === 'squad_plus';
  const isFreeTier = !isPaidPlan;

  // On free tier only 1 admin (besides the owner) is allowed
  const currentAdminCount = useMemo(
    () => (groupMembers ?? []).filter((m) => m.role === 'admin').length,
    [groupMembers],
  );
  const freeAdminLimitReached = isFreeTier && currentAdminCount >= 1;

  // Admins eligible for ownership transfer (not myself)
  const eligibleAdmins = useMemo(
    () => (groupMembers ?? []).filter(
      (m) => m.role === 'admin' && m.id !== currentUser?.id,
    ),
    [groupMembers, currentUser],
  );

  // Billing nudge: I'm the owner but billing hasn't been taken over yet
  const showBillingNudge =
    isOwner &&
    group?.billing_transferred_at &&
    group?.billing_owner_id !== currentUser?.id;

  // Display list: use groupMembers if populated, else fall back to players
  const displayMembers: GroupMember[] = useMemo(() => {
    if (groupMembers && groupMembers.length > 0) return groupMembers;
    // Fallback: treat all players as 'player' role
    return (players ?? []).map((p) => ({
      memberId:    `fallback_${p.id}`,
      role:        (p.role === 'admin' ? 'admin' : 'player') as 'admin' | 'player',
      joinedAt:    '',
      player_id:   p.id,
      id:          p.id,
      name:        p.name,
      position:    p.position,
      skill_level: p.skill_level,
      user_id:     p.user_id ?? null,
    }));
  }, [groupMembers, players]);

  // ── Mutations ─────────────────────────────────────────────────────────────

  const invalidateGroup = () => {
    queryClient.invalidateQueries({ queryKey: ['groupMembers', group?.id] });
    queryClient.invalidateQueries({ queryKey: ['group'] });
  };

  const transferMutation = useMutation({
    mutationFn: () => transferOwnership(group!.id, selectedAdminId!, currentUser!.id),
    onSuccess: () => {
      const admin = eligibleAdmins.find((a) => a.id === selectedAdminId);
      setNewOwnerName(admin?.name ?? 'the new owner');
      setTransferStep('done');
      invalidateGroup();
    },
    onError: (err: any) => {
      showAlert('Transfer failed', err.message ?? 'Please try again.');
    },
  });

  const leaveMutation = useMutation({
    mutationFn: () => leaveGroup(group!.id, currentUser!.id),
    onSuccess: () => {
      setLeaveModal(false);
      setTransferModal(false);
      router.replace('/(tabs)/home');
    },
    onError: (err: any) => {
      showAlert('Cannot leave', err.message ?? 'Please try again.');
    },
  });

  const promoteMutation = useMutation({
    mutationFn: (playerId: string) => promoteToAdmin(group!.id, playerId),
    onSuccess: () => { setManageModal(false); invalidateGroup(); },
    onError:   (err: any) => showAlert('Error', err.message),
  });

  const demoteMutation = useMutation({
    mutationFn: (playerId: string) => demoteToPlayer(group!.id, playerId),
    onSuccess: () => { setManageModal(false); invalidateGroup(); },
    onError:   (err: any) => showAlert('Error', err.message),
  });

  const billingMutation = useMutation({
    mutationFn: () => takeBillingOwnership(group!.id, currentUser!.id),
    onSuccess: () => { setBillingModal(false); invalidateGroup(); },
    onError:   (err: any) => showAlert('Error', err.message),
  });

  // ── Leave group handler ───────────────────────────────────────────────────

  const handleLeavePress = () => {
    if (!isOwner) {
      setLeaveModal(true);
      return;
    }
    if (eligibleAdmins.length === 0) {
      showAlert(
        'Promote someone first',
        'You need to promote at least one member to Admin before you can leave.',
      );
      return;
    }
    // Owner: open transfer modal
    setTransferStep('pick');
    setSelectedAdminId(null);
    setShouldLeaveAfter(true);
    setTransferModal(true);
  };

  // ── Team generation (unchanged logic) ────────────────────────────────────

  const handleGenerateTeams = (n: 2 | 3 | 4) => {
    setNumTeams(n);
    const allPlayers  = players ?? [];
    const allRatings  = ratings ?? {};
    const sorted      = [...allPlayers].sort((a, b) => (allRatings[b.id] ?? 3) - (allRatings[a.id] ?? 3));
    const playerGroups = multiSnakeDraft(sorted, n);
    const result: GeneratedTeam[] = playerGroups.map((group, i) => {
      const meta        = TEAM_META[i];
      const teamPlayers = group.map((p) => ({
        id:       p.id,
        name:     p.name,
        position: p.position,
        rating:   allRatings[p.id] ?? computeRating({ skillLevel: p.skill_level, motmWins: 0, attendanceRate: 0, wins: 0, totalGames: 0 }),
      }));
      const total = Math.round(teamPlayers.reduce((s, p) => s + p.rating, 0) * 10) / 10;
      return { meta, players: teamPlayers, total };
    });
    setGenerated(result);
  };

  const resetTeams = () => { setGenerated(null); setNumTeams(null); };

  // ── Loading ───────────────────────────────────────────────────────────────

  if (groupLoading || playersLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.accent} />
        </View>
      </SafeAreaView>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* ── Billing Nudge Banner ─────────────────────────────────────── */}
        {showBillingNudge && (
          <TouchableOpacity style={styles.billingNudge} onPress={() => setBillingModal(true)} activeOpacity={0.88}>
            <View style={styles.billingNudgeLeft}>
              <Ionicons name="card-outline" size={20} color="#D97706" />
              <View style={{ flex: 1, marginLeft: spacing.sm }}>
                <Text style={styles.billingNudgeTitle}>You're the new squad owner</Text>
                <Text style={styles.billingNudgeSub}>Take over the subscription to manage billing</Text>
              </View>
            </View>
            <View style={styles.billingNudgeBtn}>
              <Text style={styles.billingNudgeBtnText}>Take over</Text>
            </View>
          </TouchableOpacity>
        )}

        {/* ── Group Header ─────────────────────────────────────────────── */}
        <View style={styles.groupHeader}>
          <View style={styles.groupLogoContainer}>
            <View style={styles.groupLogo}>
              <Ionicons name="football" size={32} color={colors.white} />
            </View>
          </View>
          <View style={styles.groupInfo}>
            <Text style={styles.groupName}>{group?.name ?? 'Sunday Warriors FC'}</Text>
            <View style={styles.groupMeta}>
              <Ionicons name="location-outline" size={14} color={colors.textSecondary} />
              <Text style={styles.groupLocation}>{group?.location ?? 'Hackney Marshes'}</Text>
            </View>
            {group?.description ? (
              <Text style={styles.groupDesc}>{group.description}</Text>
            ) : null}
            {/* Plan badge */}
            <View style={styles.planBadge}>
              <Ionicons
                name={group?.subscription_plan === 'squad_plus' ? 'star' : group?.subscription_plan === 'pro' ? 'flash' : 'person'}
                size={11}
                color={group?.subscription_plan === 'squad_plus' ? '#D97706' : group?.subscription_plan === 'pro' ? '#2563EB' : '#6B7280'}
              />
              <Text style={[
                styles.planBadgeText,
                { color: group?.subscription_plan === 'squad_plus' ? '#D97706' : group?.subscription_plan === 'pro' ? '#2563EB' : '#6B7280' }
              ]}>
                {group?.subscription_plan === 'squad_plus' ? 'Squad+' : group?.subscription_plan === 'pro' ? 'Pro' : 'Free'}
              </Text>
            </View>
          </View>
        </View>

        {/* ── Stats Strip ──────────────────────────────────────────────── */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{displayMembers.length}</Text>
            <Text style={styles.statLabel}>Members</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>5-a-side</Text>
            <Text style={styles.statLabel}>Format</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>Weekly</Text>
            <Text style={styles.statLabel}>Frequency</Text>
          </View>
        </View>

        {/* ── Free Tier Banner ─────────────────────────────────────────── */}
        {isFreeTier && (
          <TouchableOpacity style={styles.freeBanner} onPress={() => router.push('/pricing')} activeOpacity={0.88}>
            <View style={{ flex: 1 }}>
              <Text style={styles.freeBannerTitle}>Free plan · 1 admin max</Text>
              <Text style={styles.freeBannerSub}>Upgrade to add more admins & unlock features</Text>
            </View>
            <View style={styles.freeBannerChip}>
              <Text style={styles.freeBannerChipText}>Upgrade →</Text>
            </View>
          </TouchableOpacity>
        )}

        {/* ── Admin Actions ─────────────────────────────────────────────── */}
        {isAdmin && (
          <View style={styles.adminSection}>
            <Text style={styles.sectionTitle}>Admin</Text>
            <View style={styles.adminRow}>
              <TouchableOpacity style={styles.adminBtn} onPress={() => router.push('/schedule')}>
                <Ionicons name="add-circle-outline" size={20} color={colors.primary} />
                <Text style={styles.adminBtnText}>Schedule Match</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.adminBtn, styles.adminBtnOutline]} onPress={() => router.push('/calendar')}>
                <Ionicons name="calendar-outline" size={20} color={colors.textSecondary} />
                <Text style={[styles.adminBtnText, styles.adminBtnTextOutline]}>Calendar</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              style={styles.createTeamsBtn}
              onPress={() => { resetTeams(); setTeamsModal(true); }}
              activeOpacity={0.88}
            >
              <View style={styles.createTeamsBtnIcon}>
                <Ionicons name="people" size={20} color={colors.white} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.createTeamsBtnTitle}>Create Teams</Text>
                <Text style={styles.createTeamsBtnSub}>Split squad into balanced teams</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.white} />
            </TouchableOpacity>
          </View>
        )}

        {/* ── Squad Ratings ─────────────────────────────────────────────── */}
        {ratings && (displayMembers.length) > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Squad Ratings</Text>
            <View style={styles.ratingsCard}>
              <View style={styles.legendRow}>
                {[
                  { label: 'Elite',      color: '#16A34A', min: 8   },
                  { label: 'Good',       color: '#2563EB', min: 6.5 },
                  { label: 'Average',    color: '#D97706', min: 4.5 },
                  { label: 'Developing', color: '#6B7280', min: 0   },
                ].map((tier) => {
                  const inTier = displayMembers.filter((m) => {
                    const s = ratings[m.id] ?? 3;
                    if (tier.min === 8)   return s >= 8;
                    if (tier.min === 6.5) return s >= 6.5 && s < 8;
                    if (tier.min === 4.5) return s >= 4.5 && s < 6.5;
                    return s < 4.5;
                  }).length;
                  return (
                    <View key={tier.label} style={styles.legendItem}>
                      <View style={[styles.legendDot, { backgroundColor: tier.color }]} />
                      <Text style={styles.legendLabel}>{tier.label}</Text>
                      <Text style={[styles.legendCount, { color: tier.color }]}>{inTier}</Text>
                    </View>
                  );
                })}
              </View>
              <View style={styles.avgRow}>
                <Text style={styles.avgLabel}>Squad Avg</Text>
                <Text style={styles.avgValue}>
                  {(
                    displayMembers.reduce((sum, m) => sum + (ratings[m.id] ?? 3), 0) /
                    Math.max(displayMembers.length, 1)
                  ).toFixed(1)}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* ── Members ───────────────────────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Members ({displayMembers.length})</Text>
          {[...displayMembers]
            .sort((a, b) => {
              const order = { owner: 0, admin: 1, player: 2 };
              const roleSort = order[a.role] - order[b.role];
              if (roleSort !== 0) return roleSort;
              return (ratings?.[b.id] ?? 3) - (ratings?.[a.id] ?? 3);
            })
            .map((member) => {
              const roleCfg    = ROLE_CONFIG[member.role];
              const isMe       = member.id === currentUser?.id;
              const canManage  = isOwner && !isMe && member.role !== 'owner';

              return (
                <TouchableOpacity
                  key={member.memberId}
                  style={styles.memberCard}
                  onPress={() => router.push(`/player/${member.id}`)}
                  onLongPress={() => {
                    if (canManage) {
                      setManagedMember(member);
                      setManageModal(true);
                    }
                  }}
                  activeOpacity={0.85}
                >
                  {/* Avatar */}
                  <View style={[
                    styles.memberAvatar,
                    { backgroundColor: isMe ? colors.primary : '#E8EDF2' },
                    member.role === 'owner' && !isMe && { backgroundColor: '#FFFBEB', borderWidth: 2, borderColor: '#FDE68A' },
                  ]}>
                    <Text style={[
                      styles.memberAvatarText,
                      { color: isMe ? colors.white : colors.primary },
                      member.role === 'owner' && !isMe && { color: '#D97706' },
                    ]}>
                      {member.name.charAt(0)}
                    </Text>
                  </View>

                  {/* Info */}
                  <View style={styles.memberInfo}>
                    <View style={styles.memberNameRow}>
                      <Text style={styles.memberName}>{member.name}</Text>

                      {/* Role badge */}
                      {member.role !== 'player' && (
                        <View style={[styles.roleBadge, { backgroundColor: roleCfg.bg, borderColor: roleCfg.border }]}>
                          <Ionicons name={roleCfg.icon} size={10} color={roleCfg.text} />
                          <Text style={[styles.roleBadgeText, { color: roleCfg.text }]}>{roleCfg.label}</Text>
                        </View>
                      )}

                      {/* "You" badge */}
                      {isMe && (
                        <View style={styles.youBadge}>
                          <Text style={styles.youBadgeText}>You</Text>
                        </View>
                      )}
                    </View>
                    <View style={styles.memberMeta}>
                      <View style={[styles.positionDot, { backgroundColor: POSITION_COLORS[member.position] ?? '#6B7280' }]} />
                      <Text style={styles.memberPosition}>{member.position}</Text>
                      <Text style={styles.memberDot}>·</Text>
                      <Text style={styles.memberSkill}>{member.skill_level}</Text>
                    </View>
                  </View>

                  {ratings?.[member.id] !== undefined && (
                    <RatingBadge score={ratings[member.id]} size="sm" />
                  )}

                  {canManage ? (
                    <TouchableOpacity
                      style={styles.manageBtn}
                      onPress={() => { setManagedMember(member); setManageModal(true); }}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Ionicons name="ellipsis-horizontal" size={16} color={colors.textTertiary} />
                    </TouchableOpacity>
                  ) : (
                    <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
                  )}
                </TouchableOpacity>
              );
            })}

          {/* ── Owner: transfer ownership shortcut ── */}
          {isOwner && eligibleAdmins.length > 0 && (
            <TouchableOpacity
              style={styles.transferShortcut}
              onPress={() => {
                setTransferStep('pick');
                setSelectedAdminId(null);
                setShouldLeaveAfter(false);
                setTransferModal(true);
              }}
            >
              <Ionicons name="swap-horizontal-outline" size={16} color={colors.textSecondary} />
              <Text style={styles.transferShortcutText}>Transfer ownership</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* ── Leave Group ───────────────────────────────────────────────── */}
        <TouchableOpacity style={styles.leaveBtn} onPress={handleLeavePress} activeOpacity={0.85}>
          <Ionicons name="log-out-outline" size={16} color={colors.error} />
          <Text style={styles.leaveBtnText}>Leave Squad</Text>
        </TouchableOpacity>

        <View style={{ height: spacing.xl }} />
      </ScrollView>

      {/* ══════════════════════════════════════════════════════════════════
          TRANSFER OWNERSHIP MODAL
      ══════════════════════════════════════════════════════════════════ */}
      <Modal visible={transferModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />

            {transferStep === 'pick' ? (
              /* ── Step 1: pick an admin ────────────────────────────── */
              <>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Transfer Ownership</Text>
                  <TouchableOpacity style={styles.modalClose} onPress={() => setTransferModal(false)}>
                    <Ionicons name="close" size={20} color={colors.primary} />
                  </TouchableOpacity>
                </View>

                <Text style={styles.modalSub}>
                  Select an admin to become the new owner of {group?.name}. You'll become an admin after the transfer.
                </Text>

                {/* Admin list */}
                {eligibleAdmins.map((admin) => {
                  const selected = selectedAdminId === admin.id;
                  return (
                    <TouchableOpacity
                      key={admin.id}
                      style={[styles.adminSelectCard, selected && styles.adminSelectCardSelected]}
                      onPress={() => setSelectedAdminId(admin.id)}
                      activeOpacity={0.85}
                    >
                      <View style={[styles.adminSelectAvatar, { backgroundColor: selected ? colors.primary : '#E8EDF2' }]}>
                        <Text style={[styles.adminSelectInitial, { color: selected ? colors.white : colors.primary }]}>
                          {admin.name.charAt(0)}
                        </Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.adminSelectName, selected && { color: colors.primary }]}>{admin.name}</Text>
                        <Text style={styles.adminSelectRole}>Admin · {admin.position}</Text>
                      </View>
                      {selected && (
                        <View style={styles.checkCircle}>
                          <Ionicons name="checkmark" size={14} color={colors.white} />
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}

                <Text style={styles.transferWarning}>
                  ⚠️ This cannot be undone. The new owner will be responsible for the squad subscription.
                </Text>

                <TouchableOpacity
                  style={[styles.transferBtn, !selectedAdminId && styles.transferBtnDisabled]}
                  onPress={() => transferMutation.mutate()}
                  disabled={!selectedAdminId || transferMutation.isPending}
                  activeOpacity={0.85}
                >
                  {transferMutation.isPending ? (
                    <ActivityIndicator color={colors.white} />
                  ) : (
                    <Text style={styles.transferBtnText}>
                      {selectedAdminId
                        ? `Transfer to ${eligibleAdmins.find((a) => a.id === selectedAdminId)?.name}`
                        : 'Select an admin first'}
                    </Text>
                  )}
                </TouchableOpacity>
              </>
            ) : (
              /* ── Step 2: success ──────────────────────────────────── */
              <>
                <View style={styles.successIconWrap}>
                  <Ionicons name="checkmark-circle" size={64} color={colors.accent} />
                </View>
                <Text style={styles.successTitle}>Ownership transferred!</Text>
                <Text style={styles.successSub}>
                  {newOwnerName} is now the owner of {group?.name}. You're now an admin.
                </Text>

                {shouldLeaveAfter ? (
                  <View style={styles.successActions}>
                    <TouchableOpacity
                      style={styles.leaveNowBtn}
                      onPress={() => leaveMutation.mutate()}
                      disabled={leaveMutation.isPending}
                      activeOpacity={0.85}
                    >
                      {leaveMutation.isPending
                        ? <ActivityIndicator color={colors.white} />
                        : <Text style={styles.leaveNowBtnText}>Leave Squad</Text>}
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.stayBtn}
                      onPress={() => { setTransferModal(false); setShouldLeaveAfter(false); }}
                    >
                      <Text style={styles.stayBtnText}>Stay as Admin</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={styles.stayBtn}
                    onPress={() => setTransferModal(false)}
                  >
                    <Text style={styles.stayBtnText}>Done</Text>
                  </TouchableOpacity>
                )}
              </>
            )}

            <View style={{ height: spacing.md }} />
          </View>
        </View>
      </Modal>

      {/* ══════════════════════════════════════════════════════════════════
          MEMBER MANAGE MODAL (promote / demote)
      ══════════════════════════════════════════════════════════════════ */}
      <Modal visible={manageModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { paddingBottom: 40 }]}>
            <View style={styles.modalHandle} />

            {managedMember && (
              <>
                <View style={styles.modalHeader}>
                  <View>
                    <Text style={styles.modalTitle}>{managedMember.name}</Text>
                    <Text style={styles.modalSub2}>{ROLE_CONFIG[managedMember.role].label || 'Player'} · {managedMember.position}</Text>
                  </View>
                  <TouchableOpacity style={styles.modalClose} onPress={() => setManageModal(false)}>
                    <Ionicons name="close" size={20} color={colors.primary} />
                  </TouchableOpacity>
                </View>

                {managedMember.role === 'player' && (
                  <TouchableOpacity
                    style={[styles.manageAction, freeAdminLimitReached && styles.manageActionDisabled]}
                    onPress={() => {
                      if (freeAdminLimitReached) {
                        showAlert('Upgrade required', 'Free plan allows only 1 admin. Upgrade to add more admins.');
                        return;
                      }
                      promoteMutation.mutate(managedMember.id);
                    }}
                    disabled={promoteMutation.isPending}
                  >
                    <View style={[styles.manageActionIcon, { backgroundColor: freeAdminLimitReached ? '#F3F4F6' : '#EFF6FF' }]}>
                      <Ionicons name="shield" size={18} color={freeAdminLimitReached ? '#9CA3AF' : '#2563EB'} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.manageActionTitle, freeAdminLimitReached && { color: '#9CA3AF' }]}>Promote to Admin</Text>
                      <Text style={styles.manageActionSub}>
                        {freeAdminLimitReached ? 'Upgrade plan to add more admins' : 'Can manage matches, schedule, and members'}
                      </Text>
                    </View>
                    {promoteMutation.isPending
                      ? <ActivityIndicator size="small" color={colors.textSecondary} />
                      : <Ionicons name={freeAdminLimitReached ? 'lock-closed' : 'chevron-forward'} size={16} color={colors.textTertiary} />}
                  </TouchableOpacity>
                )}

                {managedMember.role === 'admin' && (
                  <>
                    <TouchableOpacity
                      style={styles.manageAction}
                      onPress={() => demoteMutation.mutate(managedMember.id)}
                      disabled={demoteMutation.isPending}
                    >
                      <View style={[styles.manageActionIcon, { backgroundColor: colors.backgroundTertiary }]}>
                        <Ionicons name="person-outline" size={18} color={colors.textSecondary} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.manageActionTitle}>Demote to Player</Text>
                        <Text style={styles.manageActionSub}>Remove admin permissions from this member</Text>
                      </View>
                      {demoteMutation.isPending
                        ? <ActivityIndicator size="small" color={colors.textSecondary} />
                        : <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />}
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.manageAction}
                      onPress={() => {
                        setManageModal(false);
                        setSelectedAdminId(managedMember.id);
                        setTransferStep('pick');
                        setShouldLeaveAfter(false);
                        setTransferModal(true);
                      }}
                    >
                      <View style={[styles.manageActionIcon, { backgroundColor: '#FFFBEB' }]}>
                        <Ionicons name="trophy-outline" size={18} color="#D97706" />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.manageActionTitle}>Transfer Ownership</Text>
                        <Text style={styles.manageActionSub}>Make {managedMember.name} the squad owner</Text>
                      </View>
                      <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
                    </TouchableOpacity>
                  </>
                )}
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* ══════════════════════════════════════════════════════════════════
          LEAVE CONFIRM MODAL (non-owner)
      ══════════════════════════════════════════════════════════════════ */}
      <Modal visible={leaveModal} animationType="fade" transparent>
        <View style={styles.alertOverlay}>
          <View style={styles.alertBox}>
            <View style={styles.alertIconWrap}>
              <Ionicons name="log-out-outline" size={32} color={colors.error} />
            </View>
            <Text style={styles.alertTitle}>Leave {group?.name}?</Text>
            <Text style={styles.alertSub}>
              You'll lose access to this squad's matches, payments, and history.
              You can rejoin later if invited.
            </Text>
            <View style={styles.alertActions}>
              <TouchableOpacity style={styles.alertCancel} onPress={() => setLeaveModal(false)}>
                <Text style={styles.alertCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.alertConfirm}
                onPress={() => leaveMutation.mutate()}
                disabled={leaveMutation.isPending}
              >
                {leaveMutation.isPending
                  ? <ActivityIndicator color={colors.white} />
                  : <Text style={styles.alertConfirmText}>Leave Squad</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ══════════════════════════════════════════════════════════════════
          BILLING TAKEOVER MODAL
      ══════════════════════════════════════════════════════════════════ */}
      <Modal visible={billingModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { paddingBottom: 40 }]}>
            <View style={styles.modalHandle} />
            <View style={{ alignItems: 'center', marginBottom: spacing.lg }}>
              <Ionicons name="card" size={48} color="#D97706" />
            </View>
            <Text style={[styles.modalTitle, { textAlign: 'center' }]}>Take Over Subscription</Text>
            <Text style={[styles.modalSub, { textAlign: 'center' }]}>
              As the new owner of {group?.name}, you can take over the billing responsibility.
              {'\n\n'}
              This means you'll be the account charged for the squad's subscription going forward.
              Payment details will be collected when billing is set up.
            </Text>

            <View style={styles.billingInfoCard}>
              <View style={styles.billingInfoRow}>
                <Ionicons name="checkmark-circle" size={16} color={colors.accent} />
                <Text style={styles.billingInfoText}>Manage subscription plan</Text>
              </View>
              <View style={styles.billingInfoRow}>
                <Ionicons name="checkmark-circle" size={16} color={colors.accent} />
                <Text style={styles.billingInfoText}>Control billing & invoices</Text>
              </View>
              <View style={styles.billingInfoRow}>
                <Ionicons name="checkmark-circle" size={16} color={colors.accent} />
                <Text style={styles.billingInfoText}>Upgrade or cancel the squad plan</Text>
              </View>
            </View>

            <TouchableOpacity
              style={[styles.transferBtn, { marginTop: spacing.md }]}
              onPress={() => billingMutation.mutate()}
              disabled={billingMutation.isPending}
              activeOpacity={0.85}
            >
              {billingMutation.isPending
                ? <ActivityIndicator color={colors.white} />
                : <Text style={styles.transferBtnText}>Confirm — I'll handle billing</Text>}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.stayBtn, { marginTop: spacing.sm }]}
              onPress={() => setBillingModal(false)}
            >
              <Text style={styles.stayBtnText}>Not now</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ══════════════════════════════════════════════════════════════════
          CREATE TEAMS MODAL (unchanged)
      ══════════════════════════════════════════════════════════════════ */}
      <Modal visible={teamsModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{generated ? 'Balanced Teams' : 'Create Teams'}</Text>
              <TouchableOpacity style={styles.modalClose} onPress={() => setTeamsModal(false)}>
                <Ionicons name="close" size={20} color={colors.primary} />
              </TouchableOpacity>
            </View>

            {!generated ? (
              <>
                <Text style={styles.modalSub}>
                  Select how many teams to create from {players?.length ?? 0} players.
                  Teams will be balanced by rating.
                </Text>
                <View style={styles.teamCountRow}>
                  {([2, 3, 4] as const).map((n) => (
                    <TouchableOpacity
                      key={n}
                      style={styles.teamCountCard}
                      onPress={() => handleGenerateTeams(n)}
                      activeOpacity={0.8}
                    >
                      <View style={styles.teamCountIcons}>
                        {Array.from({ length: n }).map((_, i) => (
                          <View key={i} style={[styles.teamCountDot, { backgroundColor: TEAM_META[i].color }]} />
                        ))}
                      </View>
                      <Text style={styles.teamCountNum}>{n}</Text>
                      <Text style={styles.teamCountLabel}>Teams</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            ) : (
              <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 440 }}>
                <Text style={styles.modalSub}>
                  Balanced via snake draft · {numTeams} teams · {players?.length ?? 0} players
                </Text>
                <View style={styles.balanceRow}>
                  {generated.map((team) => (
                    <View key={team.meta.letter} style={[styles.balanceItem, { borderColor: team.meta.color + '44', backgroundColor: team.meta.bg }]}>
                      <Text style={[styles.balanceLetter, { color: team.meta.color }]}>{team.meta.letter}</Text>
                      <Text style={[styles.balanceTotal, { color: team.meta.color }]}>{team.total.toFixed(1)}</Text>
                      <Text style={styles.balanceSub}>total</Text>
                    </View>
                  ))}
                </View>
                {generated.map((team) => (
                  <View key={team.meta.letter} style={[styles.teamCard, { borderLeftColor: team.meta.color }]}>
                    <View style={[styles.teamCardHeader, { backgroundColor: team.meta.bg }]}>
                      <Text style={[styles.teamCardTitle, { color: team.meta.color }]}>{team.meta.label}</Text>
                      <Text style={[styles.teamCardCount, { color: team.meta.color }]}>{team.players.length} players</Text>
                    </View>
                    {team.players.map((p) => (
                      <View key={p.id} style={styles.teamPlayerRow}>
                        <View style={[styles.teamPlayerAvatar, { backgroundColor: (POSITION_COLORS[p.position] ?? '#6B7280') + '22' }]}>
                          <Text style={[styles.teamPlayerInitial, { color: POSITION_COLORS[p.position] ?? colors.primary }]}>
                            {p.name.charAt(0)}
                          </Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.teamPlayerName}>{p.name}</Text>
                          <Text style={styles.teamPlayerPos}>{p.position}</Text>
                        </View>
                        <RatingBadge score={p.rating} size="sm" />
                      </View>
                    ))}
                  </View>
                ))}
                <TouchableOpacity style={styles.regenBtn} onPress={() => handleGenerateTeams(numTeams!)}>
                  <Ionicons name="shuffle" size={16} color={colors.primary} />
                  <Text style={styles.regenBtnText}>Regenerate</Text>
                </TouchableOpacity>
                <View style={{ height: spacing.lg }} />
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container:       { flex: 1, backgroundColor: colors.backgroundSecondary },
  scroll:          { flex: 1 },
  scrollContent:   { padding: spacing.md },
  loadingContainer:{ flex: 1, justifyContent: 'center', alignItems: 'center' },

  // Billing nudge
  billingNudge: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#FFFBEB', borderRadius: borderRadius.xl,
    borderWidth: 1.5, borderColor: '#FDE68A',
    padding: spacing.md, marginBottom: spacing.md, ...shadows.xs,
  },
  billingNudgeLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: spacing.sm },
  billingNudgeTitle: { ...typography.smallBold, color: '#D97706' },
  billingNudgeSub:   { ...typography.tiny, color: '#92400E', marginTop: 2 },
  billingNudgeBtn: {
    backgroundColor: '#D97706', borderRadius: borderRadius.lg,
    paddingHorizontal: 12, paddingVertical: 6,
  },
  billingNudgeBtnText: { ...typography.tiny, fontWeight: '700', color: colors.white },

  // Group header
  groupHeader: { backgroundColor: colors.white, borderRadius: borderRadius.xl, padding: spacing.lg, marginBottom: spacing.md, ...shadows.sm },
  groupLogoContainer: { marginBottom: spacing.md },
  groupLogo: { width: 64, height: 64, borderRadius: borderRadius.xl, backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center' },
  groupInfo:     {},
  groupName:     { ...typography.h3, color: colors.primary },
  groupMeta:     { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: spacing.xs },
  groupLocation: { ...typography.caption, color: colors.textSecondary },
  groupDesc:     { ...typography.caption, color: colors.textSecondary, marginTop: spacing.sm },
  planBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    alignSelf: 'flex-start', marginTop: spacing.sm,
    paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: borderRadius.full,
    backgroundColor: colors.backgroundTertiary,
  },
  planBadgeText: { ...typography.tiny, fontWeight: '700' },

  // Stats
  statsRow: {
    backgroundColor: colors.white, borderRadius: borderRadius.xl,
    padding: spacing.md, flexDirection: 'row',
    marginBottom: spacing.md, ...shadows.sm,
  },
  statItem:   { flex: 1, alignItems: 'center' },
  statValue:  { ...typography.h4, color: colors.primary },
  statLabel:  { ...typography.tiny, color: colors.textSecondary, marginTop: 2 },
  statDivider:{ width: 1, backgroundColor: colors.border },

  // Admin section
  adminSection: { marginBottom: spacing.md },
  adminRow:     { flexDirection: 'row', gap: spacing.sm },
  adminBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: spacing.sm, backgroundColor: colors.accentTint, borderRadius: borderRadius.lg,
    paddingVertical: spacing.md, borderWidth: 1.5, borderColor: colors.accent,
  },
  adminBtnOutline:     { backgroundColor: colors.white, borderColor: colors.border },
  adminBtnText:        { ...typography.captionBold, color: colors.primary },
  adminBtnTextOutline: { color: colors.textSecondary },

  section:      { marginBottom: spacing.md },
  sectionTitle: { ...typography.captionBold, color: colors.text, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: spacing.sm },

  // Members
  memberCard: {
    backgroundColor: colors.white, borderRadius: borderRadius.lg,
    padding: spacing.md, flexDirection: 'row', alignItems: 'center',
    gap: spacing.md, marginBottom: spacing.sm, ...shadows.xs,
  },
  memberAvatar:     { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  memberAvatarText: { ...typography.bodyBold },
  memberInfo:       { flex: 1 },
  memberNameRow:    { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: 3, flexWrap: 'wrap' },
  memberName:       { ...typography.captionBold, color: colors.text },
  memberMeta:       { flexDirection: 'row', alignItems: 'center', gap: 5 },
  positionDot:      { width: 8, height: 8, borderRadius: 4 },
  memberPosition:   { ...typography.small, color: colors.textSecondary },
  memberDot:        { ...typography.small, color: colors.textTertiary },
  memberSkill:      { ...typography.small, color: colors.textSecondary },

  // Role badge
  roleBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    paddingHorizontal: 6, paddingVertical: 2,
    borderRadius: borderRadius.full, borderWidth: 1,
  },
  roleBadgeText: { fontSize: 10, fontWeight: '700' },

  // "You" badge
  youBadge:     { backgroundColor: colors.primaryTint, paddingHorizontal: 6, paddingVertical: 2, borderRadius: borderRadius.full },
  youBadgeText: { ...typography.tiny, color: colors.primary, fontWeight: '700' },

  // Manage button (…)
  manageBtn: { padding: 4 },

  // Free tier banner
  freeBanner: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#F8FAFC', borderRadius: borderRadius.xl,
    padding: spacing.md, marginBottom: spacing.md,
    borderWidth: 1.5, borderColor: '#E2E8F0',
  },
  freeBannerTitle: { ...typography.captionBold, color: colors.primary },
  freeBannerSub:   { ...typography.small, color: colors.textSecondary, marginTop: 2 },
  freeBannerChip:  {
    backgroundColor: colors.primary, borderRadius: borderRadius.full,
    paddingHorizontal: 12, paddingVertical: 6, marginLeft: spacing.sm,
  },
  freeBannerChipText: { ...typography.tiny, fontWeight: '700', color: colors.white },

  // Manage action disabled state
  manageActionDisabled: { opacity: 0.6 },

  // Transfer ownership shortcut
  transferShortcut: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: spacing.sm, paddingVertical: spacing.sm, marginTop: spacing.xs,
  },
  transferShortcutText: { ...typography.small, color: colors.textSecondary },

  // Leave button
  leaveBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: spacing.sm, paddingVertical: spacing.md,
    borderRadius: borderRadius.lg, borderWidth: 1.5, borderColor: colors.errorTint,
    backgroundColor: '#FFF5F5', marginBottom: spacing.md,
  },
  leaveBtnText: { ...typography.captionBold, color: colors.error },

  // Squad ratings
  ratingsCard: { backgroundColor: colors.white, borderRadius: borderRadius.xl, padding: spacing.md, ...shadows.sm },
  legendRow:   { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.md },
  legendItem:  { alignItems: 'center', gap: 4 },
  legendDot:   { width: 10, height: 10, borderRadius: 5 },
  legendLabel: { ...typography.tiny, color: colors.textSecondary },
  legendCount: { ...typography.captionBold },
  avgRow:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border },
  avgLabel:    { ...typography.smallBold, color: colors.textSecondary },
  avgValue:    { ...typography.h3, color: colors.primary },

  // Modals — shared
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: borderRadius.xxl, borderTopRightRadius: borderRadius.xxl,
    padding: spacing.lg,
  },
  modalHandle: { width: 40, height: 4, backgroundColor: colors.border, borderRadius: 2, alignSelf: 'center', marginBottom: spacing.md },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  modalTitle:  { ...typography.h3, color: colors.primary },
  modalSub:    { ...typography.caption, color: colors.textSecondary, marginBottom: spacing.lg, lineHeight: 20 },
  modalSub2:   { ...typography.small, color: colors.textSecondary },
  modalClose:  { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.backgroundTertiary, justifyContent: 'center', alignItems: 'center' },

  // Transfer modal — admin selection
  adminSelectCard: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    backgroundColor: colors.backgroundSecondary, borderRadius: borderRadius.lg,
    padding: spacing.md, marginBottom: spacing.sm,
    borderWidth: 1.5, borderColor: colors.border,
  },
  adminSelectCardSelected: { borderColor: colors.primary, backgroundColor: colors.primaryTint },
  adminSelectAvatar:  { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  adminSelectInitial: { ...typography.captionBold },
  adminSelectName:    { ...typography.captionBold, color: colors.text },
  adminSelectRole:    { ...typography.small, color: colors.textSecondary },
  checkCircle: {
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center',
  },
  transferWarning: { ...typography.small, color: '#92400E', backgroundColor: '#FFFBEB', borderRadius: borderRadius.lg, padding: spacing.sm, marginBottom: spacing.md, lineHeight: 18 },
  transferBtn: {
    backgroundColor: colors.primary, borderRadius: borderRadius.lg,
    paddingVertical: spacing.md, alignItems: 'center',
  },
  transferBtnDisabled: { backgroundColor: colors.textDisabled },
  transferBtnText: { ...typography.captionBold, color: colors.white },

  // Transfer success
  successIconWrap: { alignItems: 'center', marginBottom: spacing.md },
  successTitle:    { ...typography.h3, color: colors.primary, textAlign: 'center', marginBottom: spacing.sm },
  successSub:      { ...typography.caption, color: colors.textSecondary, textAlign: 'center', lineHeight: 20, marginBottom: spacing.lg },
  successActions:  { gap: spacing.sm },
  leaveNowBtn: {
    backgroundColor: colors.error, borderRadius: borderRadius.lg,
    paddingVertical: spacing.md, alignItems: 'center',
  },
  leaveNowBtnText: { ...typography.captionBold, color: colors.white },
  stayBtn: {
    borderWidth: 1.5, borderColor: colors.border, borderRadius: borderRadius.lg,
    paddingVertical: spacing.md, alignItems: 'center',
  },
  stayBtnText: { ...typography.captionBold, color: colors.textSecondary },

  // Member manage modal actions
  manageAction: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  manageActionIcon:  { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  manageActionTitle: { ...typography.captionBold, color: colors.text },
  manageActionSub:   { ...typography.small, color: colors.textSecondary, marginTop: 2 },

  // Leave confirm alert style
  alertOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: spacing.lg },
  alertBox: {
    backgroundColor: colors.white, borderRadius: borderRadius.xxl,
    padding: spacing.lg, width: '100%', alignItems: 'center',
  },
  alertIconWrap:    { width: 64, height: 64, borderRadius: 32, backgroundColor: colors.errorTint, justifyContent: 'center', alignItems: 'center', marginBottom: spacing.md },
  alertTitle:       { ...typography.h3, color: colors.primary, textAlign: 'center', marginBottom: spacing.sm },
  alertSub:         { ...typography.caption, color: colors.textSecondary, textAlign: 'center', lineHeight: 20, marginBottom: spacing.lg },
  alertActions:     { flexDirection: 'row', gap: spacing.sm, width: '100%' },
  alertCancel:      { flex: 1, paddingVertical: spacing.md, borderRadius: borderRadius.lg, backgroundColor: colors.backgroundTertiary, alignItems: 'center' },
  alertCancelText:  { ...typography.captionBold, color: colors.textSecondary },
  alertConfirm:     { flex: 1, paddingVertical: spacing.md, borderRadius: borderRadius.lg, backgroundColor: colors.error, alignItems: 'center' },
  alertConfirmText: { ...typography.captionBold, color: colors.white },

  // Billing modal
  billingInfoCard: { backgroundColor: colors.backgroundSecondary, borderRadius: borderRadius.lg, padding: spacing.md, marginTop: spacing.sm, gap: spacing.sm },
  billingInfoRow:  { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  billingInfoText: { ...typography.caption, color: colors.text },

  // Create Teams button
  createTeamsBtn: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    backgroundColor: colors.primary, borderRadius: borderRadius.xl,
    padding: spacing.md, marginTop: spacing.sm, ...shadows.sm,
  },
  createTeamsBtnIcon: {
    width: 40, height: 40, borderRadius: borderRadius.lg,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center', alignItems: 'center',
  },
  createTeamsBtnTitle: { ...typography.captionBold, color: colors.white },
  createTeamsBtnSub:   { ...typography.tiny, color: 'rgba(255,255,255,0.65)', marginTop: 2 },

  // Team count selector
  teamCountRow: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.md },
  teamCountCard: {
    flex: 1, backgroundColor: colors.backgroundSecondary,
    borderRadius: borderRadius.xl, padding: spacing.md,
    alignItems: 'center', gap: spacing.sm,
    borderWidth: 1.5, borderColor: colors.border, ...shadows.xs,
  },
  teamCountIcons: { flexDirection: 'row', gap: 5, flexWrap: 'wrap', justifyContent: 'center' },
  teamCountDot:   { width: 14, height: 14, borderRadius: 7 },
  teamCountNum:   { ...typography.h2, color: colors.primary },
  teamCountLabel: { ...typography.tiny, color: colors.textSecondary },

  // Balance summary
  balanceRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  balanceItem: { flex: 1, alignItems: 'center', padding: spacing.sm, borderRadius: borderRadius.lg, borderWidth: 1.5 },
  balanceLetter: { ...typography.captionBold, marginBottom: 2 },
  balanceTotal:  { ...typography.h3 },
  balanceSub:    { ...typography.tiny, color: colors.textSecondary },

  // Team cards
  teamCard: { borderRadius: borderRadius.lg, overflow: 'hidden', marginBottom: spacing.sm, borderLeftWidth: 3, borderWidth: 1, borderColor: colors.border, ...shadows.xs },
  teamCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  teamCardTitle:  { ...typography.captionBold },
  teamCardCount:  { ...typography.tiny, fontWeight: '600' },
  teamPlayerRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    backgroundColor: colors.white,
    borderTopWidth: 1, borderTopColor: colors.backgroundTertiary,
  },
  teamPlayerAvatar:  { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  teamPlayerInitial: { ...typography.captionBold },
  teamPlayerName:    { ...typography.smallBold, color: colors.text },
  teamPlayerPos:     { ...typography.tiny, color: colors.textSecondary },

  // Regenerate
  regenBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: spacing.sm, marginTop: spacing.sm,
    paddingVertical: spacing.md, borderRadius: borderRadius.lg,
    borderWidth: 1.5, borderColor: colors.border,
    backgroundColor: colors.backgroundSecondary,
  },
  regenBtnText: { ...typography.captionBold, color: colors.primary },
});
