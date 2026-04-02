/**
 * SquadPlay — Create Group Screen
 * Admin flow: enter club name, pick sport, upload logo placeholder
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useMutation } from '@tanstack/react-query';
import { colors, spacing, borderRadius, typography, shadows } from '@/constants/design';
import { createGroup } from '@/lib/data';

const SPORTS = [
  { id: 'football',   label: 'Football',   emoji: '⚽' },
  { id: 'basketball', label: 'Basketball', emoji: '🏀' },
  { id: 'tennis',     label: 'Tennis',     emoji: '🎾' },
  { id: 'cricket',    label: 'Cricket',    emoji: '🏏' },
  { id: 'rugby',      label: 'Rugby',      emoji: '🏉' },
  { id: 'volleyball', label: 'Volleyball', emoji: '🏐' },
  { id: 'badminton',  label: 'Badminton',  emoji: '🏸' },
  { id: 'other',      label: 'Other',      emoji: '🎯' },
];

export default function CreateGroupScreen() {
  const router = useRouter();
  const [groupName, setGroupName]       = useState('');
  const [selectedSport, setSelectedSport] = useState('');

  const createMutation = useMutation({
    mutationFn: () =>
      createGroup({ name: groupName.trim(), sport: selectedSport }),
    onSuccess: (group) => {
      router.push({
        pathname: '/group-invite',
        params: { groupName: groupName.trim(), groupId: group?.id ?? '' },
      });
    },
    onError: () => {
      Alert.alert('Error', 'Could not create club. Please try again.');
    },
  });

  const handleCreate = () => {
    if (!groupName.trim()) {
      Alert.alert('Club Name Required', 'Please enter a name for your club.');
      return;
    }
    if (!selectedSport) {
      Alert.alert('Sport Required', 'Please select a sport for your club.');
      return;
    }
    createMutation.mutate();
  };

  const isReady = !!groupName.trim() && !!selectedSport;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Nav */}
      <View style={styles.nav}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color={colors.primary} />
        </TouchableOpacity>
        <Text style={styles.navTitle}>Create Club</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Heading */}
        <Text style={styles.heading}>Set up your club</Text>
        <Text style={styles.subHeading}>
          Tell us a bit about your squad so we can get everything ready.
        </Text>

        {/* Logo Upload Placeholder */}
        <View style={styles.logoSection}>
          <TouchableOpacity style={styles.logoPlaceholder} activeOpacity={0.8}>
            <Ionicons name="camera-outline" size={30} color={colors.textTertiary} />
            <Text style={styles.logoHint}>Add Club Logo</Text>
            <Text style={styles.logoSubHint}>Optional</Text>
          </TouchableOpacity>
        </View>

        {/* Club Name */}
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>Club Name</Text>
          <TextInput
            style={styles.input}
            value={groupName}
            onChangeText={setGroupName}
            placeholder="e.g. Sunday League FC"
            placeholderTextColor={colors.textTertiary}
            maxLength={40}
            returnKeyType="done"
            autoCapitalize="words"
          />
          <Text style={styles.charCount}>{groupName.length}/40</Text>
        </View>

        {/* Sport Type */}
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>Sport</Text>
          <View style={styles.sportsGrid}>
            {SPORTS.map((sport) => {
              const active = selectedSport === sport.id;
              return (
                <TouchableOpacity
                  key={sport.id}
                  style={[styles.sportCard, active && styles.sportCardActive]}
                  onPress={() => setSelectedSport(sport.id)}
                  activeOpacity={0.75}
                >
                  <Text style={styles.sportEmoji}>{sport.emoji}</Text>
                  <Text style={[styles.sportLabel, active && styles.sportLabelActive]}>
                    {sport.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={{ height: spacing.xxl }} />
      </ScrollView>

      {/* Create Button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.createBtn, !isReady && styles.createBtnDisabled]}
          onPress={handleCreate}
          activeOpacity={0.88}
          disabled={createMutation.isPending || !isReady}
        >
          {createMutation.isPending ? (
            <ActivityIndicator color={colors.primary} />
          ) : (
            <>
              <Ionicons name="shield-checkmark-outline" size={20} color={colors.primary} />
              <Text style={styles.createBtnText}>Create Club</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

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
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.sm,
  },
  navTitle: {
    ...typography.captionBold,
    color: colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  heading: {
    ...typography.h2,
    color: colors.primary,
    marginBottom: spacing.xs,
  },
  subHeading: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.xl,
    lineHeight: 22,
  },

  logoSection: { alignItems: 'center', marginBottom: spacing.xl },
  logoPlaceholder: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
    borderWidth: 2,
    borderColor: colors.border,
    borderStyle: 'dashed',
    ...shadows.sm,
  },
  logoHint: { ...typography.smallBold, color: colors.textSecondary },
  logoSubHint: { ...typography.tiny, color: colors.textTertiary },

  fieldGroup: { marginBottom: spacing.lg },
  fieldLabel: {
    ...typography.captionBold,
    color: colors.text,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
  },
  input: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    ...typography.body,
    color: colors.text,
    borderWidth: 1.5,
    borderColor: colors.border,
    ...shadows.xs,
  },
  charCount: {
    ...typography.tiny,
    color: colors.textTertiary,
    textAlign: 'right',
    marginTop: 4,
  },

  sportsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  sportCard: {
    width: '22%',
    aspectRatio: 1,
    backgroundColor: colors.white,
    borderRadius: borderRadius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    borderWidth: 1.5,
    borderColor: colors.border,
    ...shadows.xs,
  },
  sportCardActive: {
    borderColor: colors.accent,
    backgroundColor: colors.accentTint,
  },
  sportEmoji: { fontSize: 22 },
  sportLabel: { ...typography.tiny, color: colors.textSecondary, textAlign: 'center' },
  sportLabelActive: { color: colors.accentDark, fontWeight: '700' },

  footer: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.lg,
    paddingTop: spacing.sm,
    backgroundColor: colors.backgroundSecondary,
  },
  createBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.accent,
    borderRadius: borderRadius.xl,
    paddingVertical: 18,
    ...shadows.md,
  },
  createBtnDisabled: { opacity: 0.45 },
  createBtnText: { ...typography.bodyBold, color: colors.primary },
});
