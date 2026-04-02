import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { getRatingColor, getRatingLabel } from '@/lib/ratings';
import { borderRadius, typography } from '@/constants/design';

interface Props {
  score: number;
  showLabel?: boolean;
  size?: 'sm' | 'md';
}

export default function RatingBadge({ score, showLabel = false, size = 'md' }: Props) {
  const color = getRatingColor(score);
  const label = getRatingLabel(score);
  const isSmall = size === 'sm';

  return (
    <View style={[styles.badge, { backgroundColor: color + '1A', borderColor: color + '40' }, isSmall && styles.badgeSm]}>
      <Text style={[styles.score, { color }, isSmall && styles.scoreSm]}>
        {score.toFixed(1)}
      </Text>
      {showLabel && (
        <Text style={[styles.label, { color }]}>{label}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
    borderWidth: 1,
  },
  badgeSm: {
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  score: {
    ...typography.smallBold,
    fontVariant: ['tabular-nums'],
  },
  scoreSm: {
    fontSize: 11,
    fontWeight: '700',
  },
  label: {
    ...typography.tiny,
    fontWeight: '600',
  },
});
