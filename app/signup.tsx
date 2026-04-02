/**
 * SquadPlay — Player Sign Up Screen
 * New player onboarding: name, position, skill level → creates DB record
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { colors, spacing, borderRadius, typography, shadows } from '@/constants/design';
import { createPlayer } from '@/lib/data';

// ── Data ──────────────────────────────────────────────────────────────────────

const POSITIONS = [
  { id: 'Goalkeeper', label: 'Goalkeeper', icon: 'hand-left-outline', color: '#7C3AED' },
  { id: 'Defender',   label: 'Defender',   icon: 'shield-outline',    color: '#2563EB' },
  { id: 'Midfielder', label: 'Midfielder', icon: 'sync-outline',      color: '#D97706' },
  { id: 'Striker',    label: 'Striker',    icon: 'flash-outline',     color: '#DC2626' },
  { id: 'Any',        label: 'Any / Flex', icon: 'star-outline',      color: '#16A34A' },
];

const SKILL_LEVELS = [
  { id: 'Low',    label: 'Beginner',     stars: 1, desc: 'Just getting started' },
  { id: 'Medium', label: 'Intermediate', stars: 2, desc: 'Regular player'       },
  { id: 'High',   label: 'Advanced',     stars: 3, desc: 'Experienced & competitive' },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function Stars({ count, active }: { count: number; active: boolean }) {
  return (
    <View style={{ flexDirection: 'row', gap: 2 }}>
      {Array.from({ length: 3 }).map((_, i) => (
        <Ionicons
          key={i}
          name={i < count ? 'star' : 'star-outline'}
          size={14}
          color={active ? '#D97706' : colors.textTertiary}
        />
      ))}
    </View>
  );
}

// ── Screen ────────────────────────────────────────────────────────────────────

export default function SignupScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [name, setName]               = useState('');
  const [position, setPosition]       = useState('');
  const [skillLevel, setSkillLevel]   = useState('');

  const createMutation = useMutation({
    mutationFn: () => createPlayer({ name, position, skillLevel }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['currentUser'] });
      queryClient.invalidateQueries({ queryKey: ['players'] });
      router.replace('/home');
    },
    onError: () => {
      if (Platform.OS === 'web') {
        window.alert('Could not create your account. Please try again.');
      } else {
        Alert.alert('Error', 'Could not create your account. Please try again.');
      }
    },
  });

  const handleJoin = () => {
    if (!name.trim()) {
      if (Platform.OS === 'web') { window.alert('Please enter your name.'); }
      else Alert.alert('Name Required', 'Please enter your name.');
      return;
    }
    if (!position) {
      if (Platform.OS === 'web') { window.alert('Please select your position.'); }
      else Alert.alert('Position Required', 'Please select your position.');
      return;
    }
    if (!skillLevel) {
      if (Platform.OS === 'web') { window.alert('Please select your skill level.'); }
      else Alert.alert('Skill Required', 'Please select your skill level.');
      return;
    }
    createMutation.mutate();
  };

  const isReady = !!name.trim() && !!position && !!skillLevel;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Nav */}
      <View style={styles.nav}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color={colors.primary} />
        </TouchableOpacity>
        <Text style={styles.navTitle}>Create Account</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Heading */}
        <View style={styles.headingWrap}>
          <View style={styles.headingIcon}>
            <Ionicons name="person-add-outline" size={28} color={colors.accent} />
          </View>
          <Text style={styles.heading}>Set up your profile</Text>
          <Text style={styles.subHeading}>
            Tell us about yourself so your squad can see who you are.
          </Text>
        </View>

        {/* Name */}
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>Your Name</Text>
          <View style={styles.inputWrapper}>
            <Ionicons name="person-outline" size={18} color={colors.textTertiary} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="e.g. Jamie Hartley"
              placeholderTextColor={colors.textTertiary}
              maxLength={30}
              returnKeyType="done"
              autoCapitalize="words"
              autoFocus
            />
          </View>
        </View>

        {/* Position */}
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>Position</Text>
          <View style={styles.positionGrid}>
            {POSITIONS.map((pos) => {
              const active = position === pos.id;
              return (
                <TouchableOpacity
                  key={pos.id}
                  style={[
                    styles.positionCard,
                    active && { borderColor: pos.color, backgroundColor: pos.color + '18' },
                  ]}
                  onPress={() => setPosition(pos.id)}
                  activeOpacity={0.75}
                >
                  <View style={[styles.positionIconWrap, { backgroundColor: active ? pos.color : colors.backgroundTertiary }]}>
                    <Ionicons name={pos.icon as any} size={18} color={active ? colors.white : colors.textSecondary} />
                  </View>
                  <Text style={[styles.positionLabel, active && { color: pos.color, fontWeight: '700' }]}>
                    {pos.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Skill Level */}
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>Skill Level</Text>
          <View style={styles.skillList}>
            {SKILL_LEVELS.map((level) => {
              const active = skillLevel === level.id;
              return (
                <TouchableOpacity
                  key={level.id}
                  style={[styles.skillCard, active && styles.skillCardActive]}
                  onPress={() => setSkillLevel(level.id)}
                  activeOpacity={0.75}
                >
                  <View style={styles.skillLeft}>
                    <Stars count={level.stars} active={active} />
                    <View>
                      <Text style={[styles.skillLabel, active && styles.skillLabelActive]}>
                        {level.label}
                      </Text>
                      <Text style={styles.skillDesc}>{level.desc}</Text>
                    </View>
                  </View>
                  {active && (
                    <Ionicons name="checkmark-circle" size={20} color={colors.accent} />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={{ height: spacing.xxl }} />
      </ScrollView>

      {/* Join Button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.joinBtn, !isReady && styles.joinBtnDisabled]}
          onPress={handleJoin}
          activeOpacity={0.88}
          disabled={createMutation.isPending || !isReady}
        >
          {createMutation.isPending ? (
            <ActivityIndicator color={colors.primary} />
          ) : (
            <>
              <Ionicons name="football-outline" size={20} color={colors.primary} />
              <Text style={styles.joinBtnText}>Join the Squad</Text>
            </>
          )}
        </TouchableOpacity>
        <Text style={styles.footerNote}>
          You can update these details anytime from your profile.
        </Text>
      </View>
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.backgroundSecondary },
  scroll: { flex: 1 },
  scrollContent: { padding: spacing.md },

  nav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: colors.white,
    justifyContent: 'center', alignItems: 'center',
    ...shadows.sm,
  },
  navTitle: {
    ...typography.captionBold,
    color: colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  headingWrap: { alignItems: 'center', marginBottom: spacing.xl },
  headingIcon: {
    width: 60, height: 60, borderRadius: 30,
    backgroundColor: colors.accentTint,
    justifyContent: 'center', alignItems: 'center',
    marginBottom: spacing.md,
  },
  heading: { ...typography.h2, color: colors.primary, textAlign: 'center', marginBottom: spacing.xs },
  subHeading: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },

  fieldGroup: { marginBottom: spacing.lg },
  fieldLabel: {
    ...typography.captionBold,
    color: colors.text,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
  },

  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    borderWidth: 1.5,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    ...shadows.xs,
  },
  inputIcon: { marginRight: spacing.sm },
  input: {
    flex: 1,
    paddingVertical: 14,
    ...typography.body,
    color: colors.text,
  },

  positionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  positionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    minWidth: '45%',
    flex: 1,
    ...shadows.xs,
  },
  positionIconWrap: {
    width: 32, height: 32, borderRadius: 8,
    justifyContent: 'center', alignItems: 'center',
  },
  positionLabel: { ...typography.smallBold, color: colors.textSecondary, flex: 1 },

  skillList: { gap: spacing.sm },
  skillCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    ...shadows.xs,
  },
  skillCardActive: {
    borderColor: colors.accent,
    backgroundColor: colors.accentTint,
  },
  skillLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  skillLabel: { ...typography.captionBold, color: colors.text, marginBottom: 2 },
  skillLabelActive: { color: colors.accentDark },
  skillDesc: { ...typography.tiny, color: colors.textSecondary },

  footer: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.lg,
    paddingTop: spacing.sm,
    backgroundColor: colors.backgroundSecondary,
    gap: spacing.sm,
  },
  joinBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.accent,
    borderRadius: borderRadius.xl,
    paddingVertical: 18,
    ...shadows.md,
  },
  joinBtnDisabled: { opacity: 0.45 },
  joinBtnText: { ...typography.bodyBold, color: colors.primary },
  footerNote: {
    ...typography.tiny,
    color: colors.textTertiary,
    textAlign: 'center',
  },
});
