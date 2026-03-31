import React from 'react';
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
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { colors, spacing, borderRadius, typography, shadows } from '@/constants/design';
import { getMatches, getCurrentUser, getPlayers, getMotmVotes, getAttendance } from '@/lib/data';

export default function HistoryScreen() {
  const router = useRouter();

  const { data: matches, isLoading } = useQuery({
    queryKey: ['matches'],
    queryFn: getMatches,
  });

  const { data: players } = useQuery({
    queryKey: ['players'],
    queryFn: getPlayers,
  });

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: getCurrentUser,
  });

  const pastMatches = (matches ?? []).filter((m) => m.status === 'closed');

  const formatDate = (date: string) => {
    const d = new Date(date + 'T12:00:00');
    return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.nav}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color={colors.primary} />
        </TouchableOpacity>
        <Text style={styles.navTitle}>Match History</Text>
        <View style={{ width: 40 }} />
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.accent} />
        </View>
      ) : pastMatches.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="time-outline" size={56} color={colors.textTertiary} />
          <Text style={styles.emptyTitle}>No past matches</Text>
          <Text style={styles.emptySubtitle}>Your match history will appear here</Text>
        </View>
      ) : (
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {pastMatches.map((match) => (
            <MatchHistoryCard
              key={match.id}
              match={match}
              players={players ?? []}
              currentUser={currentUser}
              onPress={() => router.push(`/match/${match.id}`)}
            />
          ))}
          <View style={{ height: spacing.xl }} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function MatchHistoryCard({ match, players, currentUser, onPress }: any) {
  const { data: votes } = useQuery({
    queryKey: ['motmVotes', match.id],
    queryFn: () => getMotmVotes(match.id),
  });

  const { data: attendance } = useQuery({
    queryKey: ['attendance', match.id],
    queryFn: () => getAttendance(match.id),
  });

  const formatDate = (date: string) => {
    const d = new Date(date + 'T12:00:00');
    return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
  };

  // Find MOTM winner
  const voteCount: Record<string, number> = {};
  (votes ?? []).forEach((v: any) => {
    voteCount[v.nomineeId] = (voteCount[v.nomineeId] ?? 0) + 1;
  });
  const maxVotes = Math.max(0, ...Object.values(voteCount));
  const winnerId = maxVotes > 0 ? Object.keys(voteCount).find((k) => voteCount[k] === maxVotes) : null;
  const winner = players.find((p: any) => p.id === winnerId);

  // My team
  const myAtt = (attendance ?? []).find((a: any) => a.playerId === currentUser?.id);
  const myTeam = myAtt?.team;

  const didWin =
    myTeam === 'A'
      ? (match.scoreA ?? 0) > (match.scoreB ?? 0)
      : myTeam === 'B'
      ? (match.scoreB ?? 0) > (match.scoreA ?? 0)
      : null;

  return (
    <TouchableOpacity style={styles.historyCard} onPress={onPress} activeOpacity={0.9}>
      <View style={styles.historyCardTop}>
        <View style={styles.historyDateBlock}>
          <Text style={styles.historyDate}>{formatDate(match.date)}</Text>
          <Text style={styles.historyLocation} numberOfLines={1}>{match.location}</Text>
        </View>
        {match.scoreA !== null && match.scoreB !== null && (
          <View style={styles.scoreBlock}>
            <Text style={styles.scoreA}>{match.scoreA}</Text>
            <Text style={styles.scoreSep}>–</Text>
            <Text style={styles.scoreB}>{match.scoreB}</Text>
          </View>
        )}
      </View>

      <View style={styles.historyCardBottom}>
        {myTeam && (
          <View style={[styles.myTeamChip, { backgroundColor: myTeam === 'A' ? colors.primaryTint : '#FFF1F2' }]}>
            <Text style={[styles.myTeamText, { color: myTeam === 'A' ? colors.primary : '#DC2626' }]}>Team {myTeam}</Text>
            {didWin !== null && (
              <Text style={[styles.resultText, { color: didWin ? colors.accentDark : '#DC2626' }]}>
                {didWin ? '· W' : didWin === false ? '· L' : '· D'}
              </Text>
            )}
          </View>
        )}

        {winner && (
          <View style={styles.motmChip}>
            <Ionicons name="trophy" size={12} color="#D97706" />
            <Text style={styles.motmChipText}>{winner.name}</Text>
          </View>
        )}

        <View style={{ flex: 1 }} />
        <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.backgroundSecondary },
  scroll: { flex: 1 },
  scrollContent: { padding: spacing.md },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  nav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.white, justifyContent: 'center', alignItems: 'center', ...shadows.sm },
  navTitle: { ...typography.captionBold, color: colors.primary, textTransform: 'uppercase', letterSpacing: 0.5 },

  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  emptyTitle: { ...typography.h4, color: colors.text, marginTop: spacing.md },
  emptySubtitle: { ...typography.caption, color: colors.textSecondary, marginTop: spacing.xs, textAlign: 'center' },

  historyCard: { backgroundColor: colors.white, borderRadius: borderRadius.xl, padding: spacing.md, marginBottom: spacing.sm, ...shadows.sm },
  historyCardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.md, paddingBottom: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.backgroundTertiary },
  historyDateBlock: { flex: 1, paddingRight: spacing.md },
  historyDate: { ...typography.captionBold, color: colors.primary },
  historyLocation: { ...typography.small, color: colors.textSecondary, marginTop: 2 },
  scoreBlock: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  scoreA: { ...typography.h3, color: colors.primary },
  scoreSep: { ...typography.body, color: colors.textTertiary },
  scoreB: { ...typography.h3, color: '#DC2626' },
  historyCardBottom: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  myTeamChip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: spacing.sm, paddingVertical: 4, borderRadius: borderRadius.full },
  myTeamText: { ...typography.smallBold },
  resultText: { ...typography.smallBold },
  motmChip: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#FEF3C7', paddingHorizontal: spacing.sm, paddingVertical: 4, borderRadius: borderRadius.full },
  motmChipText: { ...typography.smallBold, color: '#D97706' },
});
