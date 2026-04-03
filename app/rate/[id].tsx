/**
 * SquadPlay — Post-Match Player Rating Screen
 * Route: /rate/[id]   (id = matchId)
 *
 * Players rate their teammates with 1-5 stars after a match.
 * Ratings are optional per player; submit is always enabled.
 */
import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Animated,
  ActivityIndicator,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { getAttendance, getPlayers, getCurrentUser } from '@/lib/data';

// ── Constants ─────────────────────────────────────────────────────────────────

const GREEN        = '#22C55E';
const GREEN_DARK   = '#16A34A';
const GREEN_TINT   = '#F0FDF4';
const GREEN_BDR    = '#BBF7D0';
const NAVY         = '#0F2027';
const GREY_BG      = '#F6F8FA';
const GREY_CARD    = '#FFFFFF';
const GREY_BORDER  = '#E2E8F0';
const GREY_TEXT    = '#5D7A8A';
const GREY_LIGHT   = '#EEF2F5';
const STAR_ON      = '#FBBF24';   // amber
const STAR_OFF     = '#E2E8F0';

const LABELS: Record<number, { text: string; emoji: string }> = {
  1: { text: 'Love the confidence',   emoji: '😅' },
  2: { text: 'I can see the effort',  emoji: '💪' },
  3: { text: 'My kind of player',     emoji: '😊' },
  4: { text: 'Perfect-ish',           emoji: '🔥' },
  5: { text: 'Too good for us',       emoji: '🌟' },
};

// Avatar colour palette — deterministic from name
const AVATAR_COLORS = [
  ['#C8DCE8', NAVY],
  ['#BBF7D0', GREEN_DARK],
  ['#FDE68A', '#92400E'],
  ['#FECACA', '#991B1B'],
  ['#DDD6FE', '#5B21B6'],
  ['#FED7AA', '#9A3412'],
];

function avatarColors(name: string): [string, string] {
  const idx = name.charCodeAt(0) % AVATAR_COLORS.length;
  return AVATAR_COLORS[idx] as [string, string];
}

// ── Star component ────────────────────────────────────────────────────────────

function Star({
  filled, onPress, delay,
}: {
  filled: boolean; onPress: () => void; delay: number;
}) {
  const scale = useRef(new Animated.Value(1)).current;

  const handlePress = () => {
    Animated.sequence([
      Animated.timing(scale, { toValue: 1.4, duration: 80,  useNativeDriver: true }),
      Animated.spring(scale,  { toValue: 1,   friction: 4,  useNativeDriver: true }),
    ]).start();
    onPress();
  };

  return (
    <TouchableOpacity onPress={handlePress} activeOpacity={0.7} hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}>
      <Animated.Text style={[styles.star, { transform: [{ scale }] }]}>
        {filled ? '⭐' : '☆'}
      </Animated.Text>
    </TouchableOpacity>
  );
}

// ── Player card ───────────────────────────────────────────────────────────────

function PlayerCard({
  player,
  rating,
  onRate,
  isMe,
}: {
  player: any;
  rating: number;   // 0 = not rated
  onRate: (stars: number) => void;
  isMe: boolean;
}) {
  const label = rating > 0 ? LABELS[rating] : null;
  const [bg, fg] = avatarColors(player.name ?? 'X');
  const initials = (player.name ?? '?')
    .split(' ')
    .map((w: string) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  if (isMe) {
    return (
      <View style={[styles.card, styles.cardMe]}>
        <View style={[styles.avatarWrap, { backgroundColor: GREY_LIGHT }]}>
          <Text style={[styles.avatarText, { color: GREY_TEXT }]}>{initials}</Text>
        </View>
        <View style={styles.cardBody}>
          <Text style={styles.playerName}>{player.name}</Text>
          <Text style={styles.playerPos}>{player.position ?? 'Player'}</Text>
        </View>
        <View style={styles.youChip}>
          <Text style={styles.youChipText}>You</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.card, rating > 0 && styles.cardRated]}>
      {/* Avatar */}
      <View style={[styles.avatarWrap, { backgroundColor: bg }]}>
        <Text style={[styles.avatarText, { color: fg }]}>{initials}</Text>
        {rating > 0 && (
          <View style={styles.avatarBadge}>
            <Text style={styles.avatarBadgeText}>{rating}</Text>
          </View>
        )}
      </View>

      {/* Info + stars */}
      <View style={styles.cardBody}>
        <View style={styles.nameRow}>
          <Text style={styles.playerName}>{player.name}</Text>
          {rating > 0 && (
            <View style={styles.ratedDot} />
          )}
        </View>
        <Text style={styles.playerPos}>{player.position ?? 'Player'}</Text>

        {/* Stars */}
        <View style={styles.starsRow}>
          {[1, 2, 3, 4, 5].map((n) => (
            <Star
              key={n}
              filled={n <= rating}
              onPress={() => onRate(n === rating ? 0 : n)}   // tap same = deselect
              delay={n * 30}
            />
          ))}
        </View>

        {/* Label */}
        {label ? (
          <Animated.View style={styles.labelRow}>
            <Text style={styles.labelEmoji}>{label.emoji}</Text>
            <Text style={styles.labelText}>{label.text}</Text>
          </Animated.View>
        ) : (
          <Text style={styles.labelPlaceholder}>Tap a star to rate</Text>
        )}
      </View>
    </View>
  );
}

// ── Screen ────────────────────────────────────────────────────────────────────

export default function RateScreen() {
  const { id }      = useLocalSearchParams<{ id: string }>();
  const router      = useRouter();
  const [ratings, setRatings] = useState<Record<string, number>>({});
  const [submitted, setSubmitted] = useState(false);

  const { data: attendance } = useQuery({
    queryKey: ['attendance', id],
    queryFn: () => getAttendance(id),
    enabled: !!id,
  });

  const { data: players, isLoading } = useQuery({
    queryKey: ['players'],
    queryFn: getPlayers,
  });

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: getCurrentUser,
  });

  // Players who attended this match
  const attendees = (attendance ?? [])
    .filter((a) => a.status === 'yes')
    .map((a) => players?.find((p) => p.id === a.player_id))
    .filter(Boolean) as any[];

  const ratedCount = Object.values(ratings).filter((r) => r > 0).length;
  const totalRateable = attendees.filter((p) => p.id !== currentUser?.id).length;

  const handleRate = (playerId: string, stars: number) => {
    setRatings((prev) => ({ ...prev, [playerId]: stars }));
  };

  const handleSubmit = () => {
    // In production: persist ratings to Supabase
    setSubmitted(true);
  };

  // ── Success screen ─────────────────────────────────────────────────────────
  if (submitted) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.successWrap}>
          <Text style={styles.successEmoji}>🎉</Text>
          <Text style={styles.successTitle}>Ratings submitted!</Text>
          <Text style={styles.successSub}>
            Thanks for rating {ratedCount > 0 ? `${ratedCount} teammate${ratedCount > 1 ? 's' : ''}` : 'your team'}.
          </Text>
          <View style={styles.successStats}>
            <View style={styles.successStat}>
              <Text style={styles.successStatNum}>{ratedCount}</Text>
              <Text style={styles.successStatLabel}>Rated</Text>
            </View>
            <View style={styles.successStatDiv} />
            <View style={styles.successStat}>
              <Text style={styles.successStatNum}>{totalRateable - ratedCount}</Text>
              <Text style={styles.successStatLabel}>Skipped</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.doneBtnPrimary} onPress={() => router.back()} activeOpacity={0.85}>
            <Text style={styles.doneBtnText}>Back to Match</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ── Loading ────────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={GREEN} />
        </View>
      </SafeAreaView>
    );
  }

  // ── Empty (no teammates) ───────────────────────────────────────────────────
  if (attendees.filter((p) => p.id !== currentUser?.id).length === 0) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.nav}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={20} color={NAVY} />
          </TouchableOpacity>
          <Text style={styles.navTitle}>Rate Teammates</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.emptyWrap}>
          <Text style={{ fontSize: 48, marginBottom: 16 }}>🏟️</Text>
          <Text style={styles.emptyTitle}>No teammates to rate</Text>
          <Text style={styles.emptySub}>Teams haven't been confirmed for this match yet.</Text>
        </View>
      </SafeAreaView>
    );
  }

  // ── Main ───────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Nav */}
      <View style={styles.nav}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color={NAVY} />
        </TouchableOpacity>
        <Text style={styles.navTitle}>Rate Teammates</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Header card */}
        <View style={styles.headerCard}>
          <Text style={styles.headerTitle}>Rate your teammates</Text>
          <Text style={styles.headerSub}>Keep it fair… but have fun 😄</Text>

          {/* Progress row */}
          <View style={styles.progressWrap}>
            <View style={styles.progressBg}>
              <View
                style={[
                  styles.progressFill,
                  { width: totalRateable > 0 ? `${Math.round((ratedCount / totalRateable) * 100)}%` as any : '0%' },
                ]}
              />
            </View>
            <Text style={styles.progressLabel}>
              {ratedCount}/{totalRateable} rated
            </Text>
          </View>
        </View>

        {/* Rating key */}
        <View style={styles.keyCard}>
          <Text style={styles.keyTitle}>Rating guide</Text>
          <View style={styles.keyGrid}>
            {Object.entries(LABELS).reverse().map(([n, l]) => (
              <View key={n} style={styles.keyRow}>
                <Text style={styles.keyStars}>{'⭐'.repeat(Number(n))}</Text>
                <Text style={styles.keyLabel}>{l.emoji} {l.text}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Player cards */}
        {attendees.map((player) => (
          <PlayerCard
            key={player.id}
            player={player}
            rating={ratings[player.id] ?? 0}
            onRate={(stars) => handleRate(player.id, stars)}
            isMe={player.id === currentUser?.id}
          />
        ))}

        {/* Skip note */}
        <Text style={styles.skipNote}>
          💡 You can skip players if you're unsure — your partial ratings still count.
        </Text>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Sticky footer */}
      <View style={styles.footer}>
        <View style={styles.footerInner}>
          <View style={styles.footerMeta}>
            <Text style={styles.footerMetaNum}>{ratedCount}</Text>
            <Text style={styles.footerMetaLabel}>
              {ratedCount === 1 ? 'player rated' : 'players rated'}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.submitBtn}
            onPress={handleSubmit}
            activeOpacity={0.85}
          >
            <Text style={styles.submitBtnText}>
              {ratedCount === 0 ? 'Skip & Submit' : 'Submit Ratings'}
            </Text>
            <Ionicons name="checkmark-circle" size={18} color="#fff" style={{ marginLeft: 8 }} />
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe:        { flex: 1, backgroundColor: GREY_BG },
  scroll:      { flex: 1 },
  content:     { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 16 },
  loadingWrap: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  // Nav
  nav: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: GREY_CARD,
    justifyContent: 'center', alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08, shadowRadius: 3, elevation: 2,
  },
  navTitle: { fontSize: 15, fontWeight: '700', color: NAVY },

  // Header card
  headerCard: {
    backgroundColor: NAVY, borderRadius: 22,
    padding: 22, marginBottom: 14,
  },
  headerTitle: { fontSize: 22, fontWeight: '800', color: '#fff', marginBottom: 6 },
  headerSub:   { fontSize: 14, color: 'rgba(255,255,255,0.7)', marginBottom: 16 },
  progressWrap: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  progressBg:   { flex: 1, height: 6, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: 6, backgroundColor: GREEN, borderRadius: 3 },
  progressLabel:{ fontSize: 12, fontWeight: '700', color: 'rgba(255,255,255,0.7)' },

  // Rating key
  keyCard: {
    backgroundColor: GREY_CARD, borderRadius: 18, padding: 16,
    marginBottom: 14, borderWidth: 1, borderColor: GREY_BORDER,
  },
  keyTitle: { fontSize: 11, fontWeight: '700', color: GREY_TEXT, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 },
  keyGrid:  { gap: 8 },
  keyRow:   { flexDirection: 'row', alignItems: 'center', gap: 10 },
  keyStars: { fontSize: 13, width: 80 },
  keyLabel: { fontSize: 13, color: NAVY, fontWeight: '500' },

  // Player card
  card: {
    flexDirection: 'row', alignItems: 'flex-start',
    backgroundColor: GREY_CARD, borderRadius: 20, padding: 16,
    marginBottom: 12, borderWidth: 1.5, borderColor: GREY_BORDER,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
  },
  cardRated: {
    borderColor: GREEN_BDR, backgroundColor: GREEN_TINT,
    shadowColor: GREEN, shadowOpacity: 0.12, elevation: 4,
  },
  cardMe: {
    opacity: 0.55, borderStyle: 'dashed',
  },

  // Avatar
  avatarWrap: {
    width: 52, height: 52, borderRadius: 26,
    justifyContent: 'center', alignItems: 'center',
    marginRight: 14, position: 'relative',
  },
  avatarText:   { fontSize: 18, fontWeight: '800' },
  avatarBadge: {
    position: 'absolute', bottom: -2, right: -2,
    width: 20, height: 20, borderRadius: 10,
    backgroundColor: GREEN, justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, borderColor: GREY_CARD,
  },
  avatarBadgeText: { fontSize: 10, fontWeight: '800', color: '#fff' },

  // Card body
  cardBody:  { flex: 1 },
  nameRow:   { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 },
  playerName:{ fontSize: 16, fontWeight: '700', color: NAVY },
  ratedDot:  { width: 7, height: 7, borderRadius: 4, backgroundColor: GREEN },
  playerPos: { fontSize: 12, color: GREY_TEXT, marginBottom: 12 },

  // Stars
  starsRow: { flexDirection: 'row', gap: 6, marginBottom: 8 },
  star:     { fontSize: 28 },

  // Rating label
  labelRow: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(34,197,94,0.1)', borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 5, alignSelf: 'flex-start',
  },
  labelEmoji:      { fontSize: 14 },
  labelText:       { fontSize: 13, fontWeight: '700', color: GREEN_DARK },
  labelPlaceholder:{ fontSize: 12, color: '#C2D0D9', fontStyle: 'italic' },

  // "You" chip
  youChip: {
    backgroundColor: GREY_LIGHT, borderRadius: 50,
    paddingHorizontal: 12, paddingVertical: 5, alignSelf: 'flex-start',
  },
  youChipText: { fontSize: 12, fontWeight: '700', color: GREY_TEXT },

  // Skip note
  skipNote: {
    fontSize: 13, color: GREY_TEXT, textAlign: 'center',
    paddingHorizontal: 24, lineHeight: 18,
  },

  // Empty state
  emptyWrap:  { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: NAVY, marginBottom: 8, textAlign: 'center' },
  emptySub:   { fontSize: 14, color: GREY_TEXT, textAlign: 'center', lineHeight: 20 },

  // Sticky footer
  footer: {
    backgroundColor: GREY_CARD,
    borderTopWidth: 1, borderTopColor: GREY_BORDER,
    paddingBottom: Platform.OS === 'ios' ? 28 : 16,
    paddingTop: 12, paddingHorizontal: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 8,
  },
  footerInner: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  footerMeta: {
    backgroundColor: GREY_LIGHT, borderRadius: 14,
    paddingHorizontal: 16, paddingVertical: 12, alignItems: 'center',
  },
  footerMetaNum:   { fontSize: 22, fontWeight: '800', color: NAVY },
  footerMetaLabel: { fontSize: 10, color: GREY_TEXT, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.3 },
  submitBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: GREEN, borderRadius: 16, paddingVertical: 16,
    shadowColor: GREEN, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 5,
  },
  submitBtnText: { fontSize: 16, fontWeight: '800', color: '#fff' },

  // Success screen
  successWrap: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
    paddingHorizontal: 32,
  },
  successEmoji: { fontSize: 64, marginBottom: 20 },
  successTitle: { fontSize: 28, fontWeight: '800', color: NAVY, marginBottom: 8, textAlign: 'center' },
  successSub:   { fontSize: 15, color: GREY_TEXT, textAlign: 'center', lineHeight: 22, marginBottom: 32 },
  successStats: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: GREY_CARD, borderRadius: 20, borderWidth: 1, borderColor: GREY_BORDER,
    paddingVertical: 20, paddingHorizontal: 32, gap: 32, marginBottom: 32,
  },
  successStat:    { alignItems: 'center' },
  successStatNum: { fontSize: 32, fontWeight: '800', color: NAVY },
  successStatLabel: { fontSize: 13, color: GREY_TEXT, fontWeight: '600', marginTop: 4 },
  successStatDiv: { width: 1, height: 40, backgroundColor: GREY_BORDER },
  doneBtnPrimary: {
    backgroundColor: NAVY, borderRadius: 16, paddingHorizontal: 40, paddingVertical: 16,
  },
  doneBtnText: { fontSize: 16, fontWeight: '800', color: '#fff' },
});
