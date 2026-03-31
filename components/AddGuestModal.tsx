import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  Switch,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useMutation } from '@tanstack/react-query';
import { colors, spacing, borderRadius, typography, shadows } from '@/constants/design';
import { addGuest } from '@/lib/data';

interface Props {
  visible: boolean;
  onClose: () => void;
  matchId: string;
  sponsorId: string;
  onAdded: () => void;
}

type GuestType = 'guest_paid' | 'guest_free' | 'minor';
type SkillLevel = 'Low' | 'Medium' | 'High';

const GUEST_TYPES: { value: GuestType; label: string; desc: string }[] = [
  { value: 'guest_paid', label: 'Guest (Paid)', desc: 'Pays full match fee' },
  { value: 'guest_free', label: 'Guest (Free)', desc: 'Special / invited' },
  { value: 'minor', label: 'Minor (Free)', desc: 'Under-16, no fee' },
];

const SKILL_LEVELS: SkillLevel[] = ['Low', 'Medium', 'High'];

export default function AddGuestModal({ visible, onClose, matchId, sponsorId, onAdded }: Props) {
  const [name, setName] = useState('');
  const [type, setType] = useState<GuestType>('guest_paid');
  const [skillLevel, setSkillLevel] = useState<SkillLevel>('Medium');
  const [requiresPresence, setRequiresPresence] = useState(false);

  const addMutation = useMutation({
    mutationFn: () =>
      addGuest({
        matchId,
        sponsorId,
        name: name.trim(),
        type,
        skillLevel,
        requiresSponsorPresence: requiresPresence,
      }),
    onSuccess: () => {
      setName('');
      setType('guest_paid');
      setSkillLevel('Medium');
      setRequiresPresence(false);
      onAdded();
    },
    onError: () => Alert.alert('Error', 'Could not add guest. Try again.'),
  });

  const handleSubmit = () => {
    if (!name.trim()) {
      Alert.alert('Name required', 'Please enter the guest name.');
      return;
    }
    addMutation.mutate();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.handle} />

          <View style={styles.titleRow}>
            <Text style={styles.title}>Add Guest / Minor</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Name */}
          <Text style={styles.label}>Name</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="Full name"
            placeholderTextColor={colors.textTertiary}
          />

          {/* Type */}
          <Text style={styles.label}>Type</Text>
          <View style={styles.typeGrid}>
            {GUEST_TYPES.map((t) => (
              <TouchableOpacity
                key={t.value}
                style={[styles.typeCard, type === t.value && styles.typeCardActive]}
                onPress={() => setType(t.value)}
              >
                <Text style={[styles.typeLabel, type === t.value && styles.typeLabelActive]}>{t.label}</Text>
                <Text style={[styles.typeDesc, type === t.value && styles.typeDescActive]}>{t.desc}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Skill Level */}
          <Text style={styles.label}>Skill Level</Text>
          <View style={styles.skillRow}>
            {SKILL_LEVELS.map((s) => (
              <TouchableOpacity
                key={s}
                style={[styles.skillBtn, skillLevel === s && styles.skillBtnActive]}
                onPress={() => setSkillLevel(s)}
              >
                <Text style={[styles.skillBtnText, skillLevel === s && styles.skillBtnTextActive]}>{s}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Requires Presence Toggle */}
          <View style={styles.toggleRow}>
            <View style={styles.toggleInfo}>
              <Text style={styles.toggleLabel}>Requires my presence</Text>
              <Text style={styles.toggleDesc}>Guest leaves if you can't make it</Text>
            </View>
            <Switch
              value={requiresPresence}
              onValueChange={setRequiresPresence}
              trackColor={{ false: colors.backgroundTertiary, true: colors.accentTint }}
              thumbColor={requiresPresence ? colors.accent : colors.textTertiary}
            />
          </View>

          {/* Actions */}
          <View style={styles.actions}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.addBtn}
              onPress={handleSubmit}
              disabled={addMutation.isPending}
            >
              <Ionicons name="person-add" size={16} color={colors.white} />
              <Text style={styles.addBtnText}>{addMutation.isPending ? 'Adding...' : 'Add Guest'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: colors.white, borderTopLeftRadius: borderRadius.xxl, borderTopRightRadius: borderRadius.xxl, padding: spacing.lg, paddingBottom: 40 },
  handle: { width: 40, height: 4, backgroundColor: colors.border, borderRadius: 2, alignSelf: 'center', marginBottom: spacing.lg },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.lg },
  title: { ...typography.h3, color: colors.primary },
  closeBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.backgroundTertiary, justifyContent: 'center', alignItems: 'center' },

  label: { ...typography.smallBold, color: colors.textSecondary, marginBottom: spacing.sm },
  input: {
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.md,
    ...typography.body,
    color: colors.text,
    backgroundColor: colors.backgroundSecondary,
  },

  typeGrid: { gap: spacing.sm, marginBottom: spacing.md },
  typeCard: {
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.backgroundSecondary,
  },
  typeCardActive: { borderColor: colors.primary, backgroundColor: colors.primaryTint },
  typeLabel: { ...typography.captionBold, color: colors.textSecondary },
  typeLabelActive: { color: colors.primary },
  typeDesc: { ...typography.small, color: colors.textTertiary, marginTop: 2 },
  typeDescActive: { color: colors.secondary },

  skillRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  skillBtn: { flex: 1, paddingVertical: spacing.sm, borderRadius: borderRadius.lg, borderWidth: 1.5, borderColor: colors.border, alignItems: 'center', backgroundColor: colors.backgroundSecondary },
  skillBtnActive: { borderColor: colors.primary, backgroundColor: colors.primaryTint },
  skillBtnText: { ...typography.captionBold, color: colors.textSecondary },
  skillBtnTextActive: { color: colors.primary },

  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.backgroundSecondary, borderRadius: borderRadius.lg, padding: spacing.md, marginBottom: spacing.lg },
  toggleInfo: { flex: 1, paddingRight: spacing.md },
  toggleLabel: { ...typography.captionBold, color: colors.text },
  toggleDesc: { ...typography.small, color: colors.textSecondary, marginTop: 2 },

  actions: { flexDirection: 'row', gap: spacing.sm },
  cancelBtn: { flex: 1, paddingVertical: spacing.md, borderRadius: borderRadius.lg, backgroundColor: colors.backgroundTertiary, alignItems: 'center' },
  cancelBtnText: { ...typography.captionBold, color: colors.textSecondary },
  addBtn: { flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, paddingVertical: spacing.md, borderRadius: borderRadius.lg, backgroundColor: colors.primary },
  addBtnText: { ...typography.captionBold, color: colors.white },
});
