import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { colors, spacing, borderRadius, typography, shadows } from '@/constants/design';
import { getPlayerById, getPlayerStats, getCurrentUser, getMotmVotes, getPlayers } from '@/lib/data';

const POSITION_COLOR: Record<string, { bg: string; text: string }> = {
  Goalkeeper: { bg: '#EDE9FE', text: '#7C3AED' },
  Defender:   { bg: '#DBEAFE', text: '#2563EB' },
  Midfielder: { bg: '#FEF3C7', text: '#D97706' },
  Striker:    { bg: '#FEE2E2', text: '#DC2626' },
  Any:        { bg: '#F1F5F9', text: '#64748B' },
};

const SKILL_CONFIG: Record<string, { stars: number; color: string; label: string }> = {
  Low:    { stars: 1, color: '#94A3B8', label: 'Beginner' },
  Medium: { stars: 2, color: '#D97706', label: 'Intermediate' },
  High:   { stars: 3, color: '#D97706', label: 'Advanced' },
};

function StarRating({ level }: { level: string }) {
  const cfg = SKILL_CONFIG[level] ?? SKILL_CONFIG.Medium;
  return (
    <View style={starStyles.row}>
      {[1, 2, 3].map((n) => (
        <Ionicons
          key={n}
          name={n <= cfg.stars ? 'star' : 'star-outline'}
          size={14}
          color={n <= cfg.stars ? cfg.color : colors.border}
        />
      ))}
      <Text style={[starStyles.label, { color: cfg.color }]}>{cfg.label}</Text>
    </View>
  );
}

const starStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  label: { ...typography.small, fontWeight: '600', marginLeft: 3 },
});

export default function PlayerProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const { data: player, isLoading: playerLoading } = useQuery({
    queryKey: ['player', id],
    queryFn: () => getPlayerById(id),
    enabled: !!id,
  });

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['playerStats', id],
    queryFn: () => getPlayerStats(id),
    enabled: !!id,
  });

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: getCurrentUser,
  });

  const isLoading = playerLoading || statsLoading;
  const isMe = currentUser?.id === id;
  const posConfig = POSITION_COLOR[player?.position ?? 'Any'] ?? POSITION_COLOR.Any;

  const formatDate = (date: string) => {
    const d = new Date(date + 'T12:00:00');
    return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.nav}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={22} color={colors.primary} />
          </TouchableOpacity>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.accent} />
        </View>
      </SafeAreaView>
    );
  }

  if (!player) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.nav}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={22} color={colors.primary} />
          </TouchableOpacity>
          <Text style={styles.navTitle}>Player</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.loadingContainer}>
          <Text style={styles.errorText}>Player not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Nav */}
      <View style={styles.nav}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color={colors.primary} />
        </TouchableOpacity>
        <Text style={styles.navTitle}>Player Profile</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero card */}
        <View style={styles.heroCard}>
          {/* Avatar */}
          <View style={styles.avatarWrapper}>
            <View style={styles.avatar}>
              <Text style={styles.avatarInitial}>{player.name.charAt(0)}</Text>
            </View>
            {isMe && (
              <View style={styles.meRing} />
            )}
          </View>

          {/* Name + badges */}
          <Text style={styles.playerName}>{player.name}</Text>

          <View style={styles.badgeRow}>
            {isMe && (
              <View style={styles.meBadge}>
                <Text style={styles.meBadgeText}>You</Text>
              </View>
            )}
            {player.role === 'admin' && (
              <View style={styles.adminBadge}>
                <Ionicons name="shield-checkmark" size={11} color="#D97706" />
                <Text style={styles.adminBadgeText}>Admin</Text>
              </View>
            )}
            {/* Position chip */}
            <View style={[styles.positionChip, { backgroundColor: posConfig.bg }]}>
              <Text style={[styles.positionChipText, { color: posConfig.text }]}>
                {player.position ?? 'Any'}
              </Text>
            </View>
          </View>

          {/* Skill */}
          <View style={styles.skillRow}>
            <StarRating level={player.skillLevel ?? 'Medium'} />
          </View>

          {/* Stat strip */}
          <View style={styles.statsStrip}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stats?.matchesPlayed ?? 0}</Text>
              <Text style={styles.statLabel}>Played</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={[styles.statValue, styles.statGold]}>
                {stats?.motmWins ?? 0}
              </Text>
              <Text style={styles.statLabel}>MOTM</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={[styles.statValue, stats?.attendanceRate && stats.attendanceRate >= 80 ? styles.statGreen : {}]}>
                {stats?.attendanceRate ?? 0}%
              </Text>
              <Text style={styles.statLabel}>Attend.</Text>
            </View>
          </View>
        </View>

        {/* Team record */}
        {stats && stats.matchesPlayed > 0 && (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Team Record</Text>
            <View style={styles.recordRow}>
              <View style={styles.recordItem}>
                <View style={[styles.recordDot, { backgroundColor: colors.accentDark }]} />
                <Text style={styles.recordCount}>{stats.wins}</Text>
                <Text style={styles.recordLabel}>Won</Text>
              </View>
              <View style={styles.recordItem}>
                <View style={[styles.recordDot, { backgroundColor: '#94A3B8' }]} />
                <Text style={styles.recordCount}>{stats.draws}</Text>
                <Text style={styles.recordLabel}>Draw</Text>
              </View>
              <View style={styles.recordItem}>
                <View style={[styles.recordDot, { backgroundColor: '#EF4444' }]} />
                <Text style={styles.recordCount}>{stats.losses}</Text>
                <Text style={styles.recordLabel}>Lost</Text>
              </View>
            </View>

            {/* Win rate bar */}
            {(stats.wins + stats.draws + stats.losses) > 0 && (
              <View style={styles.winBarOuter}>
                <View
                  style={[
                    styles.winBarSegment,
                    styles.winBarW,
                    {
                      flex: stats.wins || 0.001,
                      borderTopRightRadius: stats.draws === 0 && stats.losses === 0 ? borderRadius.full : 0,
                      borderBottomRightRadius: stats.draws === 0 && stats.losses === 0 ? borderRadius.full : 0,
                    },
                  ]}
                />
                <View style={[styles.winBarSegment, styles.winBarD, { flex: stats.draws || 0.001 }]} />
                <View
                  style={[
                    styles.winBarSegment,
                    styles.winBarL,
                    {
                      flex: stats.losses || 0.001,
                      borderTopLeftRadius: stats.wins === 0 && stats.draws === 0 ? borderRadius.full : 0,
                      borderBottomLeftRadius: stats.wins === 0 && stats.draws === 0 ? borderRadius.full : 0,
                    },
                  ]}
                />
              </View>
            )}
          </View>
        )}

        {/* Playing details */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Playing Details</Text>

          <View style={styles.detailRow}>
            <View style={styles.detailIcon}>
              <Ionicons name="body-outline" size={16} color={colors.primary} />
            </View>
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>Position</Text>
              <View style={[styles.positionChipLg, { backgroundColor: posConfig.bg }]}>
                <Text style={[styles.positionChipLgText, { color: posConfig.text }]}>
                  {player.position ?? 'Any'}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.detailDivider} />

          <View style={styles.detailRow}>
            <View style={styles.detailIcon}>
              <Ionicons name="flash-outline" size={16} color={colors.primary} />
            </View>
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>Skill Level</Text>
              <StarRating level={player.skillLevel ?? 'Medium'} />
            </View>
          </View>

          <View style={styles.detailDivider} />

          <View style={styles.detailRow}>
            <View style={styles.detailIcon}>
              <Ionicons name="trophy-outline" size={16} color="#D97706" />
            </View>
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>Man of the Match</Text>
              <Text style={styles.detailValue}>
                {stats?.motmWins ?? 0} award{(stats?.motmWins ?? 0) !== 1 ? 's' : ''}
              </Text>
            </View>
          </View>

          <View style={styles.detailDivider} />

          <View style={styles.detailRow}>
            <View style={styles.detailIcon}>
              <Ionicons name="checkmark-circle-outline" size={16} color={colors.accentDark} />
            </View>
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>Attendance Rate</Text>
              <View style={styles.attendanceBar}>
                <View style={styles.attendanceBarBg}>
                  <View
                    style={[
                      styles.attendanceBarFill,
                      { width: `${stats?.attendanceRate ?? 0}%` as any },
                    ]}
                  />
                </View>
                <Text style={styles.attendanceBarLabel}>{stats?.attendanceRate ?? 0}%</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Recent matches */}
        {stats && stats.recentMatches.length > 0 && (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Recent Matches</Text>
            {stats.recentMatches.map((match: any) => {
              const hasScore = match.scoreA !== null && match.scoreB !== null;
              const myScore = match.myTeam === 'A' ? match.scoreA : match.scoreB;
              const oppScore = match.myTeam === 'A' ? match.scoreB : match.scoreA;
              const result = !hasScore || !match.myTeam
                ? null
                : myScore > oppScore ? 'W'
                : myScore === oppScore ? 'D'
                : 'L';

              const resultColor =
                result === 'W' ? colors.accentDark
                : result === 'D' ? '#94A3B8'
                : result === 'L' ? '#EF4444'
                : colors.textTertiary;

              return (
                <TouchableOpacity
                  key={match.id}
                  style={styles.matchRow}
                  onPress={() => router.push(`/match/${match.id}`)}
                  activeOpacity={0.85}
                >
                  <View style={styles.matchRowLeft}>
                    <Text style={styles.matchRowDate}>{formatDate(match.date)}</Text>
                    {match.myTeam && (
                      <View style={[
                        styles.teamChip,
                        { backgroundColor: match.myTeam === 'A' ? colors.primaryTint : '#FFF1F2' },
                      ]}>
                        <Text style={[
                          styles.teamChipText,
                          { color: match.myTeam === 'A' ? colors.primary : '#DC2626' },
                        ]}>
                          Team {match.myTeam}
                        </Text>
                      </View>
                    )}
                  </View>

                  <View style={styles.matchRowRight}>
                    {hasScore ? (
                      <Text style={styles.matchScore}>
                        {match.scoreA} – {match.scoreB}
                      </Text>
                    ) : (
                      <Text style={styles.matchNoScore}>–</Text>
                    )}
                    {result && (
                      <View style={[styles.resultBadge, { backgroundColor: resultColor + '22' }]}>
                        <Text style={[styles.resultText, { color: resultColor }]}>{result}</Text>
                      </View>
                    )}
                    <Ionicons name="chevron-forward" size={14} color={colors.textTertiary} />
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {stats && stats.recentMatches.length === 0 && (
          <View style={styles.emptyCard}>
            <Ionicons name="football-outline" size={32} color={colors.textTertiary} />
            <Text style={styles.emptyText}>No match history yet</Text>
          </View>
        )}

        <View style={{ height: spacing.xl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.backgroundSecondary },
  scroll: { flex: 1 },
  scrollContent: { padding: spacing.md },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorText: { ...typography.body, color: colors.textSecondary },

  nav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.sm,
  },
  navTitle: {
    ...typography.captionBold,
    color: colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // Hero
  heroCard: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    alignItems: 'center',
    marginBottom: spacing.md,
    ...shadows.lg,
  },
  avatarWrapper: { position: 'relative', marginBottom: spacing.md },
  meRing: {
    position: 'absolute',
    inset: -4,
    width: 104,
    height: 104,
    borderRadius: 52,
    borderWidth: 3,
    borderColor: colors.accent,
    top: -4,
    left: -4,
  },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitial: {
    fontSize: 38,
    fontWeight: '700',
    color: colors.white,
  },
  playerName: { ...typography.h3, color: colors.white, marginBottom: spacing.sm },
  badgeRow: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap', justifyContent: 'center', marginBottom: spacing.sm },
  meBadge: { backgroundColor: colors.accent, paddingHorizontal: spacing.sm, paddingVertical: 3, borderRadius: borderRadius.full },
  meBadgeText: { ...typography.tiny, color: colors.white, fontWeight: '700' },
  adminBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: '#FEF3C7', paddingHorizontal: spacing.sm, paddingVertical: 3, borderRadius: borderRadius.full },
  adminBadgeText: { ...typography.tiny, color: '#D97706', fontWeight: '700' },
  positionChip: { paddingHorizontal: spacing.sm, paddingVertical: 3, borderRadius: borderRadius.full },
  positionChipText: { ...typography.tiny, fontWeight: '700' },
  skillRow: { marginBottom: spacing.md, opacity: 0.9 },

  statsStrip: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    width: '100%',
    marginTop: spacing.xs,
  },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: { ...typography.h3, color: colors.white },
  statGold: { color: '#FCD34D' },
  statGreen: { color: colors.accentLight },
  statLabel: { ...typography.tiny, color: 'rgba(255,255,255,0.6)', marginTop: 2 },
  statDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.2)' },

  // Section card
  sectionCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    marginBottom: spacing.md,
    ...shadows.sm,
  },
  sectionTitle: {
    ...typography.captionBold,
    color: colors.text,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.md,
  },

  // Record
  recordRow: { flexDirection: 'row', marginBottom: spacing.md },
  recordItem: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  recordDot: { width: 10, height: 10, borderRadius: 5 },
  recordCount: { ...typography.h3, color: colors.primary },
  recordLabel: { ...typography.caption, color: colors.textSecondary },
  winBarOuter: {
    flexDirection: 'row',
    height: 8,
    borderRadius: borderRadius.full,
    overflow: 'hidden',
    backgroundColor: colors.backgroundTertiary,
  },
  winBarSegment: { height: '100%' },
  winBarW: { backgroundColor: colors.accentDark, borderTopLeftRadius: borderRadius.full, borderBottomLeftRadius: borderRadius.full },
  winBarD: { backgroundColor: '#CBD5E1' },
  winBarL: { backgroundColor: '#EF4444', borderTopRightRadius: borderRadius.full, borderBottomRightRadius: borderRadius.full },

  // Playing details
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.sm },
  detailDivider: { height: 1, backgroundColor: colors.backgroundTertiary },
  detailIcon: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.md,
    backgroundColor: colors.backgroundTertiary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailContent: { flex: 1 },
  detailLabel: { ...typography.small, color: colors.textSecondary, marginBottom: 4 },
  detailValue: { ...typography.captionBold, color: colors.text },
  positionChipLg: { alignSelf: 'flex-start', paddingHorizontal: spacing.md, paddingVertical: 5, borderRadius: borderRadius.full },
  positionChipLgText: { ...typography.captionBold },
  attendanceBar: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  attendanceBarBg: { flex: 1, height: 8, backgroundColor: colors.backgroundTertiary, borderRadius: borderRadius.full, overflow: 'hidden' },
  attendanceBarFill: { height: '100%', backgroundColor: colors.accent, borderRadius: borderRadius.full },
  attendanceBarLabel: { ...typography.captionBold, color: colors.accentDark, minWidth: 36, textAlign: 'right' },

  // Recent matches
  matchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.backgroundTertiary,
  },
  matchRowLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  matchRowDate: { ...typography.captionBold, color: colors.text },
  teamChip: { paddingHorizontal: 6, paddingVertical: 3, borderRadius: borderRadius.full },
  teamChipText: { ...typography.tiny, fontWeight: '700' },
  matchRowRight: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  matchScore: { ...typography.captionBold, color: colors.primary },
  matchNoScore: { ...typography.caption, color: colors.textTertiary },
  resultBadge: { width: 24, height: 24, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  resultText: { ...typography.tiny, fontWeight: '800' },

  // Empty
  emptyCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
    ...shadows.xs,
  },
  emptyText: { ...typography.caption, color: colors.textSecondary },
});
