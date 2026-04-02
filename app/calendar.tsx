import React, { useState, useMemo } from 'react';
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
import { getMatches, getCurrentUser } from '@/lib/data';

// ── Constants ─────────────────────────────────────────────────────────────────
const WEEKDAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const STATUS_CONFIG: Record<string, { dot: string; label: string; bg: string; text: string }> = {
  open:   { dot: colors.accent,    label: 'Open',     bg: colors.accentTint,  text: colors.accentDark },
  full:   { dot: '#F59E0B',        label: 'Full',     bg: '#FEF3C7',          text: '#D97706' },
  closed: { dot: '#94A3B8',        label: 'Finished', bg: '#F1F5F9',          text: '#64748B' },
};

// ── Helpers ───────────────────────────────────────────────────────────────────
function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}
function getFirstDayOfMonth(year: number, month: number) {
  // ISO: 0 = Mon … 6 = Sun
  const d = new Date(year, month, 1).getDay();
  return d === 0 ? 6 : d - 1;
}
function formatDateISO(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}
function todayISO() {
  const t = new Date();
  return formatDateISO(t.getFullYear(), t.getMonth(), t.getDate());
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function CalendarScreen() {
  const router = useRouter();
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [selectedDay, setSelectedDay] = useState<string | null>(todayISO());

  const { data: matches, isLoading } = useQuery({
    queryKey: ['matches'],
    queryFn: getMatches,
  });

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: getCurrentUser,
  });

  const isAdmin = currentUser?.role === 'admin';

  // Build a map: ISO date → match[]
  const matchMap = useMemo(() => {
    const map: Record<string, any[]> = {};
    (matches ?? []).forEach((m) => {
      if (!map[m.date]) map[m.date] = [];
      map[m.date].push(m);
    });
    return map;
  }, [matches]);

  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);

  const monthName = new Date(year, month, 1).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });

  const prevMonth = () => {
    if (month === 0) { setYear(y => y - 1); setMonth(11); }
    else setMonth(m => m - 1);
    setSelectedDay(null);
  };
  const nextMonth = () => {
    if (month === 11) { setYear(y => y + 1); setMonth(0); }
    else setMonth(m => m + 1);
    setSelectedDay(null);
  };

  const selectedMatches = selectedDay ? (matchMap[selectedDay] ?? []) : [];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Nav */}
      <View style={styles.nav}>
        <TouchableOpacity style={styles.navBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color={colors.primary} />
        </TouchableOpacity>
        <Text style={styles.navTitle}>Calendar</Text>
        {isAdmin ? (
          <TouchableOpacity style={styles.addBtn} onPress={() => router.push('/schedule')}>
            <Ionicons name="add" size={22} color={colors.white} />
          </TouchableOpacity>
        ) : <View style={{ width: 40 }} />}
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* Calendar card */}
        <View style={styles.calendarCard}>
          {/* Month navigation */}
          <View style={styles.monthNav}>
            <TouchableOpacity style={styles.monthNavBtn} onPress={prevMonth}>
              <Ionicons name="chevron-back" size={20} color={colors.primary} />
            </TouchableOpacity>
            <Text style={styles.monthTitle}>{monthName}</Text>
            <TouchableOpacity style={styles.monthNavBtn} onPress={nextMonth}>
              <Ionicons name="chevron-forward" size={20} color={colors.primary} />
            </TouchableOpacity>
          </View>

          {/* Weekday headers */}
          <View style={styles.weekdayRow}>
            {WEEKDAY_LABELS.map((wd) => (
              <Text key={wd} style={[styles.weekdayLabel, (wd === 'Sat' || wd === 'Sun') && styles.weekendLabel]}>
                {wd}
              </Text>
            ))}
          </View>

          {/* Day grid */}
          <View style={styles.grid}>
            {/* Leading empty cells */}
            {Array.from({ length: firstDay }).map((_, i) => (
              <View key={`empty-${i}`} style={styles.cell} />
            ))}

            {/* Day cells */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const iso = formatDateISO(year, month, day);
              const dayMatches = matchMap[iso] ?? [];
              const hasMatch = dayMatches.length > 0;
              const isToday = iso === todayISO();
              const isSelected = iso === selectedDay;
              const isPast = new Date(iso) < new Date(todayISO());

              return (
                <TouchableOpacity
                  key={iso}
                  style={[
                    styles.cell,
                    isToday && styles.cellToday,
                    isSelected && styles.cellSelected,
                    hasMatch && !isSelected && styles.cellHasMatch,
                  ]}
                  onPress={() => setSelectedDay(iso === selectedDay ? null : iso)}
                  activeOpacity={0.75}
                >
                  <Text style={[
                    styles.dayNumber,
                    isToday && styles.dayNumberToday,
                    isSelected && styles.dayNumberSelected,
                    isPast && !isToday && styles.dayNumberPast,
                  ]}>
                    {day}
                  </Text>

                  {/* Match dot indicators */}
                  {hasMatch && (
                    <View style={styles.dotRow}>
                      {dayMatches.slice(0, 3).map((m, di) => (
                        <View
                          key={di}
                          style={[
                            styles.matchDot,
                            { backgroundColor: isSelected ? colors.white : (STATUS_CONFIG[m.status]?.dot ?? colors.accent) },
                          ]}
                        />
                      ))}
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Legend */}
          <View style={styles.legend}>
            {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
              <View key={key} style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: cfg.dot }]} />
                <Text style={styles.legendText}>{cfg.label}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Selected day detail */}
        {isLoading ? (
          <ActivityIndicator size="small" color={colors.accent} style={{ marginTop: spacing.md }} />
        ) : selectedDay ? (
          <View style={styles.dayDetailSection}>
            <View style={styles.dayDetailHeader}>
              <Text style={styles.dayDetailTitle}>
                {new Date(selectedDay + 'T12:00:00').toLocaleDateString('en-GB', {
                  weekday: 'long', day: 'numeric', month: 'long',
                })}
              </Text>
              {isAdmin && (
                <TouchableOpacity
                  style={styles.scheduleOnDayBtn}
                  onPress={() => router.push('/schedule')}
                >
                  <Ionicons name="add-circle" size={16} color={colors.accent} />
                  <Text style={styles.scheduleOnDayText}>Add match</Text>
                </TouchableOpacity>
              )}
            </View>

            {selectedMatches.length === 0 ? (
              <View style={styles.noMatchCard}>
                <Ionicons name="football-outline" size={28} color={colors.textTertiary} />
                <Text style={styles.noMatchTitle}>No match scheduled</Text>
                {isAdmin && (
                  <TouchableOpacity onPress={() => router.push('/schedule')}>
                    <Text style={styles.noMatchLink}>Schedule one →</Text>
                  </TouchableOpacity>
                )}
              </View>
            ) : (
              selectedMatches.map((match) => (
                <MatchDayCard key={match.id} match={match} onPress={() => router.push(`/match/${match.id}`)} />
              ))
            )}
          </View>
        ) : null}

        {/* Upcoming matches list */}
        <View style={styles.upcomingSection}>
          <Text style={styles.upcomingTitle}>Upcoming Matches</Text>
          {(matches ?? [])
            .filter((m) => m.status === 'open' || m.status === 'full')
            .slice(0, 5)
            .map((match) => (
              <MatchDayCard key={match.id} match={match} onPress={() => router.push(`/match/${match.id}`)} compact />
            ))}

          {(matches ?? []).filter((m) => m.status === 'open' || m.status === 'full').length === 0 && (
            <View style={styles.noMatchCard}>
              <Ionicons name="calendar-outline" size={28} color={colors.textTertiary} />
              <Text style={styles.noMatchTitle}>No upcoming matches</Text>
              {isAdmin && (
                <TouchableOpacity onPress={() => router.push('/schedule')}>
                  <Text style={styles.noMatchLink}>Schedule the next one →</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>

        <View style={{ height: spacing.xl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Match day card ────────────────────────────────────────────────────────────
function MatchDayCard({ match, onPress, compact = false }: { match: any; onPress: () => void; compact?: boolean }) {
  const cfg = STATUS_CONFIG[match.status] ?? STATUS_CONFIG.open;
  const formatDate = (d: string) =>
    new Date(d + 'T12:00:00').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });

  return (
    <TouchableOpacity style={[styles.matchCard, compact && styles.matchCardCompact]} onPress={onPress} activeOpacity={0.85}>
      <View style={[styles.matchCardStripe, { backgroundColor: cfg.dot }]} />
      <View style={styles.matchCardBody}>
        {compact && <Text style={styles.matchCardDate}>{formatDate(match.date)}</Text>}
        <View style={styles.matchCardTop}>
          <Text style={styles.matchCardTime}>{match.time}</Text>
          <View style={[styles.statusPill, { backgroundColor: cfg.bg }]}>
            <Text style={[styles.statusPillText, { color: cfg.text }]}>{cfg.label}</Text>
          </View>
        </View>
        <Text style={styles.matchCardLocation} numberOfLines={1}>{match.location}</Text>
        <View style={styles.matchCardMeta}>
          <Ionicons name="wallet-outline" size={12} color={colors.textTertiary} />
          <Text style={styles.matchCardCost}>£{match.costPerPlayer?.toFixed(2)}</Text>
          {match.status === 'closed' && match.scoreA !== null && (
            <>
              <Text style={styles.matchCardDot}>·</Text>
              <Text style={styles.matchCardScore}>{match.scoreA} – {match.scoreB}</Text>
            </>
          )}
        </View>
      </View>
      <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
    </TouchableOpacity>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const CELL_SIZE = 44;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.backgroundSecondary },
  scroll: { flex: 1 },
  scrollContent: { padding: spacing.md },

  nav: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
  },
  navBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: colors.white, justifyContent: 'center', alignItems: 'center',
    ...shadows.sm,
  },
  navTitle: { ...typography.captionBold, color: colors.primary, textTransform: 'uppercase', letterSpacing: 0.5 },
  addBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: colors.accent, justifyContent: 'center', alignItems: 'center',
    ...shadows.sm,
  },

  // Calendar card
  calendarCard: {
    backgroundColor: colors.white, borderRadius: borderRadius.xl,
    padding: spacing.md, marginBottom: spacing.md, ...shadows.sm,
  },
  monthNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.md },
  monthNavBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: colors.backgroundTertiary,
    justifyContent: 'center', alignItems: 'center',
  },
  monthTitle: { ...typography.h4, color: colors.primary },

  weekdayRow: { flexDirection: 'row', marginBottom: spacing.sm },
  weekdayLabel: { flex: 1, textAlign: 'center', ...typography.tiny, color: colors.textSecondary, fontWeight: '700' },
  weekendLabel: { color: '#DC2626' },

  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: {
    width: `${100 / 7}%` as any,
    height: CELL_SIZE,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  cellToday: {
    backgroundColor: colors.primaryTint,
    borderRadius: borderRadius.lg,
  },
  cellSelected: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.lg,
  },
  cellHasMatch: {},
  dayNumber: { ...typography.captionBold, color: colors.text },
  dayNumberToday: { color: colors.primary },
  dayNumberSelected: { color: colors.white },
  dayNumberPast: { color: colors.textTertiary },
  dotRow: { flexDirection: 'row', gap: 2, marginTop: 2 },
  matchDot: { width: 5, height: 5, borderRadius: 2.5 },

  legend: { flexDirection: 'row', gap: spacing.md, justifyContent: 'center', marginTop: spacing.sm, paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: colors.backgroundTertiary },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { ...typography.tiny, color: colors.textSecondary },

  // Day detail
  dayDetailSection: { marginBottom: spacing.md },
  dayDetailHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.sm },
  dayDetailTitle: { ...typography.captionBold, color: colors.primary, textTransform: 'uppercase', letterSpacing: 0.5 },
  scheduleOnDayBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  scheduleOnDayText: { ...typography.smallBold, color: colors.accentDark },

  noMatchCard: {
    backgroundColor: colors.white, borderRadius: borderRadius.xl,
    padding: spacing.lg, alignItems: 'center', gap: spacing.sm,
    ...shadows.xs,
  },
  noMatchTitle: { ...typography.caption, color: colors.textSecondary },
  noMatchLink: { ...typography.captionBold, color: colors.accent },

  // Upcoming
  upcomingSection: { marginBottom: spacing.md },
  upcomingTitle: { ...typography.captionBold, color: colors.text, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: spacing.sm },

  // Match card
  matchCard: {
    backgroundColor: colors.white, borderRadius: borderRadius.xl,
    flexDirection: 'row', alignItems: 'center',
    marginBottom: spacing.sm, overflow: 'hidden', ...shadows.sm,
  },
  matchCardCompact: {},
  matchCardStripe: { width: 4, alignSelf: 'stretch' },
  matchCardBody: { flex: 1, padding: spacing.md },
  matchCardDate: { ...typography.tiny, color: colors.textSecondary, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  matchCardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  matchCardTime: { ...typography.captionBold, color: colors.primary },
  statusPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: borderRadius.full },
  statusPillText: { ...typography.tiny, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.3 },
  matchCardLocation: { ...typography.small, color: colors.textSecondary, marginBottom: 4 },
  matchCardMeta: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  matchCardCost: { ...typography.small, color: colors.textTertiary },
  matchCardDot: { color: colors.textTertiary },
  matchCardScore: { ...typography.smallBold, color: colors.primary },
});
