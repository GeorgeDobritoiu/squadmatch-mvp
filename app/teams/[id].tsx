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
import { useLocalSearchParams, useRouter } from 'expo-router';
import { colors, spacing, borderRadius, typography, shadows } from '@/constants/design';
import { getAttendance, getGuests, getPlayers, getMatchById } from '@/lib/data';

export default function TeamsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const { data: match } = useQuery({
    queryKey: ['match', id],
    queryFn: () => getMatchById(id),
    enabled: !!id,
  });

  const { data: attendance, isLoading } = useQuery({
    queryKey: ['attendance', id],
    queryFn: () => getAttendance(id),
    enabled: !!id,
  });

  const { data: guests } = useQuery({
    queryKey: ['guests', id],
    queryFn: () => getGuests(id),
    enabled: !!id,
  });

  const { data: players } = useQuery({
    queryKey: ['players'],
    queryFn: getPlayers,
  });

  const getPlayer = (playerId: string) => players?.find((p) => p.id === playerId);

  const teamA = (attendance ?? []).filter((a) => a.team === 'A' && a.status === 'yes');
  const teamB = (attendance ?? []).filter((a) => a.team === 'B' && a.status === 'yes');
  const guestsA = (guests ?? []).filter((g) => g.team === 'A');
  const guestsB = (guests ?? []).filter((g) => g.team === 'B');

  const formatDate = (date: string) => {
    const d = new Date(date + 'T12:00:00');
    return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.nav}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color={colors.primary} />
        </TouchableOpacity>
        <Text style={styles.navTitle}>Teams</Text>
        <View style={{ width: 40 }} />
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.accent} />
        </View>
      ) : (
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {match && (
            <View style={styles.matchInfo}>
              <Ionicons name="football-outline" size={16} color={colors.textSecondary} />
              <Text style={styles.matchInfoText}>{formatDate(match.date)} · {match.time} · {match.location}</Text>
            </View>
          )}

          {!match?.teamsLocked && (
            <View style={styles.warningBanner}>
              <Ionicons name="warning-outline" size={16} color="#D97706" />
              <Text style={styles.warningText}>Teams are not yet locked. Generate and lock teams to finalise.</Text>
            </View>
          )}

          {teamA.length === 0 && teamB.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="people-outline" size={48} color={colors.textTertiary} />
              <Text style={styles.emptyTitle}>Teams not generated yet</Text>
              <Text style={styles.emptySubtitle}>Admin needs to generate teams first</Text>
            </View>
          ) : (
            <View style={styles.teamsContainer}>
              {/* Team A */}
              <View style={[styles.teamCard, styles.teamCardA]}>
                <View style={styles.teamHeader}>
                  <View style={[styles.teamBadge, styles.teamBadgeA]}>
                    <Text style={styles.teamBadgeText}>A</Text>
                  </View>
                  <Text style={styles.teamName}>Team A</Text>
                  <Text style={styles.teamCount}>{teamA.length + guestsA.length} players</Text>
                </View>
                {teamA.map((att) => {
                  const player = getPlayer(att.playerId);
                  return (
                    <View key={att.id} style={styles.playerRow}>
                      <View style={[styles.playerAvatar, styles.playerAvatarA]}>
                        <Text style={[styles.playerAvatarText, { color: colors.primary }]}>{(player?.name ?? '?').charAt(0)}</Text>
                      </View>
                      <View style={styles.playerInfo}>
                        <Text style={styles.playerName}>{player?.name ?? att.playerId}</Text>
                        <Text style={styles.playerPos}>{player?.position} · {player?.skillLevel}</Text>
                      </View>
                    </View>
                  );
                })}
                {guestsA.map((g) => (
                  <View key={g.id} style={[styles.playerRow, styles.guestRow]}>
                    <View style={[styles.playerAvatar, { backgroundColor: '#EDE9FE' }]}>
                      <Text style={[styles.playerAvatarText, { color: '#7C3AED' }]}>{g.name.charAt(0)}</Text>
                    </View>
                    <View style={styles.playerInfo}>
                      <Text style={styles.playerName}>{g.name} <Text style={styles.guestTag}>(Guest)</Text></Text>
                      <Text style={styles.playerPos}>{g.skillLevel}</Text>
                    </View>
                  </View>
                ))}
              </View>

              {/* VS */}
              <View style={styles.vsContainer}>
                <View style={styles.vsLine} />
                <View style={styles.vsBubble}>
                  <Text style={styles.vsText}>VS</Text>
                </View>
                <View style={styles.vsLine} />
              </View>

              {/* Team B */}
              <View style={[styles.teamCard, styles.teamCardB]}>
                <View style={styles.teamHeader}>
                  <View style={[styles.teamBadge, styles.teamBadgeB]}>
                    <Text style={styles.teamBadgeText}>B</Text>
                  </View>
                  <Text style={styles.teamName}>Team B</Text>
                  <Text style={styles.teamCount}>{teamB.length + guestsB.length} players</Text>
                </View>
                {teamB.map((att) => {
                  const player = getPlayer(att.playerId);
                  return (
                    <View key={att.id} style={styles.playerRow}>
                      <View style={[styles.playerAvatar, styles.playerAvatarB]}>
                        <Text style={[styles.playerAvatarText, { color: '#DC2626' }]}>{(player?.name ?? '?').charAt(0)}</Text>
                      </View>
                      <View style={styles.playerInfo}>
                        <Text style={styles.playerName}>{player?.name ?? att.playerId}</Text>
                        <Text style={styles.playerPos}>{player?.position} · {player?.skillLevel}</Text>
                      </View>
                    </View>
                  );
                })}
                {guestsB.map((g) => (
                  <View key={g.id} style={[styles.playerRow, styles.guestRow]}>
                    <View style={[styles.playerAvatar, { backgroundColor: '#EDE9FE' }]}>
                      <Text style={[styles.playerAvatarText, { color: '#7C3AED' }]}>{g.name.charAt(0)}</Text>
                    </View>
                    <View style={styles.playerInfo}>
                      <Text style={styles.playerName}>{g.name} <Text style={styles.guestTag}>(Guest)</Text></Text>
                      <Text style={styles.playerPos}>{g.skillLevel}</Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          )}

          <View style={{ height: spacing.xl }} />
        </ScrollView>
      )}
    </SafeAreaView>
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

  matchInfo: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.white, borderRadius: borderRadius.lg, padding: spacing.md, marginBottom: spacing.md, ...shadows.xs },
  matchInfoText: { ...typography.small, color: colors.textSecondary, flex: 1 },

  warningBanner: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: '#FEF3C7', borderRadius: borderRadius.lg, padding: spacing.md, marginBottom: spacing.md, borderWidth: 1, borderColor: '#FDE68A' },
  warningText: { ...typography.caption, color: '#92400E', flex: 1 },

  emptyState: { alignItems: 'center', paddingTop: spacing.xxxl },
  emptyTitle: { ...typography.h4, color: colors.text, marginTop: spacing.md },
  emptySubtitle: { ...typography.caption, color: colors.textSecondary, marginTop: spacing.xs, textAlign: 'center' },

  teamsContainer: { gap: spacing.sm },

  teamCard: { borderRadius: borderRadius.xl, padding: spacing.md, ...shadows.sm },
  teamCardA: { backgroundColor: colors.primaryTint, borderWidth: 1.5, borderColor: '#B8D4E8' },
  teamCardB: { backgroundColor: '#FFF1F2', borderWidth: 1.5, borderColor: '#FECDD3' },

  teamHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md, paddingBottom: spacing.md, borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.07)' },
  teamBadge: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  teamBadgeA: { backgroundColor: colors.primary },
  teamBadgeB: { backgroundColor: '#DC2626' },
  teamBadgeText: { ...typography.captionBold, color: colors.white },
  teamName: { ...typography.captionBold, color: colors.text, flex: 1 },
  teamCount: { ...typography.small, color: colors.textSecondary },

  playerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.sm },
  guestRow: { opacity: 0.85 },
  playerAvatar: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  playerAvatarA: { backgroundColor: '#D4E8F5' },
  playerAvatarB: { backgroundColor: '#FEE2E2' },
  playerAvatarText: { ...typography.captionBold },
  playerInfo: { flex: 1 },
  playerName: { ...typography.captionBold, color: colors.text },
  playerPos: { ...typography.small, color: colors.textSecondary },
  guestTag: { color: '#7C3AED', fontWeight: '400' },

  vsContainer: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.xs },
  vsLine: { flex: 1, height: 1, backgroundColor: colors.border },
  vsBubble: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.white, justifyContent: 'center', alignItems: 'center', ...shadows.sm },
  vsText: { ...typography.smallBold, color: colors.textSecondary },
});
