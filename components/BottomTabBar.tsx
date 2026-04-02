import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, usePathname } from 'expo-router';
import { colors, spacing } from '@/constants/design';

const TABS = [
  { name: 'home',     label: 'Home',     icon: 'home',     iconOutline: 'home-outline'     },
  { name: 'matches',  label: 'Matches',  icon: 'football', iconOutline: 'football-outline' },
  { name: 'group',    label: 'Group',    icon: 'people',   iconOutline: 'people-outline'   },
  { name: 'payments', label: 'Payments', icon: 'wallet',   iconOutline: 'wallet-outline'   },
  { name: 'profile',  label: 'Profile',  icon: 'person',   iconOutline: 'person-outline'   },
] as const;

export default function BottomTabBar() {
  const router   = useRouter();
  const pathname = usePathname();

  return (
    <View style={styles.container}>
      {TABS.map((tab) => {
        const active = pathname === `/${tab.name}`;
        return (
          <TouchableOpacity
            key={tab.name}
            style={styles.tab}
            onPress={() => router.push(`/${tab.name}` as any)}
            activeOpacity={0.7}
          >
            <View style={[styles.iconWrap, active && styles.iconWrapActive]}>
              <Ionicons
                name={active ? tab.icon : tab.iconOutline}
                size={22}
                color={active ? colors.accent : colors.textSecondary}
              />
            </View>
            <Text style={[styles.label, active && styles.labelActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: '#E8EDF0',
    height: Platform.OS === 'ios' ? 88 : 64,
    paddingBottom: Platform.OS === 'ios' ? 28 : 8,
    paddingTop: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 8,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  iconWrap: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 10,
  },
  iconWrapActive: {
    backgroundColor: colors.accentTint,
  },
  label: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  labelActive: {
    color: colors.accent,
  },
});
