import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { colors, spacing, borderRadius, typography, shadows } from '@/constants/design';
import { getGroup, getPlayers, getCurrentUser } from '@/lib/data';
import { useRouter } from 'expo-router';
import { blink } from '@/lib/blink';

const POSITION_COLORS: Record<string, string> = {
  Goalkeeper: '#7C3AED',
  Defender: '#2563EB',
  Midfielder: '#D97706',
  Striker: '#DC2626',
  Any: '#6B7280',
};

export default function GroupScreen() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const [createMatchModal, setCreateMatchModal] = useState(false);
  const [matchDate, setMatchDate] = useState('2026-04-13');
  const [matchTime, setMatchTime] = useState('10:00');
  const [matchLocation, setMatchLocation] = useState('Hackney Marshes, Pitch 3');
  const [matchCost, setMatchCost] = useState('8');

  const { data: group, isLoading: groupLoading } = useQuery({
    queryKey: ['group'],
    queryFn: getGroup,
  });

  const { data: players, isLoading: playersLoading } = useQuery({
    queryKey: ['players'],
    queryFn: getPlayers,
  });

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: getCurrentUser,
  });

  const createMatchMutation = useMutation({
    mutationFn: async () => {
      return blink.db.matches.create({
        id: `m_${Date.now()}`,
        groupId: group?.id ?? 'grp1',
        date: matchDate,
        time: matchTime,
        location: matchLocation,
        costPerPlayer: parseFloat(matchCost),
        status: 'open',
        teamsLocked: 0,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['matches'] });
      queryClient.invalidateQueries({ queryKey: ['nextMatch'] });
      setCreateMatchModal(false);
      Alert.alert('Match Created!', 'The new match has been scheduled.');
    },
  });

  const isAdmin = currentUser?.role === 'admin';

  if (groupLoading || playersLoading) {
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
        {/* Group Header */}
        <View style={styles.groupHeader}>
          <View style={styles.groupLogoContainer}>
            <View style={styles.groupLogo}>
              <Ionicons name="football" size={32} color={colors.white} />
            </View>
          </View>
          <View style={styles.groupInfo}>
            <Text style={styles.groupName}>{group?.name ?? 'Sunday Warriors FC'}</Text>
            <View style={styles.groupMeta}>
              <Ionicons name="location-outline" size={14} color={colors.textSecondary} />
              <Text style={styles.groupLocation}>{group?.location ?? 'Hackney Marshes'}</Text>
            </View>
            <Text style={styles.groupDesc}>{group?.description ?? ''}</Text>
          </View>
        </View>

        {/* Stats Strip */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{players?.length ?? 0}</Text>
            <Text style={styles.statLabel}>Members</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>5-a-side</Text>
            <Text style={styles.statLabel}>Format</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>Weekly</Text>
            <Text style={styles.statLabel}>Frequency</Text>
          </View>
        </View>

        {/* Admin Actions */}
        {isAdmin && (
          <View style={styles.adminSection}>
            <Text style={styles.sectionTitle}>Admin</Text>
            <View style={styles.adminRow}>
              <TouchableOpacity style={styles.adminBtn} onPress={() => setCreateMatchModal(true)}>
                <Ionicons name="add-circle-outline" size={20} color={colors.primary} />
                <Text style={styles.adminBtnText}>Create Match</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.adminBtn, styles.adminBtnOutline]}>
                <Ionicons name="settings-outline" size={20} color={colors.textSecondary} />
                <Text style={[styles.adminBtnText, styles.adminBtnTextOutline]}>Settings</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Members */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Members ({players?.length ?? 0})</Text>
          {(players ?? []).map((player) => (
            <TouchableOpacity key={player.id} style={styles.memberCard} onPress={() => router.push(`/player/${player.id}`)} activeOpacity={0.85}>
              <View style={[styles.memberAvatar, { backgroundColor: player.id === currentUser?.id ? colors.primary : '#E8EDF2' }]}>
                <Text style={[styles.memberAvatarText, { color: player.id === currentUser?.id ? colors.white : colors.primary }]}>
                  {player.name.charAt(0)}
                </Text>
              </View>
              <View style={styles.memberInfo}>
                <View style={styles.memberNameRow}>
                  <Text style={styles.memberName}>{player.name}</Text>
                  {player.id === currentUser?.id && (
                    <View style={styles.youBadge}>
                      <Text style={styles.youBadgeText}>You</Text>
                    </View>
                  )}
                  {player.role === 'admin' && (
                    <View style={styles.adminBadge}>
                      <Text style={styles.adminBadgeText}>Admin</Text>
                    </View>
                  )}
                </View>
                <View style={styles.memberMeta}>
                  <View style={[styles.positionDot, { backgroundColor: POSITION_COLORS[player.position] ?? '#6B7280' }]} />
                  <Text style={styles.memberPosition}>{player.position}</Text>
                  <Text style={styles.memberDot}>·</Text>
                  <Text style={styles.memberSkill}>{player.skillLevel}</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
            </TouchableOpacity>
          ))}
        </View>

        <View style={{ height: spacing.xl }} />
      </ScrollView>

      {/* Create Match Modal */}
      <Modal visible={createMatchModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Create New Match</Text>

            <Text style={styles.inputLabel}>Date</Text>
            <TextInput
              style={styles.input}
              value={matchDate}
              onChangeText={setMatchDate}
              placeholder="YYYY-MM-DD"
            />

            <Text style={styles.inputLabel}>Time</Text>
            <TextInput
              style={styles.input}
              value={matchTime}
              onChangeText={setMatchTime}
              placeholder="10:00"
            />

            <Text style={styles.inputLabel}>Location</Text>
            <TextInput
              style={styles.input}
              value={matchLocation}
              onChangeText={setMatchLocation}
              placeholder="Pitch location"
            />

            <Text style={styles.inputLabel}>Cost per player (£)</Text>
            <TextInput
              style={styles.input}
              value={matchCost}
              onChangeText={setMatchCost}
              placeholder="8"
              keyboardType="decimal-pad"
            />

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setCreateMatchModal(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.createBtn}
                onPress={() => createMatchMutation.mutate()}
              >
                <Text style={styles.createBtnText}>Create Match</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.backgroundSecondary },
  scroll: { flex: 1 },
  scrollContent: { padding: spacing.md },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  groupHeader: { backgroundColor: colors.white, borderRadius: borderRadius.xl, padding: spacing.lg, marginBottom: spacing.md, ...shadows.sm },
  groupLogoContainer: { marginBottom: spacing.md },
  groupLogo: { width: 64, height: 64, borderRadius: borderRadius.xl, backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center' },
  groupInfo: {},
  groupName: { ...typography.h3, color: colors.primary },
  groupMeta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: spacing.xs },
  groupLocation: { ...typography.caption, color: colors.textSecondary },
  groupDesc: { ...typography.caption, color: colors.textSecondary, marginTop: spacing.sm },

  statsRow: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.xl,
    padding: spacing.md,
    flexDirection: 'row',
    marginBottom: spacing.md,
    ...shadows.sm,
  },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: { ...typography.h4, color: colors.primary },
  statLabel: { ...typography.tiny, color: colors.textSecondary, marginTop: 2 },
  statDivider: { width: 1, backgroundColor: colors.border },

  adminSection: { marginBottom: spacing.md },
  adminRow: { flexDirection: 'row', gap: spacing.sm },
  adminBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.accentTint,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md,
    borderWidth: 1.5,
    borderColor: colors.accent,
  },
  adminBtnOutline: { backgroundColor: colors.white, borderColor: colors.border },
  adminBtnText: { ...typography.captionBold, color: colors.primary },
  adminBtnTextOutline: { color: colors.textSecondary },

  section: { marginBottom: spacing.md },
  sectionTitle: { ...typography.captionBold, color: colors.text, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: spacing.sm },

  memberCard: { backgroundColor: colors.white, borderRadius: borderRadius.lg, padding: spacing.md, flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.sm, ...shadows.xs },
  memberAvatar: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  memberAvatarText: { ...typography.bodyBold },
  memberInfo: { flex: 1 },
  memberNameRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: 3 },
  memberName: { ...typography.captionBold, color: colors.text },
  youBadge: { backgroundColor: colors.primaryTint, paddingHorizontal: 6, paddingVertical: 2, borderRadius: borderRadius.full },
  youBadgeText: { ...typography.tiny, color: colors.primary, fontWeight: '700' },
  adminBadge: { backgroundColor: '#FEF3C7', paddingHorizontal: 6, paddingVertical: 2, borderRadius: borderRadius.full },
  adminBadgeText: { ...typography.tiny, color: '#D97706', fontWeight: '700' },
  memberMeta: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  positionDot: { width: 8, height: 8, borderRadius: 4 },
  memberPosition: { ...typography.small, color: colors.textSecondary },
  memberDot: { ...typography.small, color: colors.textTertiary },
  memberSkill: { ...typography.small, color: colors.textSecondary },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: colors.white, borderTopLeftRadius: borderRadius.xxl, borderTopRightRadius: borderRadius.xxl, padding: spacing.lg, paddingBottom: 40 },
  modalHandle: { width: 40, height: 4, backgroundColor: colors.border, borderRadius: 2, alignSelf: 'center', marginBottom: spacing.lg },
  modalTitle: { ...typography.h3, color: colors.primary, marginBottom: spacing.lg },
  inputLabel: { ...typography.smallBold, color: colors.textSecondary, marginBottom: spacing.xs },
  input: { borderWidth: 1.5, borderColor: colors.border, borderRadius: borderRadius.lg, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, marginBottom: spacing.md, ...typography.body, color: colors.text },
  modalActions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  cancelBtn: { flex: 1, paddingVertical: spacing.md, borderRadius: borderRadius.lg, backgroundColor: colors.backgroundTertiary, alignItems: 'center' },
  cancelBtnText: { ...typography.captionBold, color: colors.textSecondary },
  createBtn: { flex: 1, paddingVertical: spacing.md, borderRadius: borderRadius.lg, backgroundColor: colors.primary, alignItems: 'center' },
  createBtnText: { ...typography.captionBold, color: colors.white },
});
