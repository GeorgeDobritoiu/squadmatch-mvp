import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

// ── Types ─────────────────────────────────────────────────────────────────────

type Billing = 'monthly' | 'yearly';

// ── Data ──────────────────────────────────────────────────────────────────────

const PLANS = [
  {
    id:       'free',
    name:     'FREE',
    icon:     '⚽',
    subtitle: 'Start organising your weekly match in minutes',
    monthlyPrice: 0,
    yearlyPrice:  0,
    priceNote:    null,
    savingsNote:  null,
    limit:    'Up to 14 members',
    limitIcon:'people-outline' as const,
    cta:      'Get Started Free',
    ctaStyle: 'outline' as const,
    highlighted: false,
    features: [
      { text: 'Create & schedule matches',     included: true  },
      { text: 'YES / NO / MAYBE attendance',   included: true  },
      { text: 'Cost split per player',          included: true  },
      { text: 'MOTM voting',                    included: true  },
      { text: 'Random teams',                   included: true  },
      { text: 'Balanced teams',                 included: false },
      { text: 'Player rating system',           included: false },
      { text: 'Payment reminders',              included: false },
      { text: 'Match history & stats',          included: false },
    ],
  },
  {
    id:       'pro',
    name:     'PRO',
    icon:     '🏆',
    badge:    'BEST VALUE',
    subtitle: 'No more arguments. No more chasing payments.',
    monthlyPrice: 9.99,
    yearlyPrice:  6.39,
    priceNote:    'Less than £0.50 per player / month',
    savingsNote:  'Save £43 per year',
    limit:    'Up to 21 members',
    limitIcon:'people' as const,
    cta:      'Start PRO Free',
    ctaStyle: 'filled' as const,
    highlighted: true,
    features: [
      { text: 'Everything in FREE',             included: true  },
      { text: 'Balanced teams (fair every game)',included: true  },
      { text: 'Player rating system',           included: true  },
      { text: 'Payment reminders',              included: true  },
      { text: 'No-show tracking',               included: true  },
      { text: 'Match history & player stats',   included: true  },
      { text: 'WhatsApp team sharing',          included: true  },
      { text: 'Automatic waitlist',             included: true  },
    ],
  },
  {
    id:       'squad',
    name:     'SQUAD+',
    icon:     '🌟',
    subtitle: 'Built for larger groups and regular players',
    monthlyPrice: 14.99,
    yearlyPrice:  9.59,
    priceNote:    'Best for groups over 40 players',
    savingsNote:  'Save £64 per year',
    limit:    'Up to 60 members',
    limitIcon:'people' as const,
    cta:      'Start SQUAD+ Free',
    ctaStyle: 'dark' as const,
    highlighted: false,
    features: [
      { text: 'Everything in PRO',              included: true  },
      { text: 'Up to 60 members',               included: true  },
      { text: 'Multiple admins',                included: true  },
      { text: 'Recurring matches',              included: true  },
      { text: 'Season leaderboard',             included: true  },
      { text: 'Advanced ratings',               included: true  },
      { text: 'Payment export (CSV)',            included: true  },
    ],
  },
];

// ── Screen ────────────────────────────────────────────────────────────────────

export default function PricingScreen() {
  const [billing, setBilling] = useState<Billing>('monthly');
  const router = useRouter();

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      {/* Nav */}
      <View style={s.nav}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color="#0F2027" />
        </TouchableOpacity>
        <Text style={s.navTitle}>Choose a Plan</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={s.header}>
          <Text style={s.headerEyebrow}>SIMPLE PRICING</Text>
          <Text style={s.headerTitle}>Run better games.{'\n'}Every week.</Text>
          <Text style={s.headerSub}>
            Less than a post-match pint — split across your squad.
          </Text>
        </View>

        {/* Billing toggle */}
        <View style={s.toggleWrap}>
          <View style={s.toggle}>
            <TouchableOpacity
              style={[s.toggleBtn, billing === 'monthly' && s.toggleBtnActive]}
              onPress={() => setBilling('monthly')}
            >
              <Text style={[s.toggleText, billing === 'monthly' && s.toggleTextActive]}>
                Monthly
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.toggleBtn, billing === 'yearly' && s.toggleBtnActive]}
              onPress={() => setBilling('yearly')}
            >
              <Text style={[s.toggleText, billing === 'yearly' && s.toggleTextActive]}>
                Yearly
              </Text>
              <View style={s.saveBadge}>
                <Text style={s.saveBadgeText}>Save 36%</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* Plan cards */}
        {PLANS.map((plan) => {
          const price = billing === 'monthly' ? plan.monthlyPrice : plan.yearlyPrice;
          const isFree = plan.monthlyPrice === 0;

          return (
            <View
              key={plan.id}
              style={[
                s.card,
                plan.highlighted && s.cardHighlighted,
              ]}
            >
              {/* PRO badge */}
              {plan.badge && (
                <View style={s.bestBadge}>
                  <Text style={s.bestBadgeText}>{plan.badge}</Text>
                </View>
              )}

              {/* Plan header */}
              <View style={s.planHeader}>
                <View style={s.planTitleRow}>
                  <Text style={s.planIcon}>{plan.icon}</Text>
                  <Text style={[s.planName, plan.highlighted && s.planNameHighlighted]}>
                    {plan.name}
                  </Text>
                </View>

                {/* Price */}
                <View style={s.priceRow}>
                  {isFree ? (
                    <Text style={s.priceMain}>Free</Text>
                  ) : (
                    <View style={s.priceGroup}>
                      <Text style={s.priceCurrency}>£</Text>
                      <Text style={s.priceMain}>{price.toFixed(2)}</Text>
                      <View style={s.priceSuffix}>
                        <Text style={s.pricePer}>/ group</Text>
                        <Text style={s.pricePer}>/ month</Text>
                      </View>
                    </View>
                  )}
                </View>

                {/* Savings note (yearly only, paid plans) */}
                {billing === 'yearly' && plan.savingsNote && (
                  <View style={s.savingsRow}>
                    <Ionicons name="checkmark-circle" size={14} color="#16A34A" />
                    <Text style={s.savingsText}>{plan.savingsNote}</Text>
                  </View>
                )}

                {/* Price note */}
                {plan.priceNote && (
                  <Text style={s.priceNote}>{plan.priceNote}</Text>
                )}

                <Text style={s.planSubtitle}>{plan.subtitle}</Text>
              </View>

              {/* Divider */}
              <View style={[s.divider, plan.highlighted && s.dividerHighlighted]} />

              {/* Member limit chip */}
              <View style={s.limitRow}>
                <Ionicons
                  name={plan.limitIcon}
                  size={14}
                  color={plan.highlighted ? '#22C55E' : '#5D7A8A'}
                />
                <Text style={[s.limitText, plan.highlighted && s.limitTextHighlighted]}>
                  {plan.limit}
                </Text>
              </View>

              {/* Features */}
              <View style={s.featureList}>
                {plan.features.map((f, i) => (
                  <View key={i} style={s.featureRow}>
                    <View style={[
                      s.featureIcon,
                      f.included
                        ? (plan.highlighted ? s.featureIconGreen : s.featureIconMuted)
                        : s.featureIconLocked,
                    ]}>
                      <Ionicons
                        name={f.included ? 'checkmark' : 'lock-closed'}
                        size={f.included ? 11 : 10}
                        color={f.included ? (plan.highlighted ? '#fff' : '#16A34A') : '#94A3B8'}
                      />
                    </View>
                    <Text style={[s.featureText, !f.included && s.featureTextMuted]}>
                      {f.text}
                    </Text>
                  </View>
                ))}
              </View>

              {/* CTA button */}
              <TouchableOpacity
                style={[
                  s.cta,
                  plan.ctaStyle === 'filled' && s.ctaFilled,
                  plan.ctaStyle === 'outline' && s.ctaOutline,
                  plan.ctaStyle === 'dark'   && s.ctaDark,
                ]}
                activeOpacity={0.85}
              >
                <Text style={[
                  s.ctaText,
                  plan.ctaStyle === 'filled' && s.ctaTextFilled,
                  plan.ctaStyle === 'outline' && s.ctaTextOutline,
                  plan.ctaStyle === 'dark'   && s.ctaTextDark,
                ]}>
                  {plan.cta}
                </Text>
                {plan.ctaStyle === 'filled' && (
                  <Ionicons name="arrow-forward" size={16} color="#fff" style={{ marginLeft: 6 }} />
                )}
              </TouchableOpacity>

              {!isFree && (
                <Text style={s.trialNote}>7-day free trial · Cancel anytime</Text>
              )}
            </View>
          );
        })}

        {/* Trust row */}
        <View style={s.trustRow}>
          {[
            { icon: 'shield-checkmark-outline', text: 'No hidden fees' },
            { icon: 'refresh-outline',          text: 'Cancel anytime' },
            { icon: 'lock-closed-outline',      text: 'Secure payments' },
          ].map((t) => (
            <View key={t.text} style={s.trustItem}>
              <Ionicons name={t.icon as any} size={18} color="#22C55E" />
              <Text style={s.trustText}>{t.text}</Text>
            </View>
          ))}
        </View>

        {/* FAQ teaser */}
        <View style={s.faqCard}>
          <Ionicons name="chatbubble-ellipses-outline" size={20} color="#5D7A8A" />
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={s.faqTitle}>Got questions?</Text>
            <Text style={s.faqSub}>All plans include a 7-day free trial. Switch or cancel at any time — no penalties.</Text>
          </View>
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const GREEN        = '#22C55E';
const GREEN_DARK   = '#16A34A';
const GREEN_TINT   = '#F0FDF4';
const GREEN_BORDER = '#BBF7D0';
const NAVY         = '#0F2027';
const GREY_BG      = '#F6F8FA';
const GREY_TEXT    = '#5D7A8A';
const GREY_LIGHT   = '#E2E8F0';
const WHITE        = '#FFFFFF';

const s = StyleSheet.create({
  safe:    { flex: 1, backgroundColor: GREY_BG },
  scroll:  { flex: 1 },
  content: { paddingHorizontal: 16, paddingBottom: 16 },

  // Nav
  nav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: WHITE,
    justifyContent: 'center', alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08, shadowRadius: 3, elevation: 2,
  },
  navTitle: {
    fontSize: 15, fontWeight: '700', color: NAVY, letterSpacing: 0.2,
  },

  // Header
  header: { alignItems: 'center', paddingVertical: 20, paddingHorizontal: 8 },
  headerEyebrow: {
    fontSize: 11, fontWeight: '700', color: GREEN_DARK,
    letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 8,
  },
  headerTitle: {
    fontSize: 28, fontWeight: '800', color: NAVY,
    textAlign: 'center', lineHeight: 34, marginBottom: 10,
  },
  headerSub: {
    fontSize: 14, color: GREY_TEXT, textAlign: 'center', lineHeight: 20,
  },

  // Toggle
  toggleWrap: { alignItems: 'center', marginBottom: 20 },
  toggle: {
    flexDirection: 'row',
    backgroundColor: GREY_LIGHT,
    borderRadius: 50,
    padding: 3,
  },
  toggleBtn: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 9,
    borderRadius: 50, gap: 6,
  },
  toggleBtnActive: { backgroundColor: WHITE,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1, shadowRadius: 4, elevation: 2,
  },
  toggleText:       { fontSize: 14, fontWeight: '600', color: GREY_TEXT },
  toggleTextActive: { color: NAVY },
  saveBadge: {
    backgroundColor: GREEN, borderRadius: 50, paddingHorizontal: 7, paddingVertical: 2,
  },
  saveBadgeText: { fontSize: 10, fontWeight: '700', color: WHITE },

  // Card
  card: {
    backgroundColor: WHITE,
    borderRadius: 22,
    padding: 22,
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: GREY_LIGHT,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  cardHighlighted: {
    borderColor: GREEN,
    borderWidth: 2,
    shadowColor: GREEN,
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },

  // Best badge
  bestBadge: {
    alignSelf: 'flex-start',
    backgroundColor: GREEN,
    borderRadius: 50,
    paddingHorizontal: 12, paddingVertical: 4,
    marginBottom: 14,
  },
  bestBadgeText: { fontSize: 11, fontWeight: '800', color: WHITE, letterSpacing: 0.8 },

  // Plan header
  planHeader:  { marginBottom: 4 },
  planTitleRow:{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  planIcon:    { fontSize: 22 },
  planName: {
    fontSize: 20, fontWeight: '800', color: NAVY, letterSpacing: 0.2,
  },
  planNameHighlighted: { color: GREEN_DARK },

  // Price
  priceRow: { flexDirection: 'row', alignItems: 'flex-end', marginBottom: 6 },
  priceGroup: { flexDirection: 'row', alignItems: 'flex-start' },
  priceCurrency: {
    fontSize: 18, fontWeight: '700', color: NAVY, marginTop: 4, marginRight: 1,
  },
  priceMain: { fontSize: 40, fontWeight: '800', color: NAVY, lineHeight: 44 },
  priceSuffix:{ justifyContent: 'flex-end', marginLeft: 4, marginBottom: 5 },
  pricePer:   { fontSize: 12, color: GREY_TEXT, fontWeight: '500' },

  savingsRow: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: GREEN_TINT, borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 5,
    alignSelf: 'flex-start', marginBottom: 6,
  },
  savingsText: { fontSize: 13, fontWeight: '600', color: GREEN_DARK },

  priceNote: {
    fontSize: 12, color: GREY_TEXT, marginBottom: 8, fontStyle: 'italic',
  },
  planSubtitle: {
    fontSize: 13, color: GREY_TEXT, lineHeight: 18, marginTop: 4,
  },

  // Divider
  divider: { height: 1, backgroundColor: GREY_LIGHT, marginVertical: 16 },
  dividerHighlighted: { backgroundColor: GREEN_BORDER },

  // Member limit
  limitRow: {
    flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 14,
  },
  limitText: { fontSize: 13, fontWeight: '600', color: GREY_TEXT },
  limitTextHighlighted: { color: GREEN_DARK },

  // Features
  featureList: { gap: 10, marginBottom: 20 },
  featureRow:  { flexDirection: 'row', alignItems: 'center', gap: 10 },
  featureIcon: {
    width: 20, height: 20, borderRadius: 10,
    justifyContent: 'center', alignItems: 'center',
  },
  featureIconGreen: { backgroundColor: GREEN },
  featureIconMuted: { backgroundColor: GREEN_TINT, borderWidth: 1, borderColor: GREEN_BORDER },
  featureIconCross:  { backgroundColor: '#F1F5F9' },
  featureIconLocked: { backgroundColor: '#F1F5F9', borderWidth: 1, borderColor: '#E2E8F0' },
  featureText:      { flex: 1, fontSize: 14, color: NAVY, fontWeight: '500' },
  featureTextMuted: { color: '#94A3B8' },

  // CTA
  cta: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    borderRadius: 14, paddingVertical: 15, marginTop: 4,
  },
  ctaFilled:  { backgroundColor: GREEN },
  ctaOutline: { borderWidth: 2, borderColor: GREY_LIGHT },
  ctaDark:    { backgroundColor: NAVY },
  ctaText:    { fontSize: 15, fontWeight: '700' },
  ctaTextFilled:  { color: WHITE },
  ctaTextOutline: { color: NAVY },
  ctaTextDark:    { color: WHITE },

  trialNote: {
    textAlign: 'center', fontSize: 12, color: GREY_TEXT, marginTop: 10,
  },

  // Trust row
  trustRow: {
    flexDirection: 'row', justifyContent: 'space-around',
    backgroundColor: WHITE, borderRadius: 18,
    paddingVertical: 18, paddingHorizontal: 8,
    marginBottom: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 1,
    borderWidth: 1, borderColor: GREY_LIGHT,
  },
  trustItem: { alignItems: 'center', gap: 6 },
  trustText: { fontSize: 11, fontWeight: '600', color: NAVY, textAlign: 'center' },

  // FAQ
  faqCard: {
    flexDirection: 'row', alignItems: 'flex-start',
    backgroundColor: WHITE, borderRadius: 18,
    padding: 18, borderWidth: 1, borderColor: GREY_LIGHT,
  },
  faqTitle: { fontSize: 14, fontWeight: '700', color: NAVY, marginBottom: 4 },
  faqSub:   { fontSize: 13, color: GREY_TEXT, lineHeight: 18 },
});
