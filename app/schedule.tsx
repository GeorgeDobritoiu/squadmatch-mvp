/**
 * Schedule Match Screen
 * 100% custom date/time picker — no native-only packages.
 * Works on Web, iOS, and Android.
 */
import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  Platform,
  Modal,
  KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { colors, spacing, borderRadius, typography, shadows } from '@/constants/design';
import { createMatch, getGroup, getCurrentUser } from '@/lib/data';

// ── Presets ───────────────────────────────────────────────────────────────────
const PRESET_LOCATIONS = [
  'Hackney Marshes, Pitch 3',
  'Victoria Park, Astro 1',
  "Regent's Park, Field 2",
  'Clapham Common, Pitch 5',
  'Finsbury Park, 3G',
];

const PRESET_TIMES = [
  '07:00', '08:00', '09:00', '10:00', '11:00',
  '12:00', '14:00', '16:00', '18:00', '19:00', '20:00',
];

const COST_PRESETS = ['5', '6', '7', '8', '10', '12'];

const MONTH_NAMES = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];
const WEEKDAY_LABELS = ['Mo','Tu','We','Th','Fr','Sa','Su'];

// ── Helpers ───────────────────────────────────────────────────────────────────
function pad(n: number) { return String(n).padStart(2, '0'); }
function toISO(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
function isoToDisplay(iso: string) {
  const d = new Date(iso + 'T12:00:00');
  return d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}
function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}
function getFirstDayOfMonth(year: number, month: number) {
  const day = new Date(year, month, 1).getDay();
  return day === 0 ? 6 : day - 1; // Mon=0 … Sun=6
}
function getNextNDays(n: number): string[] {
  return Array.from({ length: n }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    return toISO(d);
  });
}
function todayISO() { return toISO(new Date()); }

// ── Mini Calendar Picker ──────────────────────────────────────────────────────
function MiniCalendar({
  selectedISO,
  onSelect,
}: {
  selectedISO: string;
  onSelect: (iso: string) => void;
}) {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());

  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);
  const todayStr = todayISO();

  const prevMonth = () => {
    if (month === 0) { setYear(y => y - 1); setMonth(11); }
    else setMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (month === 11) { setYear(y => y + 1); setMonth(0); }
    else setMonth(m => m + 1);
  };

  return (
    <View style={cal.wrapper}>
      {/* Month nav */}
      <View style={cal.monthNav}>
        <TouchableOpacity style={cal.navBtn} onPress={prevMonth}>
          <Ionicons name="chevron-back" size={18} color={colors.primary} />
        </TouchableOpacity>
        <Text style={cal.monthTitle}>{MONTH_NAMES[month]} {year}</Text>
        <TouchableOpacity style={cal.navBtn} onPress={nextMonth}>
          <Ionicons name="chevron-forward" size={18} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Weekday headers */}
      <View style={cal.weekRow}>
        {WEEKDAY_LABELS.map(wd => (
          <Text key={wd} style={cal.weekLabel}>{wd}</Text>
        ))}
      </View>

      {/* Day grid */}
      <View style={cal.grid}>
        {Array.from({ length: firstDay }).map((_, i) => (
          <View key={`e${i}`} style={cal.cell} />
        ))}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1;
          const iso = `${year}-${pad(month + 1)}-${pad(day)}`;
          const isSelected = iso === selectedISO;
          const isToday = iso === todayStr;
          const isPast = iso < todayStr;

          return (
            <TouchableOpacity
              key={iso}
              style={[
                cal.cell,
                isToday && !isSelected && cal.cellToday,
                isSelected && cal.cellSelected,
                isPast && cal.cellPast,
              ]}
              onPress={() => !isPast && onSelect(iso)}
              activeOpacity={isPast ? 1 : 0.75}
            >
              <Text style={[
                cal.dayNum,
                isToday && !isSelected && cal.dayNumToday,
                isSelected && cal.dayNumSelected,
                isPast && cal.dayNumPast,
              ]}>
                {day}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const CELL = 40;
const cal = StyleSheet.create({
  wrapper: { paddingTop: spacing.sm },
  monthNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.sm },
  navBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.backgroundTertiary, justifyContent: 'center', alignItems: 'center' },
  monthTitle: { ...typography.captionBold, color: colors.primary },
  weekRow: { flexDirection: 'row', marginBottom: spacing.xs },
  weekLabel: { width: `${100 / 7}%` as any, textAlign: 'center', ...typography.tiny, color: colors.textTertiary, fontWeight: '700' },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: `${100 / 7}%` as any, height: CELL, justifyContent: 'center', alignItems: 'center', marginBottom: 4 },
  cellToday: { backgroundColor: colors.primaryTint, borderRadius: borderRadius.md },
  cellSelected: { backgroundColor: colors.primary, borderRadius: borderRadius.md },
  cellPast: { opacity: 0.3 },
  dayNum: { ...typography.captionBold, color: colors.text },
  dayNumToday: { color: colors.primary },
  dayNumSelected: { color: colors.white },
  dayNumPast: { color: colors.textTertiary },
});

// ── Section card ──────────────────────────────────────────────────────────────
function SectionCard({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
  return (
    <View style={styles.sectionCard}>
      <View style={styles.sectionHeader}>
        <Ionicons name={icon as any} size={13} color={colors.textSecondary} />
        <Text style={styles.sectionTitle}>{title.toUpperCase()}</Text>
      </View>
      {children}
    </View>
  );
}

// ── Main Screen ───────────────────────────────────────────────────────────────
export default function ScheduleScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();

  // Default to next Sunday
  const nextSunday = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + ((7 - d.getDay()) % 7 || 7));
    return toISO(d);
  }, []);

  const [selectedDate, setSelectedDate] = useState(nextSunday);
  const [selectedTime, setSelectedTime] = useState('10:00');
  const [location, setLocation] = useState('Hackney Marshes, Pitch 3');
  const [costPerPlayer, setCostPerPlayer] = useState('8');
  const [notes, setNotes] = useState('');
  const [recurring, setRecurring] = useState(false);
  const [recurringWeeks, setRecurringWeeks] = useState(4);

  const [showCalendar, setShowCalendar] = useState(false);
  const [showLocationPicker, setShowLocationPicker] = useState(false);

  const { data: group } = useQuery({ queryKey: ['group'], queryFn: getGroup });
  const { data: currentUser } = useQuery({ queryKey: ['currentUser'], queryFn: getCurrentUser });

  const quickDays = useMemo(() => getNextNDays(7), []);

  const createMutation = useMutation({
    mutationFn: async () => {
      const groupId = group?.id ?? 'grp1';
      const cost = parseFloat(costPerPlayer) || 0;

      if (recurring) {
        for (let i = 0; i < recurringWeeks; i++) {
          const base = new Date(selectedDate + 'T12:00:00');
          base.setDate(base.getDate() + i * 7);
          await createMatch({ groupId, date: toISO(base), time: selectedTime, location, costPerPlayer: cost });
          await new Promise(r => setTimeout(r, 10));
        }
      } else {
        await createMatch({ groupId, date: selectedDate, time: selectedTime, location, costPerPlayer: cost });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['matches'] });
      queryClient.invalidateQueries({ queryKey: ['nextMatch'] });
      Alert.alert(
        recurring ? `${recurringWeeks} Matches Created!` : 'Match Scheduled!',
        recurring
          ? `${recurringWeeks} weekly matches added to the calendar.`
          : `Match on ${isoToDisplay(selectedDate)} at ${selectedTime} is scheduled.`,
        [
          { text: 'View Calendar', onPress: () => router.replace('/calendar') },
          { text: 'Done', onPress: () => router.back() },
        ]
      );
    },
    onError: () => Alert.alert('Error', 'Could not create match. Please try again.'),
  });

  const handleSubmit = () => {
    if (!location.trim()) { Alert.alert('Location required'); return; }
    const cost = parseFloat(costPerPlayer);
    if (isNaN(cost) || cost < 0) { Alert.alert('Enter a valid cost'); return; }
    createMutation.mutate();
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {/* Nav */}
        <View style={styles.nav}>
          <TouchableOpacity style={styles.navIconBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={22} color={colors.primary} />
          </TouchableOpacity>
          <Text style={styles.navTitle}>Schedule Match</Text>
          <TouchableOpacity style={styles.navIconBtn} onPress={() => router.push('/calendar')}>
            <Ionicons name="calendar-outline" size={22} color={colors.primary} />
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* ── Date ── */}
          <SectionCard title="Date" icon="calendar">
            {/* Quick day chips */}
            <View style={styles.quickDayRow}>
              {quickDays.map(iso => {
                const d = new Date(iso + 'T12:00:00');
                const isActive = iso === selectedDate;
                return (
                  <TouchableOpacity
                    key={iso}
                    style={[styles.dayChip, isActive && styles.dayChipActive]}
                    onPress={() => { setSelectedDate(iso); setShowCalendar(false); }}
                  >
                    <Text style={[styles.dayChipLabel, isActive && styles.dayChipLabelActive]}>
                      {d.toLocaleDateString('en-GB', { weekday: 'short' })}
                    </Text>
                    <Text style={[styles.dayChipNum, isActive && styles.dayChipNumActive]}>
                      {d.getDate()}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Selected date display + toggle full calendar */}
            <TouchableOpacity
              style={styles.selectedDateRow}
              onPress={() => setShowCalendar(v => !v)}
              activeOpacity={0.85}
            >
              <View style={styles.selectedDateLeft}>
                <View style={[styles.iconBox, { backgroundColor: '#EDE9FE' }]}>
                  <Ionicons name="calendar" size={18} color="#7C3AED" />
                </View>
                <View>
                  <Text style={styles.fieldLabel}>Selected Date</Text>
                  <Text style={styles.fieldValue}>{isoToDisplay(selectedDate)}</Text>
                </View>
              </View>
              <Ionicons name={showCalendar ? 'chevron-up' : 'chevron-down'} size={18} color={colors.textSecondary} />
            </TouchableOpacity>

            {showCalendar && (
              <MiniCalendar
                selectedISO={selectedDate}
                onSelect={iso => { setSelectedDate(iso); setShowCalendar(false); }}
              />
            )}
          </SectionCard>

          {/* ── Time ── */}
          <SectionCard title="Kick-off Time" icon="time">
            <TouchableOpacity style={styles.selectedDateRow} activeOpacity={1}>
              <View style={styles.selectedDateLeft}>
                <View style={[styles.iconBox, { backgroundColor: colors.accentTint }]}>
                  <Ionicons name="time" size={18} color={colors.accentDark} />
                </View>
                <View>
                  <Text style={styles.fieldLabel}>Kick-off</Text>
                  <Text style={styles.fieldValue}>{selectedTime}</Text>
                </View>
              </View>
            </TouchableOpacity>
            <View style={styles.chipWrap}>
              {PRESET_TIMES.map(t => (
                <TouchableOpacity
                  key={t}
                  style={[styles.chip, selectedTime === t && styles.chipActive]}
                  onPress={() => setSelectedTime(t)}
                >
                  <Text style={[styles.chipText, selectedTime === t && styles.chipTextActive]}>{t}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </SectionCard>

          {/* ── Location ── */}
          <SectionCard title="Location" icon="location">
            <TouchableOpacity
              style={styles.selectedDateRow}
              onPress={() => setShowLocationPicker(true)}
            >
              <View style={styles.selectedDateLeft}>
                <View style={[styles.iconBox, { backgroundColor: '#FEE2E2' }]}>
                  <Ionicons name="location" size={18} color="#DC2626" />
                </View>
                <View style={{ flex: 1, marginRight: spacing.sm }}>
                  <Text style={styles.fieldLabel}>Pitch / Ground</Text>
                  <Text style={styles.fieldValue} numberOfLines={1}>{location}</Text>
                </View>
              </View>
              <Ionicons name="chevron-down" size={18} color={colors.textSecondary} />
            </TouchableOpacity>

            <TextInput
              style={styles.textInput}
              value={location}
              onChangeText={setLocation}
              placeholder="Or type a custom location…"
              placeholderTextColor={colors.textTertiary}
            />
          </SectionCard>

          {/* ── Cost ── */}
          <SectionCard title="Cost per Player" icon="wallet">
            <View style={styles.costRow}>
              <View style={[styles.iconBox, { backgroundColor: '#FEF3C7', marginRight: spacing.md }]}>
                <Ionicons name="wallet" size={18} color="#D97706" />
              </View>
              <Text style={styles.costCurrency}>£</Text>
              <TextInput
                style={styles.costInput}
                value={costPerPlayer}
                onChangeText={setCostPerPlayer}
                keyboardType="decimal-pad"
                placeholder="0.00"
                placeholderTextColor={colors.textTertiary}
              />
              <Text style={styles.costLabel}>per player</Text>
            </View>
            <View style={styles.chipWrap}>
              {COST_PRESETS.map(c => (
                <TouchableOpacity
                  key={c}
                  style={[styles.chip, costPerPlayer === c && styles.chipActive]}
                  onPress={() => setCostPerPlayer(c)}
                >
                  <Text style={[styles.chipText, costPerPlayer === c && styles.chipTextActive]}>£{c}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </SectionCard>

          {/* ── Recurring ── */}
          <SectionCard title="Recurring" icon="repeat">
            <TouchableOpacity
              style={styles.toggleRow}
              onPress={() => setRecurring(v => !v)}
              activeOpacity={0.85}
            >
              <View style={styles.selectedDateLeft}>
                <View style={[styles.iconBox, { backgroundColor: colors.primaryTint }]}>
                  <Ionicons name="repeat" size={18} color={colors.primary} />
                </View>
                <View>
                  <Text style={styles.fieldLabel}>Weekly Recurring</Text>
                  <Text style={styles.fieldSubtext}>Create multiple matches at once</Text>
                </View>
              </View>
              <View style={[styles.toggle, recurring && styles.toggleOn]}>
                <View style={[styles.toggleThumb, recurring && styles.toggleThumbOn]} />
              </View>
            </TouchableOpacity>

            {recurring && (
              <View style={styles.recurringBox}>
                <Text style={styles.recurringLabel}>Number of weeks</Text>
                <View style={styles.stepper}>
                  <TouchableOpacity
                    style={styles.stepBtn}
                    onPress={() => setRecurringWeeks(w => Math.max(2, w - 1))}
                  >
                    <Ionicons name="remove" size={20} color={colors.primary} />
                  </TouchableOpacity>
                  <Text style={styles.stepValue}>{recurringWeeks}</Text>
                  <TouchableOpacity
                    style={styles.stepBtn}
                    onPress={() => setRecurringWeeks(w => Math.min(12, w + 1))}
                  >
                    <Ionicons name="add" size={20} color={colors.primary} />
                  </TouchableOpacity>
                </View>
                <View style={styles.recurringNote}>
                  <Ionicons name="information-circle-outline" size={14} color={colors.textSecondary} />
                  <Text style={styles.recurringNoteText}>
                    {recurringWeeks} matches, every week from {isoToDisplay(selectedDate)}
                  </Text>
                </View>
              </View>
            )}
          </SectionCard>

          {/* ── Notes ── */}
          <SectionCard title="Notes (optional)" icon="document-text">
            <TextInput
              style={styles.notesInput}
              value={notes}
              onChangeText={setNotes}
              placeholder="e.g. Bring bibs, cash for ref…"
              placeholderTextColor={colors.textTertiary}
              multiline
              numberOfLines={3}
            />
          </SectionCard>

          {/* ── Summary ── */}
          <View style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>Match Summary</Text>
            {[
              { icon: 'calendar-outline', text: isoToDisplay(selectedDate) },
              { icon: 'time-outline', text: selectedTime },
              { icon: 'location-outline', text: location },
              { icon: 'wallet-outline', text: `£${costPerPlayer} per player` },
            ].map((row, i) => (
              <View key={i} style={styles.summaryRow}>
                <Ionicons name={row.icon as any} size={15} color="rgba(255,255,255,0.6)" />
                <Text style={styles.summaryText} numberOfLines={1}>{row.text}</Text>
              </View>
            ))}
            {recurring && (
              <View style={styles.summaryRow}>
                <Ionicons name="repeat-outline" size={15} color={colors.accentLight} />
                <Text style={[styles.summaryText, { color: colors.accentLight }]}>
                  {recurringWeeks} weekly matches
                </Text>
              </View>
            )}
          </View>

          {/* ── Submit ── */}
          <TouchableOpacity
            style={[styles.submitBtn, createMutation.isPending && { opacity: 0.7 }]}
            onPress={handleSubmit}
            disabled={createMutation.isPending}
            activeOpacity={0.85}
          >
            <Ionicons name={recurring ? 'repeat' : 'checkmark-circle'} size={22} color={colors.white} />
            <Text style={styles.submitBtnText}>
              {createMutation.isPending
                ? 'Scheduling…'
                : recurring
                ? `Schedule ${recurringWeeks} Matches`
                : 'Schedule Match'}
            </Text>
          </TouchableOpacity>

          <View style={{ height: spacing.xxxl }} />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* ── Location preset modal ── */}
      <Modal visible={showLocationPicker} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Select Location</Text>
            {PRESET_LOCATIONS.map(loc => (
              <TouchableOpacity
                key={loc}
                style={[styles.locOption, location === loc && styles.locOptionActive]}
                onPress={() => { setLocation(loc); setShowLocationPicker(false); }}
              >
                <Ionicons name="location" size={16} color={location === loc ? colors.primary : colors.textSecondary} />
                <Text style={[styles.locOptionText, location === loc && styles.locOptionTextActive]}>{loc}</Text>
                {location === loc && <Ionicons name="checkmark-circle" size={18} color={colors.accent} />}
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={styles.modalCancel} onPress={() => setShowLocationPicker(false)}>
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  navIconBtn: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: colors.white,
    justifyContent: 'center', alignItems: 'center', ...shadows.sm,
  },
  navTitle: { ...typography.captionBold, color: colors.primary, textTransform: 'uppercase', letterSpacing: 0.5 },

  sectionCard: {
    backgroundColor: colors.white, borderRadius: borderRadius.xl,
    padding: spacing.md, marginBottom: spacing.md, ...shadows.sm,
  },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginBottom: spacing.md },
  sectionTitle: { ...typography.tiny, color: colors.textSecondary, fontWeight: '700', letterSpacing: 1 },

  // Quick day row
  quickDayRow: { flexDirection: 'row', gap: spacing.xs, marginBottom: spacing.md },
  dayChip: {
    flex: 1, alignItems: 'center', paddingVertical: spacing.sm,
    borderRadius: borderRadius.lg, backgroundColor: colors.backgroundTertiary,
    borderWidth: 1.5, borderColor: 'transparent',
  },
  dayChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  dayChipLabel: { ...typography.tiny, color: colors.textSecondary, fontWeight: '700' },
  dayChipLabelActive: { color: 'rgba(255,255,255,0.75)' },
  dayChipNum: { ...typography.captionBold, color: colors.text, marginTop: 2 },
  dayChipNumActive: { color: colors.white },

  // Selected date / field row
  selectedDateRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: colors.backgroundSecondary, borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    marginBottom: spacing.sm,
  },
  selectedDateLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, flex: 1 },
  iconBox: { width: 36, height: 36, borderRadius: borderRadius.md, justifyContent: 'center', alignItems: 'center' },
  fieldLabel: { ...typography.tiny, color: colors.textSecondary, fontWeight: '600' },
  fieldValue: { ...typography.captionBold, color: colors.primary, marginTop: 2 },
  fieldSubtext: { ...typography.tiny, color: colors.textTertiary, marginTop: 1 },

  // Chips
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, paddingTop: spacing.xs },
  chip: {
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    borderRadius: borderRadius.full, backgroundColor: colors.backgroundTertiary,
    borderWidth: 1.5, borderColor: 'transparent',
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { ...typography.smallBold, color: colors.textSecondary },
  chipTextActive: { color: colors.white },

  // Cost
  costRow: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md },
  costCurrency: { ...typography.h3, color: colors.text, marginRight: 4 },
  costInput: {
    borderWidth: 1.5, borderColor: colors.border, borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    ...typography.h3, color: colors.primary, width: 100, textAlign: 'center', marginRight: spacing.sm,
  },
  costLabel: { ...typography.caption, color: colors.textSecondary },

  // Location input
  textInput: {
    borderWidth: 1.5, borderColor: colors.border, borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    ...typography.caption, color: colors.text, marginTop: spacing.xs,
  },

  // Toggle
  toggleRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: colors.backgroundSecondary, borderRadius: borderRadius.lg,
    padding: spacing.md, marginBottom: spacing.sm,
  },
  toggle: { width: 44, height: 26, borderRadius: 13, backgroundColor: colors.border, justifyContent: 'center', paddingHorizontal: 3 },
  toggleOn: { backgroundColor: colors.accent },
  toggleThumb: { width: 20, height: 20, borderRadius: 10, backgroundColor: colors.white, ...shadows.sm },
  toggleThumbOn: { alignSelf: 'flex-end' },

  // Recurring
  recurringBox: { backgroundColor: colors.backgroundSecondary, borderRadius: borderRadius.lg, padding: spacing.md },
  recurringLabel: { ...typography.smallBold, color: colors.textSecondary, marginBottom: spacing.sm },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg, marginBottom: spacing.sm },
  stepBtn: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: colors.white,
    justifyContent: 'center', alignItems: 'center', borderWidth: 1.5, borderColor: colors.border,
  },
  stepValue: { ...typography.h2, color: colors.primary, minWidth: 32, textAlign: 'center' },
  recurringNote: { flexDirection: 'row', gap: spacing.xs, alignItems: 'flex-start' },
  recurringNoteText: { ...typography.small, color: colors.textSecondary, flex: 1 },

  // Notes
  notesInput: {
    borderWidth: 1.5, borderColor: colors.border, borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    ...typography.body, color: colors.text, minHeight: 80, textAlignVertical: 'top',
  },

  // Summary
  summaryCard: {
    backgroundColor: colors.primary, borderRadius: borderRadius.xl,
    padding: spacing.lg, marginBottom: spacing.md, ...shadows.md,
  },
  summaryTitle: {
    ...typography.captionBold, color: 'rgba(255,255,255,0.6)',
    textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: spacing.md,
  },
  summaryRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  summaryText: { ...typography.caption, color: 'rgba(255,255,255,0.9)', flex: 1 },

  // Submit
  submitBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: spacing.sm, backgroundColor: colors.accent,
    borderRadius: borderRadius.xl, paddingVertical: spacing.lg,
    marginBottom: spacing.md, ...shadows.md,
  },
  submitBtnText: { ...typography.h4, color: colors.white },

  // Location modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: borderRadius.xxl, borderTopRightRadius: borderRadius.xxl,
    padding: spacing.lg, paddingBottom: 40,
  },
  modalHandle: { width: 40, height: 4, backgroundColor: colors.border, borderRadius: 2, alignSelf: 'center', marginBottom: spacing.lg },
  modalTitle: { ...typography.h3, color: colors.primary, marginBottom: spacing.md },
  locOption: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    paddingVertical: spacing.md, paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.lg, marginBottom: spacing.xs,
    backgroundColor: colors.backgroundSecondary,
  },
  locOptionActive: { backgroundColor: colors.primaryTint, borderWidth: 1.5, borderColor: colors.primaryLight },
  locOptionText: { ...typography.caption, color: colors.textSecondary, flex: 1 },
  locOptionTextActive: { color: colors.primary, fontWeight: '600' },
  modalCancel: {
    marginTop: spacing.md, paddingVertical: spacing.md,
    borderRadius: borderRadius.lg, backgroundColor: colors.backgroundTertiary, alignItems: 'center',
  },
  modalCancelText: { ...typography.captionBold, color: colors.textSecondary },
});
