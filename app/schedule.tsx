import React, { useState, useCallback } from 'react';
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
import DateTimePicker from '@react-native-community/datetimepicker';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { colors, spacing, borderRadius, typography, shadows } from '@/constants/design';
import { createMatch, getGroup, getCurrentUser } from '@/lib/data';

// ── Common pitch locations ────────────────────────────────────────────────────
const PRESET_LOCATIONS = [
  'Hackney Marshes, Pitch 3',
  'Victoria Park, Astro 1',
  'Regent's Park, Field 2',
  'Clapham Common, Pitch 5',
  'Finsbury Park, 3G',
];

const PRESET_TIMES = ['08:00', '09:00', '10:00', '11:00', '12:00', '14:00', '16:00', '18:00', '19:00', '20:00'];

const COST_PRESETS = ['5', '6', '7', '8', '10', '12'];

// ── Helpers ───────────────────────────────────────────────────────────────────
function formatDateDisplay(date: Date) {
  return date.toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}
function formatDateISO(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
function formatTimeDisplay(date: Date) {
  return date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function ScheduleScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();

  // Form state
  const nextSunday = (() => {
    const d = new Date();
    d.setDate(d.getDate() + ((7 - d.getDay()) % 7 || 7));
    d.setHours(10, 0, 0, 0);
    return d;
  })();

  const [selectedDate, setSelectedDate] = useState(nextSunday);
  const [selectedTime, setSelectedTime] = useState(() => {
    const t = new Date(); t.setHours(10, 0, 0, 0); return t;
  });
  const [location, setLocation] = useState('Hackney Marshes, Pitch 3');
  const [costPerPlayer, setCostPerPlayer] = useState('8');
  const [notes, setNotes] = useState('');
  const [recurring, setRecurring] = useState(false);
  const [recurringWeeks, setRecurringWeeks] = useState(4);

  // Picker visibility
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [showLocationPicker, setShowLocationPicker] = useState(false);

  const { data: group } = useQuery({ queryKey: ['group'], queryFn: getGroup });
  const { data: currentUser } = useQuery({ queryKey: ['currentUser'], queryFn: getCurrentUser });

  const createMutation = useMutation({
    mutationFn: async () => {
      const groupId = group?.id ?? 'grp1';
      const dateStr = formatDateISO(selectedDate);
      const timeStr = formatTimeDisplay(selectedTime);
      const cost = parseFloat(costPerPlayer) || 0;

      if (recurring) {
        // Create multiple matches
        const promises = [];
        for (let i = 0; i < recurringWeeks; i++) {
          const d = new Date(selectedDate);
          d.setDate(d.getDate() + i * 7);
          promises.push(
            createMatch({
              groupId,
              date: formatDateISO(d),
              time: timeStr,
              location,
              costPerPlayer: cost,
            })
          );
          // Stagger slightly to avoid ID collision
          await new Promise((r) => setTimeout(r, 5));
        }
        await Promise.all(promises);
      } else {
        await createMatch({ groupId, date: dateStr, time: timeStr, location, costPerPlayer: cost });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['matches'] });
      queryClient.invalidateQueries({ queryKey: ['nextMatch'] });
      Alert.alert(
        recurring ? `${recurringWeeks} Matches Created!` : 'Match Scheduled!',
        recurring
          ? `${recurringWeeks} weekly matches have been added to the calendar.`
          : `Match on ${formatDateDisplay(selectedDate)} at ${formatTimeDisplay(selectedTime)} has been scheduled.`,
        [{ text: 'View Calendar', onPress: () => router.replace('/calendar') },
         { text: 'Done', onPress: () => router.back() }]
      );
    },
    onError: () => Alert.alert('Error', 'Could not create match. Please try again.'),
  });

  const handleSubmit = () => {
    if (!location.trim()) { Alert.alert('Location required'); return; }
    if (isNaN(parseFloat(costPerPlayer))) { Alert.alert('Enter a valid cost'); return; }
    createMutation.mutate();
  };

  const isAdmin = currentUser?.role === 'admin';

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {/* Nav */}
        <View style={styles.nav}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={22} color={colors.primary} />
          </TouchableOpacity>
          <Text style={styles.navTitle}>Schedule Match</Text>
          <TouchableOpacity style={styles.calBtn} onPress={() => router.push('/calendar')}>
            <Ionicons name="calendar-outline" size={22} color={colors.primary} />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

          {/* Date picker section */}
          <SectionCard title="Date" icon="calendar">
            <TouchableOpacity
              style={styles.pickerRow}
              onPress={() => { setShowTimePicker(false); setShowDatePicker(!showDatePicker); }}
            >
              <View style={styles.pickerLeft}>
                <View style={[styles.pickerIcon, { backgroundColor: '#EDE9FE' }]}>
                  <Ionicons name="calendar" size={18} color="#7C3AED" />
                </View>
                <View>
                  <Text style={styles.pickerLabel}>Match Date</Text>
                  <Text style={styles.pickerValue}>{formatDateDisplay(selectedDate)}</Text>
                </View>
              </View>
              <Ionicons
                name={showDatePicker ? 'chevron-up' : 'chevron-down'}
                size={18}
                color={colors.textSecondary}
              />
            </TouchableOpacity>

            {showDatePicker && (
              <View style={styles.pickerWrapper}>
                <DateTimePicker
                  value={selectedDate}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'inline' : 'default'}
                  minimumDate={new Date()}
                  onChange={(_, date) => {
                    if (date) {
                      setSelectedDate(date);
                      if (Platform.OS === 'android') setShowDatePicker(false);
                    }
                  }}
                  themeVariant="light"
                  accentColor={colors.primary}
                />
              </View>
            )}

            {/* Quick day chips */}
            <View style={styles.quickRow}>
              {getNextNDays(7).map((d) => {
                const isSelected = formatDateISO(d) === formatDateISO(selectedDate);
                return (
                  <TouchableOpacity
                    key={d.toISOString()}
                    style={[styles.dayChip, isSelected && styles.dayChipActive]}
                    onPress={() => { setSelectedDate(d); setShowDatePicker(false); }}
                  >
                    <Text style={[styles.dayChipDay, isSelected && styles.dayChipDayActive]}>
                      {d.toLocaleDateString('en-GB', { weekday: 'short' })}
                    </Text>
                    <Text style={[styles.dayChipDate, isSelected && styles.dayChipDateActive]}>
                      {d.getDate()}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </SectionCard>

          {/* Time picker section */}
          <SectionCard title="Time" icon="time">
            <TouchableOpacity
              style={styles.pickerRow}
              onPress={() => { setShowDatePicker(false); setShowTimePicker(!showTimePicker); }}
            >
              <View style={styles.pickerLeft}>
                <View style={[styles.pickerIcon, { backgroundColor: colors.accentTint }]}>
                  <Ionicons name="time" size={18} color={colors.accentDark} />
                </View>
                <View>
                  <Text style={styles.pickerLabel}>Kick-off Time</Text>
                  <Text style={styles.pickerValue}>{formatTimeDisplay(selectedTime)}</Text>
                </View>
              </View>
              <Ionicons
                name={showTimePicker ? 'chevron-up' : 'chevron-down'}
                size={18}
                color={colors.textSecondary}
              />
            </TouchableOpacity>

            {showTimePicker && Platform.OS !== 'web' && (
              <View style={styles.pickerWrapper}>
                <DateTimePicker
                  value={selectedTime}
                  mode="time"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  minuteInterval={15}
                  onChange={(_, t) => {
                    if (t) {
                      setSelectedTime(t);
                      if (Platform.OS === 'android') setShowTimePicker(false);
                    }
                  }}
                  themeVariant="light"
                  accentColor={colors.primary}
                />
              </View>
            )}

            {/* Quick time presets */}
            <View style={styles.chipWrap}>
              {PRESET_TIMES.map((t) => {
                const [h, m] = t.split(':').map(Number);
                const isSelected = selectedTime.getHours() === h && selectedTime.getMinutes() === m;
                return (
                  <TouchableOpacity
                    key={t}
                    style={[styles.timeChip, isSelected && styles.timeChipActive]}
                    onPress={() => {
                      const d = new Date(selectedTime);
                      d.setHours(h, m, 0, 0);
                      setSelectedTime(d);
                      setShowTimePicker(false);
                    }}
                  >
                    <Text style={[styles.timeChipText, isSelected && styles.timeChipTextActive]}>{t}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </SectionCard>

          {/* Location section */}
          <SectionCard title="Location" icon="location">
            <TouchableOpacity
              style={styles.pickerRow}
              onPress={() => setShowLocationPicker(true)}
            >
              <View style={styles.pickerLeft}>
                <View style={[styles.pickerIcon, { backgroundColor: '#FEE2E2' }]}>
                  <Ionicons name="location" size={18} color="#DC2626" />
                </View>
                <View style={{ flex: 1, marginRight: spacing.sm }}>
                  <Text style={styles.pickerLabel}>Pitch / Ground</Text>
                  <Text style={styles.pickerValue} numberOfLines={1}>{location}</Text>
                </View>
              </View>
              <Ionicons name="chevron-down" size={18} color={colors.textSecondary} />
            </TouchableOpacity>

            <TextInput
              style={styles.locationInput}
              value={location}
              onChangeText={setLocation}
              placeholder="Or type a custom location…"
              placeholderTextColor={colors.textTertiary}
              multiline={false}
            />
          </SectionCard>

          {/* Cost section */}
          <SectionCard title="Cost" icon="wallet">
            <View style={styles.costRow}>
              <View style={[styles.pickerIcon, { backgroundColor: '#FEF3C7', marginRight: spacing.md }]}>
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
              {COST_PRESETS.map((c) => (
                <TouchableOpacity
                  key={c}
                  style={[styles.timeChip, costPerPlayer === c && styles.timeChipActive]}
                  onPress={() => setCostPerPlayer(c)}
                >
                  <Text style={[styles.timeChipText, costPerPlayer === c && styles.timeChipTextActive]}>£{c}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </SectionCard>

          {/* Recurring section */}
          <SectionCard title="Recurring" icon="repeat">
            <TouchableOpacity
              style={styles.toggleRow}
              onPress={() => setRecurring(!recurring)}
              activeOpacity={0.8}
            >
              <View style={styles.pickerLeft}>
                <View style={[styles.pickerIcon, { backgroundColor: colors.primaryTint }]}>
                  <Ionicons name="repeat" size={18} color={colors.primary} />
                </View>
                <View>
                  <Text style={styles.pickerLabel}>Weekly Recurring</Text>
                  <Text style={styles.pickerSubtext}>Create multiple matches at once</Text>
                </View>
              </View>
              <View style={[styles.toggle, recurring && styles.toggleActive]}>
                <View style={[styles.toggleThumb, recurring && styles.toggleThumbActive]} />
              </View>
            </TouchableOpacity>

            {recurring && (
              <View style={styles.recurringConfig}>
                <Text style={styles.recurringLabel}>Number of weeks</Text>
                <View style={styles.weekStepper}>
                  <TouchableOpacity
                    style={styles.stepperBtn}
                    onPress={() => setRecurringWeeks(Math.max(2, recurringWeeks - 1))}
                  >
                    <Ionicons name="remove" size={20} color={colors.primary} />
                  </TouchableOpacity>
                  <Text style={styles.stepperValue}>{recurringWeeks}</Text>
                  <TouchableOpacity
                    style={styles.stepperBtn}
                    onPress={() => setRecurringWeeks(Math.min(12, recurringWeeks + 1))}
                  >
                    <Ionicons name="add" size={20} color={colors.primary} />
                  </TouchableOpacity>
                </View>
                <View style={styles.recurringPreview}>
                  <Ionicons name="information-circle-outline" size={14} color={colors.textSecondary} />
                  <Text style={styles.recurringPreviewText}>
                    {recurringWeeks} matches will be created, every Sunday from {formatDateDisplay(selectedDate)}
                  </Text>
                </View>
              </View>
            )}
          </SectionCard>

          {/* Notes section */}
          <SectionCard title="Notes (optional)" icon="document-text">
            <TextInput
              style={styles.notesInput}
              value={notes}
              onChangeText={setNotes}
              placeholder="e.g. Bring bibs, bring cash for ref…"
              placeholderTextColor={colors.textTertiary}
              multiline
              numberOfLines={3}
            />
          </SectionCard>

          {/* Summary preview */}
          <View style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>Match Summary</Text>
            <View style={styles.summaryRow}>
              <Ionicons name="calendar-outline" size={15} color={colors.textSecondary} />
              <Text style={styles.summaryText}>{formatDateDisplay(selectedDate)}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Ionicons name="time-outline" size={15} color={colors.textSecondary} />
              <Text style={styles.summaryText}>{formatTimeDisplay(selectedTime)}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Ionicons name="location-outline" size={15} color={colors.textSecondary} />
              <Text style={styles.summaryText} numberOfLines={1}>{location}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Ionicons name="wallet-outline" size={15} color={colors.textSecondary} />
              <Text style={styles.summaryText}>£{costPerPlayer} per player</Text>
            </View>
            {recurring && (
              <View style={styles.summaryRow}>
                <Ionicons name="repeat-outline" size={15} color={colors.accent} />
                <Text style={[styles.summaryText, { color: colors.accentDark }]}>{recurringWeeks} weekly matches</Text>
              </View>
            )}
          </View>

          {/* Submit */}
          <TouchableOpacity
            style={[styles.submitBtn, createMutation.isPending && styles.submitBtnLoading]}
            onPress={handleSubmit}
            disabled={createMutation.isPending}
            activeOpacity={0.85}
          >
            <Ionicons name={recurring ? 'repeat' : 'checkmark-circle'} size={20} color={colors.white} />
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

      {/* Location preset modal */}
      <Modal visible={showLocationPicker} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Select Location</Text>
            {PRESET_LOCATIONS.map((loc) => (
              <TouchableOpacity
                key={loc}
                style={[styles.locationOption, location === loc && styles.locationOptionActive]}
                onPress={() => { setLocation(loc); setShowLocationPicker(false); }}
              >
                <Ionicons
                  name="location"
                  size={16}
                  color={location === loc ? colors.primary : colors.textSecondary}
                />
                <Text style={[styles.locationOptionText, location === loc && styles.locationOptionTextActive]}>
                  {loc}
                </Text>
                {location === loc && <Ionicons name="checkmark-circle" size={18} color={colors.accent} />}
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setShowLocationPicker(false)}>
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────
function SectionCard({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
  return (
    <View style={styles.sectionCard}>
      <View style={styles.sectionHeader}>
        <Ionicons name={icon as any} size={14} color={colors.textSecondary} />
        <Text style={styles.sectionTitle}>{title.toUpperCase()}</Text>
      </View>
      {children}
    </View>
  );
}

// ── Utility ───────────────────────────────────────────────────────────────────
function getNextNDays(n: number) {
  const days: Date[] = [];
  for (let i = 0; i < n; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    d.setHours(0, 0, 0, 0);
    days.push(d);
  }
  return days;
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.backgroundSecondary },
  scroll: { flex: 1 },
  scrollContent: { padding: spacing.md },

  nav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: colors.white,
    justifyContent: 'center', alignItems: 'center',
    ...shadows.sm,
  },
  calBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: colors.white,
    justifyContent: 'center', alignItems: 'center',
    ...shadows.sm,
  },
  navTitle: { ...typography.captionBold, color: colors.primary, textTransform: 'uppercase', letterSpacing: 0.5 },

  // Section cards
  sectionCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.xl,
    padding: spacing.md,
    marginBottom: spacing.md,
    ...shadows.sm,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  sectionTitle: { ...typography.tiny, color: colors.textSecondary, fontWeight: '700', letterSpacing: 1 },

  // Picker row
  pickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.backgroundSecondary,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  pickerLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, flex: 1 },
  pickerIcon: { width: 36, height: 36, borderRadius: borderRadius.md, justifyContent: 'center', alignItems: 'center' },
  pickerLabel: { ...typography.tiny, color: colors.textSecondary, fontWeight: '600' },
  pickerValue: { ...typography.captionBold, color: colors.primary, marginTop: 2 },
  pickerSubtext: { ...typography.tiny, color: colors.textTertiary, marginTop: 1 },

  pickerWrapper: {
    backgroundColor: colors.backgroundSecondary,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    marginBottom: spacing.md,
  },

  // Day chips
  quickRow: { flexDirection: 'row', gap: spacing.xs },
  dayChip: {
    flex: 1, alignItems: 'center', paddingVertical: spacing.sm,
    borderRadius: borderRadius.lg, backgroundColor: colors.backgroundTertiary,
    borderWidth: 1.5, borderColor: 'transparent',
  },
  dayChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  dayChipDay: { ...typography.tiny, color: colors.textSecondary, fontWeight: '600' },
  dayChipDayActive: { color: 'rgba(255,255,255,0.75)' },
  dayChipDate: { ...typography.captionBold, color: colors.text, marginTop: 2 },
  dayChipDateActive: { color: colors.white },

  // Time chips
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  timeChip: {
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    borderRadius: borderRadius.full, backgroundColor: colors.backgroundTertiary,
    borderWidth: 1.5, borderColor: 'transparent',
  },
  timeChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  timeChipText: { ...typography.smallBold, color: colors.textSecondary },
  timeChipTextActive: { color: colors.white },

  // Location
  locationInput: {
    borderWidth: 1.5, borderColor: colors.border,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    marginTop: spacing.xs,
    ...typography.caption, color: colors.text,
  },

  // Cost
  costRow: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md },
  costCurrency: { ...typography.h3, color: colors.text, marginRight: 4 },
  costInput: {
    borderWidth: 1.5, borderColor: colors.border,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    ...typography.h3, color: colors.primary, width: 100, textAlign: 'center',
    marginRight: spacing.sm,
  },
  costLabel: { ...typography.caption, color: colors.textSecondary },

  // Toggle
  toggleRow: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.backgroundSecondary,
    borderRadius: borderRadius.lg, padding: spacing.md,
    marginBottom: spacing.md,
  },
  toggle: {
    width: 44, height: 26, borderRadius: 13,
    backgroundColor: colors.border,
    justifyContent: 'center', paddingHorizontal: 3,
  },
  toggleActive: { backgroundColor: colors.accent },
  toggleThumb: { width: 20, height: 20, borderRadius: 10, backgroundColor: colors.white, ...shadows.sm },
  toggleThumbActive: { alignSelf: 'flex-end' },

  // Recurring config
  recurringConfig: {
    backgroundColor: colors.backgroundSecondary,
    borderRadius: borderRadius.lg, padding: spacing.md,
  },
  recurringLabel: { ...typography.smallBold, color: colors.textSecondary, marginBottom: spacing.sm },
  weekStepper: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg, marginBottom: spacing.sm },
  stepperBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: colors.white,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1.5, borderColor: colors.border,
  },
  stepperValue: { ...typography.h2, color: colors.primary, minWidth: 32, textAlign: 'center' },
  recurringPreview: { flexDirection: 'row', gap: spacing.xs, alignItems: 'flex-start' },
  recurringPreviewText: { ...typography.small, color: colors.textSecondary, flex: 1 },

  // Notes
  notesInput: {
    borderWidth: 1.5, borderColor: colors.border,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    ...typography.body, color: colors.text, minHeight: 80, textAlignVertical: 'top',
  },

  // Summary card
  summaryCard: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    marginBottom: spacing.md,
    ...shadows.md,
  },
  summaryTitle: { ...typography.captionBold, color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: spacing.md },
  summaryRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  summaryText: { ...typography.caption, color: 'rgba(255,255,255,0.9)', flex: 1 },

  // Submit
  submitBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: spacing.sm, backgroundColor: colors.accent,
    borderRadius: borderRadius.xl, paddingVertical: spacing.lg,
    marginBottom: spacing.md, ...shadows.md,
  },
  submitBtnLoading: { opacity: 0.7 },
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
  locationOption: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    paddingVertical: spacing.md, paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.lg, marginBottom: spacing.xs,
    backgroundColor: colors.backgroundSecondary,
  },
  locationOptionActive: { backgroundColor: colors.primaryTint, borderWidth: 1.5, borderColor: colors.primaryLight },
  locationOptionText: { ...typography.caption, color: colors.textSecondary, flex: 1 },
  locationOptionTextActive: { color: colors.primary, fontWeight: '600' },
  modalCancelBtn: {
    marginTop: spacing.md, paddingVertical: spacing.md,
    borderRadius: borderRadius.lg, backgroundColor: colors.backgroundTertiary,
    alignItems: 'center',
  },
  modalCancelText: { ...typography.captionBold, color: colors.textSecondary },
});
