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
import { getCurrentUser, getPlayerStats, getUserGroups, getGroup } from '@/lib/data';
import { signOut } from '@/lib/auth';


export default function ProfileScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const doSignOut = async () => {
    queryClient.clear();
    await signOut();
    router.replace('/(auth)/login');
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

  const { data: userGroupsRaw } = useQuery({
    queryKey: ['userGroups', currentUser?.id],
    queryFn: () => getUserGroups(currentUser!.id),
    enabled: !!currentUser?.id,
  });

  // Fallback: if no group_members rows found, show the group from getGroup()
  const { data: fallbackGroup } = useQuery({
    queryKey: ['group'],
    queryFn: getGroup,
    enabled: (userGroupsRaw?.length ?? 0) === 0,
  });

  const userGroups = (userGroupsRaw && userGroupsRaw.length > 0)
    ? userGroupsRaw
    : fallbackGroup
      ? [{ ...fallbackGroup, myRole: currentUser?.role ?? 'player' }]
      : [];

  const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'owner';

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

        </View>

        {/* My Teams */}
        {(userGroups?.length ?? 0) > 0 && (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>My Teams ({userGroups!.length})</Text>
            {userGroups!.map((g: any) => (
              <TouchableOpacity
                key={g.id}
                style={styles.teamRow}
                onPress={() => router.push('/(tabs)/group')}
                activeOpacity={0.8}
              >
                <View style={styles.teamAvatar}>
                  <Ionicons name="football" size={18} color={colors.white} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.teamName}>{g.name}</Text>
                  <Text style={styles.teamMeta}>{g.location ?? ''}{g.location && g.myRole ? ' · ' : ''}{g.myRole}</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
              </TouchableOpacity>
            ))}
          </View>
        )}


        {/* Create Your Club CTA */}
        <TouchableOpacity style={styles.createClubCard} onPress={() => router.push('/create-group')} activeOpacity={0.88}>
          <View style={styles.createClubIcon}>
            <Ionicons name="shield-outline" size={26} color={colors.white} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.createClubTitle}>Start Your Own Club</Text>
            <Text style={styles.createClubSub}>Create a team, invite players, manage matches</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.white} />
        </TouchableOpacity>

        {/* Plans comparison */}
        <>
        <View style={styles.plansCard}>
          <Text style={styles.sectionTitle}>Plans</Text>

          {/* Free */}
          <View style={styles.planRow}>
            <View style={[styles.planIconWrap, { backgroundColor: '#F1F5F9' }]}>
              <Ionicons name="person-outline" size={18} color="#64748B" />
            </View>
            <View style={{ flex: 1 }}>
              <View style={styles.planNameRow}>
                <Text style={styles.planName}>Free</Text>
                <Text style={styles.planPrice}>Free</Text>
              </View>
              {['RSVP & attendance tracking', '1 admin per group', 'Basic match history'].map((f) => (
                <View key={f} style={styles.planFeatureRow}>
                  <Ionicons name="checkmark" size={13} color="#64748B" />
                  <Text style={styles.planFeatureText}>{f}</Text>
                </View>
              ))}
            </View>
          </View>

          <View style={styles.planDivider} />

          {/* Pro */}
          <View style={styles.planRow}>
            <View style={[styles.planIconWrap, { backgroundColor: '#EFF6FF' }]}>
              <Ionicons name="flash" size={18} color="#2563EB" />
            </View>
            <View style={{ flex: 1 }}>
              <View style={styles.planNameRow}>
                <Text style={[styles.planName, { color: '#2563EB' }]}>Pro</Text>
                <Text style={[styles.planPrice, { color: '#2563EB' }]}>£9.99/mo</Text>
              </View>
              {['Balanced auto team generation', 'Unlimited admins', 'Player ratings & leaderboard', 'Match reminders'].map((f) => (
                <View key={f} style={styles.planFeatureRow}>
                  <Ionicons name="checkmark-circle" size={13} color="#2563EB" />
                  <Text style={[styles.planFeatureText, { color: '#1E40AF' }]}>{f}</Text>
                </View>
              ))}
            </View>
          </View>

          <View style={styles.planDivider} />

          {/* Squad+ */}
          <View style={styles.planRow}>
            <View style={[styles.planIconWrap, { backgroundColor: '#FFFBEB' }]}>
              <Ionicons name="star" size={18} color="#D97706" />
            </View>
            <View style={{ flex: 1 }}>
              <View style={styles.planNameRow}>
                <Text style={[styles.planName, { color: '#D97706' }]}>Squad+</Text>
                <Text style={[styles.planPrice, { color: '#D97706' }]}>£14.99/mo</Text>
              </View>
              {['Everything in Pro', 'Payment tracking & split', 'MOTM voting & trophies', 'Advanced stats & history', 'Priority support'].map((f) => (
                <View key={f} style={styles.planFeatureRow}>
                  <Ionicons name="star" size={13} color="#D97706" />
                  <Text style={[styles.planFeatureText, { color: '#92400E' }]}>{f}</Text>
                </View>
              ))}
            </View>
          </View>

          <TouchableOpacity style={styles.upgradeBtn} onPress={() => router.push('/pricing')} activeOpacity={0.88}>
            <Text style={styles.upgradeBtnText}>See all plans & upgrade →</Text>
          </TouchableOpacity>
        </View>
        </>

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

  // Create Club CTA
  createClubCard: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    backgroundColor: colors.primary, borderRadius: borderRadius.xl,
    padding: spacing.md, marginBottom: spacing.md, ...shadows.md,
  },
  createClubIcon: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center', alignItems: 'center',
  },
  createClubTitle: { ...typography.bodyBold, color: colors.white, marginBottom: 2 },
  createClubSub:   { ...typography.small, color: 'rgba(255,255,255,0.7)' },

  // Plans card
  plansCard: {
    backgroundColor: colors.white, borderRadius: borderRadius.xl,
    padding: spacing.lg, marginBottom: spacing.md, ...shadows.sm,
  },
  planRow:      { flexDirection: 'row', gap: spacing.md, paddingVertical: spacing.sm },
  planIconWrap: { width: 40, height: 40, borderRadius: borderRadius.lg, justifyContent: 'center', alignItems: 'center', marginTop: 2 },
  planNameRow:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  planName:     { ...typography.captionBold, color: colors.primary },
  planPrice:    { ...typography.captionBold, color: colors.textSecondary },
  planFeatureRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 3 },
  planFeatureText: { ...typography.small, color: colors.textSecondary },
  planDivider:  { height: 1, backgroundColor: colors.backgroundTertiary, marginVertical: spacing.sm },
  upgradeBtn: {
    marginTop: spacing.md, backgroundColor: colors.primary,
    borderRadius: borderRadius.lg, paddingVertical: spacing.md, alignItems: 'center',
  },
  upgradeBtnText: { ...typography.captionBold, color: colors.white },
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

  teamRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.backgroundTertiary },
  teamAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center' },
  teamName: { ...typography.captionBold, color: colors.primary },
  teamMeta: { ...typography.small, color: colors.textSecondary, textTransform: 'capitalize' },

  recordRow: { flexDirection: 'row', gap: spacing.md },
  recordItem: { flexDirection: 'row', alignItems: 'center' },
  recordDot: { width: 8, height: 8, borderRadius: 4, marginRight: 4 },
  recordValue: { ...typography.smallBold, color: colors.text },
});
