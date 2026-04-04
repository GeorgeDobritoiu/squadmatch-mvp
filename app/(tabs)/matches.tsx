import React, { useState } from 'react';
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
import { useRouter } from 'expo-router';
import { colors, spacing, borderRadius, typography, shadows } from '@/constants/design';
import { getMatches } from '@/lib/data';

const STATUS_CONFIG: Record<string, { color: string; bg: string; label: string; icon: string }> = {
  open: { color: colors.accentDark, bg: colors.accentTint, label: 'Open', icon: 'radio-button-on' },
  full: { color: '#D97706', bg: '#FEF3C7', label: 'Full', icon: 'people' },
  closed: { color: '#6B7280', bg: '#F3F4F6', label: 'Finished', icon: 'checkmark-circle' },
};

export default function MatchesScreen() {
  const router = useRouter();
  const [filter, setFilter] = useState<'upcoming' | 'past' | 'all'>('upcoming');

  const { data: matches, isLoading } = useQuery({
    queryKey: ['matches'],
    queryFn: getMatches,
  });

  const filtered = (matches ?? [])
    .filter((m) => {
      if (filter === 'upcoming') return m.status === 'open' || m.status === 'full';
      if (filter === 'past') return m.status === 'closed';
      return true;
    })
    .sort((a, b) => {
      const diff = new Date(a.date).getTime() - new Date(b.date).getTime();
      // upcoming: soonest first; past & all: most recent first
      return filter === 'upcoming' ? diff : -diff;
    });

  const formatDate = (date: string) => {
    const d = new Date(date + 'T12:00:00');
    return {
      day: d.toLocaleDateString('en-GB', { weekday: 'short' }),
      date: d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
      full: d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' }),
    };
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Matches</Text>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterRow}>
        {(['upcoming', 'past', 'all'] as const).map((f) => (
          <TouchableOpacity
            key={f}
            style={[styles.filterTab, filter === f && styles.filterTabActive]}
            onPress={() => setFilter(f)}
          >
            <Text style={[styles.filterTabText, filter === f && styles.filterTabTextActive]}>
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.accent} />
        </View>
      ) : (
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {filtered.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="football-outline" size={48} color={colors.textTertiary} />
              <Text style={styles.emptyTitle}>No matches found</Text>
              <Text style={styles.emptySubtitle}>Check back later</Text>
            </View>
          ) : (
            filtered.map((match) => {
              const dateInfo = formatDate(match.date);
              const config = STATUS_CONFIG[match.status] ?? STATUS_CONFIG.open;

              return (
                <TouchableOpacity
                  key={match.id}
                  style={styles.matchCard}
                  onPress={() => router.push(`/match/${match.id}`)}
                  activeOpacity={0.85}
                >
                  {/* Date Block */}
                  <View style={styles.dateBlock}>
                    <Text style={styles.dateDayText}>{dateInfo.day}</Text>
                    <Text style={styles.dateFullText}>{dateInfo.date}</Text>
                  </View>

                  {/* Divider */}
                  <View style={styles.dateDivider} />

                  {/* Info */}
                  <View style={styles.matchInfo}>
                    <View style={styles.matchInfoTop}>
                      <Text style={styles.matchTime}>{match.time}</Text>
                      <View style={[styles.statusBadge, { backgroundColor: config.bg }]}>
                        <Ionicons name={config.icon as any} size={10} color={config.color} style={{ marginRight: 3 }} />
                        <Text style={[styles.statusText, { color: config.color }]}>{config.label}</Text>
                      </View>
                    </View>
                    <Text style={styles.matchLocation} numberOfLines={1}>{match.location}</Text>
                    {match.status === 'closed' && match.scoreA !== null && match.scoreB !== null ? (
                      <View style={styles.scoreRow}>
                        <Text style={styles.scoreText}>Team A {match.scoreA} – {match.scoreB} Team B</Text>
                      </View>
                    ) : (
                      <Text style={styles.matchCost}>£{match.costPerPlayer?.toFixed(2)} per player</Text>
                    )}
                  </View>

                  <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
                </TouchableOpacity>
              );
            })
          )}
          <View style={{ height: spacing.xl }} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.backgroundSecondary },
  header: { paddingHorizontal: spacing.md, paddingVertical: spacing.md },
  title: { ...typography.h2, color: colors.primary },

  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  filterTab: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: colors.white,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  filterTabActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  filterTabText: { ...typography.captionBold, color: colors.textSecondary },
  filterTabTextActive: { color: colors.white },

  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: spacing.md },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  emptyState: { alignItems: 'center', paddingTop: spacing.xxxl },
  emptyTitle: { ...typography.h4, color: colors.text, marginTop: spacing.md },
  emptySubtitle: { ...typography.caption, color: colors.textSecondary, marginTop: spacing.xs },

  matchCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.xl,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
    ...shadows.sm,
  },
  dateBlock: { alignItems: 'center', minWidth: 44 },
  dateDayText: { ...typography.tiny, color: colors.textSecondary, textTransform: 'uppercase', fontWeight: '700' },
  dateFullText: { ...typography.captionBold, color: colors.primary, marginTop: 2 },
  dateDivider: { width: 1, height: 40, backgroundColor: colors.border, marginHorizontal: spacing.md },
  matchInfo: { flex: 1 },
  matchInfoTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 3 },
  matchTime: { ...typography.captionBold, color: colors.text },
  statusBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 7, paddingVertical: 3, borderRadius: borderRadius.full },
  statusText: { ...typography.tiny, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.3 },
  matchLocation: { ...typography.small, color: colors.textSecondary, marginBottom: 4 },
  matchCost: { ...typography.small, color: colors.textTertiary },
  scoreRow: {},
  scoreText: { ...typography.smallBold, color: colors.primary },
});
