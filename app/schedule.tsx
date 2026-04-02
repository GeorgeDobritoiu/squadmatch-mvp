/**
 * Schedule Match Screen
 * 100% cross-platform — no native-only packages.
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
const PRESET_TIMES = ['07:00','08:00','09:00','10:00','11:00','12:00','14:00','16:00','18:00','19:00','20:00'];
const COST_PRESETS = ['5','6','7','8','10','12'];
const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const WEEKDAY_LABELS = ['Mo','Tu','We','Th','Fr','Sa','Su'];

// ── Helpers ───────────────────────────────────────────────────────────────────
function pad(n: number) { return String(n).padStart(2, '0'); }
function toISO(d: Date) { return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`; }
function isoToDisplay(iso: string) {
  const d = new Date(iso + 'T12:00:00');
  return d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}
function getDaysInMonth(y: number, m: number) { return new Date(y, m+1, 0).getDate(); }
function getFirstDayOfMonth(y: number, m: number) { const d = new Date(y, m, 1).getDay(); return d === 0 ? 6 : d-1; }
function todayISO() { return toISO(new Date()); }
function getNextNDays(n: number): string[] {
  return Array.from({ length: n }, (_, i) => { const d = new Date(); d.setDate(d.getDate()+i); return toISO(d); });
}

// ── Mini Calendar ─────────────────────────────────────────────────────────────
function MiniCalendar({ selected, onSelect }: { selected: string; onSelect: (iso: string) => void }) {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const todayStr = todayISO();

  const prevMonth = () => { if (month === 0) { setYear(y=>y-1); setMonth(11); } else setMonth(m=>m-1); };
  const nextMonth = () => { if (month === 11) { setYear(y=>y+1); setMonth(0); } else setMonth(m=>m+1); };

  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);

  return (
    <View style={cs.wrap}>
      <View style={cs.nav}>
        <TouchableOpacity style={cs.navBtn} onPress={prevMonth}>
          <Ionicons name="chevron-back" size={18} color={colors.primary} />
        </TouchableOpacity>
        <Text style={cs.navTitle}>{MONTH_NAMES[month]} {year}</Text>
        <TouchableOpacity style={cs.navBtn} onPress={nextMonth}>
          <Ionicons name="chevron-forward" size={18} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <View style={cs.weekRow}>
        {WEEKDAY_LABELS.map(wd => (
          <Text key={wd} style={cs.weekLabel}>{wd}</Text>
        ))}
      </View>

      <View style={cs.grid}>
        {Array.from({ length: firstDay }).map((_, i) => <View key={`e${i}`} style={cs.cell} />)}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1;
          const iso = `${year}-${pad(month+1)}-${pad(day)}`;
          const isSel = iso === selected;
          const isToday = iso === todayStr;
          const isPast = iso < todayStr;
          return (
            <TouchableOpacity
              key={iso}
              style={[cs.cell, isToday && !isSel && cs.cellToday, isSel && cs.cellSel, isPast && cs.cellPast]}
              onPress={() => !isPast && onSelect(iso)}
              activeOpacity={isPast ? 1 : 0.8}
            >
              <Text style={[cs.day, isToday && !isSel && cs.dayToday, isSel && cs.daySel, isPast && cs.dayPast]}>
                {day}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const cs = StyleSheet.create({
  wrap: { paddingTop: spacing.sm },
  nav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.sm },
  navBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.backgroundTertiary, justifyContent: 'center', alignItems: 'center' },
  navTitle: { ...typography.captionBold, color: colors.primary },
  weekRow: { flexDirection: 'row', marginBottom: spacing.xs },
  weekLabel: { width: `${100/7}%` as any, textAlign: 'center', ...typography.tiny, color: colors.textTertiary, fontWeight: '700' },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: `${100/7}%` as any, height: 40, justifyContent: 'center', alignItems: 'center', marginBottom: 4 },
  cellToday: { backgroundColor: colors.primaryTint, borderRadius: borderRadius.md },
  cellSel: { backgroundColor: colors.primary, borderRadius: borderRadius.md },
  cellPast: { opacity: 0.3 },
  day: { ...typography.captionBold, color: colors.text },
  dayToday: { color: colors.primary },
  daySel: { color: colors.white },
  dayPast: { color: colors.textTertiary },
});

// ── Section card ──────────────────────────────────────────────────────────────
function SectionCard({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
  return (
    <View style={s.sectionCard}>
      <View style={s.sectionHeader}>
        <Ionicons name={icon as any} size={13} color={colors.textSecondary} />
        <Text style={s.sectionTitle}>{title.toUpperCase()}</Text>
      </View>
      {children}
    </View>
  );
}

// ── Screen ────────────────────────────────────────────────────────────────────
export default function ScheduleScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const nextSunday = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + ((7 - d.getDay()) % 7 || 7));
    return toISO(d);
  }, []);

  const [selectedDate, setSelectedDate] = useState(nextSunday);
  const [selectedTime, setSelectedTime] = useState('10:00');
  const [location, setLocation] = useState('Hackney Marshes, Pitch 3');
  const [cost, setCost] = useState('8');
  const [notes, setNotes] = useState('');
  const [recurring, setRecurring] = useState(false);
  const [recurringWeeks, setRecurringWeeks] = useState(4);
  const [showCal, setShowCal] = useState(false);
  const [showLocModal, setShowLocModal] = useState(false);

  const { data: group } = useQuery({ queryKey: ['group'], queryFn: getGroup });
  const quickDays = useMemo(() => getNextNDays(7), []);

  const createMutation = useMutation({
    mutationFn: async () => {
      const groupId = group?.id ?? 'grp1';
      const costVal = parseFloat(cost) || 0;
      if (recurring) {
        for (let i = 0; i < recurringWeeks; i++) {
          const base = new Date(selectedDate + 'T12:00:00');
          base.setDate(base.getDate() + i * 7);
          await createMatch({ groupId, date: toISO(base), time: selectedTime, location, costPerPlayer: costVal });
          await new Promise(r => setTimeout(r, 12));
        }
      } else {
        await createMatch({ groupId, date: selectedDate, time: selectedTime, location, costPerPlayer: costVal });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['matches'] });
      queryClient.invalidateQueries({ queryKey: ['nextMatch'] });
      Alert.alert(
        recurring ? `${recurringWeeks} Matches Created!` : 'Match Scheduled!',
        recurring
          ? `${recurringWeeks} weekly matches added to the calendar.`
          : `Match on ${isoToDisplay(selectedDate)} at ${selectedTime}.`,
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
    if (isNaN(parseFloat(cost)) || parseFloat(cost) < 0) { Alert.alert('Enter a valid cost'); return; }
    createMutation.mutate();
  };

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={s.nav}>
          <TouchableOpacity style={s.navBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={22} color={colors.primary} />
          </TouchableOpacity>
          <Text style={s.navTitle}>Schedule Match</Text>
          <TouchableOpacity style={s.navBtn} onPress={() => router.push('/calendar')}>
            <Ionicons name="calendar-outline" size={22} color={colors.primary} />
          </TouchableOpacity>
        </View>

        <ScrollView style={s.scroll} contentContainerStyle={s.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

          {/* Date */}
          <SectionCard title="Date" icon="calendar">
            <View style={s.quickRow}>
              {quickDays.map(iso => {
                const d = new Date(iso + 'T12:00:00');
                const active = iso === selectedDate;
                return (
                  <TouchableOpacity key={iso} style={[s.dayChip, active && s.dayChipOn]} onPress={() => { setSelectedDate(iso); setShowCal(false); }}>
                    <Text style={[s.dayChipTop, active && s.dayChipTopOn]}>{d.toLocaleDateString('en-GB',{weekday:'short'})}</Text>
                    <Text style={[s.dayChipBot, active && s.dayChipBotOn]}>{d.getDate()}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <TouchableOpacity style={s.fieldRow} onPress={() => setShowCal(v => !v)}>
              <View style={s.fieldLeft}>
                <View style={[s.iconBox, { backgroundColor: '#EDE9FE' }]}>
                  <Ionicons name="calendar" size={18} color="#7C3AED" />
                </View>
                <View>
                  <Text style={s.fieldLabel}>Selected Date</Text>
                  <Text style={s.fieldValue}>{isoToDisplay(selectedDate)}</Text>
                </View>
              </View>
              <Ionicons name={showCal ? 'chevron-up' : 'chevron-down'} size={18} color={colors.textSecondary} />
            </TouchableOpacity>

            {showCal && (
              <MiniCalendar selected={selectedDate} onSelect={iso => { setSelectedDate(iso); setShowCal(false); }} />
            )}
          </SectionCard>

          {/* Time */}
          <SectionCard title="Kick-off Time" icon="time">
            <View style={s.fieldRow}>
              <View style={s.fieldLeft}>
                <View style={[s.iconBox, { backgroundColor: colors.accentTint }]}>
                  <Ionicons name="time" size={18} color={colors.accentDark} />
                </View>
                <View>
                  <Text style={s.fieldLabel}>Kick-off</Text>
                  <Text style={s.fieldValue}>{selectedTime}</Text>
                </View>
              </View>
            </View>
            <View style={s.chipWrap}>
              {PRESET_TIMES.map(t => (
                <TouchableOpacity key={t} style={[s.chip, selectedTime === t && s.chipOn]} onPress={() => setSelectedTime(t)}>
                  <Text style={[s.chipText, selectedTime === t && s.chipTextOn]}>{t}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </SectionCard>

          {/* Location */}
          <SectionCard title="Location" icon="location">
            <TouchableOpacity style={s.fieldRow} onPress={() => setShowLocModal(true)}>
              <View style={[s.fieldLeft, { flex: 1 }]}>
                <View style={[s.iconBox, { backgroundColor: '#FEE2E2' }]}>
                  <Ionicons name="location" size={18} color="#DC2626" />
                </View>
                <View style={{ flex: 1, marginRight: spacing.sm }}>
                  <Text style={s.fieldLabel}>Pitch / Ground</Text>
                  <Text style={s.fieldValue} numberOfLines={1}>{location}</Text>
                </View>
              </View>
              <Ionicons name="chevron-down" size={18} color={colors.textSecondary} />
            </TouchableOpacity>
            <TextInput
              style={s.textInput}
              value={location}
              onChangeText={setLocation}
              placeholder="Or type a custom location…"
              placeholderTextColor={colors.textTertiary}
            />
          </SectionCard>

          {/* Cost */}
          <SectionCard title="Cost per Player" icon="wallet">
            <View style={s.costRow}>
              <View style={[s.iconBox, { backgroundColor: '#FEF3C7', marginRight: spacing.md }]}>
                <Ionicons name="wallet" size={18} color="#D97706" />
              </View>
              <Text style={s.currency}>£</Text>
              <TextInput
                style={s.costInput}
                value={cost}
                onChangeText={setCost}
                keyboardType="decimal-pad"
                placeholder="0.00"
                placeholderTextColor={colors.textTertiary}
              />
              <Text style={s.costLabel}>per player</Text>
            </View>
            <View style={s.chipWrap}>
              {COST_PRESETS.map(c => (
                <TouchableOpacity key={c} style={[s.chip, cost === c && s.chipOn]} onPress={() => setCost(c)}>
                  <Text style={[s.chipText, cost === c && s.chipTextOn]}>£{c}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </SectionCard>

          {/* Recurring */}
          <SectionCard title="Recurring" icon="repeat">
            <TouchableOpacity style={s.toggleRow} onPress={() => setRecurring(v => !v)} activeOpacity={0.85}>
              <View style={s.fieldLeft}>
                <View style={[s.iconBox, { backgroundColor: colors.primaryTint }]}>
                  <Ionicons name="repeat" size={18} color={colors.primary} />
                </View>
                <View>
                  <Text style={s.fieldLabel}>Weekly Recurring</Text>
                  <Text style={s.fieldSubtext}>Create multiple matches at once</Text>
                </View>
              </View>
              <View style={[s.toggle, recurring && s.toggleOn]}>
                <View style={[s.thumb, recurring && s.thumbOn]} />
              </View>
            </TouchableOpacity>
            {recurring && (
              <View style={s.recurBox}>
                <Text style={s.recurLabel}>Number of weeks</Text>
                <View style={s.stepper}>
                  <TouchableOpacity style={s.stepBtn} onPress={() => setRecurringWeeks(w => Math.max(2, w-1))}>
                    <Ionicons name="remove" size={20} color={colors.primary} />
                  </TouchableOpacity>
                  <Text style={s.stepVal}>{recurringWeeks}</Text>
                  <TouchableOpacity style={s.stepBtn} onPress={() => setRecurringWeeks(w => Math.min(12, w+1))}>
                    <Ionicons name="add" size={20} color={colors.primary} />
                  </TouchableOpacity>
                </View>
                <View style={s.recurNote}>
                  <Ionicons name="information-circle-outline" size={14} color={colors.textSecondary} />
                  <Text style={s.recurNoteText}>{recurringWeeks} matches, every week from {isoToDisplay(selectedDate)}</Text>
                </View>
              </View>
            )}
          </SectionCard>

          {/* Notes */}
          <SectionCard title="Notes (optional)" icon="document-text">
            <TextInput
              style={s.notesInput}
              value={notes}
              onChangeText={setNotes}
              placeholder="e.g. Bring bibs, cash for ref…"
              placeholderTextColor={colors.textTertiary}
              multiline
              numberOfLines={3}
            />
          </SectionCard>

          {/* Summary */}
          <View style={s.summary}>
            <Text style={s.summaryTitle}>Match Summary</Text>
            {[
              { icon: 'calendar-outline', text: isoToDisplay(selectedDate) },
              { icon: 'time-outline', text: selectedTime },
              { icon: 'location-outline', text: location },
              { icon: 'wallet-outline', text: `£${cost} per player` },
            ].map((row, i) => (
              <View key={i} style={s.summaryRow}>
                <Ionicons name={row.icon as any} size={15} color="rgba(255,255,255,0.6)" />
                <Text style={s.summaryText} numberOfLines={1}>{row.text}</Text>
              </View>
            ))}
            {recurring && (
              <View style={s.summaryRow}>
                <Ionicons name="repeat-outline" size={15} color={colors.accentLight} />
                <Text style={[s.summaryText, { color: colors.accentLight }]}>{recurringWeeks} weekly matches</Text>
              </View>
            )}
          </View>

          {/* Submit */}
          <TouchableOpacity
            style={[s.submitBtn, createMutation.isPending && { opacity: 0.7 }]}
            onPress={handleSubmit}
            disabled={createMutation.isPending}
            activeOpacity={0.85}
          >
            <Ionicons name={recurring ? 'repeat' : 'checkmark-circle'} size={22} color={colors.white} />
            <Text style={s.submitText}>
              {createMutation.isPending ? 'Scheduling…' : recurring ? `Schedule ${recurringWeeks} Matches` : 'Schedule Match'}
            </Text>
          </TouchableOpacity>

          <View style={{ height: spacing.xxxl }} />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Location modal */}
      <Modal visible={showLocModal} animationType="slide" transparent>
        <View style={s.overlay}>
          <View style={s.sheet}>
            <View style={s.sheetHandle} />
            <Text style={s.sheetTitle}>Select Location</Text>
            {PRESET_LOCATIONS.map(loc => (
              <TouchableOpacity
                key={loc}
                style={[s.locOption, location === loc && s.locOptionOn]}
                onPress={() => { setLocation(loc); setShowLocModal(false); }}
              >
                <Ionicons name="location" size={16} color={location === loc ? colors.primary : colors.textSecondary} />
                <Text style={[s.locText, location === loc && s.locTextOn]}>{loc}</Text>
                {location === loc && <Ionicons name="checkmark-circle" size={18} color={colors.accent} />}
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={s.cancelBtn} onPress={() => setShowLocModal(false)}>
              <Text style={s.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.backgroundSecondary },
  scroll: { flex: 1 },
  content: { padding: spacing.md },

  nav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  navBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.white, justifyContent: 'center', alignItems: 'center', ...shadows.sm },
  navTitle: { ...typography.captionBold, color: colors.primary, textTransform: 'uppercase', letterSpacing: 0.5 },

  sectionCard: { backgroundColor: colors.white, borderRadius: borderRadius.xl, padding: spacing.md, marginBottom: spacing.md, ...shadows.sm },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginBottom: spacing.md },
  sectionTitle: { ...typography.tiny, color: colors.textSecondary, fontWeight: '700', letterSpacing: 1 },

  quickRow: { flexDirection: 'row', gap: spacing.xs, marginBottom: spacing.md },
  dayChip: { flex: 1, alignItems: 'center', paddingVertical: spacing.sm, borderRadius: borderRadius.lg, backgroundColor: colors.backgroundTertiary, borderWidth: 1.5, borderColor: 'transparent' },
  dayChipOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  dayChipTop: { ...typography.tiny, color: colors.textSecondary, fontWeight: '700' },
  dayChipTopOn: { color: 'rgba(255,255,255,0.75)' },
  dayChipBot: { ...typography.captionBold, color: colors.text, marginTop: 2 },
  dayChipBotOn: { color: colors.white },

  fieldRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.backgroundSecondary, borderRadius: borderRadius.lg, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, marginBottom: spacing.sm },
  fieldLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  iconBox: { width: 36, height: 36, borderRadius: borderRadius.md, justifyContent: 'center', alignItems: 'center' },
  fieldLabel: { ...typography.tiny, color: colors.textSecondary, fontWeight: '600' },
  fieldValue: { ...typography.captionBold, color: colors.primary, marginTop: 2 },
  fieldSubtext: { ...typography.tiny, color: colors.textTertiary, marginTop: 1 },

  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, paddingTop: spacing.xs },
  chip: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: borderRadius.full, backgroundColor: colors.backgroundTertiary, borderWidth: 1.5, borderColor: 'transparent' },
  chipOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { ...typography.smallBold, color: colors.textSecondary },
  chipTextOn: { color: colors.white },

  textInput: { borderWidth: 1.5, borderColor: colors.border, borderRadius: borderRadius.lg, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, ...typography.caption, color: colors.text, marginTop: spacing.xs },

  costRow: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md },
  currency: { ...typography.h3, color: colors.text, marginRight: 4 },
  costInput: { borderWidth: 1.5, borderColor: colors.border, borderRadius: borderRadius.lg, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, ...typography.h3, color: colors.primary, width: 100, textAlign: 'center', marginRight: spacing.sm },
  costLabel: { ...typography.caption, color: colors.textSecondary },

  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.backgroundSecondary, borderRadius: borderRadius.lg, padding: spacing.md, marginBottom: spacing.sm },
  toggle: { width: 44, height: 26, borderRadius: 13, backgroundColor: colors.border, justifyContent: 'center', paddingHorizontal: 3 },
  toggleOn: { backgroundColor: colors.accent },
  thumb: { width: 20, height: 20, borderRadius: 10, backgroundColor: colors.white, ...shadows.sm },
  thumbOn: { alignSelf: 'flex-end' },

  recurBox: { backgroundColor: colors.backgroundSecondary, borderRadius: borderRadius.lg, padding: spacing.md },
  recurLabel: { ...typography.smallBold, color: colors.textSecondary, marginBottom: spacing.sm },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg, marginBottom: spacing.sm },
  stepBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.white, justifyContent: 'center', alignItems: 'center', borderWidth: 1.5, borderColor: colors.border },
  stepVal: { ...typography.h2, color: colors.primary, minWidth: 32, textAlign: 'center' },
  recurNote: { flexDirection: 'row', gap: spacing.xs, alignItems: 'flex-start' },
  recurNoteText: { ...typography.small, color: colors.textSecondary, flex: 1 },

  notesInput: { borderWidth: 1.5, borderColor: colors.border, borderRadius: borderRadius.lg, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, ...typography.body, color: colors.text, minHeight: 80, textAlignVertical: 'top' },

  summary: { backgroundColor: colors.primary, borderRadius: borderRadius.xl, padding: spacing.lg, marginBottom: spacing.md, ...shadows.md },
  summaryTitle: { ...typography.captionBold, color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: spacing.md },
  summaryRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  summaryText: { ...typography.caption, color: 'rgba(255,255,255,0.9)', flex: 1 },

  submitBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, backgroundColor: colors.accent, borderRadius: borderRadius.xl, paddingVertical: spacing.lg, marginBottom: spacing.md, ...shadows.md },
  submitText: { ...typography.h4, color: colors.white },

  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: colors.white, borderTopLeftRadius: borderRadius.xxl, borderTopRightRadius: borderRadius.xxl, padding: spacing.lg, paddingBottom: 40 },
  sheetHandle: { width: 40, height: 4, backgroundColor: colors.border, borderRadius: 2, alignSelf: 'center', marginBottom: spacing.lg },
  sheetTitle: { ...typography.h3, color: colors.primary, marginBottom: spacing.md },
  locOption: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.md, paddingHorizontal: spacing.sm, borderRadius: borderRadius.lg, marginBottom: spacing.xs, backgroundColor: colors.backgroundSecondary },
  locOptionOn: { backgroundColor: colors.primaryTint, borderWidth: 1.5, borderColor: colors.primaryLight },
  locText: { ...typography.caption, color: colors.textSecondary, flex: 1 },
  locTextOn: { color: colors.primary, fontWeight: '600' },
  cancelBtn: { marginTop: spacing.md, paddingVertical: spacing.md, borderRadius: borderRadius.lg, backgroundColor: colors.backgroundTertiary, alignItems: 'center' },
  cancelText: { ...typography.captionBold, color: colors.textSecondary },
});
