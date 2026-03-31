import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { colors, spacing, borderRadius, typography, shadows } from '@/constants/design';
import { getAttendance, getPlayers, getCurrentUser, getMotmVotes, castMotmVote } from '@/lib/data';

export default function MotmScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();

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

  const { data: votes } = useQuery({
    queryKey: ['motmVotes', id],
    queryFn: () => getMotmVotes(id),
    enabled: !!id,
  });

  const voteMutation = useMutation({
    mutationFn: (nomineeId: string) => castMotmVote(id, currentUser!.id, nomineeId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['motmVotes', id] }),
  });

  const matchPlayers = (attendance ?? [])
    .filter((a) => a.status === 'yes')
    .map((a) => players?.find((p) => p.id === a.playerId))
    .filter(Boolean);

  const myVote = (votes ?? []).find((v) => v.voterId === currentUser?.id);

  // Count votes per player
  const voteCount: Record<string, number> = {};
  (votes ?? []).forEach((v) => {
    voteCount[v.nomineeId] = (voteCount[v.nomineeId] ?? 0) + 1;
  });

  const maxVotes = Math.max(0, ...Object.values(voteCount));
  const winners = Object.entries(voteCount).filter(([, c]) => c === maxVotes && maxVotes > 0).map(([id]) => id);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.nav}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color={colors.primary} />
        </TouchableOpacity>
        <Text style={styles.navTitle}>Man of the Match</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.headerCard}>
          <View style={styles.trophyCircle}>
            <Ionicons name="trophy" size={36} color="#D97706" />
          </View>
          <Text style={styles.headerTitle}>Vote for MOTM</Text>
          <Text style={styles.headerSubtitle}>Tap a player to cast your vote. You can only vote once.</Text>
          {myVote && (
            <View style={styles.votedBanner}>
              <Ionicons name="checkmark-circle" size={16} color={colors.accentDark} />
              <Text style={styles.votedText}>
                Your vote: {players?.find((p) => p.id === myVote.nomineeId)?.name ?? ''}
              </Text>
            </View>
          )}
        </View>

        {/* Results summary */}
        {votes && votes.length > 0 && (
          <View style={styles.resultsCard}>
            <Text style={styles.resultsTitle}>{votes.length} vote{votes.length !== 1 ? 's' : ''} cast</Text>
            {winners.length > 0 && (
              <View style={styles.leadingRow}>
                <Ionicons name="star" size={14} color="#D97706" />
                <Text style={styles.leadingText}>
                  Leading: {winners.map((wId) => players?.find((p) => p.id === wId)?.name).join(', ')} ({maxVotes} votes)
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Player list */}
        {isLoading ? (
          <ActivityIndicator size="large" color={colors.accent} style={{ marginTop: spacing.xl }} />
        ) : matchPlayers.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>No players found</Text>
          </View>
        ) : (
          matchPlayers.map((player) => {
            if (!player) return null;
            const isMe = player.id === currentUser?.id;
            const isVotedFor = myVote?.nomineeId === player.id;
            const playerVotes = voteCount[player.id] ?? 0;
            const isWinner = winners.includes(player.id) && maxVotes > 0;
            const percentage = votes && votes.length > 0 ? (playerVotes / votes.length) * 100 : 0;

            return (
              <TouchableOpacity
                key={player.id}
                style={[
                  styles.playerCard,
                  isVotedFor && styles.playerCardVoted,
                  isWinner && styles.playerCardWinner,
                  isMe && styles.playerCardMe,
                ]}
                onPress={() => {
                  if (isMe) {
                    Alert.alert("You can't vote for yourself");
                    return;
                  }
                  voteMutation.mutate(player.id);
                }}
                activeOpacity={isMe ? 1 : 0.85}
              >
                <View style={[styles.playerAvatar, isWinner && styles.playerAvatarWinner]}>
                  {isWinner && <View style={styles.crownContainer}><Text style={styles.crown}>👑</Text></View>}
                  <Text style={[styles.playerAvatarText, isWinner && { color: '#D97706' }]}>{player.name.charAt(0)}</Text>
                </View>

                <View style={styles.playerInfo}>
                  <View style={styles.playerNameRow}>
                    <Text style={styles.playerName}>{player.name}</Text>
                    {isMe && <View style={styles.youBadge}><Text style={styles.youBadgeText}>You</Text></View>}
                    {isWinner && <View style={styles.leadingBadge}><Text style={styles.leadingBadgeText}>🏆 Leading</Text></View>}
                  </View>
                  <Text style={styles.playerPos}>{player.position}</Text>
                  {/* Vote bar */}
                  <View style={styles.voteBarContainer}>
                    <View style={[styles.voteBar, { width: `${Math.round(percentage)}%` as any }]} />
                  </View>
                </View>

                <View style={styles.voteRight}>
                  <Text style={styles.voteCount}>{playerVotes}</Text>
                  {isVotedFor && <Ionicons name="checkmark-circle" size={18} color={colors.accentDark} />}
                  {!isMe && !isVotedFor && <Ionicons name="radio-button-off" size={18} color={colors.textTertiary} />}
                </View>
              </TouchableOpacity>
            );
          })
        )}

        <View style={{ height: spacing.xl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.backgroundSecondary },
  scroll: { flex: 1 },
  scrollContent: { padding: spacing.md },

  nav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.white, justifyContent: 'center', alignItems: 'center', ...shadows.sm },
  navTitle: { ...typography.captionBold, color: colors.primary, textTransform: 'uppercase', letterSpacing: 0.5 },

  headerCard: { backgroundColor: colors.white, borderRadius: borderRadius.xl, padding: spacing.lg, alignItems: 'center', marginBottom: spacing.md, ...shadows.sm },
  trophyCircle: { width: 72, height: 72, borderRadius: 36, backgroundColor: '#FEF3C7', justifyContent: 'center', alignItems: 'center', marginBottom: spacing.md },
  headerTitle: { ...typography.h3, color: colors.primary, marginBottom: spacing.xs },
  headerSubtitle: { ...typography.caption, color: colors.textSecondary, textAlign: 'center' },
  votedBanner: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.accentTint, borderRadius: borderRadius.full, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, marginTop: spacing.md },
  votedText: { ...typography.captionBold, color: colors.accentDark },

  resultsCard: { backgroundColor: colors.primaryTint, borderRadius: borderRadius.lg, padding: spacing.md, marginBottom: spacing.md, borderWidth: 1, borderColor: '#B8D4E8' },
  resultsTitle: { ...typography.captionBold, color: colors.primary, marginBottom: 4 },
  leadingRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  leadingText: { ...typography.caption, color: colors.secondary },

  emptyState: { alignItems: 'center', paddingTop: spacing.xl },
  emptyTitle: { ...typography.h4, color: colors.textSecondary },

  playerCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.xl,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1.5,
    borderColor: 'transparent',
    ...shadows.sm,
  },
  playerCardVoted: { borderColor: colors.accent, backgroundColor: colors.accentTint },
  playerCardWinner: { borderColor: '#F59E0B', backgroundColor: '#FFFBEB' },
  playerCardMe: { opacity: 0.6 },

  playerAvatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.primaryTint, justifyContent: 'center', alignItems: 'center', position: 'relative' },
  playerAvatarWinner: { backgroundColor: '#FEF3C7' },
  crownContainer: { position: 'absolute', top: -10, left: '50%', marginLeft: -8 },
  crown: { fontSize: 16 },
  playerAvatarText: { ...typography.bodyBold, color: colors.primary },

  playerInfo: { flex: 1 },
  playerNameRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: 3 },
  playerName: { ...typography.captionBold, color: colors.text },
  youBadge: { backgroundColor: colors.primaryTint, paddingHorizontal: 6, paddingVertical: 2, borderRadius: borderRadius.full },
  youBadgeText: { ...typography.tiny, color: colors.primary, fontWeight: '700' },
  leadingBadge: { backgroundColor: '#FEF3C7', paddingHorizontal: 6, paddingVertical: 2, borderRadius: borderRadius.full },
  leadingBadgeText: { ...typography.tiny, color: '#D97706', fontWeight: '700' },
  playerPos: { ...typography.small, color: colors.textSecondary, marginBottom: spacing.sm },
  voteBarContainer: { height: 4, backgroundColor: colors.backgroundTertiary, borderRadius: 2, overflow: 'hidden' },
  voteBar: { height: '100%', backgroundColor: colors.accent, borderRadius: 2 },

  voteRight: { alignItems: 'center', gap: 3 },
  voteCount: { ...typography.h4, color: colors.primary },
});
