/**
 * SquadPlay — Welcome / Onboarding Screen
 * Sports-tech aesthetic: Strava/Nike feel
 * Palette: #4ED39D emerald green + deep navy #0A1628 + white
 */
import React, { useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  NativeSyntheticEvent,
  NativeScrollEvent,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Svg, {
  Path, Circle, Rect, Ellipse, G, Defs, LinearGradient, Stop, Polygon, Line,
} from 'react-native-svg';

const { width: SCREEN_W } = Dimensions.get('window');
const SLIDE_W = SCREEN_W;

// ── Brand tokens ──────────────────────────────────────────────────────────────
const B = {
  green:       '#4ED39D',
  greenDark:   '#35B882',
  greenLight:  '#A8EDCE',
  greenTint:   '#E8FAF3',
  navy:        '#0A1628',
  navyLight:   '#152238',
  navyMid:     '#1E3A5F',
  white:       '#FFFFFF',
  offWhite:    '#F7F9FB',
  grey100:     '#F0F3F6',
  grey300:     '#C8D2DC',
  grey500:     '#8A9BB0',
  grey700:     '#4A5A6A',
  black:       '#060D17',
};

// ── Slide data ────────────────────────────────────────────────────────────────
const SLIDES = [
  {
    id: 'chaos',
    headline: 'End the Group Chat\nChaos.',
    sub: 'Organise matches, track RSVPs, and settle payments instantly.',
    accent: B.green,
  },
  {
    id: 'teams',
    headline: 'Balanced Teams\nin Seconds.',
    sub: 'Auto-generate fair squads so every game is a proper contest.',
    accent: '#5BC8F5',
  },
  {
    id: 'motm',
    headline: 'Track MOTM &\nPlayer Ratings.',
    sub: 'Vote for your standout player and watch the leaderboard climb.',
    accent: '#F5A623',
  },
];

// ── SVG Illustrations ─────────────────────────────────────────────────────────

/** Slide 1 — stylised football pitch with player dots */
function IllustrationChaos() {
  return (
    <Svg width={260} height={180} viewBox="0 0 260 180">
      <Defs>
        <LinearGradient id="pitchGrad" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#1A4731" />
          <Stop offset="1" stopColor="#0F2D1E" />
        </LinearGradient>
        <LinearGradient id="greenGlow" x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0" stopColor={B.green} stopOpacity="0" />
          <Stop offset="0.5" stopColor={B.green} stopOpacity="0.15" />
          <Stop offset="1" stopColor={B.green} stopOpacity="0" />
        </LinearGradient>
      </Defs>

      {/* Pitch background */}
      <Rect x={10} y={10} width={240} height={160} rx={16} fill="url(#pitchGrad)" />

      {/* Pitch stripes */}
      {[30, 50, 70, 90, 110, 130, 150, 170, 190, 210, 230].map((x, i) => (
        <Rect key={i} x={x} y={10} width={10} height={160} fill="#FFFFFF" fillOpacity={0.03} />
      ))}

      {/* Centre circle */}
      <Circle cx={130} cy={90} r={38} stroke="#FFFFFF" strokeWidth={1.5} strokeOpacity={0.3} fill="none" />
      <Circle cx={130} cy={90} r={3} fill="#FFFFFF" fillOpacity={0.4} />

      {/* Centre line */}
      <Line x1={130} y1={10} x2={130} y2={170} stroke="#FFFFFF" strokeWidth={1.5} strokeOpacity={0.3} />

      {/* Goal boxes */}
      <Rect x={10} y={60} width={32} height={60} stroke="#FFFFFF" strokeWidth={1.5} strokeOpacity={0.3} fill="none" />
      <Rect x={218} y={60} width={32} height={60} stroke="#FFFFFF" strokeWidth={1.5} strokeOpacity={0.3} fill="none" />

      {/* Glow overlay */}
      <Rect x={10} y={10} width={240} height={160} rx={16} fill="url(#greenGlow)" />

      {/* Player dots — team A (green) */}
      {[
        [55, 90], [85, 55], [85, 125], [100, 90],
      ].map(([cx, cy], i) => (
        <G key={`a${i}`}>
          <Circle cx={cx} cy={cy} r={11} fill={B.green} />
          <Circle cx={cx} cy={cy - 4} r={5} fill="#FFFFFF" fillOpacity={0.9} />
          <Ellipse cx={cx} cy={cy + 5} rx={5} ry={3} fill="#FFFFFF" fillOpacity={0.6} />
        </G>
      ))}

      {/* Player dots — team B (navy/white) */}
      {[
        [175, 90], [155, 55], [155, 125], [200, 90],
      ].map(([cx, cy], i) => (
        <G key={`b${i}`}>
          <Circle cx={cx} cy={cy} r={11} fill="#FFFFFF" fillOpacity={0.15} stroke="#FFFFFF" strokeWidth={1.5} />
          <Circle cx={cx} cy={cy - 4} r={5} fill="#FFFFFF" fillOpacity={0.7} />
          <Ellipse cx={cx} cy={cy + 5} rx={5} ry={3} fill="#FFFFFF" fillOpacity={0.4} />
        </G>
      ))}

      {/* Ball */}
      <Circle cx={130} cy={90} r={8} fill="#FFFFFF" />
      <Circle cx={130} cy={90} r={8} stroke={B.navy} strokeWidth={0.5} fill="none" />
      {/* Ball pentagon pattern */}
      <Polygon points="130,84 134,88 132,93 128,93 126,88" fill={B.navy} fillOpacity={0.25} />

      {/* Message bubble — chaos illustration */}
      <Rect x={30} y={18} width={72} height={22} rx={6} fill={B.green} fillOpacity={0.9} />
      <Text x={66} y={33} textAnchor="middle" fill={B.navy} fontSize={9} fontWeight="bold">Who's playing? 🏃</Text>
      <Path d="M44 40 L40 46 L50 40Z" fill={B.green} fillOpacity={0.9} />

      <Rect x={158} y={18} width={78} height={22} rx={6} fill="#FFFFFF" fillOpacity={0.12} />
      <Text x={197} y={33} textAnchor="middle" fill="#FFFFFF" fontSize={9}>Can't make it 😅</Text>
      <Path d="M211 40 L215 46 L205 40Z" fill="#FFFFFF" fillOpacity={0.12} />

      {/* Notification badge */}
      <Circle cx={226} cy={25} r={10} fill="#FF4757" />
      <Text x={226} y={29} textAnchor="middle" fill="#FFFFFF" fontSize={9} fontWeight="bold">12</Text>
    </Svg>
  );
}

/** Slide 2 — balanced team split graphic */
function IllustrationTeams() {
  return (
    <Svg width={260} height={180} viewBox="0 0 260 180">
      <Defs>
        <LinearGradient id="teamBg" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#0D1F3C" />
          <Stop offset="1" stopColor="#0A1628" />
        </LinearGradient>
      </Defs>
      <Rect x={10} y={10} width={240} height={160} rx={16} fill="url(#teamBg)" />

      {/* Divider */}
      <Line x1={130} y1={20} x2={130} y2={170} stroke={B.green} strokeWidth={1.5} strokeDasharray="4,3" strokeOpacity={0.6} />

      {/* Team A label */}
      <Rect x={22} y={20} width={72} height={24} rx={8} fill={B.green} fillOpacity={0.15} />
      <Text x={58} y={36} textAnchor="middle" fill={B.green} fontSize={11} fontWeight="bold">TEAM A</Text>

      {/* Team B label */}
      <Rect x={166} y={20} width={72} height={24} rx={8} fill="#5BC8F5" fillOpacity={0.15} />
      <Text x={202} y={36} textAnchor="middle" fill="#5BC8F5" fontSize={11} fontWeight="bold">TEAM B</Text>

      {/* Team A players */}
      {[[55,75],[35,115],[75,115],[55,150]].map(([cx,cy],i)=>(
        <G key={`ta${i}`}>
          <Circle cx={cx} cy={cy} r={13} fill={B.green} fillOpacity={0.2} stroke={B.green} strokeWidth={1.5} />
          <Circle cx={cx} cy={cy-5} r={6} fill={B.green} fillOpacity={0.8} />
          <Ellipse cx={cx} cy={cy+6} rx={6} ry={4} fill={B.green} fillOpacity={0.5} />
        </G>
      ))}

      {/* Team B players */}
      {[[200,75],[180,115],[220,115],[200,150]].map(([cx,cy],i)=>(
        <G key={`tb${i}`}>
          <Circle cx={cx} cy={cy} r={13} fill="#5BC8F5" fillOpacity={0.2} stroke="#5BC8F5" strokeWidth={1.5} />
          <Circle cx={cx} cy={cy-5} r={6} fill="#5BC8F5" fillOpacity={0.8} />
          <Ellipse cx={cx} cy={cy+6} rx={6} ry={4} fill="#5BC8F5" fillOpacity={0.5} />
        </G>
      ))}

      {/* Lightning bolt */}
      <Polygon points="137,65 126,98 133,98 123,130 142,90 134,90" fill={B.green} />
    </Svg>
  );
}

/** Slide 3 — MOTM trophy + stars */
function IllustrationMOTM() {
  return (
    <Svg width={260} height={180} viewBox="0 0 260 180">
      <Defs>
        <LinearGradient id="motmBg" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#1C1400" />
          <Stop offset="1" stopColor="#0A1628" />
        </LinearGradient>
        <LinearGradient id="trophyGrad" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#FFD700" />
          <Stop offset="1" stopColor="#F5A623" />
        </LinearGradient>
      </Defs>
      <Rect x={10} y={10} width={240} height={160} rx={16} fill="url(#motmBg)" />

      {/* Stars background */}
      {[[30,30],[220,40],[50,145],[210,150],[130,25],[80,160],[180,165]].map(([cx,cy],i)=>(
        <Circle key={i} cx={cx} cy={cy} r={1.5} fill="#FFD700" fillOpacity={0.4} />
      ))}

      {/* Trophy cup */}
      <Path d="M110,140 L150,140 L145,120 L115,120 Z" fill="url(#trophyGrad)" />
      <Rect x={122} y={118} width={16} height={6} fill="url(#trophyGrad)" />
      <Path d="M115,80 C100,80 92,88 92,100 C92,112 100,118 115,118 L145,118 C160,118 168,112 168,100 C168,88 160,80 145,80 Z" fill="url(#trophyGrad)" />
      {/* Trophy handles */}
      <Path d="M115,88 C105,88 98,94 98,102 C98,110 105,113 115,113" stroke="#FFD700" strokeWidth={6} fill="none" strokeLinecap="round" />
      <Path d="M145,88 C155,88 162,94 162,102 C162,110 155,113 145,113" stroke="#FFD700" strokeWidth={6} fill="none" strokeLinecap="round" />
      {/* Trophy shine */}
      <Path d="M120,88 C122,88 124,90 124,95 C124,100 122,103 120,103" stroke="#FFFFFF" strokeWidth={2} fill="none" strokeOpacity={0.4} strokeLinecap="round" />

      {/* MOTM badge */}
      <Rect x={95} y={55} width={70} height={22} rx={11} fill="#FFD700" fillOpacity={0.15} stroke="#FFD700" strokeWidth={1} />
      <Text x={130} y={70} textAnchor="middle" fill="#FFD700" fontSize={10} fontWeight="bold">MAN OF THE MATCH</Text>

      {/* Stars row */}
      {[0,1,2,3,4].map(i=>(
        <Polygon
          key={i}
          points={`${88+i*22},44 ${91+i*22},38 ${94+i*22},44 ${88+i*22},41 ${94+i*22},41`}
          fill="#FFD700"
          fillOpacity={i < 4 ? 1 : 0.3}
        />
      ))}

      {/* Player rating pills */}
      {[['J. Hartley','9.2', 32],['M. Rossi','8.7', 68],['L. Chen','8.1', 104]].map(([name,score,y],i)=>(
        <G key={i}>
          <Rect x={150} y={Number(y)} width={96} height={26} rx={8} fill="#FFFFFF" fillOpacity={0.06} />
          <Text x={160} y={Number(y)+17} fill="#FFFFFF" fillOpacity={0.7} fontSize={10}>{name}</Text>
          <Rect x={215} y={Number(y)+6} width={24} height={14} rx={7} fill={B.green} fillOpacity={0.2} />
          <Text x={227} y={Number(y)+17} textAnchor="middle" fill={B.green} fontSize={10} fontWeight="bold">{score}</Text>
        </G>
      ))}
    </Svg>
  );
}

const ILLUSTRATIONS = [IllustrationChaos, IllustrationTeams, IllustrationMOTM];

// ── Logo ──────────────────────────────────────────────────────────────────────
function SquadPlayLogo() {
  return (
    <View style={logo.wrap}>
      {/* Shield icon */}
      <View style={logo.shieldWrap}>
        <Svg width={40} height={44} viewBox="0 0 40 44">
          <Defs>
            <LinearGradient id="shieldG" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={B.green} />
              <Stop offset="1" stopColor={B.greenDark} />
            </LinearGradient>
          </Defs>
          {/* Shield body */}
          <Path
            d="M20 2 L36 8 L36 22 C36 31 28 39 20 42 C12 39 4 31 4 22 L4 8 Z"
            fill="url(#shieldG)"
          />
          {/* Play triangle inside shield */}
          <Polygon points="15,16 15,28 29,22" fill={B.navy} fillOpacity={0.85} />
        </Svg>
      </View>
      {/* Wordmark */}
      <View style={logo.textWrap}>
        <Text style={logo.word}>
          <Text style={logo.squad}>Squad</Text>
          <Text style={logo.play}>Play</Text>
        </Text>
      </View>
    </View>
  );
}

const logo = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  shieldWrap: { width: 40, height: 44 },
  textWrap: { justifyContent: 'center' },
  word: { letterSpacing: -0.5 },
  squad: { fontSize: 28, fontWeight: '800', color: B.navy, letterSpacing: -0.5 },
  play:  { fontSize: 28, fontWeight: '800', color: B.green, letterSpacing: -0.5 },
});

// ── Slide ─────────────────────────────────────────────────────────────────────
function Slide({ slide, index }: { slide: typeof SLIDES[0]; index: number }) {
  const Illustration = ILLUSTRATIONS[index];
  return (
    <View style={[ss.slide, { width: SLIDE_W }]}>
      {/* Card */}
      <View style={ss.card}>
        {/* Top accent bar */}
        <View style={[ss.cardAccent, { backgroundColor: slide.accent }]} />

        {/* Illustration */}
        <View style={ss.illustrationWrap}>
          <Illustration />
        </View>

        {/* Text */}
        <View style={ss.cardText}>
          <Text style={[ss.headline, { color: B.navy }]}>{slide.headline}</Text>
          <Text style={ss.sub}>{slide.sub}</Text>
        </View>
      </View>
    </View>
  );
}

const ss = StyleSheet.create({
  slide: { paddingHorizontal: 24, justifyContent: 'center', alignItems: 'center' },
  card: {
    width: '100%',
    backgroundColor: B.white,
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: B.navy,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 10,
  },
  cardAccent: { height: 4, width: '100%' },
  illustrationWrap: { alignItems: 'center', paddingTop: 24, paddingBottom: 8 },
  cardText: { padding: 24, paddingTop: 8 },
  headline: {
    fontSize: 26,
    fontWeight: '800',
    lineHeight: 32,
    letterSpacing: -0.5,
    marginBottom: 10,
    color: B.navy,
  },
  sub: {
    fontSize: 15,
    lineHeight: 22,
    color: B.grey700,
    fontWeight: '400',
  },
});

// ── Main Screen ───────────────────────────────────────────────────────────────
export default function WelcomeScreen() {
  const router = useRouter();
  const scrollRef = useRef<ScrollView>(null);
  const [activeSlide, setActiveSlide] = useState(0);

  const onScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const idx = Math.round(e.nativeEvent.contentOffset.x / SLIDE_W);
    setActiveSlide(idx);
  }, []);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.container}>

        {/* ── Header ── */}
        <View style={styles.header}>
          <SquadPlayLogo />
          <View style={styles.tagWrap}>
            <View style={styles.tagPill}>
              <View style={styles.tagDot} />
              <Text style={styles.tagText}>For casual sports groups</Text>
            </View>
          </View>
        </View>

        {/* ── Carousel ── */}
        <View style={styles.carouselWrap}>
          <ScrollView
            ref={scrollRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onScroll={onScroll}
            scrollEventThrottle={16}
            decelerationRate="fast"
            bounces={false}
            style={styles.scrollView}
          >
            {SLIDES.map((slide, i) => (
              <Slide key={slide.id} slide={slide} index={i} />
            ))}
          </ScrollView>

          {/* Dot indicators */}
          <View style={styles.dots}>
            {SLIDES.map((_, i) => (
              <TouchableOpacity
                key={i}
                onPress={() => scrollRef.current?.scrollTo({ x: i * SLIDE_W, animated: true })}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <View
                  style={[
                    styles.dot,
                    i === activeSlide && styles.dotActive,
                  ]}
                />
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* ── CTAs ── */}
        <View style={styles.ctas}>
          {/* Primary */}
          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={() => router.push('/create-group')}
            activeOpacity={0.88}
          >
            <View style={styles.primaryBtnInner}>
              <Svg width={20} height={20} viewBox="0 0 20 20" style={{ marginRight: 8 }}>
                <Path
                  d="M10 2 L18 6 L18 13 C18 16.5 14 19 10 21 C6 19 2 16.5 2 13 L2 6 Z"
                  fill={B.navy}
                  fillOpacity={0.15}
                />
                <Path
                  d="M10 2 L18 6 L18 13 C18 16.5 14 19 10 21 C6 19 2 16.5 2 13 L2 6 Z"
                  stroke={B.navy}
                  strokeWidth={1.5}
                  fill="none"
                />
                <Polygon points="8,8 8,14 14,11" fill={B.navy} />
              </Svg>
              <Text style={styles.primaryBtnText}>Create a Club</Text>
            </View>
          </TouchableOpacity>

          {/* Secondary */}
          <TouchableOpacity
            style={styles.secondaryBtn}
            onPress={() => router.push('/signup')}
            activeOpacity={0.88}
          >
            <Text style={styles.secondaryBtnText}>Sign Up / Get Started</Text>
          </TouchableOpacity>

          {/* Access code link */}
          <TouchableOpacity
            style={styles.accessCodeBtn}
            onPress={() => router.push('/signup')}
            activeOpacity={0.75}
          >
            <Text style={styles.accessCodeText}>Got an Access Code?  <Text style={styles.accessCodeLink}>Enter here</Text></Text>
          </TouchableOpacity>
        </View>

        {/* ── Footer ── */}
        <Text style={styles.footer}>
          By signing up, you agree to our{' '}
          <Text style={styles.footerLink}>Terms</Text>
          {' & '}
          <Text style={styles.footerLink}>Privacy Policy</Text>.
        </Text>

      </View>
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: B.offWhite,
  },
  container: {
    flex: 1,
    paddingTop: 8,
  },

  // Header
  header: {
    paddingHorizontal: 28,
    paddingBottom: 20,
    gap: 12,
  },
  tagWrap: { flexDirection: 'row' },
  tagPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: B.greenTint,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: B.greenLight,
  },
  tagDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: B.green,
  },
  tagText: {
    fontSize: 12,
    fontWeight: '600',
    color: B.greenDark,
    letterSpacing: 0.1,
  },

  // Carousel
  carouselWrap: {
    flex: 1,
    minHeight: 0,
  },
  scrollView: { flex: 1 },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 16,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: B.grey300,
  },
  dotActive: {
    width: 24,
    height: 8,
    borderRadius: 4,
    backgroundColor: B.green,
  },

  // CTAs
  ctas: {
    paddingHorizontal: 24,
    gap: 12,
    paddingBottom: 8,
  },
  primaryBtn: {
    backgroundColor: B.green,
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: B.green,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
  primaryBtnInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnText: {
    fontSize: 17,
    fontWeight: '800',
    color: B.navy,
    letterSpacing: 0.2,
  },
  secondaryBtn: {
    borderRadius: 16,
    paddingVertical: 17,
    alignItems: 'center',
    justifyContent: 'center',
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

  accessCodeBtn: {
    alignItems: 'center',
    paddingVertical: 6,
  },
  accessCodeText: {
    fontSize: 13,
    color: B.grey500,
  },
  accessCodeLink: {
    color: B.grey700,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },

  // Footer
  footer: {
    textAlign: 'center',
    fontSize: 12,
    color: B.grey500,
    paddingHorizontal: 32,
    paddingBottom: 12,
    paddingTop: 4,
    lineHeight: 18,
  },
  footerLink: {
    color: B.grey700,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
});
