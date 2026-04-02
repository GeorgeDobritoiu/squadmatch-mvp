import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { colors, spacing, borderRadius, typography, shadows } from '@/constants/design';
import { getCurrentUser, getMatches, getPlayerStats } from '@/lib/data';

const POSITIONS = ['Goalkeeper', 'Defender', 'Midfielder', 'Striker', 'Any'];
const SKILL_LEVELS = ['Low', 'Medium', 'High'];

const POSITION_COLOR: Record<string, string> = {
  Goalkeeper: '#7C3AED',
  Defender: '#2563EB',
  Midfielder: '#D97706',
  Striker: '#DC2626',
  Any: '#6B7280',
};

export default function ProfileScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const doSignOut = () => {
    queryClient.clear();
    router.replace('/welcome');
  };

  const handleSignOut = () => {
    if (Platform.OS === 'web') {
      // Alert.alert callbacks don't work reliably on web
      if (window.confirm('Are you sure you want to sign out?')) {
        doSignOut();
      }
    } else {
      Alert.alert(
        'Sign Out',
        'Are you sure you want to sign out?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Sign Out', style: 'destructive', onPress: doSignOut },
        ],
      );
    }
  };

  const { data: currentUser, isLoading } = useQuery({
    queryKey: ['currentUser'],
    queryFn: getCurrentUser,
  });

  const { data: stats } = useQuery({
    queryKey: ['playerStats', currentUser?.id],
    queryFn: () => getPlayerStats(currentUser!.id),
    enabled: !!currentUser?.id,
  });

  if (isLoading) {
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
          <Text style={styles.title}>Profile</Text>
        </View>

        {/* Profile Card */}
        <View style={styles.profileCard}>
          <TouchableOpacity
            style={styles.avatarWrapper}
            onPress={() => currentUser && router.push(`/player/${currentUser.id}`)}
            activeOpacity={0.85}
          >
            <View style={styles.avatar}>
              <Text style={styles.avatarInitial}>{(currentUser?.name ?? 'P').charAt(0)}</Text>
            </View>
            <TouchableOpacity style={styles.avatarEditBtn}>
              <Ionicons name="camera" size={14} color={colors.white} />
            </TouchableOpacity>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => currentUser && router.push(`/player/${currentUser.id}`)}>
            <Text style={styles.profileName}>{currentUser?.name ?? 'Player'}</Text>
          </TouchableOpacity>
          {currentUser?.role === 'admin' && (
            <View style={styles.adminChip}>
              <Ionicons name="shield-checkmark" size={12} color="#D97706" />
              <Text style={styles.adminChipText}>Group Admin</Text>
            </View>
          )}

          {/* Stats */}
          <View style={styles.statsRow}>
            <TouchableOpacity style={styles.statItem} onPress={() => currentUser && router.push(`/player/${currentUser.id}`)}>
              <Text style={styles.statValue}>{stats?.matchesPlayed ?? 0}</Text>
              <Text style={styles.statLabel}>Matches</Text>
            </TouchableOpacity>
            <View style={styles.statDivider} />
            <TouchableOpacity style={styles.statItem} onPress={() => currentUser && router.push(`/player/${currentUser.id}`)}>
              <Text style={[styles.statValue, { color: '#D97706' }]}>{stats?.motmWins ?? 0}</Text>
              <Text style={styles.statLabel}>MOTM</Text>
            </TouchableOpacity>
            <View style={styles.statDivider} />
            <TouchableOpacity style={styles.statItem} onPress={() => currentUser && router.push(`/player/${currentUser.id}`)}>
              <Text style={[styles.statValue, styles.statValueGreen]}>{stats?.attendanceRate ?? 0}%</Text>
              <Text style={styles.statLabel}>Attend.</Text>
            </TouchableOpacity>
          </View>

          {/* View full profile link */}
          <TouchableOpacity
            style={styles.viewProfileBtn}
            onPress={() => currentUser && router.push(`/player/${currentUser.id}`)}
          >
            <Text style={styles.viewProfileText}>View full profile</Text>
            <Ionicons name="chevron-forward" size={14} color={colors.accent} />
          </TouchableOpacity>
        </View>

        {/* Position & Skill */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Playing Details</Text>

          <View style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>Position</Text>
            <View style={styles.chipRow}>
              {POSITIONS.map((pos) => (
                <View
                  key={pos}
                  style={[
                    styles.chip,
                    currentUser?.position === pos && {
                      backgroundColor: POSITION_COLOR[pos] ?? colors.primary,
                      borderColor: POSITION_COLOR[pos] ?? colors.primary,
                    },
                  ]}
                >
                  <Text style={[styles.chipText, currentUser?.position === pos && styles.chipTextActive]}>
                    {pos}
                  </Text>
                </View>
              ))}
            </View>
          </View>

          <View style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>Skill Level</Text>
            <View style={styles.chipRow}>
              {SKILL_LEVELS.map((level) => (
                <View
                  key={level}
                  style={[
                    styles.chip,
                    currentUser?.skillLevel === level && {
                      backgroundColor: colors.primary,
                      borderColor: colors.primary,
                    },
                  ]}
                >
                  <Text style={[styles.chipText, currentUser?.skillLevel === level && styles.chipTextActive]}>
                    {level}
                  </Text>
                </View>
              ))}
            </View>
          </View>

          {/* W/D/L record if available */}
          {stats && stats.matchesPlayed > 0 && (
            <View style={styles.fieldRow}>
              <Text style={styles.fieldLabel}>Team Record</Text>
              <View style={styles.recordRow}>
                <View style={styles.recordItem}>
                  <View style={[styles.recordDot, { backgroundColor: colors.accentDark }]} />
                  <Text style={styles.recordValue}>{stats.wins}W</Text>
                </View>
                <View style={styles.recordItem}>
                  <View style={[styles.recordDot, { backgroundColor: '#94A3B8' }]} />
                  <Text style={styles.recordValue}>{stats.draws}D</Text>
                </View>
                <View style={styles.recordItem}>
                  <View style={[styles.recordDot, { backgroundColor: '#EF4444' }]} />
                  <Text style={styles.recordValue}>{stats.losses}L</Text>
                </View>
              </View>
            </View>
          )}
        </View>

        {/* Settings */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Settings</Text>
          {[
            { icon: 'notifications-outline', label: 'Notifications', color: colors.primary, onPress: () => {} },
            { icon: 'shield-outline',        label: 'Privacy',       color: colors.primary, onPress: () => {} },
            { icon: 'help-circle-outline',   label: 'Help & Support',color: colors.primary, onPress: () => {} },
            { icon: 'log-out-outline',       label: 'Sign Out',      color: '#EF4444',      onPress: handleSignOut },
          ].map((item, i) => (
            <TouchableOpacity key={i} style={styles.settingRow} onPress={item.onPress} activeOpacity={0.75}>
              <View style={[styles.settingIcon, { backgroundColor: item.color === '#EF4444' ? '#FEE2E2' : colors.primaryTint }]}>
                <Ionicons name={item.icon as any} size={18} color={item.color} />
              </View>
              <Text style={[styles.settingLabel, item.color === '#EF4444' && { color: '#EF4444' }]}>{item.label}</Text>
              <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.version}>SquadMatch v1.0 MVP</Text>
        <View style={{ height: spacing.xl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.backgroundSecondary },
  scroll: { flex: 1 },
  scrollContent: { padding: spacing.md },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { marginBottom: spacing.md },
  title: { ...typography.h2, color: colors.primary },

  profileCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    alignItems: 'center',
    marginBottom: spacing.md,
    ...shadows.sm,
  },
  avatarWrapper: { position: 'relative', marginBottom: spacing.md },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: colors.accentTint,
  },
  avatarInitial: { fontSize: 36, fontWeight: '700', color: colors.white },
  avatarEditBtn: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.white,
  },
  profileName: { ...typography.h3, color: colors.primary, marginBottom: spacing.sm },
  adminChip: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#FEF3C7', paddingHorizontal: spacing.sm, paddingVertical: 4, borderRadius: borderRadius.full, marginBottom: spacing.md },
  adminChipText: { ...typography.smallBold, color: '#D97706' },

  statsRow: { flexDirection: 'row', width: '100%', marginTop: spacing.sm },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: { ...typography.h3, color: colors.primary },
  statValueGreen: { color: colors.accentDark },
  statLabel: { ...typography.tiny, color: colors.textSecondary, marginTop: 2 },
  statDivider: { width: 1, backgroundColor: colors.border },

  sectionCard: { backgroundColor: colors.white, borderRadius: borderRadius.xl, padding: spacing.lg, marginBottom: spacing.md, ...shadows.sm },
  sectionTitle: { ...typography.captionBold, color: colors.text, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: spacing.md },
  fieldRow: { marginBottom: spacing.md },
  fieldLabel: { ...typography.smallBold, color: colors.textSecondary, marginBottom: spacing.sm },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: { paddingHorizontal: spacing.md, paddingVertical: 6, borderRadius: borderRadius.full, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.backgroundTertiary },
  chipText: { ...typography.smallBold, color: colors.textSecondary },
  chipTextActive: { color: colors.white },

  settingRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.backgroundTertiary },
  settingIcon: { width: 36, height: 36, borderRadius: borderRadius.md, justifyContent: 'center', alignItems: 'center', marginRight: spacing.md },
  settingLabel: { ...typography.body, color: colors.text, flex: 1 },

  version: { ...typography.tiny, color: colors.textTertiary, textAlign: 'center', marginBottom: spacing.sm },

  viewProfileBtn: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.md, paddingVertical: spacing.sm, paddingHorizontal: spacing.md, backgroundColor: colors.primaryTint, borderRadius: borderRadius.md },
  viewProfileText: { ...typography.smallBold, color: colors.primary, marginRight: spacing.sm },

  recordRow: { flexDirection: 'row', gap: spacing.md },
  recordItem: { flexDirection: 'row', alignItems: 'center' },
  recordDot: { width: 8, height: 8, borderRadius: 4, marginRight: 4 },
  recordValue: { ...typography.smallBold, color: colors.text },
});
