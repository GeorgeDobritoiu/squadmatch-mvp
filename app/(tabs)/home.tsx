/**
 * SquadPlay — Home Screen (redesign)
 *
 * Sections (in order):
 *  1. Squad switcher header
 *  2. Next match hero card + attendance
 *  3. Your team (if generated)
 *  4. Payment status
 *  5. Admin actions (admin only)
 *  6. Quick actions
 *
 * Empty states:
 *  - No squad yet
 *  - No match scheduled
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
  Modal,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { colors, spacing, borderRadius, typography, shadows } from '@/constants/design';
import {
  getNextMatch,
  getCurrentUser,
  getAttendance,
  getPayments,
  getGroup,
  getUserGroups,
  getPlayers,
  upsertAttendance,
  markPayment,
} from '@/lib/data';
import AddGuestModal from '@/components/AddGuestModal';

// ── Tokens ────────────────────────────────────────────────────────────────────

const GREEN       = '#22C55E';
const GREEN_DARK  = '#16A34A';
const GREEN_TINT  = '#F0FDF4';
const GREEN_BDR   = '#BBF7D0';
const RED         = '#EF4444';
const RED_DARK    = '#DC2626';
const RED_TINT    = '#FEF2F2';
const RED_BDR     = '#FECACA';
const AMBER       = '#F59E0B';
const AMBER_TINT  = '#FFFBEB';
const AMBER_BDR   = '#FDE68A';
const NAVY        = '#0F2027';
const GREY_BG     = '#F6F8FA';
const GREY_CARD   = '#FFFFFF';
const GREY_BORDER = '#E2E8F0';
const GREY_TEXT   = '#5D7A8A';
const GREY_LIGHT  = '#EEF2F5';
const PURPLE      = '#7C3AED';
const PURPLE_TINT = '#EDE9FE';

// ── Helpers ───────────────────────────────────────────────────────────────────

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

function formatMatchDate(date: string) {
  const d = new Date(date + 'T12:00:00');
  return d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
}

function daysUntil(date: string) {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const match = new Date(date + 'T00:00:00');
  const diff  = Math.round((match.getTime() - today.getTime()) / 86400000);
  if (diff === 0)  return 'Today';
  if (diff === 1)  return 'Tomorrow';
  if (diff < 0)   return 'Past';
  return `In ${diff} days`;
}

function avatarBg(name: string) {
  const palette = ['#C8DCE8','#BBF7D0','#FDE68A','#FECACA','#DDD6FE','#FED7AA'];
  return palette[name.charCodeAt(0) % palette.length];
}

// ── Avatar ────────────────────────────────────────────────────────────────────

function Avatar({ name, size = 36, style }: { name: string; size?: number; style?: any }) {
  const initials = name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();
  return (
    <View style={[{
      width: size, height: size, borderRadius: size / 2,
      backgroundColor: avatarBg(name),
      justifyContent: 'center', alignItems: 'center',
    }, style]}>
      <Text style={{ fontSize: size * 0.38, fontWeight: '800', color: NAVY }}>{initials}</Text>
    </View>
  );
}

// ── Screen ────────────────────────────────────────────────────────────────────

export default function HomeScreen() {
  const router        = useRouter();
  const queryClient   = useQueryClient();
  const [guestModal, setGuestModal] = useState(false);

  // ── Data ──────────────────────────────────────────────────────────────────

  const { data: currentUser } = useQuery({ queryKey: ['currentUser'], queryFn: getCurrentUser });

  // Get all groups this user belongs to, then pick the first one
  const { data: userGroups } = useQuery({
    queryKey: ['userGroups', currentUser?.id],
    queryFn:  () => getUserGroups(currentUser!.id),
    enabled:  !!currentUser?.id,
  });
  const firstGroupId = userGroups?.[0]?.id ?? null;

  const { data: group } = useQuery({
    queryKey: ['group', firstGroupId],
    queryFn:  () => getGroup(firstGroupId ?? undefined),
    enabled:  firstGroupId !== null || userGroups !== undefined,
  });
  const { data: players }      = useQuery({ queryKey: ['players'],     queryFn: getPlayers });

  const { data: match, isLoading: matchLoading } = useQuery({
    queryKey: ['nextMatch'],
    queryFn:  getNextMatch,
  });

  const { data: attendance } = useQuery({
    queryKey: ['attendance', match?.id],
    queryFn:  () => getAttendance(match!.id),
    enabled:  !!match?.id,
  });

  const { data: payments } = useQuery({
    queryKey: ['payments', match?.id],
    queryFn:  () => getPayments(match!.id),
    enabled:  !!match?.id,
  });

  // ── Mutations ─────────────────────────────────────────────────────────────

  const attendMutation = useMutation({
    mutationFn: (status: string) => upsertAttendance(match!.id, currentUser!.id, status),
    onSuccess:  () => queryClient.invalidateQueries({ queryKey: ['attendance'] }),
  });

  const payMutation = useMutation({
    mutationFn: (id: string) => markPayment(id, 'pending'),
    onSuccess:  () => queryClient.invalidateQueries({ queryKey: ['payments'] }),
  });

  // ── Derived ───────────────────────────────────────────────────────────────

  const isAdmin     = currentUser?.role === 'admin';
  const isPremium   = false; // wire to subscription when ready
  const myAttendance = attendance?.find((a) => a.player_id === currentUser?.id);
  const myPayment    = payments?.find((p) => p.player_id === currentUser?.id);
  const goingList    = (attendance ?? []).filter((a) => a.status === 'yes');
  const goingCount   = goingList.length;

  // Teammates on my team
  const myTeam = myAttendance?.team
    ? goingList.filter((a) => a.team === myAttendance.team)
    : [];
  const teammates = myTeam
    .map((a) => players?.find((p) => p.id === a.player_id))
    .filter(Boolean) as any[];

  const teamsGenerated = goingList.some((a) => a.team === 'A' || a.team === 'B');

  // ── Loading ───────────────────────────────────────────────────────────────

  if (matchLoading) {
    return (
      <SafeAreaView style={s.safe} edges={['top']}>
        <View style={s.loadingWrap}>
          <ActivityIndicator size="large" color={GREEN} />
        </View>
      </SafeAreaView>
    );
  }

  // ── No squad ──────────────────────────────────────────────────────────────

  if (!group && !matchLoading) {
    return (
      <SafeAreaView style={s.safe} edges={['top']}>
        <ScrollView contentContainerStyle={s.noSquadWrap}>
          <Text style={{ fontSize: 56, marginBottom: 20 }}>🏟️</Text>
          <Text style={s.noSquadTitle}>You're not in any squad yet</Text>
          <Text style={s.noSquadSub}>
            Join a squad using an invite link, or create your own in seconds.
          </Text>
          <TouchableOpacity style={s.noSquadPrimary} onPress={() => router.push('/create-group')}>
            <Ionicons name="add-circle-outline" size={18} color="#fff" style={{ marginRight: 8 }} />
            <Text style={s.noSquadPrimaryText}>Create a squad</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.noSquadSecondary}>
            <Ionicons name="link-outline" size={18} color={NAVY} style={{ marginRight: 8 }} />
            <Text style={s.noSquadSecondaryText}>Join via invite link</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ── Main ──────────────────────────────────────────────────────────────────

  const squadInitial = (group?.name ?? 'S')[0].toUpperCase();

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.content}
        showsVerticalScrollIndicator={false}
      >
        {/* ── HEADER ── */}
        <View style={s.header}>
          {/* Squad switcher */}
          <TouchableOpacity style={s.squadSwitcher} activeOpacity={0.75}>
            <View style={s.squadLogo}>
              <Text style={s.squadLogoText}>{squadInitial}</Text>
            </View>
            <View style={s.squadInfo}>
              <Text style={s.squadName} numberOfLines={1}>{group?.name ?? 'My Squad'}</Text>
              <View style={s.rolePlanRow}>
                <View style={[s.roleBadge, isAdmin && s.roleBadgeAdmin]}>
                  <Text style={[s.roleBadgeText, isAdmin && s.roleBadgeTextAdmin]}>
                    {isAdmin ? 'Admin' : 'Player'}
                  </Text>
                </View>
                <Text style={s.roleSep}>·</Text>
                <View style={[s.planBadge, isPremium && s.planBadgePremium]}>
                  <Text style={[s.planBadgeText, isPremium && s.planBadgeTextPremium]}>
                    {isPremium ? '⭐ Premium' : 'Free'}
                  </Text>
                </View>
              </View>
            </View>
            <Ionicons name="chevron-down" size={18} color={GREY_TEXT} />
          </TouchableOpacity>

          {/* User avatar */}
          <TouchableOpacity onPress={() => router.push('/(tabs)/profile')}>
            <Avatar name={currentUser?.name ?? 'You'} size={44} />
          </TouchableOpacity>
        </View>

        {/* Greeting */}
        <View style={s.greetingRow}>
          <Text style={s.greeting}>{getGreeting()}, </Text>
          <Text style={s.greetingName}>{(currentUser?.name ?? 'there').split(' ')[0]} 👋</Text>
        </View>

        {/* ── NEXT MATCH HERO ── */}
        {match ? (
          <>
            <View style={s.heroCard}>
              {/* Top row */}
              <View style={s.heroTopRow}>
                <View style={s.heroLabel}>
                  <Ionicons name="football" size={13} color="rgba(255,255,255,0.7)" />
                  <Text style={s.heroLabelText}>NEXT MATCH</Text>
                </View>
                <View style={s.countdownPill}>
                  <Text style={s.countdownText}>{daysUntil(match.date)}</Text>
                </View>
              </View>

              {/* Date */}
              <Text style={s.heroDate}>{formatMatchDate(match.date)}</Text>

              {/* Details row */}
              <View style={s.heroDetails}>
                <View style={s.heroDetailItem}>
                  <Ionicons name="time-outline" size={14} color="rgba(255,255,255,0.65)" />
                  <Text style={s.heroDetailText}>{match.time}</Text>
                </View>
                <View style={s.heroDetailDot} />
                <View style={s.heroDetailItem}>
                  <Ionicons name="location-outline" size={14} color="rgba(255,255,255,0.65)" />
                  <Text style={s.heroDetailText} numberOfLines={1}>{match.location}</Text>
                </View>
              </View>

              {/* Stats strip */}
              <View style={s.heroStrip}>
                <View style={s.heroStripItem}>
                  <Text style={s.heroStripNum}>£{(match.cost_per_player ?? 0).toFixed(2)}</Text>
                  <Text style={s.heroStripLabel}>Per player</Text>
                </View>
                <View style={s.heroStripDiv} />
                <View style={s.heroStripItem}>
                  <Text style={s.heroStripNum}>{goingCount}</Text>
                  <Text style={s.heroStripLabel}>Going</Text>
                </View>
                <View style={s.heroStripDiv} />
                <TouchableOpacity
                  style={s.heroStripItem}
                  onPress={() => router.push(`/match/${match.id}`)}
                >
                  <Text style={[s.heroStripNum, { color: GREEN }]}>View →</Text>
                  <Text style={s.heroStripLabel}>Details</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* ── ATTENDANCE ── */}
            {match.status !== 'closed' && (
              <View style={s.attendCard}>
                <Text style={s.attendCardTitle}>Are you in?</Text>
                {myAttendance?.status && (
                  <Text style={s.attendCardSub}>
                    Your response:{' '}
                    <Text style={[
                      s.attendCardSubBold,
                      myAttendance.status === 'yes'   && { color: GREEN_DARK },
                      myAttendance.status === 'no'    && { color: RED_DARK },
                      myAttendance.status === 'maybe' && { color: '#92400E' },
                    ]}>
                      {myAttendance.status.charAt(0).toUpperCase() + myAttendance.status.slice(1)}
                    </Text>
                  </Text>
                )}
                <View style={s.attendBtns}>
                  {[
                    { status: 'yes',   label: 'YES',   icon: 'checkmark-circle' as const, activeStyle: s.attendYesActive,   iconColor: GREEN_DARK },
                    { status: 'no',    label: 'NO',    icon: 'close-circle'     as const, activeStyle: s.attendNoActive,    iconColor: RED_DARK   },
                    { status: 'maybe', label: 'MAYBE', icon: 'help-circle'      as const, activeStyle: s.attendMaybeActive, iconColor: '#92400E'  },
                  ].map((btn) => {
                    const active = myAttendance?.status === btn.status;
                    return (
                      <TouchableOpacity
                        key={btn.status}
                        style={[s.attendBtn, active && btn.activeStyle]}
                        onPress={() => attendMutation.mutate(btn.status)}
                        activeOpacity={0.8}
                        disabled={attendMutation.isPending}
                      >
                        <Ionicons
                          name={btn.icon}
                          size={22}
                          color={active ? '#fff' : btn.iconColor}
                        />
                        <Text style={[s.attendBtnLabel, active && s.attendBtnLabelActive]}>
                          {btn.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
                {/* Add guest */}
                <TouchableOpacity style={s.addGuestRow} onPress={() => setGuestModal(true)}>
                  <Ionicons name="person-add-outline" size={15} color={GREY_TEXT} />
                  <Text style={s.addGuestText}>Bringing someone? Add a guest</Text>
                  <Ionicons name="chevron-forward" size={14} color={GREY_TEXT} />
                </TouchableOpacity>
              </View>
            )}
          </>
        ) : (
          /* ── NO MATCH ── */
          <View style={s.noMatchCard}>
            <View style={s.noMatchIcon}>
              <Ionicons name="calendar-outline" size={28} color={GREY_TEXT} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.noMatchTitle}>No match scheduled yet</Text>
              <Text style={s.noMatchSub}>
                {isAdmin ? 'Create the next match for your squad.' : 'Your admin will schedule the next one soon.'}
              </Text>
            </View>
            {isAdmin && (
              <TouchableOpacity style={s.noMatchCta} onPress={() => router.push('/schedule')}>
                <Text style={s.noMatchCtaText}>Create</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* ── YOUR TEAM ── */}
        {match && teamsGenerated && myAttendance?.team && (
          <TouchableOpacity
            style={s.teamCard}
            onPress={() => router.push(`/teams/${match.id}`)}
            activeOpacity={0.85}
          >
            <View style={s.teamCardHeader}>
              <View style={s.teamLabelPill}>
                <Text style={s.teamLabelText}>Team {myAttendance.team}</Text>
              </View>
              <Text style={s.teamCardTitle}>Your Team</Text>
              <Text style={s.teamCardSeeAll}>See all →</Text>
            </View>
            <View style={s.teamAvatarRow}>
              {teammates.slice(0, 6).map((p, i) => (
                <View key={p.id} style={[s.teamAvatarWrap, { zIndex: 10 - i, marginLeft: i === 0 ? 0 : -10 }]}>
                  <Avatar name={p.name} size={40} style={s.teamAvatar} />
                </View>
              ))}
              {teammates.length > 6 && (
                <View style={[s.teamAvatarWrap, s.teamAvatarMore, { marginLeft: -10 }]}>
                  <Text style={s.teamAvatarMoreText}>+{teammates.length - 6}</Text>
                </View>
              )}
              {teammates.length === 0 && (
                <Text style={s.teamNoPlayers}>No teammates confirmed yet</Text>
              )}
            </View>
          </TouchableOpacity>
        )}

        {/* ── PAYMENT STATUS ── */}
        {myPayment && (
          <TouchableOpacity
            style={[
              s.payCard,
              myPayment.status === 'paid'    && s.payCardPaid,
              myPayment.status === 'unpaid'  && s.payCardUnpaid,
              myPayment.status === 'pending' && s.payCardPending,
            ]}
            onPress={() => router.push('/(tabs)/payments')}
            activeOpacity={0.85}
          >
            <View style={[
              s.payIconWrap,
              myPayment.status === 'paid'    && { backgroundColor: GREEN_TINT  },
              myPayment.status === 'unpaid'  && { backgroundColor: RED_TINT    },
              myPayment.status === 'pending' && { backgroundColor: AMBER_TINT  },
            ]}>
              <Ionicons
                name={
                  myPayment.status === 'paid'   ? 'checkmark-circle' :
                  myPayment.status === 'pending'? 'time-outline' : 'wallet-outline'
                }
                size={22}
                color={
                  myPayment.status === 'paid'   ? GREEN_DARK :
                  myPayment.status === 'pending'? AMBER : RED_DARK
                }
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.payTitle}>
                {myPayment.status === 'paid'
                  ? 'Payment confirmed'
                  : myPayment.status === 'pending'
                  ? 'Payment pending review'
                  : 'Payment due'}
              </Text>
              <Text style={s.payAmount}>
                {myPayment.status === 'paid'
                  ? `£${(myPayment.amount ?? 0).toFixed(2)} paid ✓`
                  : `£${(myPayment.amount ?? 0).toFixed(2)} outstanding`}
              </Text>
            </View>
            {myPayment.status === 'unpaid' && (
              <TouchableOpacity
                style={s.payAction}
                onPress={(e) => { e.stopPropagation?.(); payMutation.mutate(myPayment.id); }}
              >
                <Text style={s.payActionText}>I've Paid</Text>
              </TouchableOpacity>
            )}
            {myPayment.status !== 'unpaid' && (
              <Ionicons name="chevron-forward" size={16} color={GREY_TEXT} />
            )}
          </TouchableOpacity>
        )}

        {/* ── ADMIN ACTIONS ── */}
        {isAdmin && (
          <View style={s.adminSection}>
            <Text style={s.adminSectionLabel}>Admin</Text>
            <View style={s.adminGrid}>
              {[
                { icon: 'add-circle-outline' as const, label: 'Create Match', color: GREEN,  bg: GREEN_TINT,  border: GREEN_BDR,  onPress: () => router.push('/schedule')          },
                { icon: 'people-outline'      as const, label: 'Players',      color: NAVY,   bg: GREY_LIGHT,  border: GREY_BORDER, onPress: () => router.push('/(tabs)/group')      },
                { icon: 'shuffle-outline'     as const, label: 'Teams',        color: PURPLE, bg: PURPLE_TINT, border: '#DDD6FE',  onPress: () => match && router.push(`/teams/${match.id}`) },
                { icon: 'stats-chart-outline' as const, label: 'Stats',        color: AMBER,  bg: AMBER_TINT,  border: AMBER_BDR,  onPress: () => router.push('/history')           },
              ].map((item) => (
                <TouchableOpacity
                  key={item.label}
                  style={[s.adminBtn, { backgroundColor: item.bg, borderColor: item.border }]}
                  onPress={item.onPress}
                  activeOpacity={0.8}
                >
                  <View style={[s.adminBtnIcon, { backgroundColor: item.bg }]}>
                    <Ionicons name={item.icon} size={22} color={item.color} />
                  </View>
                  <Text style={[s.adminBtnLabel, { color: item.color }]}>{item.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* ── QUICK ACTIONS ── */}
        <View style={s.quickRow}>
          {[
            { icon: 'football-outline'  as const, label: 'Match',   onPress: () => match && router.push(`/match/${match.id}`), color: NAVY   },
            { icon: 'people-outline'    as const, label: 'Squad',   onPress: () => router.push('/(tabs)/group'),               color: NAVY   },
            { icon: 'time-outline'      as const, label: 'History', onPress: () => router.push('/history'),                    color: NAVY   },
            { icon: 'star-outline'      as const, label: 'Rate',    onPress: () => match && router.push(`/rate/${match.id}`),  color: AMBER  },
          ].map((q) => (
            <TouchableOpacity key={q.label} style={s.quickBtn} onPress={q.onPress} activeOpacity={0.75}>
              <View style={s.quickIcon}>
                <Ionicons name={q.icon} size={20} color={q.color} />
              </View>
              <Text style={s.quickLabel}>{q.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Upgrade nudge — admin only */}
        {isAdmin && !isPremium && (
          <TouchableOpacity style={s.upgradeNudge} onPress={() => router.push('/pricing')} activeOpacity={0.88}>
            <View style={{ flex: 1 }}>
              <Text style={s.upgradeNudgeTitle}>Upgrade to PRO 🏆</Text>
              <Text style={s.upgradeNudgeSub}>Balanced teams · Player stats · Reminders</Text>
            </View>
            <View style={s.upgradeNudgeChip}>
              <Text style={s.upgradeNudgeChipText}>From £9.99/mo</Text>
            </View>
          </TouchableOpacity>
        )}

        <View style={{ height: 32 }} />
      </ScrollView>

      {/* Guest modal */}
      <AddGuestModal
        visible={guestModal}
        onClose={() => setGuestModal(false)}
        matchId={match?.id ?? ''}
        sponsorId={currentUser?.id ?? ''}
        onAdded={() => {
          setGuestModal(false);
          queryClient.invalidateQueries({ queryKey: ['attendance'] });
        }}
      />
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  safe:        { flex: 1, backgroundColor: GREY_BG },
  scroll:      { flex: 1 },
  content:     { paddingHorizontal: 16, paddingTop: 8 },
  loadingWrap: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  // ── Header ──────────────────────────────────────────────────────────────────
  header: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: 6,
  },
  squadSwitcher: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    backgroundColor: GREY_CARD, borderRadius: 18,
    borderWidth: 1, borderColor: GREY_BORDER,
    paddingHorizontal: 12, paddingVertical: 9,
    marginRight: 10,
    ...shadows.xs,
  } as any,
  squadLogo: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: NAVY, justifyContent: 'center', alignItems: 'center',
    marginRight: 10,
  },
  squadLogoText: { fontSize: 16, fontWeight: '800', color: '#fff' },
  squadInfo:     { flex: 1 },
  squadName:     { fontSize: 15, fontWeight: '700', color: NAVY, marginBottom: 3 },
  rolePlanRow:   { flexDirection: 'row', alignItems: 'center', gap: 5 },
  roleBadge:     { backgroundColor: GREY_LIGHT, borderRadius: 50, paddingHorizontal: 8, paddingVertical: 2 },
  roleBadgeAdmin:{ backgroundColor: '#DCFCE7', borderWidth: 1, borderColor: GREEN_BDR },
  roleBadgeText: { fontSize: 10, fontWeight: '700', color: GREY_TEXT },
  roleBadgeTextAdmin: { color: GREEN_DARK },
  roleSep:       { fontSize: 10, color: GREY_TEXT },
  planBadge:     { backgroundColor: GREY_LIGHT, borderRadius: 50, paddingHorizontal: 8, paddingVertical: 2 },
  planBadgePremium: { backgroundColor: '#FEF3C7', borderWidth: 1, borderColor: AMBER_BDR },
  planBadgeText: { fontSize: 10, fontWeight: '700', color: GREY_TEXT },
  planBadgeTextPremium: { color: '#92400E' },

  // ── Greeting ─────────────────────────────────────────────────────────────
  greetingRow:  { flexDirection: 'row', marginBottom: 16, marginTop: 8 },
  greeting:     { fontSize: 16, color: GREY_TEXT, fontWeight: '400' },
  greetingName: { fontSize: 16, fontWeight: '700', color: NAVY },

  // ── Hero card ─────────────────────────────────────────────────────────────
  heroCard: {
    backgroundColor: NAVY, borderRadius: 24,
    padding: 20, marginBottom: 12,
    ...shadows.lg,
  } as any,
  heroTopRow:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  heroLabel:     { flexDirection: 'row', alignItems: 'center', gap: 5 },
  heroLabelText: { fontSize: 11, fontWeight: '700', color: 'rgba(255,255,255,0.6)', letterSpacing: 1.2, textTransform: 'uppercase' },
  countdownPill: { backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 50, paddingHorizontal: 12, paddingVertical: 4 },
  countdownText: { fontSize: 12, fontWeight: '700', color: '#fff' },
  heroDate:      { fontSize: 22, fontWeight: '800', color: '#fff', marginBottom: 10, lineHeight: 26 },
  heroDetails:   { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
  heroDetailItem:{ flexDirection: 'row', alignItems: 'center', gap: 5 },
  heroDetailText:{ fontSize: 13, color: 'rgba(255,255,255,0.75)', fontWeight: '500' },
  heroDetailDot: { width: 3, height: 3, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.3)' },
  heroStrip:     { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 14, paddingVertical: 12 },
  heroStripItem: { flex: 1, alignItems: 'center' },
  heroStripNum:  { fontSize: 16, fontWeight: '800', color: '#fff', marginBottom: 2 },
  heroStripLabel:{ fontSize: 10, color: 'rgba(255,255,255,0.55)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  heroStripDiv:  { width: 1, backgroundColor: 'rgba(255,255,255,0.12)' },

  // ── Attendance ────────────────────────────────────────────────────────────
  attendCard: {
    backgroundColor: GREY_CARD, borderRadius: 22,
    padding: 18, marginBottom: 14,
    borderWidth: 1, borderColor: GREY_BORDER,
    ...shadows.sm,
  } as any,
  attendCardTitle:   { fontSize: 15, fontWeight: '700', color: NAVY, marginBottom: 4 },
  attendCardSub:     { fontSize: 12, color: GREY_TEXT, marginBottom: 14 },
  attendCardSubBold: { fontWeight: '700' },
  attendBtns:        { flexDirection: 'row', gap: 8, marginBottom: 14 },
  attendBtn: {
    flex: 1, flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 14, borderRadius: 16,
    backgroundColor: GREY_LIGHT, borderWidth: 1.5, borderColor: GREY_BORDER, gap: 5,
  },
  attendYesActive:   { backgroundColor: GREEN_DARK, borderColor: GREEN_DARK },
  attendNoActive:    { backgroundColor: RED_DARK,   borderColor: RED_DARK   },
  attendMaybeActive: { backgroundColor: AMBER,      borderColor: AMBER      },
  attendBtnLabel:    { fontSize: 11, fontWeight: '800', color: GREY_TEXT, letterSpacing: 0.5 },
  attendBtnLabelActive: { color: '#fff' },
  addGuestRow: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingTop: 4, borderTopWidth: 1, borderTopColor: GREY_BORDER,
  },
  addGuestText: { flex: 1, fontSize: 13, color: GREY_TEXT },

  // ── No match ──────────────────────────────────────────────────────────────
  noMatchCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: GREY_CARD, borderRadius: 22,
    padding: 18, marginBottom: 14, gap: 14,
    borderWidth: 1, borderColor: GREY_BORDER,
    ...shadows.sm,
  } as any,
  noMatchIcon: {
    width: 52, height: 52, borderRadius: 16,
    backgroundColor: GREY_LIGHT, justifyContent: 'center', alignItems: 'center',
  },
  noMatchTitle: { fontSize: 15, fontWeight: '700', color: NAVY, marginBottom: 3 },
  noMatchSub:   { fontSize: 12, color: GREY_TEXT, lineHeight: 17 },
  noMatchCta: {
    backgroundColor: NAVY, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 10,
  },
  noMatchCtaText: { fontSize: 13, fontWeight: '700', color: '#fff' },

  // ── Your team ─────────────────────────────────────────────────────────────
  teamCard: {
    backgroundColor: GREY_CARD, borderRadius: 22, padding: 18,
    marginBottom: 14, borderWidth: 1, borderColor: GREY_BORDER,
    ...shadows.sm,
  } as any,
  teamCardHeader:  { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  teamLabelPill:   { backgroundColor: GREEN_TINT, borderRadius: 50, paddingHorizontal: 10, paddingVertical: 4, marginRight: 10 },
  teamLabelText:   { fontSize: 11, fontWeight: '800', color: GREEN_DARK },
  teamCardTitle:   { flex: 1, fontSize: 15, fontWeight: '700', color: NAVY },
  teamCardSeeAll:  { fontSize: 13, color: GREEN_DARK, fontWeight: '600' },
  teamAvatarRow:   { flexDirection: 'row', alignItems: 'center' },
  teamAvatarWrap:  { borderWidth: 2, borderColor: GREY_CARD, borderRadius: 22 },
  teamAvatar:      {},
  teamAvatarMore: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: GREY_LIGHT,
    justifyContent: 'center', alignItems: 'center',
  },
  teamAvatarMoreText: { fontSize: 12, fontWeight: '800', color: NAVY },
  teamNoPlayers:   { fontSize: 13, color: GREY_TEXT },

  // ── Payment ───────────────────────────────────────────────────────────────
  payCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: GREY_CARD, borderRadius: 22,
    padding: 16, marginBottom: 14,
    borderWidth: 1.5, borderColor: GREY_BORDER,
    ...shadows.sm,
  } as any,
  payCardPaid:    { borderColor: GREEN_BDR },
  payCardUnpaid:  { borderColor: RED_BDR   },
  payCardPending: { borderColor: AMBER_BDR },
  payIconWrap:    { width: 48, height: 48, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  payTitle:       { fontSize: 14, fontWeight: '700', color: NAVY, marginBottom: 2 },
  payAmount:      { fontSize: 12, color: GREY_TEXT, fontWeight: '500' },
  payAction: {
    backgroundColor: NAVY, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 9,
  },
  payActionText: { fontSize: 12, fontWeight: '700', color: '#fff' },

  // ── Admin ─────────────────────────────────────────────────────────────────
  adminSection:    { marginBottom: 14 },
  adminSectionLabel: {
    fontSize: 11, fontWeight: '700', color: GREY_TEXT,
    textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10,
  },
  adminGrid: { flexDirection: 'row', gap: 8 },
  adminBtn: {
    flex: 1, alignItems: 'center', paddingVertical: 14,
    borderRadius: 18, borderWidth: 1.5, gap: 6,
  },
  adminBtnIcon:  { marginBottom: 2 },
  adminBtnLabel: { fontSize: 11, fontWeight: '700' },

  // ── Quick actions ─────────────────────────────────────────────────────────
  quickRow: {
    flexDirection: 'row', gap: 8, marginBottom: 14,
  },
  quickBtn: {
    flex: 1, alignItems: 'center', gap: 6,
    backgroundColor: GREY_CARD, borderRadius: 18,
    paddingVertical: 14, borderWidth: 1, borderColor: GREY_BORDER,
    ...shadows.xs,
  } as any,
  quickIcon: {},
  quickLabel: { fontSize: 11, fontWeight: '600', color: NAVY },

  // ── Upgrade nudge ─────────────────────────────────────────────────────────
  upgradeNudge: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: NAVY, borderRadius: 22,
    padding: 18, marginBottom: 14,
    ...shadows.md,
  } as any,
  upgradeNudgeTitle: { fontSize: 15, fontWeight: '700', color: '#fff', marginBottom: 3 },
  upgradeNudgeSub:   { fontSize: 12, color: 'rgba(255,255,255,0.65)' },
  upgradeNudgeChip: {
    backgroundColor: GREEN, borderRadius: 50,
    paddingHorizontal: 14, paddingVertical: 8,
  },
  upgradeNudgeChipText: { fontSize: 12, fontWeight: '800', color: '#fff' },

  // ── No squad ──────────────────────────────────────────────────────────────
  noSquadWrap: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
    paddingHorizontal: 32, paddingVertical: 64,
  },
  noSquadTitle: { fontSize: 22, fontWeight: '800', color: NAVY, textAlign: 'center', marginBottom: 12 },
  noSquadSub:   { fontSize: 14, color: GREY_TEXT, textAlign: 'center', lineHeight: 21, marginBottom: 32 },
  noSquadPrimary: {
    width: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: GREEN, borderRadius: 16, paddingVertical: 16, marginBottom: 12,
  },
  noSquadPrimaryText: { fontSize: 16, fontWeight: '700', color: '#fff' },
  noSquadSecondary: {
    width: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: GREY_BORDER,
    backgroundColor: GREY_CARD, borderRadius: 16, paddingVertical: 16,
  },
  noSquadSecondaryText: { fontSize: 16, fontWeight: '700', color: NAVY },
});
