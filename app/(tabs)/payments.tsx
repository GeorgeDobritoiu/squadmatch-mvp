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
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { colors, spacing, borderRadius, typography, shadows } from '@/constants/design';
import { getAllPayments, getPlayers, getCurrentUser, markPayment, getMatches } from '@/lib/data';

export default function PaymentsScreen() {
  const queryClient = useQueryClient();
  const [view, setView] = useState<'mine' | 'all'>('mine');

  const { data: payments, isLoading } = useQuery({
    queryKey: ['allPayments'],
    queryFn: getAllPayments,
  });

  const { data: players } = useQuery({
    queryKey: ['players'],
    queryFn: getPlayers,
  });

  const { data: matches } = useQuery({
    queryKey: ['matches'],
    queryFn: getMatches,
  });

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: getCurrentUser,
  });

  const markPaidMutation = useMutation({
    mutationFn: (paymentId: string) => markPayment(paymentId, 'paid', 'revolut'),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['allPayments'] }),
  });

  const getPlayerName = (id: string) => players?.find((p) => p.id === id)?.name ?? 'Unknown';
  const getMatchDate = (id: string) => {
    const m = matches?.find((m) => m.id === id);
    if (!m) return '';
    const d = new Date(m.date + 'T12:00:00');
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  };

  const myPayments = (payments ?? []).filter((p) => p.playerId === currentUser?.id);
  const allPayments = payments ?? [];
  const displayPayments = view === 'mine' ? myPayments : allPayments;

  const totalOwed = myPayments.filter((p) => p.status === 'unpaid').reduce((s, p) => s + (p.amount ?? 0), 0);
  const totalPaid = myPayments.filter((p) => p.status === 'paid').reduce((s, p) => s + (p.amount ?? 0), 0);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Payments</Text>
      </View>

      {/* My Summary Card */}
      <View style={styles.summaryCard}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Outstanding</Text>
          <Text style={[styles.summaryValue, totalOwed > 0 && styles.summaryValueRed]}>
            £{totalOwed.toFixed(2)}
          </Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Paid (total)</Text>
          <Text style={[styles.summaryValue, styles.summaryValueGreen]}>£{totalPaid.toFixed(2)}</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Payment Info</Text>
          <Text style={styles.summaryPayMethod}>Revolut / Cash</Text>
        </View>
      </View>

      {/* Revolut Info */}
      <View style={styles.infoCard}>
        <Ionicons name="information-circle-outline" size={18} color={colors.primary} />
        <Text style={styles.infoText}>Send payments via <Text style={styles.infoBold}>Revolut @sundaywarriors</Text> or cash to the admin</Text>
      </View>

      {/* View Toggle */}
      {currentUser?.role === 'admin' && (
        <View style={styles.toggleRow}>
          <TouchableOpacity
            style={[styles.toggleBtn, view === 'mine' && styles.toggleBtnActive]}
            onPress={() => setView('mine')}
          >
            <Text style={[styles.toggleBtnText, view === 'mine' && styles.toggleBtnTextActive]}>My Payments</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toggleBtn, view === 'all' && styles.toggleBtnActive]}
            onPress={() => setView('all')}
          >
            <Text style={[styles.toggleBtnText, view === 'all' && styles.toggleBtnTextActive]}>All Players</Text>
          </TouchableOpacity>
        </View>
      )}

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.accent} />
        </View>
      ) : (
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {displayPayments.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="wallet-outline" size={48} color={colors.textTertiary} />
              <Text style={styles.emptyTitle}>No payments yet</Text>
            </View>
          ) : (
            displayPayments.map((payment) => {
              const isPaid = payment.status === 'paid';
              const isMe = payment.playerId === currentUser?.id;

              return (
                <View key={payment.id} style={styles.paymentCard}>
                  <View style={[styles.paymentStatusDot, { backgroundColor: isPaid ? colors.accent : '#EF4444' }]} />
                  <View style={styles.paymentInfo}>
                    {view === 'all' && (
                      <Text style={styles.paymentPlayer}>{getPlayerName(payment.playerId)}</Text>
                    )}
                    <Text style={styles.paymentMatchDate}>Match · {getMatchDate(payment.matchId)}</Text>
                    <View style={styles.paymentMeta}>
                      <Text style={styles.paymentAmount}>£{payment.amount?.toFixed(2)}</Text>
                      {payment.method && (
                        <View style={styles.methodBadge}>
                          <Text style={styles.methodText}>{payment.method}</Text>
                        </View>
                      )}
                    </View>
                  </View>
                  <View style={styles.paymentRight}>
                    {isPaid ? (
                      <View style={styles.paidBadge}>
                        <Ionicons name="checkmark-circle" size={16} color={colors.accentDark} />
                        <Text style={styles.paidText}>Paid</Text>
                      </View>
                    ) : isMe ? (
                      <TouchableOpacity
                        style={styles.markPaidBtn}
                        onPress={() => markPaidMutation.mutate(payment.id)}
                      >
                        <Text style={styles.markPaidBtnText}>Mark Paid</Text>
                      </TouchableOpacity>
                    ) : (
                      <View style={styles.unpaidBadge}>
                        <Text style={styles.unpaidText}>Unpaid</Text>
                      </View>
                    )}
                  </View>
                </View>
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
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  summaryCard: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.xl,
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
    padding: spacing.md,
    flexDirection: 'row',
    ...shadows.md,
  },
  summaryItem: { flex: 1, alignItems: 'center' },
  summaryLabel: { ...typography.tiny, color: 'rgba(255,255,255,0.6)', marginBottom: 4 },
  summaryValue: { ...typography.h4, color: colors.white },
  summaryValueRed: { color: '#FCA5A5' },
  summaryValueGreen: { color: colors.accentLight },
  summaryPayMethod: { ...typography.smallBold, color: 'rgba(255,255,255,0.8)' },
  summaryDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.15)' },

  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    backgroundColor: colors.primaryTint,
    borderRadius: borderRadius.lg,
    marginHorizontal: spacing.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  infoText: { ...typography.caption, color: colors.primary, flex: 1 },
  infoBold: { fontWeight: '700' },

  toggleRow: { flexDirection: 'row', marginHorizontal: spacing.md, marginBottom: spacing.md, backgroundColor: colors.backgroundTertiary, borderRadius: borderRadius.lg, padding: 4 },
  toggleBtn: { flex: 1, paddingVertical: spacing.sm, borderRadius: borderRadius.md, alignItems: 'center' },
  toggleBtnActive: { backgroundColor: colors.white, ...shadows.xs },
  toggleBtnText: { ...typography.captionBold, color: colors.textSecondary },
  toggleBtnTextActive: { color: colors.primary },

  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: spacing.md },
  emptyState: { alignItems: 'center', paddingTop: spacing.xxxl },
  emptyTitle: { ...typography.h4, color: colors.text, marginTop: spacing.md },

  paymentCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.sm,
    ...shadows.xs,
  },
  paymentStatusDot: { width: 8, height: 8, borderRadius: 4 },
  paymentInfo: { flex: 1 },
  paymentPlayer: { ...typography.captionBold, color: colors.text },
  paymentMatchDate: { ...typography.small, color: colors.textSecondary, marginBottom: 3 },
  paymentMeta: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  paymentAmount: { ...typography.captionBold, color: colors.text },
  methodBadge: { backgroundColor: colors.backgroundTertiary, paddingHorizontal: 6, paddingVertical: 2, borderRadius: borderRadius.full },
  methodText: { ...typography.tiny, color: colors.textSecondary, textTransform: 'capitalize' },
  paymentRight: {},
  paidBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.accentTint, paddingHorizontal: spacing.sm, paddingVertical: 5, borderRadius: borderRadius.full },
  paidText: { ...typography.smallBold, color: colors.accentDark },
  unpaidBadge: { backgroundColor: '#FEE2E2', paddingHorizontal: spacing.sm, paddingVertical: 5, borderRadius: borderRadius.full },
  unpaidText: { ...typography.smallBold, color: '#DC2626' },
  markPaidBtn: { backgroundColor: colors.primary, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: borderRadius.lg },
  markPaidBtnText: { ...typography.smallBold, color: colors.white },
});
