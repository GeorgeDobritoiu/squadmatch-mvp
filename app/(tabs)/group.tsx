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
import { colors, spacing, borderRadius, typography, shadows } from '@/constants/design';
import { getGroup, getPlayers, getCurrentUser, getAllPlayerRatings } from '@/lib/data';
import { getRatingColor, getRatingLabel } from '@/lib/ratings';
import RatingBadge from '@/components/RatingBadge';
import { useRouter } from 'expo-router';

const POSITION_COLORS: Record<string, string> = {
  Goalkeeper: '#7C3AED',
  Defender: '#2563EB',
  Midfielder: '#D97706',
  Striker: '#DC2626',
  Any: '#6B7280',
};

export default function GroupScreen() {
  const router = useRouter();

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

      {/* Create Match Modal */}
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
