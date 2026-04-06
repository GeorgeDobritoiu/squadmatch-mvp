import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { colors, spacing, borderRadius, typography, shadows } from '@/constants/design';
import { getGroup, getCurrentUser, joinGroup } from '@/lib/data';

export default function JoinGroupScreen() {
  const { groupId } = useLocalSearchParams<{ groupId: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<'idle' | 'joined' | 'already_member' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const { data: group, isLoading: loadingGroup } = useQuery({
    queryKey: ['group', groupId],
    queryFn: () => getGroup(groupId),
    enabled: !!groupId,
  });

  const { data: currentUser, isLoading: loadingUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: getCurrentUser,
  });

  const joinMutation = useMutation({
    mutationFn: () => joinGroup(groupId!),
    onSuccess: (result) => {
      setStatus(result);
      queryClient.invalidateQueries({ queryKey: ['userGroups'] });
    },
    onError: (e: any) => {
      setStatus('error');
      setErrorMsg(e.message ?? 'Something went wrong');
    },
  });

  const isLoading = loadingGroup || loadingUser;

  // Auto-redirect to login if not logged in
  useEffect(() => {
    if (!loadingUser && !currentUser) {
      router.replace(`/(auth)/login?redirect=/join/${groupId}`);
    }
  }, [loadingUser, currentUser]);

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.accent} />
        </View>
      </SafeAreaView>
    );
  }

  if (!group) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <Ionicons name="alert-circle-outline" size={52} color={colors.textTertiary} />
          <Text style={styles.heading}>Invite not found</Text>
          <Text style={styles.sub}>This invite link may have expired or the team no longer exists.</Text>
          <TouchableOpacity style={styles.primaryBtn} onPress={() => router.replace('/(tabs)/home')}>
            <Text style={styles.primaryBtnText}>Go to Home</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (status === 'joined') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <View style={styles.successRing}>
            <View style={styles.successCircle}>
              <Ionicons name="checkmark" size={44} color={colors.white} />
            </View>
          </View>
          <Text style={styles.heading}>You're in!</Text>
          <Text style={styles.groupNamePill}>{group.name}</Text>
          <Text style={styles.sub}>You've joined the squad. Check the group page to see your teammates.</Text>
          <TouchableOpacity style={styles.primaryBtn} onPress={() => router.replace('/(tabs)/group')}>
            <Text style={styles.primaryBtnText}>View Squad →</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (status === 'already_member') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <Ionicons name="people" size={52} color={colors.accent} />
          <Text style={styles.heading}>Already a member</Text>
          <Text style={styles.groupNamePill}>{group.name}</Text>
          <Text style={styles.sub}>You're already part of this squad.</Text>
          <TouchableOpacity style={styles.primaryBtn} onPress={() => router.replace('/(tabs)/group')}>
            <Text style={styles.primaryBtnText}>View Squad →</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Default: invite card
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.center}>
        {/* Team logo placeholder */}
        <View style={styles.logoCircle}>
          <Ionicons name="football" size={40} color={colors.white} />
        </View>

        <Text style={styles.inviteLabel}>You've been invited to join</Text>
        <Text style={styles.heading}>{group.name}</Text>
        {group.location ? (
          <View style={styles.metaRow}>
            <Ionicons name="location-outline" size={14} color={colors.textSecondary} />
            <Text style={styles.metaText}>{group.location}</Text>
          </View>
        ) : null}
        {group.description ? (
          <Text style={styles.sub}>{group.description}</Text>
        ) : null}

        {status === 'error' && (
          <Text style={styles.errorText}>{errorMsg}</Text>
        )}

        <TouchableOpacity
          style={styles.primaryBtn}
          onPress={() => joinMutation.mutate()}
          disabled={joinMutation.isPending}
          activeOpacity={0.88}
        >
          {joinMutation.isPending
            ? <ActivityIndicator color={colors.white} />
            : <Text style={styles.primaryBtnText}>Join Squad</Text>
          }
        </TouchableOpacity>

        <TouchableOpacity style={styles.secondaryBtn} onPress={() => router.replace('/(tabs)/home')}>
          <Text style={styles.secondaryBtnText}>Not now</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.backgroundSecondary },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.xl },

  logoCircle: {
    width: 88, height: 88, borderRadius: 44,
    backgroundColor: colors.primary,
    justifyContent: 'center', alignItems: 'center',
    marginBottom: spacing.lg, ...shadows.lg,
  },

  successRing: {
    width: 116, height: 116, borderRadius: 58,
    backgroundColor: colors.accentTint,
    justifyContent: 'center', alignItems: 'center',
    marginBottom: spacing.xl,
  },
  successCircle: {
    width: 88, height: 88, borderRadius: 44,
    backgroundColor: colors.accent,
    justifyContent: 'center', alignItems: 'center',
    ...shadows.lg,
  },

  inviteLabel: { ...typography.caption, color: colors.textSecondary, marginBottom: spacing.xs },
  heading: { ...typography.h2, color: colors.primary, textAlign: 'center', marginBottom: spacing.sm },
  groupNamePill: {
    ...typography.captionBold, color: colors.primary,
    backgroundColor: colors.primaryTint,
    paddingHorizontal: spacing.md, paddingVertical: 4,
    borderRadius: borderRadius.full, marginBottom: spacing.md,
    overflow: 'hidden',
  },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: spacing.sm },
  metaText: { ...typography.caption, color: colors.textSecondary },
  sub: { ...typography.body, color: colors.textSecondary, textAlign: 'center', lineHeight: 22, marginBottom: spacing.xl },

  errorText: { ...typography.small, color: '#EF4444', marginBottom: spacing.md, textAlign: 'center' },

  primaryBtn: {
    width: '100%', backgroundColor: colors.primary,
    borderRadius: borderRadius.xl, paddingVertical: 16,
    alignItems: 'center', ...shadows.md, marginBottom: spacing.sm,
  },
  primaryBtnText: { ...typography.bodyBold, color: colors.white },

  secondaryBtn: { paddingVertical: spacing.sm },
  secondaryBtnText: { ...typography.caption, color: colors.textSecondary },
});
