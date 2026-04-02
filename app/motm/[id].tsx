/**
 * SquadPlay — MOTM Voting Screen
 * One Man of the Match per team (Team A & Team B).
 * Players cast one vote in each team's category; can't vote for themselves.
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { colors, spacing, borderRadius, typography, shadows } from '@/constants/design';
import { getAttendance, getPlayers, getCurrentUser, getMotmVotes, castMotmVote } from '@/lib/data';
import BottomTabBar from '@/components/BottomTabBar';

// ── Team config ───────────────────────────────────────────────────────────────

const TEAM_CONFIG = {
  A: { label: 'Team A', color: '#0F2027', bg: '#E8F4F8', tint: '#C8DCE8' },
  B: { label: 'Team B', color: '#DC2626', bg: '#FEE2E2', tint: '#FECACA' },
} as const;

type TeamKey = 'A' | 'B';

// ── Helpers ───────────────────────────────────────────────────────────────────

function tallyVotes(votes: any[], category: TeamKey): Record<string, number> {
  const tally: Record<string, number> = {};
  votes
    .filter((v) => v.team === category)
    .forEach((v) => { tally[v.nomineeId] = (tally[v.nomineeId] ?? 0) + 1; });
  return tally;
}

function getWinner(tally: Record<string, number>): string | null {
  const entries = Object.entries(tally);
  if (entries.length === 0) return null;
  const max = Math.max(...entries.map(([, c]) => c));
  if (max === 0) return null;
  const winners = entries.filter(([, c]) => c === max);
  return winners.length === 1 ? winners[0][0] : null; // only one winner if no tie
}

// ── Screen ────────────────────────────────────────────────────────────────────

export default function MotmScreen() {
  const { id }       = useLocalSearchParams<{ id: string }>();
  const router       = useRouter();
  const queryClient  = useQueryClient();
  const [activeTab, setActiveTab] = useState<TeamKey>('A');

  const { data: attendance } = useQuery({
    queryKey: ['attendance', id],
    queryFn: () => getAttendance(id),
    enabled: !!id,
  });

  const { data: players, isLoading } = useQuery({
    queryKey: ['players'],
    queryFn: getPlayers,
  });

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: getCurrentUser,
  });

  const { data: votes } = useQuery({
    queryKey: ['motmVotes', id],
    queryFn: () => getMotmVotes(id),
    enabled: !!id,
  });

  const voteMutation = useMutation({
    mutationFn: ({ nomineeId, team }: { nomineeId: string; team: TeamKey }) => {
      if (!currentUser) throw new Error('You must be logged in to vote');
      return castMotmVote(id, currentUser.id, nomineeId, team);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['motmVotes', id] }),
    onError: (err: any) => {
      const msg = err?.message ?? 'Vote failed. Please try again.';
      if (Platform.OS === 'web') window.alert(msg);
      else Alert.alert('Error', msg);
    },
  });

  // ── Derived data ────────────────────────────────────────────────────────────

  // Players per team
  const teamPlayers = (team: TeamKey) =>
    (attendance ?? [])
      .filter((a) => a.status === 'yes' && a.team === team)
      .map((a) => players?.find((p) => p.id === a.playerId))
      .filter(Boolean) as NonNullable<ReturnType<typeof players>>[number][];

  // Has teams been generated?
  const teamsGenerated = (attendance ?? []).some((a) => a.team === 'A' || a.team === 'B');

  // Vote tallies per category
  const tallyA = tallyVotes(votes ?? [], 'A');
  const tallyB = tallyVotes(votes ?? [], 'B');
  const tally  = activeTab === 'A' ? tallyA : tallyB;

  const totalVotesInTab = Object.values(tally).reduce((s, c) => s + c, 0);

  // My votes per category
  const myVoteA = (votes ?? []).find(
    (v) => v.voterId === currentUser?.id && v.team === 'A',
  );
  const myVoteB = (votes ?? []).find(
    (v) => v.voterId === currentUser?.id && v.team === 'B',
  );
  const myVote  = activeTab === 'A' ? myVoteA : myVoteB;

  // Winners
  const winnerA = getWinner(tallyA);
  const winnerB = getWinner(tallyB);
  const winner  = activeTab === 'A' ? winnerA : winnerB;

  // Voting complete for me?
  const votedBoth = !!myVoteA && !!myVoteB;

  const handleVote = (nomineeId: string) => {
    if (nomineeId === currentUser?.id) {
      if (Platform.OS === 'web') { window.alert("You can't vote for yourself"); }
      else Alert.alert("Can't vote for yourself");
      return;
    }
    voteMutation.mutate({ nomineeId, team: activeTab });
  };

  const currentTabPlayers = teamPlayers(activeTab);

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Nav */}
      <View style={styles.nav}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color={colors.primary} />
        </TouchableOpacity>
        <Text style={styles.navTitle}>Man of the Match</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header trophy card */}
        <View style={styles.headerCard}>
          <View style={styles.trophyRow}>
            <View style={[styles.trophyCircle, { backgroundColor: TEAM_CONFIG.A.bg }]}>
              <Ionicons name="trophy" size={28} color={TEAM_CONFIG.A.color} />
            </View>
            <View style={styles.trophyVs}>
              <Text style={styles.trophyVsText}>MOTM</Text>
            </View>
            <View style={[styles.trophyCircle, { backgroundColor: TEAM_CONFIG.B.bg }]}>
              <Ionicons name="trophy" size={28} color={TEAM_CONFIG.B.color} />
            </View>
          </View>
          <Text style={styles.headerTitle}>Vote for your top player</Text>
          <Text style={styles.headerSub}>
            One vote per team — tap <Text style={{ fontWeight: '700' }}>Vote</Text> next to your pick from each side.
          </Text>

          {/* My vote status */}
          <View style={styles.myVotesRow}>
            {(['A', 'B'] as TeamKey[]).map((t) => {
              const v = t === 'A' ? myVoteA : myVoteB;
              const cfg = TEAM_CONFIG[t];
              const votedFor = v ? players?.find((p) => p.id === v.nomineeId)?.name : null;
              return (
                <View
                  key={t}
                  style={[
                    styles.myVoteChip,
                    { borderColor: v ? cfg.color : colors.border, backgroundColor: v ? cfg.bg : colors.backgroundTertiary },
                  ]}
                >
                  <Ionicons
                    name={v ? 'checkmark-circle' : 'ellipse-outline'}
                    size={14}
                    color={v ? cfg.color : colors.textTertiary}
                  />
                  <Text style={[styles.myVoteChipText, { color: v ? cfg.color : colors.textTertiary }]}>
                    {cfg.label}: {votedFor ?? 'not voted'}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* Winners summary (if any votes) */}
        {(winnerA || winnerB) && (
          <View style={styles.winnersCard}>
            <Text style={styles.winnersTitle}>🏆 Current Leaders</Text>
            <View style={styles.winnersRow}>
              {(['A', 'B'] as TeamKey[]).map((t) => {
                const w = t === 'A' ? winnerA : winnerB;
                const cfg = TEAM_CONFIG[t];
                const name = w ? players?.find((p) => p.id === w)?.name : null;
                const cnt  = w ? (t === 'A' ? tallyA[w] : tallyB[w]) : 0;
                return (
                  <View key={t} style={[styles.winnerItem, { backgroundColor: cfg.bg, borderColor: cfg.tint }]}>
                    <Text style={[styles.winnerTeam, { color: cfg.color }]}>{cfg.label}</Text>
                    {name ? (
                      <>
                        <Text style={[styles.winnerName, { color: cfg.color }]}>{name}</Text>
                        <Text style={[styles.winnerVotes, { color: cfg.color }]}>{cnt} vote{cnt !== 1 ? 's' : ''}</Text>
                      </>
                    ) : (
                      <Text style={styles.winnerEmpty}>No votes yet</Text>
                    )}
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* No teams warning */}
        {!teamsGenerated && (
          <View style={styles.noTeamsCard}>
            <Ionicons name="information-circle-outline" size={20} color="#D97706" />
            <Text style={styles.noTeamsText}>
              Teams haven't been generated yet. Generate teams first to enable per-team voting.
            </Text>
          </View>
        )}

        {/* Team tabs */}
        {teamsGenerated && (
          <>
            <View style={styles.tabs}>
              {(['A', 'B'] as TeamKey[]).map((t) => {
                const cfg      = TEAM_CONFIG[t];
                const myV      = t === 'A' ? myVoteA : myVoteB;
                const isActive = activeTab === t;
                return (
                  <TouchableOpacity
                    key={t}
                    style={[
                      styles.tab,
                      isActive && { borderBottomColor: cfg.color, borderBottomWidth: 2 },
                    ]}
                    onPress={() => setActiveTab(t)}
                  >
                    <Text style={[styles.tabText, isActive && { color: cfg.color, fontWeight: '700' }]}>
                      {cfg.label}
                    </Text>
                    {myV && (
                      <View style={[styles.tabDot, { backgroundColor: cfg.color }]} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Player cards for active tab */}
            {isLoading ? (
              <ActivityIndicator size="large" color={colors.accent} style={{ marginTop: spacing.xl }} />
            ) : currentTabPlayers.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="people-outline" size={40} color={colors.textTertiary} />
                <Text style={styles.emptyTitle}>No players in {TEAM_CONFIG[activeTab].label}</Text>
              </View>
            ) : (
              currentTabPlayers.map((player) => {
                const isMe       = player.id === currentUser?.id;
                const isVotedFor = myVote?.nomineeId === player.id;
                const playerVotes = tally[player.id] ?? 0;
                const isWinner   = winner === player.id;
                const pct        = totalVotesInTab > 0
                  ? Math.round((playerVotes / totalVotesInTab) * 100) : 0;
                const cfg        = TEAM_CONFIG[activeTab];

                return (
                  <TouchableOpacity
                    key={player.id}
                    style={[
                      styles.playerCard,
                      isVotedFor && { borderColor: cfg.color, backgroundColor: cfg.bg },
                      isWinner && styles.playerCardWinner,
                      isMe && styles.playerCardMe,
                    ]}
                    onPress={() => handleVote(player.id)}
                    activeOpacity={isMe ? 1 : 0.85}
                    disabled={voteMutation.isPending}
                  >
                    {/* Avatar */}
                    <View style={[
                      styles.playerAvatar,
                      isWinner && { backgroundColor: '#FEF3C7' },
                      isVotedFor && { backgroundColor: cfg.tint },
                    ]}>
                      {isWinner && (
                        <Text style={styles.crown}>👑</Text>
                      )}
                      <Text style={[styles.avatarText, isWinner && { color: '#D97706' }]}>
                        {player.name.charAt(0)}
                      </Text>
                    </View>

                    {/* Info */}
                    <View style={styles.playerInfo}>
                      <View style={styles.nameRow}>
                        <Text style={styles.playerName}>{player.name}</Text>
                        {isMe && (
                          <View style={styles.youBadge}>
                            <Text style={styles.youBadgeText}>You</Text>
                          </View>
                        )}
                        {isWinner && !isMe && (
                          <View style={styles.leadingBadge}>
                            <Text style={styles.leadingBadgeText}>Leading</Text>
                          </View>
                        )}
                      </View>
                      <Text style={styles.playerPos}>{player.position}</Text>
                      {/* Vote bar */}
                      <View style={styles.barBg}>
                        <View
                          style={[
                            styles.barFill,
                            { width: `${pct}%` as any, backgroundColor: isVotedFor ? cfg.color : colors.accent },
                          ]}
                        />
                      </View>
                    </View>

                    {/* Vote count + action button */}
                    <View style={styles.voteRight}>
                      <Text style={[styles.voteCount, isWinner && { color: '#D97706' }]}>
                        {playerVotes}
                      </Text>
                      {isMe ? (
                        <View style={styles.cantVoteChip}>
                          <Text style={styles.cantVoteText}>You</Text>
                        </View>
                      ) : isVotedFor ? (
                        <View style={[styles.votedChip, { backgroundColor: cfg.color }]}>
                          <Ionicons name="checkmark" size={12} color="#fff" />
                          <Text style={styles.votedChipText}>Voted</Text>
                        </View>
                      ) : (
                        <View style={[styles.voteChip, { borderColor: cfg.color }]}>
                          <Text style={[styles.voteChipText, { color: cfg.color }]}>Vote</Text>
                        </View>
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })
            )}
          </>
        )}

        {/* Voted both — congratulations nudge */}
        {votedBoth && (
          <View style={styles.doneBanner}>
            <Ionicons name="checkmark-done-circle" size={20} color={colors.accentDark} />
            <Text style={styles.doneText}>
              You've voted in both teams — results update live!
            </Text>
          </View>
        )}

        <View style={{ height: spacing.xl }} />
      </ScrollView>

      <BottomTabBar />
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.backgroundSecondary },
  scroll: { flex: 1 },
  scrollContent: { padding: spacing.md },

  nav: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: colors.white, justifyContent: 'center', alignItems: 'center',
    ...shadows.sm,
  },
  navTitle: { ...typography.captionBold, color: colors.primary, textTransform: 'uppercase', letterSpacing: 0.5 },

  // Header card
  headerCard: {
    backgroundColor: colors.white, borderRadius: borderRadius.xl,
    padding: spacing.lg, alignItems: 'center',
    marginBottom: spacing.md, ...shadows.sm,
  },
  trophyRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.md },
  trophyCircle: { width: 60, height: 60, borderRadius: 30, justifyContent: 'center', alignItems: 'center' },
  trophyVs: { backgroundColor: colors.backgroundTertiary, paddingHorizontal: spacing.sm, paddingVertical: 4, borderRadius: borderRadius.full },
  trophyVsText: { ...typography.captionBold, color: colors.textSecondary },
  headerTitle: { ...typography.h4, color: colors.primary, marginBottom: spacing.xs },
  headerSub: { ...typography.caption, color: colors.textSecondary, textAlign: 'center', lineHeight: 20, marginBottom: spacing.md },

  myVotesRow: { width: '100%', gap: spacing.sm },
  myVoteChip: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    borderRadius: borderRadius.lg, borderWidth: 1.5,
  },
  myVoteChipText: { ...typography.smallBold, flex: 1 },

  // Winners
  winnersCard: {
    backgroundColor: '#FFFBEB', borderRadius: borderRadius.xl,
    padding: spacing.md, marginBottom: spacing.md,
    borderWidth: 1, borderColor: '#FDE68A', ...shadows.xs,
  },
  winnersTitle: { ...typography.captionBold, color: '#D97706', marginBottom: spacing.sm },
  winnersRow: { flexDirection: 'row', gap: spacing.sm },
  winnerItem: {
    flex: 1, borderRadius: borderRadius.lg, padding: spacing.md,
    alignItems: 'center', borderWidth: 1.5,
  },
  winnerTeam: { ...typography.tiny, fontWeight: '700', marginBottom: 4 },
  winnerName: { ...typography.captionBold, textAlign: 'center', marginBottom: 2 },
  winnerVotes: { ...typography.tiny, fontWeight: '600' },
  winnerEmpty: { ...typography.tiny, color: colors.textTertiary, fontStyle: 'italic' },

  // No teams warning
  noTeamsCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm,
    backgroundColor: '#FEF3C7', borderRadius: borderRadius.lg,
    padding: spacing.md, marginBottom: spacing.md,
    borderWidth: 1, borderColor: '#FDE68A',
  },
  noTeamsText: { ...typography.caption, color: '#92400E', flex: 1, lineHeight: 18 },

  // Tabs
  tabs: {
    flexDirection: 'row', backgroundColor: colors.white,
    borderRadius: borderRadius.xl, marginBottom: spacing.md,
    overflow: 'hidden', ...shadows.xs,
  },
  tab: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: spacing.md, gap: spacing.xs,
    borderBottomWidth: 2, borderBottomColor: 'transparent',
  },
  tabText: { ...typography.captionBold, color: colors.textSecondary },
  tabDot: { width: 8, height: 8, borderRadius: 4 },

  // Player cards
  playerCard: {
    backgroundColor: colors.white, borderRadius: borderRadius.xl,
    padding: spacing.md, flexDirection: 'row', alignItems: 'center',
    gap: spacing.md, marginBottom: spacing.sm,
    borderWidth: 1.5, borderColor: 'transparent', ...shadows.sm,
  },
  playerCardWinner: { borderColor: '#F59E0B', backgroundColor: '#FFFBEB' },
  playerCardMe: { opacity: 0.55 },
  playerAvatar: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: colors.primaryTint,
    justifyContent: 'center', alignItems: 'center',
  },
  crown: { position: 'absolute', top: -10, fontSize: 16 },
  avatarText: { ...typography.bodyBold, color: colors.primary },

  playerInfo: { flex: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: 3 },
  playerName: { ...typography.captionBold, color: colors.text },
  youBadge: { backgroundColor: colors.primaryTint, paddingHorizontal: 6, paddingVertical: 2, borderRadius: borderRadius.full },
  youBadgeText: { ...typography.tiny, color: colors.primary, fontWeight: '700' },
  leadingBadge: { backgroundColor: '#FEF3C7', paddingHorizontal: 6, paddingVertical: 2, borderRadius: borderRadius.full },
  leadingBadgeText: { ...typography.tiny, color: '#D97706', fontWeight: '700' },
  playerPos: { ...typography.small, color: colors.textSecondary, marginBottom: spacing.sm },
  barBg: { height: 4, backgroundColor: colors.backgroundTertiary, borderRadius: 2, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 2 },

  voteRight: { alignItems: 'center', gap: 6, minWidth: 52 },
  voteCount: { ...typography.h4, color: colors.primary },

  voteChip: {
    paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: borderRadius.full, borderWidth: 1.5,
  },
  voteChipText: { ...typography.smallBold },

  votedChip: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    paddingHorizontal: 8, paddingVertical: 5,
    borderRadius: borderRadius.full,
  },
  votedChipText: { ...typography.smallBold, color: '#fff' },

  cantVoteChip: {
    paddingHorizontal: 8, paddingVertical: 5,
    borderRadius: borderRadius.full,
    backgroundColor: colors.backgroundTertiary,
  },
  cantVoteText: { ...typography.tiny, color: colors.textTertiary, fontWeight: '600' },

  // Done banner
  doneBanner: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    backgroundColor: colors.accentTint, borderRadius: borderRadius.lg,
    padding: spacing.md, marginTop: spacing.sm,
    borderWidth: 1, borderColor: colors.accent + '44',
  },
  doneText: { ...typography.caption, color: colors.accentDark, flex: 1, lineHeight: 18 },
});
