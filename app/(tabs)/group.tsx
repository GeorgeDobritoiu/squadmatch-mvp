import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { colors, spacing, borderRadius, typography, shadows } from '@/constants/design';
import { getGroup, getPlayers, getCurrentUser, getAllPlayerRatings } from '@/lib/data';
import { getRatingColor, multiSnakeDraft, computeRating, SKILL_BASE } from '@/lib/ratings';
import RatingBadge from '@/components/RatingBadge';
import { useRouter } from 'expo-router';

const POSITION_COLORS: Record<string, string> = {
  Goalkeeper: '#7C3AED',
  Defender: '#2563EB',
  Midfielder: '#D97706',
  Striker: '#DC2626',
  Any: '#6B7280',
};

const TEAM_META = [
  { letter: 'A', color: '#0F2027', bg: '#E8F4F8', label: 'Team A' },
  { letter: 'B', color: '#DC2626', bg: '#FEE2E2', label: 'Team B' },
  { letter: 'C', color: '#7C3AED', bg: '#EDE9FE', label: 'Team C' },
  { letter: 'D', color: '#D97706', bg: '#FEF3C7', label: 'Team D' },
];

export default function GroupScreen() {
  const router = useRouter();

  const [teamsModal, setTeamsModal] = useState(false);
  const [numTeams, setNumTeams]     = useState<2 | 3 | 4 | null>(null);
  type GeneratedTeam = { meta: typeof TEAM_META[0]; players: { id: string; name: string; position: string; rating: number }[]; total: number };
  const [generated, setGenerated]   = useState<GeneratedTeam[] | null>(null);

  const { data: group, isLoading: groupLoading } = useQuery({
    queryKey: ['group'],
    queryFn: getGroup,
  });

  const { data: players, isLoading: playersLoading } = useQuery({
    queryKey: ['players'],
    queryFn: getPlayers,
  });

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: getCurrentUser,
  });

  const { data: ratings } = useQuery({
    queryKey: ['allPlayerRatings'],
    queryFn: getAllPlayerRatings,
  });

  const isAdmin = currentUser?.role === 'admin';

  const handleGenerateTeams = (n: 2 | 3 | 4) => {
    setNumTeams(n);
    const allPlayers = players ?? [];
    const allRatings = ratings ?? {};

    // Sort by rating descending
    const sorted = [...allPlayers].sort(
      (a, b) => (allRatings[b.id] ?? 3) - (allRatings[a.id] ?? 3),
    );

    const playerGroups = multiSnakeDraft(sorted, n);

    const result: GeneratedTeam[] = playerGroups.map((group, i) => {
      const meta = TEAM_META[i];
      const teamPlayers = group.map((p) => ({
        id: p.id,
        name: p.name,
        position: p.position,
        rating: allRatings[p.id] ?? computeRating({ skillLevel: p.skillLevel, motmWins: 0, attendanceRate: 0, wins: 0, totalGames: 0 }),
      }));
      const total = Math.round(teamPlayers.reduce((s, p) => s + p.rating, 0) * 10) / 10;
      return { meta, players: teamPlayers, total };
    });

    setGenerated(result);
  };

  const resetTeams = () => {
    setGenerated(null);
    setNumTeams(null);
  };

  if (groupLoading || playersLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.accent} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Group Header */}
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
            <Text style={styles.groupDesc}>{group?.description ?? ''}</Text>
          </View>
        </View>

        {/* Stats Strip */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{players?.length ?? 0}</Text>
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

        {/* Admin Actions */}
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
            {/* Create Teams CTA */}
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

        {/* Create new team CTA */}
        <TouchableOpacity style={styles.createTeamBanner} onPress={() => router.push('/create-team')} activeOpacity={0.85}>
          <View style={styles.createTeamLeft}>
            <View style={styles.createTeamIcon}>
              <Ionicons name="people" size={20} color={colors.white} />
            </View>
            <View>
              <Text style={styles.createTeamTitle}>Create a New Team</Text>
              <Text style={styles.createTeamSub}>Set up a squad for any sport</Text>
            </View>
          </View>
          <Ionicons name="arrow-forward-circle" size={24} color={colors.accent} />
        </TouchableOpacity>

        {/* Squad Ratings overview */}
        {ratings && (players?.length ?? 0) > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Squad Ratings</Text>
            <View style={styles.ratingsCard}>
              {/* Legend */}
              <View style={styles.legendRow}>
                {[
                  { label: 'Elite',      color: '#16A34A', min: 8   },
                  { label: 'Good',       color: '#2563EB', min: 6.5 },
                  { label: 'Average',    color: '#D97706', min: 4.5 },
                  { label: 'Developing', color: '#6B7280', min: 0   },
                ].map((tier) => {
                  const count = (players ?? []).filter((p) => {
                    const s = ratings[p.id] ?? 3;
                    return s >= tier.min;
                  }).length - (
                    tier.min === 0 ? 0 :
                    [8, 6.5, 4.5].filter(m => m > tier.min).reduce((acc, m) => acc + (players ?? []).filter(p => (ratings[p.id] ?? 3) >= m).length, 0)
                    // simplified: just count players in this exact tier
                  );
                  const inTier = (players ?? []).filter((p) => {
                    const s = ratings[p.id] ?? 3;
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
              {/* Average squad rating */}
              <View style={styles.avgRow}>
                <Text style={styles.avgLabel}>Squad Avg</Text>
                <Text style={styles.avgValue}>
                  {(
                    (players ?? []).reduce((sum, p) => sum + (ratings[p.id] ?? 3), 0) /
                    Math.max((players ?? []).length, 1)
                  ).toFixed(1)}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Members */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Members ({players?.length ?? 0})</Text>
          {(players ?? [])
            .slice()
            .sort((a, b) => ((ratings?.[b.id] ?? 3) - (ratings?.[a.id] ?? 3)))
            .map((player) => (
            <TouchableOpacity key={player.id} style={styles.memberCard} onPress={() => router.push(`/player/${player.id}`)} activeOpacity={0.85}>
              <View style={[styles.memberAvatar, { backgroundColor: player.id === currentUser?.id ? colors.primary : '#E8EDF2' }]}>
                <Text style={[styles.memberAvatarText, { color: player.id === currentUser?.id ? colors.white : colors.primary }]}>
                  {player.name.charAt(0)}
                </Text>
              </View>
              <View style={styles.memberInfo}>
                <View style={styles.memberNameRow}>
                  <Text style={styles.memberName}>{player.name}</Text>
                  {player.id === currentUser?.id && (
                    <View style={styles.youBadge}>
                      <Text style={styles.youBadgeText}>You</Text>
                    </View>
                  )}
                  {player.role === 'admin' && (
                    <View style={styles.adminBadge}>
                      <Text style={styles.adminBadgeText}>Admin</Text>
                    </View>
                  )}
                </View>
                <View style={styles.memberMeta}>
                  <View style={[styles.positionDot, { backgroundColor: POSITION_COLORS[player.position] ?? '#6B7280' }]} />
                  <Text style={styles.memberPosition}>{player.position}</Text>
                  <Text style={styles.memberDot}>·</Text>
                  <Text style={styles.memberSkill}>{player.skillLevel}</Text>
                </View>
              </View>
              {ratings?.[player.id] !== undefined && (
                <RatingBadge score={ratings[player.id]} size="sm" />
              )}
              <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
            </TouchableOpacity>
          ))}
        </View>

        <View style={{ height: spacing.xl }} />
      </ScrollView>

      {/* ── Create Teams Modal ── */}
      <Modal visible={teamsModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />

            {/* Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {generated ? 'Balanced Teams' : 'Create Teams'}
              </Text>
              <TouchableOpacity
                style={styles.modalClose}
                onPress={() => setTeamsModal(false)}
              >
                <Ionicons name="close" size={20} color={colors.primary} />
              </TouchableOpacity>
            </View>

            {!generated ? (
              /* ── Step 1: choose number of teams ── */
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
                          <View
                            key={i}
                            style={[styles.teamCountDot, { backgroundColor: TEAM_META[i].color }]}
                          />
                        ))}
                      </View>
                      <Text style={styles.teamCountNum}>{n}</Text>
                      <Text style={styles.teamCountLabel}>Teams</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            ) : (
              /* ── Step 2: preview generated teams ── */
              <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 440 }}>
                <Text style={styles.modalSub}>
                  Balanced via snake draft · {numTeams} teams · {players?.length ?? 0} players
                </Text>

                {/* Balance bar */}
                <View style={styles.balanceRow}>
                  {generated.map((team) => (
                    <View key={team.meta.letter} style={[styles.balanceItem, { borderColor: team.meta.color + '44', backgroundColor: team.meta.bg }]}>
                      <Text style={[styles.balanceLetter, { color: team.meta.color }]}>{team.meta.letter}</Text>
                      <Text style={[styles.balanceTotal, { color: team.meta.color }]}>{team.total.toFixed(1)}</Text>
                      <Text style={styles.balanceSub}>total</Text>
                    </View>
                  ))}
                </View>

                {/* Team cards */}
                {generated.map((team) => (
                  <View key={team.meta.letter} style={[styles.teamCard, { borderLeftColor: team.meta.color }]}>
                    <View style={[styles.teamCardHeader, { backgroundColor: team.meta.bg }]}>
                      <Text style={[styles.teamCardTitle, { color: team.meta.color }]}>{team.meta.label}</Text>
                      <Text style={[styles.teamCardCount, { color: team.meta.color }]}>{team.players.length} players</Text>
                    </View>
                    {team.players.map((p) => (
                      <View key={p.id} style={styles.teamPlayerRow}>
                        <View style={[styles.teamPlayerAvatar, { backgroundColor: POSITION_COLORS[p.position] + '22' }]}>
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

                {/* Regenerate */}
                <TouchableOpacity
                  style={styles.regenBtn}
                  onPress={() => handleGenerateTeams(numTeams!)}
                >
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.backgroundSecondary },
  scroll: { flex: 1 },
  scrollContent: { padding: spacing.md },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  groupHeader: { backgroundColor: colors.white, borderRadius: borderRadius.xl, padding: spacing.lg, marginBottom: spacing.md, ...shadows.sm },
  groupLogoContainer: { marginBottom: spacing.md },
  groupLogo: { width: 64, height: 64, borderRadius: borderRadius.xl, backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center' },
  groupInfo: {},
  groupName: { ...typography.h3, color: colors.primary },
  groupMeta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: spacing.xs },
  groupLocation: { ...typography.caption, color: colors.textSecondary },
  groupDesc: { ...typography.caption, color: colors.textSecondary, marginTop: spacing.sm },

  statsRow: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.xl,
    padding: spacing.md,
    flexDirection: 'row',
    marginBottom: spacing.md,
    ...shadows.sm,
  },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: { ...typography.h4, color: colors.primary },
  statLabel: { ...typography.tiny, color: colors.textSecondary, marginTop: 2 },
  statDivider: { width: 1, backgroundColor: colors.border },

  adminSection: { marginBottom: spacing.md },
  adminRow: { flexDirection: 'row', gap: spacing.sm },
  adminBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.accentTint,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md,
    borderWidth: 1.5,
    borderColor: colors.accent,
  },
  adminBtnOutline: { backgroundColor: colors.white, borderColor: colors.border },
  adminBtnText: { ...typography.captionBold, color: colors.primary },
  adminBtnTextOutline: { color: colors.textSecondary },

  section: { marginBottom: spacing.md },
  sectionTitle: { ...typography.captionBold, color: colors.text, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: spacing.sm },

  memberCard: { backgroundColor: colors.white, borderRadius: borderRadius.lg, padding: spacing.md, flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.sm, ...shadows.xs },
  memberAvatar: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  memberAvatarText: { ...typography.bodyBold },
  memberInfo: { flex: 1 },
  memberNameRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: 3 },
  memberName: { ...typography.captionBold, color: colors.text },
  youBadge: { backgroundColor: colors.primaryTint, paddingHorizontal: 6, paddingVertical: 2, borderRadius: borderRadius.full },
  youBadgeText: { ...typography.tiny, color: colors.primary, fontWeight: '700' },
  adminBadge: { backgroundColor: '#FEF3C7', paddingHorizontal: 6, paddingVertical: 2, borderRadius: borderRadius.full },
  adminBadgeText: { ...typography.tiny, color: '#D97706', fontWeight: '700' },
  memberMeta: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  positionDot: { width: 8, height: 8, borderRadius: 4 },
  memberPosition: { ...typography.small, color: colors.textSecondary },
  memberDot: { ...typography.small, color: colors.textTertiary },
  memberSkill: { ...typography.small, color: colors.textSecondary },

  ratingsCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.xl,
    padding: spacing.md,
    ...shadows.sm,
  },
  legendRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.md },
  legendItem: { alignItems: 'center', gap: 4 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendLabel: { ...typography.tiny, color: colors.textSecondary },
  legendCount: { ...typography.captionBold },
  avgRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border },
  avgLabel: { ...typography.smallBold, color: colors.textSecondary },
  avgValue: { ...typography.h3, color: colors.primary },

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
  createTeamsBtnSub: { ...typography.tiny, color: 'rgba(255,255,255,0.65)', marginTop: 2 },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: borderRadius.xxl, borderTopRightRadius: borderRadius.xxl,
    padding: spacing.lg, paddingBottom: 40,
  },
  modalHandle: { width: 40, height: 4, backgroundColor: colors.border, borderRadius: 2, alignSelf: 'center', marginBottom: spacing.md },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  modalTitle: { ...typography.h3, color: colors.primary },
  modalClose: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.backgroundTertiary, justifyContent: 'center', alignItems: 'center' },
  modalSub: { ...typography.caption, color: colors.textSecondary, marginBottom: spacing.lg, lineHeight: 20 },

  // Team count selector
  teamCountRow: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.md },
  teamCountCard: {
    flex: 1, backgroundColor: colors.backgroundSecondary,
    borderRadius: borderRadius.xl, padding: spacing.md,
    alignItems: 'center', gap: spacing.sm,
    borderWidth: 1.5, borderColor: colors.border, ...shadows.xs,
  },
  teamCountIcons: { flexDirection: 'row', gap: 5, flexWrap: 'wrap', justifyContent: 'center' },
  teamCountDot: { width: 14, height: 14, borderRadius: 7 },
  teamCountNum: { ...typography.h2, color: colors.primary },
  teamCountLabel: { ...typography.tiny, color: colors.textSecondary },

  // Balance summary
  balanceRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  balanceItem: {
    flex: 1, alignItems: 'center', padding: spacing.sm,
    borderRadius: borderRadius.lg, borderWidth: 1.5,
  },
  balanceLetter: { ...typography.captionBold, marginBottom: 2 },
  balanceTotal: { ...typography.h3 },
  balanceSub: { ...typography.tiny, color: colors.textSecondary },

  // Team cards
  teamCard: {
    borderRadius: borderRadius.lg, overflow: 'hidden',
    marginBottom: spacing.sm, borderLeftWidth: 3,
    borderWidth: 1, borderColor: colors.border, ...shadows.xs,
  },
  teamCardHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
  },
  teamCardTitle: { ...typography.captionBold },
  teamCardCount: { ...typography.tiny, fontWeight: '600' },
  teamPlayerRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    backgroundColor: colors.white,
    borderTopWidth: 1, borderTopColor: colors.backgroundTertiary,
  },
  teamPlayerAvatar: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  teamPlayerInitial: { ...typography.captionBold },
  teamPlayerName: { ...typography.smallBold, color: colors.text },
  teamPlayerPos: { ...typography.tiny, color: colors.textSecondary },

  // Regenerate
  regenBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: spacing.sm, marginTop: spacing.sm,
    paddingVertical: spacing.md, borderRadius: borderRadius.lg,
    borderWidth: 1.5, borderColor: colors.border,
    backgroundColor: colors.backgroundSecondary,
  },
  regenBtnText: { ...typography.captionBold, color: colors.primary },

  // Create Team banner
  createTeamBanner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: colors.primary, borderRadius: borderRadius.xl,
    padding: spacing.md, marginBottom: spacing.md, ...shadows.sm,
  },
  createTeamLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  createTeamIcon: {
    width: 40, height: 40, borderRadius: borderRadius.lg,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center', alignItems: 'center',
  },
  createTeamTitle: { ...typography.captionBold, color: colors.white },
  createTeamSub: { ...typography.tiny, color: 'rgba(255,255,255,0.65)', marginTop: 2 },

});
