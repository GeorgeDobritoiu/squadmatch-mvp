/**
 * SquadPlay — Zero-Friction Entry Screen
 * Primary landing for new users: join via invite link or create a squad.
 * No forced sign-up. No friction. Just play.
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Path, Circle, Polygon, Defs, LinearGradient, Stop, Rect, Ellipse, G } from 'react-native-svg';

// ── Brand tokens ──────────────────────────────────────────────────────────────
const B = {
  green:      '#4ED39D',
  greenDark:  '#35B882',
  greenLight: '#A8EDCE',
  greenTint:  '#E8FAF3',
  navy:       '#0A1628',
  navyLight:  '#152238',
  navyMid:    '#1E3A5F',
  white:      '#FFFFFF',
  offWhite:   '#F7F9FB',
  grey100:    '#F0F3F6',
  grey300:    '#C8D2DC',
  grey500:    '#8A9BB0',
  grey700:    '#4A5A6A',
};

// ── Small pitch illustration ──────────────────────────────────────────────────
function PitchGraphic() {
  return (
    <Svg width={200} height={120} viewBox="0 0 200 120">
      <Defs>
        <LinearGradient id="pg" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#1A4731" />
          <Stop offset="1" stopColor="#0F2D1E" />
        </LinearGradient>
      </Defs>
      <Rect x={4} y={4} width={192} height={112} rx={14} fill="url(#pg)" />
      {/* Stripes */}
      {[24,40,56,72,88,104,120,136,152,168,184].map((x, i) => (
        <Rect key={i} x={x} y={4} width={8} height={112} fill="#FFFFFF" fillOpacity={0.025} />
      ))}
      {/* Centre circle */}
      <Circle cx={100} cy={60} r={28} stroke="#FFFFFF" strokeWidth={1.5} strokeOpacity={0.3} fill="none" />
      <Circle cx={100} cy={60} r={3} fill="#FFFFFF" fillOpacity={0.4} />
      {/* Centre line */}
      <Rect x={99} y={4} width={2} height={112} fill="#FFFFFF" fillOpacity={0.2} />
      {/* Goal boxes */}
      <Rect x={4} y={35} width={22} height={50} stroke="#FFFFFF" strokeWidth={1.5} strokeOpacity={0.25} fill="none" />
      <Rect x={174} y={35} width={22} height={50} stroke="#FFFFFF" strokeWidth={1.5} strokeOpacity={0.25} fill="none" />
      {/* Team A dots */}
      {[[38,60],[58,38],[58,82]].map(([cx,cy],i)=>(
        <G key={`a${i}`}>
          <Circle cx={cx} cy={cy} r={9} fill={B.green} fillOpacity={0.9} />
          <Circle cx={cx} cy={cy-3} r={4} fill="#FFFFFF" fillOpacity={0.85} />
          <Ellipse cx={cx} cy={cy+4} rx={4} ry={2.5} fill="#FFFFFF" fillOpacity={0.5} />
        </G>
      ))}
      {/* Team B dots */}
      {[[162,60],[142,38],[142,82]].map(([cx,cy],i)=>(
        <G key={`b${i}`}>
          <Circle cx={cx} cy={cy} r={9} fill="#FFFFFF" fillOpacity={0.15} stroke="#FFFFFF" strokeWidth={1.5} />
          <Circle cx={cx} cy={cy-3} r={4} fill="#FFFFFF" fillOpacity={0.7} />
          <Ellipse cx={cx} cy={cy+4} rx={4} ry={2.5} fill="#FFFFFF" fillOpacity={0.35} />
        </G>
      ))}
      {/* Ball */}
      <Circle cx={100} cy={60} r={7} fill="#FFFFFF" />
      <Polygon points="100,55 103,58 102,62 98,62 97,58" fill={B.navy} fillOpacity={0.2} />
    </Svg>
  );
}

// ── Helper: parse invite link → groupId ──────────────────────────────────────
function extractGroupId(input: string): string | null {
  const trimmed = input.trim();
  // Full URL: squadplay--squadplay.expo.app/join/GROUPID
  const urlMatch = trimmed.match(/\/join\/([a-zA-Z0-9_-]{6,})/);
  if (urlMatch) return urlMatch[1];
  // Raw UUID or short ID
  if (/^[a-zA-Z0-9_-]{6,}$/.test(trimmed)) return trimmed;
  return null;
}

// ── Main Screen ───────────────────────────────────────────────────────────────
export default function JoinScreen() {
  const router = useRouter();
  const [inviteInput, setInviteInput] = useState('');
  const [inputError, setInputError] = useState('');
  const [showInput, setShowInput] = useState(false);

  const handleJoinWithLink = () => {
    if (!showInput) {
      setShowInput(true);
      return;
    }
    const groupId = extractGroupId(inviteInput);
    if (!groupId) {
      setInputError('Paste a valid SquadPlay invite link or code.');
      return;
    }
    setInputError('');
    router.push(`/join/${groupId}`);
  };

  return (
    <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={s.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >

          {/* ── Logo ── */}
          <View style={s.logoRow}>
            <Image
              source={require('../assets/images/icon.png')}
              style={s.logoImg}
              resizeMode="contain"
            />
            <Text style={s.logoText}>
              Squad<Text style={{ color: B.green }}>Play</Text>
            </Text>
          </View>

          {/* ── Pitch illustration ── */}
          <View style={s.illustrationWrap}>
            <PitchGraphic />
          </View>

          {/* ── Headline ── */}
          <View style={s.headlineWrap}>
            <Text style={s.headline}>No accounts.{'\n'}No friction.{'\n'}Just play.</Text>
            <Text style={s.sub}>
              Organise your casual sports group — matches, payments, ratings.
            </Text>
          </View>

          {/* ── Primary CTA: Join via invite ── */}
          <View style={s.ctaBlock}>

            {showInput && (
              <View style={s.inputWrap}>
                <Ionicons name="link-outline" size={18} color={B.grey500} style={s.inputIcon} />
                <TextInput
                  style={s.input}
                  placeholder="Paste invite link or code…"
                  placeholderTextColor={B.grey500}
                  value={inviteInput}
                  onChangeText={(t) => { setInviteInput(t); setInputError(''); }}
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoFocus
                  returnKeyType="go"
                  onSubmitEditing={handleJoinWithLink}
                />
              </View>
            )}

            {inputError ? (
              <Text style={s.errorText}>{inputError}</Text>
            ) : null}

            <TouchableOpacity
              style={s.primaryBtn}
              onPress={handleJoinWithLink}
              activeOpacity={0.88}
            >
              <Ionicons
                name={showInput ? 'arrow-forward' : 'people'}
                size={20}
                color={B.navy}
                style={{ marginRight: 8 }}
              />
              <Text style={s.primaryBtnText}>
                {showInput ? 'Join Squad' : 'Join via Invite Link'}
              </Text>
            </TouchableOpacity>

            {showInput && (
              <TouchableOpacity
                style={s.cancelBtn}
                onPress={() => { setShowInput(false); setInviteInput(''); setInputError(''); }}
                activeOpacity={0.7}
              >
                <Text style={s.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
            )}

            {/* ── Divider ── */}
            {!showInput && (
              <View style={s.dividerRow}>
                <View style={s.dividerLine} />
                <Text style={s.dividerText}>or</Text>
                <View style={s.dividerLine} />
              </View>
            )}

            {/* ── Create squad ── */}
            {!showInput && (
              <TouchableOpacity
                style={s.secondaryBtn}
                onPress={() => router.push('/(auth)/register')}
                activeOpacity={0.88}
              >
                <Ionicons name="add-circle-outline" size={20} color={B.navy} style={{ marginRight: 8 }} />
                <Text style={s.secondaryBtnText}>Create a Squad</Text>
              </TouchableOpacity>
            )}

            {/* ── Log in ── */}
            {!showInput && (
              <TouchableOpacity
                style={s.loginBtn}
                onPress={() => router.push('/(auth)/login')}
                activeOpacity={0.88}
              >
                <Text style={s.loginBtnText}>Already have an account? <Text style={s.loginLink}>Log in</Text></Text>
              </TouchableOpacity>
            )}

          </View>

          {/* ── Social proof pills ── */}
          {!showInput && (
            <View style={s.pillRow}>
              {['Matches', 'Payments', 'Ratings', 'Teams'].map((label) => (
                <View key={label} style={s.pill}>
                  <Text style={s.pillText}>{label}</Text>
                </View>
              ))}
            </View>
          )}

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: B.offWhite },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 32,
    alignItems: 'center',
  },

  // Logo
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: 10, alignSelf: 'flex-start', marginBottom: 8 },
  logoImg: { width: 40, height: 40 },
  logoText: { fontSize: 26, fontWeight: '800', color: B.navy, letterSpacing: -0.5 },

  // Illustration
  illustrationWrap: {
    marginVertical: 20,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: B.navy,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
  },

  // Headline
  headlineWrap: { width: '100%', marginBottom: 28 },
  headline: {
    fontSize: 34,
    fontWeight: '800',
    color: B.navy,
    letterSpacing: -1,
    lineHeight: 40,
    marginBottom: 10,
  },
  sub: {
    fontSize: 15,
    color: B.grey700,
    lineHeight: 22,
    fontWeight: '400',
  },

  // CTAs
  ctaBlock: { width: '100%', gap: 12 },

  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: B.white,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: B.green,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 14 : 10,
    shadowColor: B.green,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 3,
  },
  inputIcon: { marginRight: 8 },
  input: {
    flex: 1,
    fontSize: 15,
    color: B.navy,
    fontWeight: '500',
  },

  errorText: {
    fontSize: 13,
    color: '#EF4444',
    textAlign: 'center',
    marginTop: -4,
  },

  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: B.green,
    borderRadius: 16,
    paddingVertical: 18,
    shadowColor: B.green,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
  primaryBtnText: {
    fontSize: 17,
    fontWeight: '800',
    color: B.navy,
    letterSpacing: 0.1,
  },

  cancelBtn: { alignItems: 'center', paddingVertical: 6 },
  cancelBtnText: { fontSize: 14, color: B.grey500 },

  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 4 },
  dividerLine: { flex: 1, height: 1, backgroundColor: B.grey300 },
  dividerText: { fontSize: 13, color: B.grey500, fontWeight: '500' },

  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    paddingVertical: 17,
    borderWidth: 2,
    borderColor: B.navy,
    backgroundColor: 'transparent',
  },
  secondaryBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: B.navy,
    letterSpacing: 0.1,
  },

  loginBtn: { alignItems: 'center', paddingVertical: 10 },
  loginBtnText: { fontSize: 14, color: B.grey500 },
  loginLink: { color: B.grey700, fontWeight: '700', textDecorationLine: 'underline' },

  // Pills
  pillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
    marginTop: 24,
  },
  pill: {
    backgroundColor: B.greenTint,
    borderWidth: 1,
    borderColor: B.greenLight,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
  },
  pillText: { fontSize: 12, fontWeight: '600', color: B.greenDark } as any,
});
