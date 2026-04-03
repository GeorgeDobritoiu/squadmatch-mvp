/**
 * SquadPlay — Payments Screen
 * Player view: outstanding balance, payment instructions, history.
 * Admin view: match overview, per-player status, remind / mark-paid actions.
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { colors, spacing, borderRadius, typography, shadows } from '@/constants/design';
import { getAllPayments, getPlayers, getCurrentUser, markPayment, getMatches } from '@/lib/data';

// ── Tokens ────────────────────────────────────────────────────────────────────

const GREEN       = '#22C55E';
const GREEN_DARK  = '#16A34A';
const GREEN_TINT  = '#F0FDF4';
const GREEN_BDR   = '#BBF7D0';
const RED         = '#EF4444';
const RED_DARK    = '#DC2626';
const RED_TINT    = '#FEF2F2';
const RED_BDR     = '#FECACA';
const YELLOW      = '#F59E0B';
const YELLOW_TINT = '#FFFBEB';
const YELLOW_BDR  = '#FDE68A';
const NAVY        = '#0F2027';
const GREY_BG     = '#F6F8FA';
const GREY_CARD   = '#FFFFFF';
const GREY_BORDER = '#E2E8F0';
const GREY_TEXT   = '#5D7A8A';
const GREY_LIGHT  = '#EEF2F5';

type FilterTab = 'all' | 'unpaid' | 'pending' | 'paid';

// ── Helpers ───────────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const cfg =
    status === 'paid'
      ? { bg: GREEN_TINT,   border: GREEN_BDR,  text: GREEN_DARK, label: 'Paid',    icon: 'checkmark-circle' as const }
      : status === 'pending'
      ? { bg: YELLOW_TINT,  border: YELLOW_BDR, text: '#92400E',  label: 'Pending', icon: 'time-outline' as const }
      : { bg: RED_TINT,     border: RED_BDR,    text: RED_DARK,   label: 'Unpaid',  icon: 'close-circle-outline' as const };

  return (
    <View style={[s.badge, { backgroundColor: cfg.bg, borderColor: cfg.border }]}>
      <Ionicons name={cfg.icon} size={11} color={cfg.text} />
      <Text style={[s.badgeText, { color: cfg.text }]}>{cfg.label}</Text>
    </View>
  );
}

function Avatar({ name, size = 38 }: { name: string; size?: number }) {
  const initials = name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();
  return (
    <View style={[s.avatar, { width: size, height: size, borderRadius: size / 2 }]}>
      <Text style={[s.avatarText, { fontSize: size * 0.38 }]}>{initials}</Text>
    </View>
  );
}

// ── Screen ────────────────────────────────────────────────────────────────────

export default function PaymentsScreen() {
  const queryClient = useQueryClient();
  const [filter, setFilter]           = useState<FilterTab>('all');
  const [remindModal, setRemindModal] = useState(false);
  const [remindTarget, setRemindTarget] = useState<string | null>(null); // null = all

  // ── Data ──────────────────────────────────────────────────────────────────

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
    mutationFn: ({ id, method }: { id: string; method: string }) =>
      markPayment(id, 'paid', method),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['allPayments'] }),
  });

  const markPendingMutation = useMutation({
    mutationFn: (id: string) => markPayment(id, 'pending'),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['allPayments'] }),
  });

  // ── Derived ───────────────────────────────────────────────────────────────

  const isAdmin = currentUser?.role === 'admin';

  const getPlayerName = (id: string) =>
    players?.find((p) => p.id === id)?.name ?? 'Unknown';

  const getMatchLabel = (id: string) => {
    const m = matches?.find((m) => m.id === id);
    if (!m) return 'Match';
    const d = new Date(m.date + 'T12:00:00');
    const day = d.toLocaleDateString('en-GB', { weekday: 'long' });
    return `${day} 7-a-side`;
  };

  const formatDate = (id: string) => {
    const m = matches?.find((m) => m.id === id);
    if (!m) return '';
    const d = new Date(m.date + 'T12:00:00');
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const allPayments  = payments ?? [];
  const myPayments   = allPayments.filter((p) => p.player_id === currentUser?.id);

  // Player-view derived
  const currentDebt  = myPayments.filter((p) => p.status !== 'paid');
  const latestDue    = currentDebt[0] ?? null;
  const totalOwed    = currentDebt.reduce((s, p) => s + (p.amount ?? 0), 0);
  const history      = myPayments.filter((p) => p.status === 'paid');

  // Admin-view derived
  const totalCost    = allPayments.reduce((s, p) => s + (p.amount ?? 0), 0);
  const paidCount    = allPayments.filter((p) => p.status === 'paid').length;
  const unpaidCount  = allPayments.filter((p) => p.status !== 'paid').length;
  const collected    = allPayments.filter((p) => p.status === 'paid').reduce((s, p) => s + (p.amount ?? 0), 0);
  const outstanding  = allPayments.filter((p) => p.status !== 'paid').reduce((s, p) => s + (p.amount ?? 0), 0);

  const filtered = allPayments.filter((p) => {
    if (filter === 'all') return true;
    return p.status === filter;
  });

  // ── Remind action ─────────────────────────────────────────────────────────

  const handleRemind = (playerId: string | null) => {
    setRemindTarget(playerId);
    setRemindModal(true);
  };

  const sendReminder = () => {
    setRemindModal(false);
    const msg = remindTarget
      ? `Reminder sent to ${getPlayerName(remindTarget)}.`
      : `Reminders sent to all ${unpaidCount} unpaid players.`;
    if (Platform.OS === 'web') window.alert(msg);
    else Alert.alert('Reminder sent', msg);
  };

  // ── Loading ───────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <SafeAreaView style={s.safe} edges={['top']}>
        <View style={s.loadingWrap}>
          <ActivityIndicator size="large" color={GREEN} />
        </View>
      </SafeAreaView>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      {/* ── HEADER ── */}
      <View style={s.header}>
        <View>
          <Text style={s.headerTitle}>Payments</Text>
          <Text style={s.headerSub}>
            {isAdmin ? 'Manage match payments' : 'Track your match payments'}
          </Text>
        </View>
        {isAdmin && (
          <View style={s.adminBadge}>
            <Ionicons name="shield-checkmark" size={12} color={GREEN_DARK} />
            <Text style={s.adminBadgeText}>Admin</Text>
          </View>
        )}
      </View>

      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.content}
        showsVerticalScrollIndicator={false}
      >
        {isAdmin ? (
          <AdminView
            totalCost={totalCost}
            playersCount={allPayments.length}
            paidCount={paidCount}
            unpaidCount={unpaidCount}
            collected={collected}
            outstanding={outstanding}
            payments={filtered}
            filter={filter}
            setFilter={setFilter}
            getPlayerName={getPlayerName}
            getMatchLabel={getMatchLabel}
            formatDate={formatDate}
            onRemindAll={() => handleRemind(null)}
            onRemindPlayer={(id) => handleRemind(id)}
            onMarkPaid={(id) => markPaidMutation.mutate({ id, method: 'cash' })}
            onConfirmPaid={(id) => markPaidMutation.mutate({ id, method: 'confirmed' })}
          />
        ) : (
          <PlayerView
            latestDue={latestDue}
            totalOwed={totalOwed}
            history={history}
            getMatchLabel={getMatchLabel}
            formatDate={formatDate}
            onMarkPaid={(id) => markPendingMutation.mutate(id)}
          />
        )}

        <View style={{ height: 32 }} />
      </ScrollView>

      {/* ── REMIND MODAL ── */}
      <Modal transparent visible={remindModal} animationType="fade" onRequestClose={() => setRemindModal(false)}>
        <View style={s.modalOverlay}>
          <View style={s.modalCard}>
            <View style={s.modalIconWrap}>
              <Ionicons name="notifications" size={28} color={GREEN} />
            </View>
            <Text style={s.modalTitle}>Send payment reminder?</Text>
            <Text style={s.modalBody}>
              {remindTarget
                ? `This will notify ${getPlayerName(remindTarget)} about their outstanding payment.`
                : `This will notify all ${unpaidCount} players with outstanding payments.`}
            </Text>
            <View style={s.modalActions}>
              <TouchableOpacity style={s.modalCancel} onPress={() => setRemindModal(false)}>
                <Text style={s.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.modalSend} onPress={sendReminder}>
                <Ionicons name="send" size={14} color="#fff" style={{ marginRight: 6 }} />
                <Text style={s.modalSendText}>Send</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ── Player View ───────────────────────────────────────────────────────────────

function PlayerView({
  latestDue, totalOwed, history,
  getMatchLabel, formatDate, onMarkPaid,
}: {
  latestDue: any;
  totalOwed: number;
  history: any[];
  getMatchLabel: (id: string) => string;
  formatDate: (id: string) => string;
  onMarkPaid: (id: string) => void;
}) {
  // Empty state
  if (!latestDue && history.length === 0) {
    return (
      <View style={s.emptyCard}>
        <Text style={s.emptyEmoji}>✅</Text>
        <Text style={s.emptyTitle}>No payment due</Text>
        <Text style={s.emptySub}>You're all caught up</Text>
      </View>
    );
  }

  return (
    <>
      {/* Outstanding card */}
      {latestDue ? (
        <View style={[s.card, s.outstandingCard]}>
          <View style={s.outstandingTop}>
            <View>
              <Text style={s.outstandingLabel}>Outstanding payment</Text>
              <Text style={s.outstandingAmount}>£{(latestDue.amount ?? 0).toFixed(2)}</Text>
            </View>
            <StatusBadge status={latestDue.status} />
          </View>

          <View style={s.matchInfo}>
            <View style={s.matchInfoRow}>
              <Ionicons name="football-outline" size={14} color={GREY_TEXT} />
              <Text style={s.matchInfoText}>{getMatchLabel(latestDue.match_id)}</Text>
            </View>
            <View style={s.matchInfoRow}>
              <Ionicons name="calendar-outline" size={14} color={GREY_TEXT} />
              <Text style={s.matchInfoText}>{formatDate(latestDue.match_id)}</Text>
            </View>
          </View>

          <View style={s.divider} />

          <TouchableOpacity
            style={s.ctaPrimary}
            onPress={() => onMarkPaid(latestDue.id)}
            activeOpacity={0.85}
          >
            <Ionicons name="checkmark-circle-outline" size={18} color="#fff" />
            <Text style={s.ctaPrimaryText}>I've Paid</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={[s.card, s.allClearCard]}>
          <Ionicons name="checkmark-done-circle" size={28} color={GREEN} />
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={s.allClearTitle}>No payment due</Text>
            <Text style={s.allClearSub}>You're all caught up</Text>
          </View>
        </View>
      )}

      {/* Payment instructions */}
      <View style={s.card}>
        <Text style={s.sectionLabel}>How to pay</Text>
        {[
          { icon: 'person-outline',     label: 'Pay to',    value: 'Group Admin'              },
          { icon: 'card-outline',       label: 'Method',    value: 'Revolut · Bank · Cash'    },
          { icon: 'pricetag-outline',   label: 'Reference', value: 'Your name'                },
          { icon: 'chatbubble-outline', label: 'Note',      value: 'Pay before match day'     },
        ].map((row) => (
          <View key={row.label} style={s.instrRow}>
            <View style={s.instrIconWrap}>
              <Ionicons name={row.icon as any} size={15} color={NAVY} />
            </View>
            <View style={s.instrText}>
              <Text style={s.instrLabel}>{row.label}</Text>
              <Text style={s.instrValue}>{row.value}</Text>
            </View>
          </View>
        ))}
      </View>

      {/* Payment history */}
      {history.length > 0 && (
        <View style={s.card}>
          <Text style={s.sectionLabel}>Payment history</Text>
          {history.map((p, i) => (
            <View key={p.id} style={[s.historyRow, i < history.length - 1 && s.historyRowBorder]}>
              <View style={s.historyLeft}>
                <Text style={s.historyMatch}>{getMatchLabel(p.match_id)}</Text>
                <Text style={s.historyDate}>{formatDate(p.match_id)}</Text>
              </View>
              <View style={s.historyRight}>
                <Text style={s.historyAmount}>£{(p.amount ?? 0).toFixed(2)}</Text>
                <StatusBadge status={p.status} />
              </View>
            </View>
          ))}
        </View>
      )}
    </>
  );
}

// ── Admin View ────────────────────────────────────────────────────────────────

function AdminView({
  totalCost, playersCount, paidCount, unpaidCount,
  collected, outstanding, payments, filter, setFilter,
  getPlayerName, getMatchLabel, formatDate,
  onRemindAll, onRemindPlayer, onMarkPaid, onConfirmPaid,
}: {
  totalCost: number; playersCount: number; paidCount: number; unpaidCount: number;
  collected: number; outstanding: number; payments: any[]; filter: FilterTab;
  setFilter: (f: FilterTab) => void;
  getPlayerName: (id: string) => string; getMatchLabel: (id: string) => string;
  formatDate: (id: string) => string;
  onRemindAll: () => void; onRemindPlayer: (id: string) => void;
  onMarkPaid: (id: string) => void; onConfirmPaid: (id: string) => void;
}) {
  const pct = playersCount > 0 ? Math.round((paidCount / playersCount) * 100) : 0;

  return (
    <>
      {/* Summary card */}
      <View style={[s.card, s.summaryCard]}>
        <View style={s.summaryHeader}>
          <View>
            <Text style={s.summaryTitle}>Match Overview</Text>
            <Text style={s.summarySubtitle}>
              {paidCount} of {playersCount} players paid
            </Text>
          </View>
          <View style={s.collectedPill}>
            <Text style={s.collectedAmount}>£{collected.toFixed(2)}</Text>
            <Text style={s.collectedLabel}>collected</Text>
          </View>
        </View>

        {/* Progress bar */}
        <View style={s.progressBg}>
          <View style={[s.progressFill, { width: `${pct}%` as any }]} />
        </View>
        <Text style={s.progressLabel}>{pct}% collected</Text>

        {/* Stats row */}
        <View style={s.statsRow}>
          {[
            { label: 'Total cost',   value: `£${totalCost.toFixed(2)}`, color: NAVY   },
            { label: 'Paid',         value: String(paidCount),          color: GREEN_DARK  },
            { label: 'Unpaid',       value: String(unpaidCount),        color: RED_DARK },
            { label: 'Outstanding',  value: `£${outstanding.toFixed(2)}`, color: RED_DARK },
          ].map((stat, i) => (
            <React.Fragment key={stat.label}>
              {i > 0 && <View style={s.statDivider} />}
              <View style={s.statItem}>
                <Text style={[s.statValue, { color: stat.color }]}>{stat.value}</Text>
                <Text style={s.statLabel}>{stat.label}</Text>
              </View>
            </React.Fragment>
          ))}
        </View>

        {unpaidCount > 0 && (
          <TouchableOpacity style={s.remindAllBtn} onPress={onRemindAll} activeOpacity={0.85}>
            <Ionicons name="notifications-outline" size={16} color="#fff" />
            <Text style={s.remindAllText}>Remind all unpaid ({unpaidCount})</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Filter tabs */}
      <View style={s.tabRow}>
        {(['all', 'unpaid', 'pending', 'paid'] as FilterTab[]).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[s.tab, filter === tab && s.tabActive]}
            onPress={() => setFilter(tab)}
          >
            <Text style={[s.tabText, filter === tab && s.tabTextActive]}>
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Player list */}
      {payments.length === 0 ? (
        <View style={s.emptyCard}>
          <Text style={s.emptyEmoji}>🎉</Text>
          <Text style={s.emptyTitle}>
            {filter === 'unpaid' ? 'Everyone has paid!' : 'No payments here'}
          </Text>
          <Text style={s.emptySub}>
            {filter === 'unpaid' ? 'No outstanding balances' : 'Try a different filter'}
          </Text>
        </View>
      ) : (
        <View style={s.card}>
          {payments.map((p, i) => {
            const name   = getPlayerName(p.player_id);
            const isPaid = p.status === 'paid';
            const isPending = p.status === 'pending';
            const isLast = i === payments.length - 1;

            return (
              <View key={p.id} style={[s.playerRow, !isLast && s.playerRowBorder]}>
                <Avatar name={name} size={40} />
                <View style={s.playerInfo}>
                  <Text style={s.playerName}>{name}</Text>
                  <Text style={s.playerMatch}>{getMatchLabel(p.match_id)} · {formatDate(p.match_id)}</Text>
                  {p.reminded_at && (
                    <Text style={s.remindedNote}>Reminded 2h ago</Text>
                  )}
                </View>
                <View style={s.playerRight}>
                  <Text style={s.playerAmount}>£{(p.amount ?? 0).toFixed(2)}</Text>
                  <StatusBadge status={p.status} />
                  {/* Actions */}
                  {!isPaid && (
                    <View style={s.actionRow}>
                      {!isPending && (
                        <TouchableOpacity
                          style={s.actionRemind}
                          onPress={() => onRemindPlayer(p.player_id)}
                        >
                          <Ionicons name="notifications-outline" size={12} color={GREY_TEXT} />
                          <Text style={s.actionRemindText}>Remind</Text>
                        </TouchableOpacity>
                      )}
                      <TouchableOpacity
                        style={s.actionMarkPaid}
                        onPress={() => isPending ? onConfirmPaid(p.id) : onMarkPaid(p.id)}
                      >
                        <Text style={s.actionMarkPaidText}>
                          {isPending ? 'Confirm' : 'Mark paid'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              </View>
            );
          })}
        </View>
      )}
    </>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  safe:        { flex: 1, backgroundColor: GREY_BG },
  scroll:      { flex: 1 },
  content:     { paddingHorizontal: 16, paddingTop: 4 },
  loadingWrap: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  // Header
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 8, paddingBottom: 16,
  },
  headerTitle: { fontSize: 26, fontWeight: '800', color: NAVY, letterSpacing: -0.3 },
  headerSub:   { fontSize: 13, color: GREY_TEXT, marginTop: 2 },
  adminBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: GREEN_TINT, borderWidth: 1, borderColor: GREEN_BDR,
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 50,
  },
  adminBadgeText: { fontSize: 12, fontWeight: '700', color: GREEN_DARK },

  // Card base
  card: {
    backgroundColor: GREY_CARD, borderRadius: 22, padding: 18,
    marginBottom: 14, borderWidth: 1, borderColor: GREY_BORDER,
    ...shadows.sm,
  } as any,

  // Outstanding card
  outstandingCard: { borderColor: RED_BDR, borderWidth: 1.5 },
  outstandingTop: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
    marginBottom: 14,
  },
  outstandingLabel: { fontSize: 12, fontWeight: '600', color: GREY_TEXT, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 },
  outstandingAmount: { fontSize: 44, fontWeight: '800', color: NAVY, lineHeight: 48 },

  matchInfo: { gap: 6, marginBottom: 4 },
  matchInfoRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  matchInfoText: { fontSize: 14, color: GREY_TEXT, fontWeight: '500' },

  divider: { height: 1, backgroundColor: GREY_BORDER, marginVertical: 16 },

  ctaPrimary: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: NAVY, borderRadius: 14, paddingVertical: 15,
  },
  ctaPrimaryText: { fontSize: 16, fontWeight: '700', color: '#fff' },

  // All clear card
  allClearCard: {
    flexDirection: 'row', alignItems: 'center',
    borderColor: GREEN_BDR, backgroundColor: GREEN_TINT,
  },
  allClearTitle: { fontSize: 16, fontWeight: '700', color: GREEN_DARK },
  allClearSub:   { fontSize: 13, color: GREEN_DARK, opacity: 0.7, marginTop: 2 },

  // Payment instructions
  sectionLabel: {
    fontSize: 11, fontWeight: '700', color: GREY_TEXT,
    textTransform: 'uppercase', letterSpacing: 1, marginBottom: 14,
  },
  instrRow:     { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  instrIconWrap:{ width: 34, height: 34, borderRadius: 10, backgroundColor: GREY_LIGHT, justifyContent: 'center', alignItems: 'center' },
  instrText:    { flex: 1 },
  instrLabel:   { fontSize: 11, color: GREY_TEXT, fontWeight: '600', marginBottom: 1 },
  instrValue:   { fontSize: 14, color: NAVY, fontWeight: '600' },

  // History
  historyRow:       { flexDirection: 'row', alignItems: 'center', paddingVertical: 12 },
  historyRowBorder: { borderBottomWidth: 1, borderBottomColor: GREY_BORDER },
  historyLeft:      { flex: 1 },
  historyMatch:     { fontSize: 14, fontWeight: '600', color: NAVY, marginBottom: 2 },
  historyDate:      { fontSize: 12, color: GREY_TEXT },
  historyRight:     { alignItems: 'flex-end', gap: 5 },
  historyAmount:    { fontSize: 15, fontWeight: '700', color: NAVY },

  // Empty state
  emptyCard: {
    backgroundColor: GREY_CARD, borderRadius: 22, padding: 36,
    alignItems: 'center', borderWidth: 1, borderColor: GREY_BORDER,
    marginBottom: 14,
  },
  emptyEmoji: { fontSize: 40, marginBottom: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: NAVY, marginBottom: 6 },
  emptySub:   { fontSize: 14, color: GREY_TEXT, textAlign: 'center' },

  // Badge
  badge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    borderWidth: 1, borderRadius: 50, paddingHorizontal: 8, paddingVertical: 4,
  },
  badgeText: { fontSize: 11, fontWeight: '700' },

  // Avatar
  avatar:     { backgroundColor: '#C8DCE8', justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontWeight: '700', color: NAVY },

  // Admin summary card
  summaryCard: { padding: 20 },
  summaryHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  summaryTitle:    { fontSize: 18, fontWeight: '800', color: NAVY, marginBottom: 3 },
  summarySubtitle: { fontSize: 13, color: GREY_TEXT },
  collectedPill: {
    backgroundColor: GREEN_TINT, borderRadius: 14, borderWidth: 1,
    borderColor: GREEN_BDR, paddingHorizontal: 14, paddingVertical: 8, alignItems: 'center',
  },
  collectedAmount: { fontSize: 20, fontWeight: '800', color: GREEN_DARK },
  collectedLabel:  { fontSize: 10, color: GREEN_DARK, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },

  progressBg:    { height: 8, backgroundColor: GREY_LIGHT, borderRadius: 4, marginBottom: 4, overflow: 'hidden' },
  progressFill:  { height: 8, backgroundColor: GREEN, borderRadius: 4 },
  progressLabel: { fontSize: 12, color: GREY_TEXT, fontWeight: '600', marginBottom: 16 },

  statsRow:   { flexDirection: 'row', marginBottom: 18 },
  statItem:   { flex: 1, alignItems: 'center' },
  statDivider:{ width: 1, backgroundColor: GREY_BORDER },
  statValue:  { fontSize: 16, fontWeight: '800', marginBottom: 2 },
  statLabel:  { fontSize: 10, color: GREY_TEXT, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.3 },

  remindAllBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: NAVY, borderRadius: 14, paddingVertical: 13,
  },
  remindAllText: { fontSize: 15, fontWeight: '700', color: '#fff' },

  // Filter tabs
  tabRow: {
    flexDirection: 'row', backgroundColor: GREY_LIGHT, borderRadius: 50,
    padding: 3, marginBottom: 14,
  },
  tab: {
    flex: 1, paddingVertical: 9, borderRadius: 50, alignItems: 'center',
  },
  tabActive:    { backgroundColor: GREY_CARD, ...shadows.xs } as any,
  tabText:      { fontSize: 13, fontWeight: '600', color: GREY_TEXT },
  tabTextActive:{ color: NAVY },

  // Player list
  playerRow:       { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 14, gap: 12 },
  playerRowBorder: { borderBottomWidth: 1, borderBottomColor: GREY_BORDER },
  playerInfo:      { flex: 1, minWidth: 0 },
  playerName:      { fontSize: 15, fontWeight: '700', color: NAVY, marginBottom: 2 },
  playerMatch:     { fontSize: 12, color: GREY_TEXT, marginBottom: 4 },
  remindedNote:    { fontSize: 11, color: YELLOW, fontWeight: '600' },
  playerRight:     { alignItems: 'flex-end', gap: 6 },
  playerAmount:    { fontSize: 16, fontWeight: '800', color: NAVY },

  actionRow:       { flexDirection: 'row', gap: 6, marginTop: 4 },
  actionRemind: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    borderWidth: 1, borderColor: GREY_BORDER, borderRadius: 8,
    paddingHorizontal: 8, paddingVertical: 5,
  },
  actionRemindText: { fontSize: 11, fontWeight: '600', color: GREY_TEXT },
  actionMarkPaid: {
    backgroundColor: NAVY, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5,
  },
  actionMarkPaidText: { fontSize: 11, fontWeight: '700', color: '#fff' },

  // Remind modal
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: GREY_CARD, borderTopLeftRadius: 28, borderTopRightRadius: 28,
    padding: 28, paddingBottom: Platform.OS === 'ios' ? 44 : 28,
  },
  modalIconWrap: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: GREEN_TINT, justifyContent: 'center', alignItems: 'center',
    alignSelf: 'center', marginBottom: 16,
  },
  modalTitle:  { fontSize: 20, fontWeight: '800', color: NAVY, textAlign: 'center', marginBottom: 8 },
  modalBody:   { fontSize: 14, color: GREY_TEXT, textAlign: 'center', lineHeight: 20, marginBottom: 28 },
  modalActions:{ flexDirection: 'row', gap: 12 },
  modalCancel: {
    flex: 1, borderWidth: 1.5, borderColor: GREY_BORDER,
    borderRadius: 14, paddingVertical: 15, alignItems: 'center',
  },
  modalCancelText: { fontSize: 15, fontWeight: '700', color: NAVY },
  modalSend: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: GREEN, borderRadius: 14, paddingVertical: 15,
  },
  modalSendText: { fontSize: 15, fontWeight: '700', color: '#fff' },
});
