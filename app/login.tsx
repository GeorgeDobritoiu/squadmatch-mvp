/**
 * SquadPlay — Login Screen
 * Existing players pick their name from the squad list to log in.
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { colors, spacing, borderRadius, typography, shadows } from '@/constants/design';
import { getPlayers, loginAsPlayer } from '@/lib/data';

const POSITION_COLOR: Record<string, string> = {
  Goalkeeper: '#7C3AED',
  Defender:   '#2563EB',
  Midfielder: '#D97706',
  Striker:    '#DC2626',
  Any:        '#16A34A',
};

const SKILL_STARS: Record<string, number> = { Low: 1, Medium: 2, High: 3 };

function Stars({ count }: { count: number }) {
  return (
    <View style={{ flexDirection: 'row', gap: 1 }}>
      {Array.from({ length: 3 }).map((_, i) => (
        <Ionicons
          key={i}
          name={i < count ? 'star' : 'star-outline'}
          size={11}
          color={i < count ? '#D97706' : colors.textTertiary}
        />
      ))}
    </View>
  );
}

export default function LoginScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState('');

  const { data: players, isLoading } = useQuery({
    queryKey: ['players'],
    queryFn: getPlayers,
  });

  const loginMutation = useMutation({
    mutationFn: (playerId: string) => loginAsPlayer(playerId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['currentUser'] });
      queryClient.invalidateQueries({ queryKey: ['players'] });
      router.replace('/home');
    },
  });

  const filtered = (players ?? []).filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()),
  );

  const handleLogin = (playerId: string) => {
    setSelectedId(playerId);
    loginMutation.mutate(playerId);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Nav */}
      <View style={styles.nav}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color={colors.primary} />
        </TouchableOpacity>
        <Text style={styles.navTitle}>Log In</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.inner}>
        {/* Heading */}
        <View style={styles.headingWrap}>
          <View style={styles.headingIcon}>
            <Ionicons name="people-outline" size={28} color={colors.accent} />
          </View>
          <Text style={styles.heading}>Welcome back!</Text>
          <Text style={styles.subHeading}>
            Select your name from the squad list to log in.
          </Text>
        </View>

        {/* Search */}
        <View style={styles.searchWrapper}>
          <Ionicons name="search-outline" size={18} color={colors.textTertiary} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            value={search}
            onChangeText={setSearch}
            placeholder="Search your name…"
            placeholderTextColor={colors.textTertiary}
            autoCapitalize="words"
            returnKeyType="search"
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={18} color={colors.textTertiary} />
            </TouchableOpacity>
          )}
        </View>

        {/* Player List */}
        {isLoading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color={colors.accent} />
          </View>
        ) : filtered.length === 0 ? (
          <View style={styles.emptyWrap}>
            <Ionicons name="person-outline" size={40} color={colors.textTertiary} />
            <Text style={styles.emptyText}>No players found</Text>
            <TouchableOpacity onPress={() => router.replace('/signup')}>
              <Text style={styles.emptyLink}>Create a new account</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <ScrollView showsVerticalScrollIndicator={false} style={styles.list}>
            {filtered.map((player) => {
              const isSelected = selectedId === player.id;
              const posColor = POSITION_COLOR[player.position] ?? colors.primary;
              const stars = SKILL_STARS[player.skillLevel] ?? 1;
              return (
                <TouchableOpacity
                  key={player.id}
                  style={[styles.playerCard, isSelected && styles.playerCardActive]}
                  onPress={() => handleLogin(player.id)}
                  activeOpacity={0.8}
                  disabled={loginMutation.isPending}
                >
                  {/* Avatar */}
                  <View style={[styles.avatar, { backgroundColor: posColor + '22', borderColor: posColor + '44' }]}>
                    <Text style={[styles.avatarText, { color: posColor }]}>
                      {player.name.charAt(0).toUpperCase()}
                    </Text>
                  </View>

                  {/* Info */}
                  <View style={styles.playerInfo}>
                    <Text style={[styles.playerName, isSelected && styles.playerNameActive]}>
                      {player.name}
                    </Text>
                    <View style={styles.playerMeta}>
                      <View style={[styles.posBadge, { backgroundColor: posColor + '18' }]}>
                        <Text style={[styles.posText, { color: posColor }]}>{player.position}</Text>
                      </View>
                      <Stars count={stars} />
                    </View>
                  </View>

                  {/* Right */}
                  {isSelected && loginMutation.isPending ? (
                    <ActivityIndicator size="small" color={colors.accent} />
                  ) : isSelected ? (
                    <Ionicons name="checkmark-circle" size={22} color={colors.accent} />
                  ) : (
                    <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
                  )}
                </TouchableOpacity>
              );
            })}
            <View style={{ height: spacing.xl }} />
          </ScrollView>
        )}

        {/* New account link */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Not in the list? </Text>
          <TouchableOpacity onPress={() => router.replace('/signup')}>
            <Text style={styles.footerLink}>Create a new account</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.backgroundSecondary },
  inner: { flex: 1, paddingHorizontal: spacing.md },

  nav: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: colors.white,
    justifyContent: 'center', alignItems: 'center',
    ...shadows.sm,
  },
  navTitle: {
    ...typography.captionBold, color: colors.primary,
    textTransform: 'uppercase', letterSpacing: 0.5,
  },

  headingWrap: { alignItems: 'center', paddingVertical: spacing.lg },
  headingIcon: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: colors.accentTint,
    justifyContent: 'center', alignItems: 'center',
    marginBottom: spacing.md,
  },
  heading: { ...typography.h2, color: colors.primary, textAlign: 'center', marginBottom: spacing.xs },
  subHeading: { ...typography.body, color: colors.textSecondary, textAlign: 'center', lineHeight: 22 },

  searchWrapper: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    borderWidth: 1.5, borderColor: colors.border,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
    ...shadows.xs,
  },
  searchIcon: { marginRight: spacing.sm },
  searchInput: {
    flex: 1, paddingVertical: 13,
    ...typography.body, color: colors.text,
  },

  loadingWrap: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: spacing.sm },
  emptyText: { ...typography.body, color: colors.textSecondary },
  emptyLink: { ...typography.captionBold, color: colors.accent, textDecorationLine: 'underline' },

  list: { flex: 1 },
  playerCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: borderRadius.xl,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1.5, borderColor: colors.border,
    gap: spacing.md,
    ...shadows.xs,
  },
  playerCardActive: {
    borderColor: colors.accent,
    backgroundColor: colors.accentTint,
  },
  avatar: {
    width: 44, height: 44, borderRadius: 22,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1.5,
  },
  avatarText: { ...typography.h4, fontWeight: '700' },
  playerInfo: { flex: 1, gap: 4 },
  playerName: { ...typography.captionBold, color: colors.text },
  playerNameActive: { color: colors.accentDark },
  playerMeta: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  posBadge: {
    paddingHorizontal: 8, paddingVertical: 2,
    borderRadius: borderRadius.full,
  },
  posText: { ...typography.tiny, fontWeight: '700' },

  footer: {
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
    paddingVertical: spacing.md,
  },
  footerText: { ...typography.caption, color: colors.textSecondary },
  footerLink: { ...typography.captionBold, color: colors.accent, textDecorationLine: 'underline' },
});
