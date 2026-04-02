/**
 * NativeDatePicker
 *
 * Wraps @react-native-community/datetimepicker for iOS/Android only.
 * On Web, renders a plain TextInput fallback since the native picker is
 * not supported on the web platform.
 */
import React from 'react';
import { Platform, TextInput, StyleSheet, View } from 'react-native';
import { colors, borderRadius, typography, spacing } from '@/constants/design';

interface Props {
  value: Date;
  mode: 'date' | 'time';
  onChange: (event: any, date?: Date) => void;
  display?: string;
  minimumDate?: Date;
  minuteInterval?: 1 | 2 | 3 | 4 | 5 | 6 | 10 | 12 | 15 | 20 | 30;
  accentColor?: string;
}

// No native dependency — this component is a pure web/TextInput fallback.
// The schedule screen uses a custom MiniCalendar instead.

function formatForInput(date: Date, mode: 'date' | 'time') {
  if (mode === 'date') {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

function parseWebInput(value: string, mode: 'date' | 'time', base: Date): Date | null {
  try {
    if (mode === 'date') {
      const [y, m, d] = value.split('-').map(Number);
      if (!y || !m || !d) return null;
      const date = new Date(base);
      date.setFullYear(y, m - 1, d);
      return date;
    } else {
      const [h, min] = value.split(':').map(Number);
      if (isNaN(h) || isNaN(min)) return null;
      const date = new Date(base);
      date.setHours(h, min, 0, 0);
      return date;
    }
  } catch {
    return null;
  }
}

export default function NativeDatePicker({ value, mode, onChange }: Props) {
  // Pure TextInput fallback — works on all platforms
  return (
    <View style={styles.webContainer}>
      <TextInput
        style={styles.webInput}
        value={formatForInput(value, mode)}
        onChangeText={(text) => {
          const parsed = parseWebInput(text, mode, value);
          if (parsed) onChange({ type: 'set' } as any, parsed);
        }}
        placeholder={mode === 'date' ? 'YYYY-MM-DD' : 'HH:MM'}
        placeholderTextColor={colors.textTertiary}
        keyboardType={mode === 'time' ? 'numbers-and-punctuation' : 'default'}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  webContainer: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  webInput: {
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    ...typography.h4,
    color: colors.primary,
    textAlign: 'center',
  },
});
