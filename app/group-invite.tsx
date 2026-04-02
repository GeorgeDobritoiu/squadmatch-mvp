/**
 * SquadPlay — Group Invite Screen
 * Shown after successful club creation; prompts admin to invite squad via Share.
 */
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Share,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, borderRadius, typography, shadows } from '@/constants/design';

export default function GroupInviteScreen() {
  const { groupName, groupId } = useLocalSearchParams<{
    groupName: string;
    groupId: string;
  }>();
  const router = useRouter();

  const handleInvite = async () => {
    const inviteLink = `https://squadplay.app/join/${groupId ?? 'squad'}`;
    const message =
      `Join our group on SquadPlay to manage our matches! ` +
      `Use this link to sign up: ${inviteLink}`;

    try {
      await Share.share(
        {
          message,
          // title is used on Android share sheet
          title: `Join ${groupName ?? 'our squad'} on SquadPlay`,
          ...(Platform.OS === 'ios' ? { url: inviteLink } : {}),
        },
        { dialogTitle: 'Invite Your Squad' },
      );
    } catch {
      // user dismissed share sheet — no action needed
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.inner}>

        {/* Success badge */}
        <View style={styles.badgeWrap}>
          <View style={styles.outerRing}>
            <View style={styles.iconCircle}>
              <Ionicons name="checkmark" size={44} color={colors.white} />
            </View>
          </View>
        </View>

        {/* Copy */}
        <Text style={styles.heading}>Club Created!</Text>
        {groupName ? (
          <View style={styles.clubNamePill}>
            <Text style={styles.clubNameText}>{groupName}</Text>
          </View>
        ) : null}
        <Text style={styles.sub}>
          Your club is set up and ready to go.{'\n'}
          Invite your squad to manage matches together.
        </Text>

        {/* Share card */}
        <View style={styles.shareCard}>
          <Ionicons name="logo-whatsapp" size={22} color="#25D366" style={{ marginBottom: spacing.xs }} />
          <Text style={styles.shareCardText}>
            Share a link with your squad so they can join instantly.
          </Text>
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.inviteBtn}
            onPress={handleInvite}
            activeOpacity={0.88}
          >
            <Ionicons name="share-social-outline" size={22} color={colors.primary} />
            <Text style={styles.inviteBtnText}>Invite Your Squad</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.dashboardBtn}
            onPress={() => router.replace('/home')}
            activeOpacity={0.88}
          >
            <Text style={styles.dashboardBtnText}>Go to Dashboard</Text>
            <Ionicons name="arrow-forward" size={18} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.backgroundSecondary },
  inner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },

  badgeWrap: { marginBottom: spacing.xl },
  outerRing: {
    width: 116,
    height: 116,
    borderRadius: 58,
    backgroundColor: colors.accentTint,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.lg,
  },

  heading: {
    ...typography.h1,
    color: colors.primary,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  clubNamePill: {
    backgroundColor: colors.primaryTint,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    marginBottom: spacing.md,
  },
  clubNameText: {
    ...typography.captionBold,
    color: colors.primary,
  },
  sub: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: spacing.lg,
  },

  shareCard: {
    width: '100%',
    backgroundColor: colors.white,
    borderRadius: borderRadius.xl,
    padding: spacing.md,
    alignItems: 'center',
    marginBottom: spacing.xl,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.sm,
  },
  shareCardText: {
    ...typography.caption,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },

  actions: { width: '100%', gap: spacing.md },
  inviteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.accent,
    borderRadius: borderRadius.xl,
    paddingVertical: 18,
    ...shadows.md,
  },
  inviteBtnText: { ...typography.bodyBold, color: colors.primary },

  dashboardBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderRadius: borderRadius.xl,
    paddingVertical: 16,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  dashboardBtnText: { ...typography.captionBold, color: colors.textSecondary },
});
