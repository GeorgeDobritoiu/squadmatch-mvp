import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Alert,
  ActivityIndicator,
  Platform,
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
  upsertAttendance,
  markPayment,
  addGuest,
} from '@/lib/data';
import AddGuestModal from '@/components/AddGuestModal';

const STATUS_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  open: { bg: colors.accentTint, text: colors.accentDark, label: 'Open' },
  full: { bg: '#FEF3C7', text: '#D97706', label: 'Full' },
  closed: { bg: '#FEE2E2', text: '#DC2626', label: 'Closed' },
};

export default function HomeScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [guestModalVisible, setGuestModalVisible] = useState(false);

  const { data: match, isLoading: matchLoading } = useQuery({
    queryKey: ['nextMatch'],
    queryFn: getNextMatch,
  });

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: getCurrentUser,
  });

  const { data: attendance } = useQuery({
    queryKey: ['attendance', match?.id],
    queryFn: () => getAttendance(match!.id),
    enabled: !!match?.id,
  });

  const { data: payments } = useQuery({
    queryKey: ['payments', match?.id],
    queryFn: () => getPayments(match!.id),
    enabled: !!match?.id,
  });

  const attendanceMutation = useMutation({
    mutationFn: ({ status }: { status: string }) =>
      upsertAttendance(match!.id, currentUser!.id, status),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['attendance'] }),
  });

  const paymentMutation = useMutation({
    mutationFn: (paymentId: string) => markPayment(paymentId, 'paid', 'revolut'),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['payments'] }),
  });

  const myAttendance = attendance?.find((a) => a.playerId === currentUser?.id);
  const myPayment = payments?.find((p) => p.playerId === currentUser?.id);
  const goingCount = attendance?.filter((a) => a.status === 'yes').length ?? 0;

  const formatDate = (date: string) => {
    const d = new Date(date + 'T12:00:00');
    return d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
  };

  if (matchLoading) {
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
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Good morning 👋</Text>
            <Text style={styles.userName}>{currentUser?.name ?? 'Player'}</Text>
          </View>
          <TouchableOpacity style={styles.avatarBtn}>
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarInitial}>{(currentUser?.name ?? 'P')[0]}</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Next Match Card */}
        {match ? (
          <View style={styles.matchCard}>
            <View style={styles.matchCardHeader}>
              <Text style={styles.matchCardTitle}>Next Match</Text>
              {match.status && (
                <View style={[styles.statusBadge, { backgroundColor: STATUS_COLORS[match.status]?.bg ?? colors.primaryTint }]}>
                  <Text style={[styles.statusText, { color: STATUS_COLORS[match.status]?.text ?? colors.primary }]}>
                    {STATUS_COLORS[match.status]?.label ?? match.status}
                  </Text>
                </View>
              )}
            </View>

            <Text style={styles.matchDate}>{formatDate(match.date)}</Text>

            <View style={styles.matchInfoRow}>
              <View style={styles.matchInfoItem}>
                <Ionicons name="time-outline" size={16} color={colors.textSecondary} />
                <Text style={styles.matchInfoText}>{match.time}</Text>
              </View>
              <View style={styles.matchInfoItem}>
                <Ionicons name="location-outline" size={16} color={colors.textSecondary} />
                <Text style={styles.matchInfoText} numberOfLines={1}>{match.location}</Text>
              </View>
            </View>

            <View style={styles.matchMetaRow}>
              <View style={styles.matchMetaItem}>
                <Text style={styles.matchMetaLabel}>Cost</Text>
                <Text style={styles.matchMetaValue}>£{match.costPerPlayer?.toFixed(2)}</Text>
              </View>
              <View style={styles.matchMetaDivider} />
              <View style={styles.matchMetaItem}>
                <Text style={styles.matchMetaLabel}>Going</Text>
                <Text style={styles.matchMetaValue}>{goingCount} players</Text>
              </View>
              <View style={styles.matchMetaDivider} />
              <View style={styles.matchMetaItem}>
                <Text style={styles.matchMetaLabel}>Your Status</Text>
                <Text style={[styles.matchMetaValue, myAttendance?.status === 'yes' ? styles.textGreen : myAttendance?.status === 'no' ? styles.textRed : styles.textOrange]}>
                  {myAttendance?.status ? myAttendance.status.charAt(0).toUpperCase() + myAttendance.status.slice(1) : '—'}
                </Text>
              </View>
            </View>
          </View>
        ) : (
          <View style={styles.emptyCard}>
            <Ionicons name="football-outline" size={40} color={colors.textTertiary} />
            <Text style={styles.emptyTitle}>No upcoming match</Text>
            <Text style={styles.emptySubtitle}>Ask your admin to schedule the next one</Text>
          </View>
        )}

        {/* Attendance Buttons */}
        {match && match.status !== 'closed' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Are you in?</Text>
            <View style={styles.attendanceRow}>
              <TouchableOpacity
                style={[styles.attendBtn, myAttendance?.status === 'yes' && styles.attendBtnActiveGreen]}
                onPress={() => attendanceMutation.mutate({ status: 'yes' })}
              >
                <Ionicons name="checkmark-circle" size={20} color={myAttendance?.status === 'yes' ? colors.white : colors.accentDark} />
                <Text style={[styles.attendBtnText, myAttendance?.status === 'yes' && styles.attendBtnTextActive]}>Yes</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.attendBtn, myAttendance?.status === 'no' && styles.attendBtnActiveRed]}
                onPress={() => attendanceMutation.mutate({ status: 'no' })}
              >
                <Ionicons name="close-circle" size={20} color={myAttendance?.status === 'no' ? colors.white : '#EF4444'} />
                <Text style={[styles.attendBtnText, myAttendance?.status === 'no' && styles.attendBtnTextActive]}>No</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.attendBtn, myAttendance?.status === 'maybe' && styles.attendBtnActiveMaybe]}
                onPress={() => attendanceMutation.mutate({ status: 'maybe' })}
              >
                <Ionicons name="help-circle" size={20} color={myAttendance?.status === 'maybe' ? colors.white : '#D97706'} />
                <Text style={[styles.attendBtnText, myAttendance?.status === 'maybe' && styles.attendBtnTextActive]}>Maybe</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Action Buttons */}
        {match && (
          <View style={styles.section}>
            <View style={styles.actionGrid}>
              <TouchableOpacity style={styles.actionBtn} onPress={() => setGuestModalVisible(true)}>
                <View style={[styles.actionIcon, { backgroundColor: '#EDE9FE' }]}>
                  <Ionicons name="person-add-outline" size={20} color="#7C3AED" />
                </View>
                <Text style={styles.actionBtnText}>Add Guest</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.actionBtn} onPress={() => router.push(`/match/${match.id}`)}>
                <View style={[styles.actionIcon, { backgroundColor: colors.primaryTint }]}>
                  <Ionicons name="people-outline" size={20} color={colors.primary} />
                </View>
                <Text style={styles.actionBtnText}>View Match</Text>
              </TouchableOpacity>

              {match.teamsLocked ? (
                <TouchableOpacity style={styles.actionBtn} onPress={() => router.push(`/teams/${match.id}`)}>
                  <View style={[styles.actionIcon, { backgroundColor: colors.accentTint }]}>
                    <Ionicons name="shield-checkmark-outline" size={20} color={colors.accentDark} />
                  </View>
                  <Text style={styles.actionBtnText}>My Team</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          </View>
        )}

        {/* Payment Banner */}
        {myPayment && myPayment.status === 'unpaid' && (
          <View style={styles.paymentBanner}>
            <View style={styles.paymentBannerLeft}>
              <Ionicons name="wallet-outline" size={20} color="#D97706" />
              <View style={styles.paymentBannerText}>
                <Text style={styles.paymentBannerTitle}>Payment Due</Text>
                <Text style={styles.paymentBannerAmount}>£{myPayment.amount?.toFixed(2)}</Text>
              </View>
            </View>
            <View style={styles.paymentBannerActions}>
              <TouchableOpacity
                style={styles.payNowBtn}
                onPress={() => paymentMutation.mutate(myPayment.id)}
              >
                <Text style={styles.payNowBtnText}>Mark Paid</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
        {myPayment && myPayment.status === 'paid' && (
          <View style={[styles.paymentBanner, styles.paymentPaid]}>
            <Ionicons name="checkmark-circle" size={20} color={colors.accentDark} />
            <Text style={styles.paymentPaidText}>Payment confirmed ✓</Text>
          </View>
        )}

        {/* Recent Match */}
        <View style={styles.section}>
          <View style={styles.sectionRow}>
            <Text style={styles.sectionTitle}>Recent Activity</Text>
            <TouchableOpacity onPress={() => router.push('/history')}>
              <Text style={styles.seeAll}>See all</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity style={styles.historyCard} onPress={() => router.push('/history')}>
            <View style={styles.historyCardLeft}>
              <View style={styles.historyIcon}>
                <Ionicons name="trophy-outline" size={18} color="#D97706" />
              </View>
              <View>
                <Text style={styles.historyTitle}>Sun 23 Mar — Final Score</Text>
                <Text style={styles.historyScore}>Team A 3 – 2 Team B</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
          </TouchableOpacity>
        </View>

        <View style={{ height: spacing.xl }} />
      </ScrollView>

      <AddGuestModal
        visible={guestModalVisible}
        onClose={() => setGuestModalVisible(false)}
        matchId={match?.id ?? ''}
        sponsorId={currentUser?.id ?? 'p1'}
        onAdded={() => {
          setGuestModalVisible(false);
          queryClient.invalidateQueries({ queryKey: ['guests'] });
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.backgroundSecondary },
  scroll: { flex: 1 },
  scrollContent: { padding: spacing.md },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
    paddingTop: spacing.sm,
  },
  greeting: { ...typography.caption, color: colors.textSecondary },
  userName: { ...typography.h2, color: colors.primary, marginTop: 2 },
  avatarBtn: {},
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitial: { ...typography.bodyBold, color: colors.white },

  // Match Card
  matchCard: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    marginBottom: spacing.md,
    ...shadows.lg,
  },
  matchCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  matchCardTitle: { ...typography.small, color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: 1 },
  statusBadge: { paddingHorizontal: spacing.sm, paddingVertical: 3, borderRadius: borderRadius.full },
  statusText: { ...typography.tiny, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  matchDate: { ...typography.h3, color: colors.white, marginBottom: spacing.md },
  matchInfoRow: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.md },
  matchInfoItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  matchInfoText: { ...typography.caption, color: 'rgba(255,255,255,0.8)', flex: 1 },
  matchMetaRow: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: borderRadius.lg, padding: spacing.md },
  matchMetaItem: { flex: 1, alignItems: 'center' },
  matchMetaLabel: { ...typography.tiny, color: 'rgba(255,255,255,0.6)', marginBottom: 2 },
  matchMetaValue: { ...typography.captionBold, color: colors.white },
  matchMetaDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.2)' },

  // Empty
  emptyCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    alignItems: 'center',
    marginBottom: spacing.md,
    ...shadows.sm,
  },
  emptyTitle: { ...typography.h4, color: colors.text, marginTop: spacing.md },
  emptySubtitle: { ...typography.caption, color: colors.textSecondary, marginTop: spacing.xs, textAlign: 'center' },

  // Section
  section: { marginBottom: spacing.md },
  sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  sectionTitle: { ...typography.captionBold, color: colors.text, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: spacing.sm },
  seeAll: { ...typography.caption, color: colors.accent, fontWeight: '600' },

  // Attendance
  attendanceRow: { flexDirection: 'row', gap: spacing.sm },
  attendBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.white,
    borderWidth: 1.5,
    borderColor: colors.border,
    ...shadows.xs,
  },
  attendBtnActiveGreen: { backgroundColor: colors.accentDark, borderColor: colors.accentDark },
  attendBtnActiveRed: { backgroundColor: '#EF4444', borderColor: '#EF4444' },
  attendBtnActiveMaybe: { backgroundColor: '#D97706', borderColor: '#D97706' },
  attendBtnText: { ...typography.captionBold, color: colors.text },
  attendBtnTextActive: { color: colors.white },

  // Action Grid
  actionGrid: { flexDirection: 'row', gap: spacing.sm },
  actionBtn: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    alignItems: 'center',
    gap: spacing.xs,
    ...shadows.xs,
  },
  actionIcon: { width: 40, height: 40, borderRadius: borderRadius.md, justifyContent: 'center', alignItems: 'center' },
  actionBtnText: { ...typography.tiny, fontWeight: '600', color: colors.text, textAlign: 'center' },

  // Payment Banner
  paymentBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FEF3C7',
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  paymentPaid: { backgroundColor: colors.accentTint, borderColor: '#86EFAC' },
  paymentBannerLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  paymentBannerText: {},
  paymentBannerTitle: { ...typography.small, color: '#92400E', fontWeight: '600' },
  paymentBannerAmount: { ...typography.captionBold, color: '#78350F' },
  paymentBannerActions: {},
  payNowBtn: { backgroundColor: '#D97706', paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: borderRadius.md },
  payNowBtnText: { ...typography.smallBold, color: colors.white },
  paymentPaidText: { ...typography.captionBold, color: colors.accentDark, marginLeft: spacing.sm },

  // History
  historyCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...shadows.xs,
  },
  historyCardLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  historyIcon: { width: 40, height: 40, borderRadius: borderRadius.md, backgroundColor: '#FEF3C7', justifyContent: 'center', alignItems: 'center' },
  historyTitle: { ...typography.caption, color: colors.textSecondary },
  historyScore: { ...typography.captionBold, color: colors.text, marginTop: 2 },

  // Text colours
  textGreen: { color: colors.accentLight },
  textRed: { color: '#F87171' },
  textOrange: { color: '#FBBF24' },
});
