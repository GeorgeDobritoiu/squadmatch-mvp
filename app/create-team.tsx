/**
 * Create Team Screen
 * Form to create a new sports team/group with name, sport type,
 * location, description, and an invite-members step.
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
  KeyboardAvoidingView,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { colors, spacing, borderRadius, typography, shadows } from '@/constants/design';
import { createGroup, getPlayers } from '@/lib/data';

// ── Sport options ─────────────────────────────────────────────────────────────
const SPORTS = [
  { id: 'football',   label: 'Football',   icon: 'football',           color: '#16A34A', bg: '#DCFCE7' },
  { id: 'basketball', label: 'Basketball', icon: 'basketball',         color: '#EA580C', bg: '#FEF3C7' },
  { id: 'tennis',     label: 'Tennis',     icon: 'tennisball',         color: '#D97706', bg: '#FEF9C3' },
  { id: 'rugby',      label: 'Rugby',      icon: 'american-football',  color: '#7C3AED', bg: '#EDE9FE' },
  { id: 'cricket',    label: 'Cricket',    icon: 'baseball',           color: '#0369A1', bg: '#E0F2FE' },
  { id: 'hockey',     label: 'Hockey',     icon: 'golf',               color: '#0F766E', bg: '#CCFBF1' },
  { id: 'volleyball', label: 'Volleyball', icon: 'planet',             color: '#C026D3', bg: '#FAE8FF' },
  { id: 'other',      label: 'Other',      icon: 'trophy',             color: '#6B7280', bg: '#F1F5F9' },
];

// ── Format options ────────────────────────────────────────────────────────────
const FORMATS: Record<string, string[]> = {
  football:   ['5-a-side', '6-a-side', '7-a-side', '9-a-side', '11-a-side'],
  basketball: ['3x3', '5x5'],
  tennis:     ['Singles', 'Doubles', 'Mixed Doubles'],
  rugby:      ['7s', '10s', 'Full 15s'],
  cricket:    ['T20', 'ODI', 'Test-style'],
  hockey:     ['6-a-side', '8-a-side', 'Full 11-a-side'],
  volleyball: ['4-a-side', '6-a-side', 'Beach 2-a-side'],
  other:      ['Casual', 'Competitive', 'Tournament'],
};

// ── Frequency options ─────────────────────────────────────────────────────────
const FREQUENCIES = ['Weekly', 'Bi-weekly', 'Monthly', 'Ad hoc'];

// ── Step indicator ────────────────────────────────────────────────────────────
function StepIndicator({ current, total }: { current: number; total: number }) {
  return (
    <View style={si.row}>
      {Array.from({ length: total }).map((_, i) => (
        <React.Fragment key={i}>
          <View style={[si.dot, i < current && si.dotDone, i === current - 1 && si.dotActive]}>
            {i < current - 1 ? (
              <Ionicons name="checkmark" size={10} color={colors.white} />
            ) : (
              <Text style={[si.dotLabel, i === current - 1 && si.dotLabelActive]}>{i + 1}</Text>
            )}
          </View>
          {i < total - 1 && <View style={[si.line, i < current - 1 && si.lineDone]} />}
        </React.Fragment>
      ))}
    </View>
  );
}

const si = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: spacing.lg },
  dot: { width: 28, height: 28, borderRadius: 14, backgroundColor: colors.backgroundTertiary, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: colors.border },
  dotActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  dotDone: { backgroundColor: colors.accent, borderColor: colors.accent },
  dotLabel: { ...typography.tiny, color: colors.textSecondary, fontWeight: '700' },
  dotLabelActive: { color: colors.white },
  line: { flex: 1, height: 2, backgroundColor: colors.border, marginHorizontal: spacing.xs },
  lineDone: { backgroundColor: colors.accent },
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

// ── Member invite row ─────────────────────────────────────────────────────────
function InviteRow({
  player,
  invited,
  onToggle,
}: {
  player: any;
  invited: boolean;
  onToggle: () => void;
}) {
  const posColors: Record<string, string> = {
    Goalkeeper: '#7C3AED', Defender: '#2563EB', Midfielder: '#D97706', Striker: '#DC2626', Any: '#6B7280',
  };
  return (
    <TouchableOpacity style={[styles.inviteRow, invited && styles.inviteRowOn]} onPress={onToggle} activeOpacity={0.85}>
      <View style={[styles.inviteAvatar, { backgroundColor: invited ? colors.primary : '#E8EDF2' }]}>
        <Text style={[styles.inviteAvatarText, { color: invited ? colors.white : colors.primary }]}>
          {player.name.charAt(0)}
        </Text>
      </View>
      <View style={styles.inviteInfo}>
        <Text style={styles.inviteName}>{player.name}</Text>
        <View style={styles.inviteMeta}>
          <View style={[styles.inviteDot, { backgroundColor: posColors[player.position] ?? '#6B7280' }]} />
          <Text style={styles.invitePos}>{player.position} · {player.skillLevel}</Text>
        </View>
      </View>
      <View style={[styles.checkBox, invited && styles.checkBoxOn]}>
        {invited && <Ionicons name="checkmark" size={14} color={colors.white} />}
      </View>
    </TouchableOpacity>
  );
}

// ── Main Screen ───────────────────────────────────────────────────────────────
export default function CreateTeamScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();

  // Step state
  const [step, setStep] = useState(1);
  const TOTAL_STEPS = 3;

  // Step 1 — Team identity
  const [teamName, setTeamName] = useState('');
  const [sport, setSport] = useState<string | null>(null);
  const [format, setFormat] = useState<string | null>(null);
  const [frequency, setFrequency] = useState('Weekly');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');

  // Step 3 — Members
  const [invitedIds, setInvitedIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);

  const { data: players = [] } = useQuery({ queryKey: ['players'], queryFn: getPlayers });

  const filteredPlayers = useMemo(() =>
    players.filter(p =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.position.toLowerCase().includes(searchQuery.toLowerCase())
    ), [players, searchQuery]);

  const selectedSport = SPORTS.find(s => s.id === sport);
  const formatOptions = sport ? FORMATS[sport] : [];

  const createMutation = useMutation({
    mutationFn: async () => {
      await createGroup({
        name: teamName.trim(),
        sport: sport ?? 'other',
        format: format ?? '',
        frequency,
        location: location.trim(),
        description: description.trim(),
        memberIds: Array.from(invitedIds),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['group'] });
      queryClient.invalidateQueries({ queryKey: ['players'] });
      setShowSuccess(true);
    },
    onError: () => Alert.alert('Error', 'Could not create team. Please try again.'),
  });

  // Validation per step
  const canProceed = useMemo(() => {
    if (step === 1) return teamName.trim().length >= 2 && sport !== null;
    if (step === 2) return location.trim().length >= 2;
    return true;
  }, [step, teamName, sport, location]);

  const goNext = () => {
    if (step < TOTAL_STEPS) setStep(s => s + 1);
    else createMutation.mutate();
  };

  const goBack = () => {
    if (step > 1) setStep(s => s - 1);
    else router.back();
  };

  const toggleInvite = (id: string) => {
    setInvitedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const selectAllToggle = () => {
    if (invitedIds.size === filteredPlayers.length) {
      setInvitedIds(new Set());
    } else {
      setInvitedIds(new Set(filteredPlayers.map(p => p.id)));
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {/* Nav */}
        <View style={styles.nav}>
          <TouchableOpacity style={styles.navBtn} onPress={goBack}>
            <Ionicons name={step === 1 ? 'close' : 'arrow-back'} size={22} color={colors.primary} />
          </TouchableOpacity>
          <Text style={styles.navTitle}>
            {step === 1 ? 'Create Team' : step === 2 ? 'Team Details' : 'Invite Members'}
          </Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Step indicator */}
        <View style={styles.stepWrap}>
          <StepIndicator current={step} total={TOTAL_STEPS} />
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* ══ STEP 1 — Identity ══ */}
          {step === 1 && (
            <>
              <SectionCard title="Team Name" icon="people">
                <TextInput
                  style={styles.textInput}
                  value={teamName}
                  onChangeText={setTeamName}
                  placeholder="e.g. Sunday Warriors FC"
                  placeholderTextColor={colors.textTertiary}
                  maxLength={40}
                  autoFocus
                />
                <Text style={styles.charCount}>{teamName.length}/40</Text>
              </SectionCard>

              <SectionCard title="Sport Type" icon="trophy">
                <View style={styles.sportGrid}>
                  {SPORTS.map(s => (
                    <TouchableOpacity
                      key={s.id}
                      style={[styles.sportCard, sport === s.id && { borderColor: s.color, backgroundColor: s.bg }]}
                      onPress={() => { setSport(s.id); setFormat(null); }}
                      activeOpacity={0.8}
                    >
                      <View style={[styles.sportIcon, { backgroundColor: sport === s.id ? s.color : colors.backgroundTertiary }]}>
                        <Ionicons name={s.icon as any} size={20} color={sport === s.id ? colors.white : colors.textSecondary} />
                      </View>
                      <Text style={[styles.sportLabel, sport === s.id && { color: s.color, fontWeight: '700' }]}>
                        {s.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </SectionCard>

              {sport && formatOptions.length > 0 && (
                <SectionCard title="Format" icon="layers">
                  <View style={styles.chipWrap}>
                    {formatOptions.map(f => (
                      <TouchableOpacity
                        key={f}
                        style={[styles.chip, format === f && styles.chipOn]}
                        onPress={() => setFormat(f)}
                      >
                        <Text style={[styles.chipText, format === f && styles.chipTextOn]}>{f}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </SectionCard>
              )}

              <SectionCard title="Match Frequency" icon="repeat">
                <View style={styles.chipWrap}>
                  {FREQUENCIES.map(f => (
                    <TouchableOpacity
                      key={f}
                      style={[styles.chip, frequency === f && styles.chipOn]}
                      onPress={() => setFrequency(f)}
                    >
                      <Text style={[styles.chipText, frequency === f && styles.chipTextOn]}>{f}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </SectionCard>
            </>
          )}

          {/* ══ STEP 2 — Details ══ */}
          {step === 2 && (
            <>
              {/* Sport summary badge */}
              {selectedSport && (
                <View style={[styles.sportBadge, { backgroundColor: selectedSport.bg }]}>
                  <View style={[styles.sportBadgeIcon, { backgroundColor: selectedSport.color }]}>
                    <Ionicons name={selectedSport.icon as any} size={18} color={colors.white} />
                  </View>
                  <Text style={[styles.sportBadgeText, { color: selectedSport.color }]}>
                    {teamName} · {selectedSport.label}{format ? ` · ${format}` : ''}
                  </Text>
                </View>
              )}

              <SectionCard title="Location / Home Ground" icon="location">
                <TextInput
                  style={styles.textInput}
                  value={location}
                  onChangeText={setLocation}
                  placeholder="e.g. Hackney Marshes, Pitch 3"
                  placeholderTextColor={colors.textTertiary}
                />
              </SectionCard>

              <SectionCard title="Description (optional)" icon="document-text">
                <TextInput
                  style={styles.notesInput}
                  value={description}
                  onChangeText={setDescription}
                  placeholder="Tell members what this team is about…"
                  placeholderTextColor={colors.textTertiary}
                  multiline
                  numberOfLines={4}
                  maxLength={200}
                />
                <Text style={styles.charCount}>{description.length}/200</Text>
              </SectionCard>

              <SectionCard title="Visibility" icon="eye">
                {[
                  { id: 'private', label: 'Private', sub: 'Only invited members can join', icon: 'lock-closed' },
                  { id: 'public',  label: 'Public',  sub: 'Anyone can find and request to join', icon: 'globe' },
                ].map(opt => (
                  <TouchableOpacity key={opt.id} style={styles.visRow} activeOpacity={0.8}>
                    <View style={[styles.visIconBox, { backgroundColor: colors.backgroundTertiary }]}>
                      <Ionicons name={opt.icon as any} size={18} color={colors.primary} />
                    </View>
                    <View style={styles.visInfo}>
                      <Text style={styles.visLabel}>{opt.label}</Text>
                      <Text style={styles.visSub}>{opt.sub}</Text>
                    </View>
                    <View style={[styles.radio, opt.id === 'private' && styles.radioOn]}>
                      {opt.id === 'private' && <View style={styles.radioDot} />}
                    </View>
                  </TouchableOpacity>
                ))}
              </SectionCard>
            </>
          )}

          {/* ══ STEP 3 — Invite Members ══ */}
          {step === 3 && (
            <>
              <View style={styles.inviteHeader}>
                <Text style={styles.inviteHeadTitle}>Who's on the team?</Text>
                <Text style={styles.inviteHeadSub}>Select players from your existing roster to invite. You can always add more later.</Text>
              </View>

              {/* Search */}
              <View style={styles.searchBox}>
                <Ionicons name="search" size={16} color={colors.textTertiary} />
                <TextInput
                  style={styles.searchInput}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  placeholder="Search players…"
                  placeholderTextColor={colors.textTertiary}
                />
                {searchQuery.length > 0 && (
                  <TouchableOpacity onPress={() => setSearchQuery('')}>
                    <Ionicons name="close-circle" size={16} color={colors.textTertiary} />
                  </TouchableOpacity>
                )}
              </View>

              {/* Select all */}
              <TouchableOpacity style={styles.selectAllRow} onPress={selectAllToggle}>
                <Text style={styles.selectAllText}>
                  {invitedIds.size === filteredPlayers.length && filteredPlayers.length > 0
                    ? 'Deselect all'
                    : `Select all (${filteredPlayers.length})`}
                </Text>
                <Text style={styles.selectedCount}>{invitedIds.size} selected</Text>
              </TouchableOpacity>

              {/* Player list */}
              <View style={styles.playerList}>
                {filteredPlayers.length === 0 ? (
                  <View style={styles.emptySearch}>
                    <Ionicons name="person-outline" size={28} color={colors.textTertiary} />
                    <Text style={styles.emptySearchText}>No players found</Text>
                  </View>
                ) : (
                  filteredPlayers.map(player => (
                    <InviteRow
                      key={player.id}
                      player={player}
                      invited={invitedIds.has(player.id)}
                      onToggle={() => toggleInvite(player.id)}
                    />
                  ))
                )}
              </View>

              {/* Invite via link */}
              <TouchableOpacity style={styles.inviteLinkBtn}>
                <Ionicons name="link" size={18} color={colors.accent} />
                <Text style={styles.inviteLinkText}>Copy invite link</Text>
              </TouchableOpacity>
            </>
          )}

          <View style={{ height: spacing.xxxl }} />
        </ScrollView>

        {/* Bottom CTA */}
        <View style={styles.bottomBar}>
          <View style={styles.stepLabel}>
            <Text style={styles.stepLabelText}>Step {step} of {TOTAL_STEPS}</Text>
          </View>
          <TouchableOpacity
            style={[styles.ctaBtn, (!canProceed || createMutation.isPending) && styles.ctaBtnDisabled]}
            onPress={goNext}
            disabled={!canProceed || createMutation.isPending}
            activeOpacity={0.85}
          >
            <Text style={styles.ctaBtnText}>
              {createMutation.isPending
                ? 'Creating…'
                : step < TOTAL_STEPS
                ? 'Continue'
                : `Create Team${invitedIds.size > 0 ? ` & Invite ${invitedIds.size}` : ''}`}
            </Text>
            {!createMutation.isPending && (
              <Ionicons
                name={step < TOTAL_STEPS ? 'arrow-forward' : 'checkmark-circle'}
                size={20}
                color={colors.white}
              />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* Success modal */}
      <Modal visible={showSuccess} animationType="fade" transparent>
        <View style={styles.successOverlay}>
          <View style={styles.successCard}>
            <View style={[styles.successIcon, { backgroundColor: colors.accentTint }]}>
              <Ionicons name="checkmark-circle" size={48} color={colors.accent} />
            </View>
            <Text style={styles.successTitle}>Team Created!</Text>
            <Text style={styles.successSub}>
              <Text style={{ fontWeight: '700', color: colors.primary }}>{teamName}</Text>
              {' '}is ready.{invitedIds.size > 0 ? ` ${invitedIds.size} member${invitedIds.size > 1 ? 's' : ''} invited.` : ''}
            </Text>

            <View style={styles.successSummary}>
              {selectedSport && (
                <View style={styles.successRow}>
                  <Ionicons name={selectedSport.icon as any} size={16} color={selectedSport.color} />
                  <Text style={styles.successRowText}>{selectedSport.label}{format ? ` · ${format}` : ''}</Text>
                </View>
              )}
              {location.trim() && (
                <View style={styles.successRow}>
                  <Ionicons name="location-outline" size={16} color={colors.textSecondary} />
                  <Text style={styles.successRowText}>{location.trim()}</Text>
                </View>
              )}
              <View style={styles.successRow}>
                <Ionicons name="repeat-outline" size={16} color={colors.textSecondary} />
                <Text style={styles.successRowText}>{frequency}</Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.successBtn}
              onPress={() => { setShowSuccess(false); router.replace('/(tabs)/group'); }}
            >
              <Text style={styles.successBtnText}>View My Team</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.successSecondBtn}
              onPress={() => { setShowSuccess(false); router.replace('/schedule'); }}
            >
              <Text style={styles.successSecondBtnText}>Schedule First Match</Text>
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
  content: { paddingHorizontal: spacing.md, paddingBottom: spacing.md },

  nav: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
  },
  navBtn: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: colors.white,
    justifyContent: 'center', alignItems: 'center', ...shadows.sm,
  },
  navTitle: { ...typography.captionBold, color: colors.primary, textTransform: 'uppercase', letterSpacing: 0.5 },

  stepWrap: { paddingHorizontal: spacing.lg, paddingBottom: spacing.sm },

  sectionCard: {
    backgroundColor: colors.white, borderRadius: borderRadius.xl,
    padding: spacing.md, marginBottom: spacing.md, ...shadows.sm,
  },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginBottom: spacing.md },
  sectionTitle: { ...typography.tiny, color: colors.textSecondary, fontWeight: '700', letterSpacing: 1 },

  textInput: {
    borderWidth: 1.5, borderColor: colors.border, borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md, paddingVertical: spacing.md,
    ...typography.h4, color: colors.text,
  },
  charCount: { ...typography.tiny, color: colors.textTertiary, textAlign: 'right', marginTop: spacing.xs },

  // Sport grid
  sportGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  sportCard: {
    width: '22%', alignItems: 'center', paddingVertical: spacing.md,
    borderRadius: borderRadius.xl, backgroundColor: colors.backgroundSecondary,
    borderWidth: 2, borderColor: 'transparent', gap: spacing.xs,
  },
  sportIcon: { width: 40, height: 40, borderRadius: borderRadius.lg, justifyContent: 'center', alignItems: 'center' },
  sportLabel: { ...typography.tiny, color: colors.textSecondary, fontWeight: '600', textAlign: 'center' },

  // Chips
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    borderRadius: borderRadius.full, backgroundColor: colors.backgroundTertiary,
    borderWidth: 1.5, borderColor: 'transparent',
  },
  chipOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { ...typography.smallBold, color: colors.textSecondary },
  chipTextOn: { color: colors.white },

  // Step 2
  sportBadge: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    borderRadius: borderRadius.xl, marginBottom: spacing.md,
  },
  sportBadgeIcon: { width: 32, height: 32, borderRadius: borderRadius.md, justifyContent: 'center', alignItems: 'center' },
  sportBadgeText: { ...typography.captionBold, flex: 1 },

  notesInput: {
    borderWidth: 1.5, borderColor: colors.border, borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    ...typography.body, color: colors.text, minHeight: 90, textAlignVertical: 'top',
  },

  // Visibility
  visRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.backgroundTertiary,
  },
  visIconBox: { width: 36, height: 36, borderRadius: borderRadius.md, justifyContent: 'center', alignItems: 'center' },
  visInfo: { flex: 1 },
  visLabel: { ...typography.captionBold, color: colors.text },
  visSub: { ...typography.tiny, color: colors.textSecondary, marginTop: 2 },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: colors.border, justifyContent: 'center', alignItems: 'center' },
  radioOn: { borderColor: colors.primary },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.primary },

  // Step 3
  inviteHeader: { marginBottom: spacing.md },
  inviteHeadTitle: { ...typography.h3, color: colors.primary, marginBottom: spacing.xs },
  inviteHeadSub: { ...typography.caption, color: colors.textSecondary },

  searchBox: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    backgroundColor: colors.white, borderRadius: borderRadius.xl,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    marginBottom: spacing.sm, ...shadows.xs,
  },
  searchInput: { flex: 1, ...typography.caption, color: colors.text },

  selectAllRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.xs, marginBottom: spacing.sm,
  },
  selectAllText: { ...typography.smallBold, color: colors.primary },
  selectedCount: { ...typography.caption, color: colors.textSecondary },

  playerList: { gap: spacing.xs, marginBottom: spacing.md },

  inviteRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    backgroundColor: colors.white, borderRadius: borderRadius.lg,
    padding: spacing.md, borderWidth: 1.5, borderColor: 'transparent', ...shadows.xs,
  },
  inviteRowOn: { borderColor: colors.primary, backgroundColor: colors.primaryTint },
  inviteAvatar: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  inviteAvatarText: { ...typography.bodyBold },
  inviteInfo: { flex: 1 },
  inviteName: { ...typography.captionBold, color: colors.text },
  inviteMeta: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 3 },
  inviteDot: { width: 7, height: 7, borderRadius: 3.5 },
  invitePos: { ...typography.small, color: colors.textSecondary },
  checkBox: {
    width: 24, height: 24, borderRadius: 12,
    borderWidth: 2, borderColor: colors.border, backgroundColor: colors.white,
    justifyContent: 'center', alignItems: 'center',
  },
  checkBoxOn: { backgroundColor: colors.primary, borderColor: colors.primary },

  inviteLinkBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: spacing.sm, paddingVertical: spacing.md,
    borderRadius: borderRadius.xl, borderWidth: 1.5, borderColor: colors.accent,
    backgroundColor: colors.accentTint,
  },
  inviteLinkText: { ...typography.captionBold, color: colors.accentDark },

  emptySearch: { padding: spacing.xl, alignItems: 'center', gap: spacing.sm },
  emptySearchText: { ...typography.caption, color: colors.textSecondary },

  // Bottom bar
  bottomBar: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    paddingHorizontal: spacing.md, paddingVertical: spacing.md,
    backgroundColor: colors.white, borderTopWidth: 1, borderTopColor: colors.backgroundTertiary,
  },
  stepLabel: { paddingHorizontal: spacing.sm },
  stepLabelText: { ...typography.tiny, color: colors.textTertiary, fontWeight: '700' },
  ctaBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: spacing.sm, backgroundColor: colors.accent,
    borderRadius: borderRadius.xl, paddingVertical: spacing.md, ...shadows.sm,
  },
  ctaBtnDisabled: { opacity: 0.45 },
  ctaBtnText: { ...typography.captionBold, color: colors.white, fontSize: 15 },

  // Success modal
  successOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: spacing.lg },
  successCard: {
    backgroundColor: colors.white, borderRadius: borderRadius.xxl,
    padding: spacing.xl, alignItems: 'center', width: '100%', ...shadows.xl,
  },
  successIcon: { width: 80, height: 80, borderRadius: 40, justifyContent: 'center', alignItems: 'center', marginBottom: spacing.md },
  successTitle: { ...typography.h2, color: colors.primary, marginBottom: spacing.sm },
  successSub: { ...typography.caption, color: colors.textSecondary, textAlign: 'center', marginBottom: spacing.lg },
  successSummary: { width: '100%', gap: spacing.sm, marginBottom: spacing.lg },
  successRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  successRowText: { ...typography.caption, color: colors.textSecondary },
  successBtn: {
    width: '100%', backgroundColor: colors.primary,
    borderRadius: borderRadius.xl, paddingVertical: spacing.md,
    alignItems: 'center', marginBottom: spacing.sm,
  },
  successBtnText: { ...typography.captionBold, color: colors.white },
  successSecondBtn: {
    width: '100%', backgroundColor: colors.accentTint,
    borderRadius: borderRadius.xl, paddingVertical: spacing.md,
    alignItems: 'center', borderWidth: 1.5, borderColor: colors.accent,
  },
  successSecondBtnText: { ...typography.captionBold, color: colors.accentDark },
});
