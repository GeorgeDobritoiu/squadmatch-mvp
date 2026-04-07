/**
 * UpgradeBanner — inline lock strip shown when a feature requires PRO.
 * Tapping it navigates to /pricing.
 */
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

interface Props {
  feature: string;        // e.g. "MOTM Voting"
  requiredPlan?: string;  // defaults to "PRO"
  compact?: boolean;
}

export default function UpgradeBanner({ feature, requiredPlan = 'PRO', compact = false }: Props) {
  const router = useRouter();

  if (compact) {
    return (
      <TouchableOpacity style={s.compact} onPress={() => router.push('/pricing')} activeOpacity={0.85}>
        <Ionicons name="lock-closed" size={13} color="#D97706" />
        <Text style={s.compactText}>{feature} · <Text style={s.compactLink}>Upgrade to {requiredPlan}</Text></Text>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity style={s.banner} onPress={() => router.push('/pricing')} activeOpacity={0.85}>
      <View style={s.iconWrap}>
        <Ionicons name="lock-closed" size={18} color="#D97706" />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={s.title}>{feature}</Text>
        <Text style={s.sub}>Available on {requiredPlan} plan</Text>
      </View>
      <View style={s.pill}>
        <Text style={s.pillText}>Upgrade</Text>
        <Ionicons name="arrow-forward" size={12} color="#D97706" />
      </View>
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#FFFBEB',
    borderWidth: 1.5,
    borderColor: '#FDE68A',
    borderRadius: 14,
    padding: 14,
    marginVertical: 6,
  },
  iconWrap: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#FEF3C7',
    justifyContent: 'center', alignItems: 'center',
  },
  title: { fontSize: 14, fontWeight: '700', color: '#92400E' },
  sub:   { fontSize: 12, color: '#B45309', marginTop: 1 },
  pill:  {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 20,
  },
  pillText: { fontSize: 12, fontWeight: '700', color: '#D97706' },

  // Compact variant
  compact: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#FFFBEB', borderWidth: 1, borderColor: '#FDE68A',
    borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8,
    marginVertical: 4,
  },
  compactText: { fontSize: 13, color: '#92400E' },
  compactLink: { fontWeight: '700', color: '#D97706' },
});
