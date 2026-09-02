import { useState, useEffect, useLayoutEffect, useRef, useMemo, useContext, useCallback } from 'react';
import NetInfo from '@react-native-community/netinfo';
import * as Location from 'expo-location';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  ScrollView,
  RefreshControl,
   SafeAreaView,
   Alert,
   Animated,
   Easing,
   Switch,
   Dimensions,
   Linking,
   Image,
   StatusBar,
   Modal,
   TouchableWithoutFeedback,
 } from 'react-native';
import Svg, { Circle, Defs, G, Line, Path, RadialGradient, Rect, Stop } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import {
  THEME_MODES,
} from './themes';
import { useRoute, useNavigation, useFocusEffect } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import i18n, { changeLanguage } from './i18n';
import { LoadingContext } from './App';
import { SettingsContext } from './SettingsContext';
import { useFontSize } from './FontSizeContext';
import { useTheme } from './ThemeContext';
import AsyncStorage from '@react-native-async-storage/async-storage';

const BASE_URL = 'https://api.open-meteo.com/v1/forecast';
const TIMEOUT_MS = 10000;
const SCREEN_WIDTH = Dimensions.get('window').width;
const APP_VERSION = require('./package.json').version;
const APP_ICON_SOURCE = require('./assets/icon.png');
const GITHUB_URL = 'https://github.com/werxuiiika/My-Weather-app';

const REMEMBER_CITY_ENABLED_KEY = 'remember_city_enabled';
const LAST_CITY_KEY = 'last_selected_city';

const loadLastCity = async () => { try { return await AsyncStorage.getItem(LAST_CITY_KEY); } catch (e) { return null; } };
const saveLastCity = async (name) => { try { await AsyncStorage.setItem(LAST_CITY_KEY, name); } catch (e) {} };
const clearLastCity = async () => { try { await AsyncStorage.removeItem(LAST_CITY_KEY); } catch (e) {} };
const loadRememberCity = async () => { try { const v = await AsyncStorage.getItem(REMEMBER_CITY_ENABLED_KEY); return v === null ? true : v === 'true'; } catch (e) { return true; } };
const saveRememberCity = async (value) => {
  try {
    await AsyncStorage.setItem(REMEMBER_CITY_ENABLED_KEY, value ? 'true' : 'false');
    if (!value) {
      await clearLastCity();
    }
  } catch (e) {}
};

const fetchJson = async (url) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: controller.signal });
    return await res.json();
  } catch (e) {
    if (e instanceof TypeError || (e && e.name === 'AbortError')) {
      const err = new Error(e instanceof TypeError ? i18n.t('noInternet') : i18n.t('serverTimeout'));
      err.kind = 'network';
      throw err;
    }
    throw e;
  } finally {
    clearTimeout(timer);
  }
};

const ICON_COLORS = {
  sun: '#ffd166',
  moon: '#eaf0fc',
  cloudLight: '#c3cee6',
  cloudDark: '#9fb0d6',
  drop: '#5b9bd5',
  snow: '#f2f7ff',
  fog: '#aab6cf',
};

const THUNDER_BOLT_PATHS = [
  'M32 14 L26 54 L32 54 L28 64 L40 46 L36 46',
  'M34 14 L40 50 L34 50 L38 62 L30 44 L33 44',
  'M30 46 L26 60 L34 60 L30 46',
];

function CloudShape({ x = 0, y = 0, s = 1, fill }) {
  return (
    <G transform={`translate(${x} ${y}) scale(${s})`}>
      <Circle cx={21} cy={33} r={9} fill={fill} />
      <Circle cx={32} cy={27} r={11.5} fill={fill} />
      <Circle cx={43} cy={34} r={8} fill={fill} />
      <Rect x={12} y={37} width={40} height={9} rx={4.5} fill={fill} />
    </G>
  );
}

function SunCore({ x = 0, y = 0, s = 1 }) {
  const rays = [];
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4;
    rays.push(
      <Line key={i}
        x1={x + Math.cos(a) * 13 * s} y1={y + Math.sin(a) * 13 * s}
        x2={x + Math.cos(a) * 18 * s} y2={y + Math.sin(a) * 18 * s}
        stroke={ICON_COLORS.sun} strokeWidth={3 * s} strokeLinecap="round" />
    );
  }
  return (
    <G>
      {rays}
      <Circle cx={x} cy={y} r={9 * s} fill={ICON_COLORS.sun} />
    </G>
  );
}

function MoonCrescent({ transform }) {
  const { theme } = useTheme();
  const fill = theme.mode === 'light' ? '#6b7c9e' : '#eaf0fc';
  return (
    <Path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"
      fill={fill} transform={transform} />
  );
}

function GithubIcon({ size = 22, color = '#eaf0fc' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 16 16">
      <Path fillRule="evenodd" clipRule="evenodd"
        d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8z"
        fill={color} />
    </Svg>
  );
}

function RainLayer({ size, heavy }) {
  const scale = size / 64;
  const dropsRef = useRef(null);
  if (dropsRef.current === null) {
    const count = heavy ? 7 : 5;
    dropsRef.current = Array.from({ length: count }, (_, i) => ({
      v: new Animated.Value(0),
      left: 19 + ((i * 47) % 27),
      cycle: 900 + ((i * 137) % 420),
      len: heavy && i % 2 === 0 ? 11 : 8,
    }));
  }
  const drops = dropsRef.current;
  useEffect(() => {
    const loops = drops.map((d) =>
      Animated.loop(
        Animated.timing(d.v, {
          toValue: 1,
          duration: d.cycle,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      )
    );
    loops.forEach((l) => l.start());
    return () => loops.forEach((l) => l.stop());
  }, []);
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {drops.map((d, i) => (
        <Animated.View
          key={i}
          pointerEvents="none"
          style={{
            position: 'absolute',
            left: d.left * scale,
            top: 44 * scale,
            width: Math.max(2, 3 * scale),
            height: d.len * scale,
            borderRadius: Math.max(1, 1.5 * scale),
            backgroundColor: ICON_COLORS.drop,
            opacity: 0.85,
            transform: [
              {
                translateY: d.v.interpolate({
                  inputRange: [0, 0.18, 0.8, 1],
                  outputRange: [-6 * scale, -6 * scale, 24 * scale, 24 * scale],
                }),
              },
            ],
          }}
        />
      ))}
    </View>
  );
}

function SnowLayer({ size }) {
  const { theme } = useTheme();
  const scale = size / 64;
  const fill = theme.mode === 'light' ? '#8fa4c9' : ICON_COLORS.snow;
  const flakesRef = useRef(null);
  if (flakesRef.current === null) {
    flakesRef.current = Array.from({ length: 10 }, (_, i) => ({
      v: new Animated.Value(0),
      left: 15 + ((i * 29) % 33),
      dia: 3 + ((i * 7) % 7) * 0.5,
      cycle: 1600 + ((i * 173) % 1300),
      amp: 1.5 + (i % 3),
    }));
  }
  const flakes = flakesRef.current;
  useEffect(() => {
    const loops = flakes.map((f) =>
      Animated.loop(
        Animated.timing(f.v, {
          toValue: 1,
          duration: f.cycle,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      )
    );
    loops.forEach((l) => l.start());
    return () => loops.forEach((l) => l.stop());
  }, []);
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {flakes.map((f, i) => (
        <Animated.View
          key={i}
          pointerEvents="none"
          style={{
            position: 'absolute',
            left: f.left * scale,
            top: 42 * scale,
            width: Math.max(2, f.dia * scale),
            height: Math.max(2, f.dia * scale),
            borderRadius: Math.max(1, (f.dia * scale) / 2),
            backgroundColor: fill,
            opacity: 0.9,
            transform: [
              {
                translateX: f.v.interpolate({
                  inputRange: [0, 0.25, 0.5, 0.75, 1],
                  outputRange: [0, f.amp * scale, 0, -f.amp * scale, 0],
                }),
              },
              {
                translateY: f.v.interpolate({
                  inputRange: [0, 0.12, 0.82, 1],
                  outputRange: [-8 * scale, -8 * scale, 24 * scale, 24 * scale],
                }),
              },
            ],
          }}
        />
      ))}
    </View>
  );
}

function DriftCloud({ size, fill, offsetX = 0, offsetY = 0, s = 1 }) {
  const scale = size / 64;
  const u = (v) => v * scale * s;
  const x = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(x, {
          toValue: 1,
          duration: 3500,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
        Animated.timing(x, {
          toValue: 0,
          duration: 3500,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);
  const translateX = x.interpolate({
    inputRange: [0, 1],
    outputRange: [-3 * scale, 3 * scale],
  });
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Animated.View
        style={{
          position: 'absolute',
          left: offsetX * scale,
          top: offsetY * scale,
          width: 64 * scale * s,
          height: 64 * scale * s,
          transform: [{ translateX }],
        }}
      >
        <View style={{ position: 'absolute', left: u(12), top: u(24), width: u(18), height: u(18), borderRadius: u(9), backgroundColor: fill }} />
        <View style={{ position: 'absolute', left: u(20.5), top: u(15.5), width: u(23), height: u(23), borderRadius: u(11.5), backgroundColor: fill }} />
        <View style={{ position: 'absolute', left: u(35), top: u(26), width: u(16), height: u(16), borderRadius: u(8), backgroundColor: fill }} />
        <View style={{ position: 'absolute', left: u(12), top: u(37), width: u(40), height: u(9), borderRadius: u(4.5), backgroundColor: fill }} />
      </Animated.View>
    </View>
  );
}

function ThunderWeather({ size }) {
  const scale = size / 64;
  const originX = 32 * scale;
  const originY = 34 * scale;
  const burstR = 36 * scale;

  const forkOps = useRef(THUNDER_BOLT_PATHS.map(() => new Animated.Value(0))).current;
  const burstScale = useRef(new Animated.Value(1)).current;
  const burstOp = useRef(new Animated.Value(0)).current;
  const flashOp = useRef(new Animated.Value(0)).current;
  const shake = useRef(new Animated.Value(0)).current;
  const animRef = useRef(null);
  const [lit, setLit] = useState(false);

  const runStrike = (forkIndex) => {
    const op = forkOps[forkIndex];
    op.setValue(0);
    setLit(true);
    Animated.sequence([
      Animated.timing(op, {
        toValue: 0.85,
        duration: 70,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(op, {
        toValue: 0,
        duration: 240,
        easing: Easing.in(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start(() => setLit(false));
  };

  const runBurst = () => {
    const hitCount = 2 + Math.floor(Math.random() * 2);
    let fired = 0;
    const fireNext = () => {
      runStrike(fired % THUNDER_BOLT_PATHS.length);
      fired += 1;
      if (fired < hitCount) {
        animRef.current = setTimeout(fireNext, 120 + Math.random() * 80);
      } else {
        animRef.current = setTimeout(runStorm, 2200 + Math.random() * 3200);
      }
    };
    burstScale.setValue(0.3);
    burstOp.setValue(0);
    flashOp.setValue(0);
    shake.setValue(0);
    Animated.parallel([
      Animated.timing(burstScale, {
        toValue: 1.6,
        duration: 240,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.sequence([
        Animated.timing(burstOp, { toValue: 0.9, duration: 90, useNativeDriver: true }),
        Animated.timing(burstOp, {
          toValue: 0,
          duration: 220,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
      Animated.sequence([
        Animated.timing(flashOp, { toValue: 0.55, duration: 80, useNativeDriver: true }),
        Animated.timing(flashOp, {
          toValue: 0,
          duration: 280,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
      Animated.sequence([
        Animated.timing(shake, { toValue: 1, duration: 150, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(shake, { toValue: 0, duration: 140, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ]),
    ]).start();
    fireNext();
  };

  const runStorm = () => {
    runBurst();
  };

  useEffect(() => {
    let cancelled = false;
    const first = () => {
      if (cancelled) return;
      runStorm();
    };
    animRef.current = setTimeout(first, 800 + Math.random() * 1400);
    return () => {
      cancelled = true;
      if (animRef.current) clearTimeout(animRef.current);
      forkOps.forEach((o) => o.stopAnimation());
      [burstScale, burstOp, flashOp, shake].forEach((v) => v.stopAnimation());
    };
  }, []);

  const shakeX = shake.interpolate({
    inputRange: [0, 0.25, 0.5, 0.75, 1],
    outputRange: [-3 * scale, -2 * scale, 3 * scale, 2 * scale, 0],
  });
  const shakeY = shake.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0, -2 * scale, 0],
  });

  return (
    <View style={{ width: size, height: size, overflow: 'hidden' }}>
      <Animated.View
        style={{
          width: size,
          height: size,
          transform: [{ translateX: shakeX }, { translateY: shakeY }],
        }}
      >
        <Svg width={size} height={size} viewBox="0 0 64 64">
          <G>
            <CloudShape y={-2} fill={lit ? '#cbd6ec' : ICON_COLORS.cloudDark} />
          </G>
        </Svg>

        {THUNDER_BOLT_PATHS.map((d, i) => (
          <Animated.View
            key={`bolt-${i}`}
            pointerEvents="none"
            style={[StyleSheet.absoluteFill, { width: size, height: size, opacity: forkOps[i] }]}
          >
            <Svg width={size} height={size} viewBox="0 0 64 64">
              <G>
                <Path
                  d={d}
                  stroke={ICON_COLORS.sun}
                  strokeWidth={2.2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  fill="none"
                />
                <Path
                  d={d}
                  stroke="rgba(255, 255, 0, 0.35)"
                  strokeWidth={4.4}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  fill="none"
                />
              </G>
            </Svg>
          </Animated.View>
        ))}

        <Animated.View
          pointerEvents="none"
          style={[StyleSheet.absoluteFill, { backgroundColor: '#fff9c4', opacity: flashOp }]}
        />

        <Animated.View
          pointerEvents="none"
          style={{
            position: 'absolute',
            left: originX - burstR,
            top: originY - burstR,
            width: burstR * 2,
            height: burstR * 2,
            opacity: burstOp,
            transform: [{ scale: burstScale }],
          }}
        >
          <Svg width={burstR * 2} height={burstR * 2} viewBox="0 0 64 64">
            <Defs>
              <RadialGradient id="thunderBurst" cx="32" cy="32" r="32" fx="32" fy="32">
                <Stop offset="0%" stopColor="#ffffff" stopOpacity={1} />
                <Stop offset="100%" stopColor="#ffffff" stopOpacity={0} />
              </RadialGradient>
            </Defs>
            <Circle cx={32} cy={32} r={32} fill="url(#thunderBurst)" />
          </Svg>
        </Animated.View>
      </Animated.View>
    </View>
  );
}

function ForecastFogAnimation({ size = 26 }) {
  const anim1 = useRef(new Animated.Value(0)).current;
  const anim2 = useRef(new Animated.Value(0)).current;
  const anim3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const createLoop = (anim, delay = 0) => {
      return Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(anim, {
            toValue: 1,
            duration: 4000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(anim, {
            toValue: 0,
            duration: 4000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      );
    };

    const l1 = createLoop(anim1, 0);
    const l2 = createLoop(anim2, 100);
    const l3 = createLoop(anim3, 200);

    l1.start();
    l2.start();
    l3.start();

    return () => {
      l1.stop();
      l2.stop();
      l3.stop();
    };
  }, [anim1, anim2, anim3]);

  const translateX1 = anim1.interpolate({ inputRange: [0, 1], outputRange: [0, 5] });
  const translateX2 = anim2.interpolate({ inputRange: [0, 1], outputRange: [0, 6] });
  const translateX3 = anim3.interpolate({ inputRange: [0, 1], outputRange: [0, 5] });

  return (
    <View style={{ width: size, height: size * 0.833, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size * 0.833} viewBox="0 0 120 100">
        <Path
          d="M 45 78
             L 95 78
             A 16 16 0 0 0 111 62
             A 15 15 0 0 0 99 48
             A 22 22 0 0 0 58 35
             A 25 25 0 0 0 35 55
             A 16 16 0 0 0 45 78 Z"
          fill="#CFD8DC"
        />
        <AnimatedLine
          x1="35"
          y1="58"
          x2="75"
          y2="58"
          stroke="#B0BEC5"
          strokeWidth="6"
          strokeLinecap="round"
          style={{ transform: [{ translateX: translateX1 }] }}
        />
        <AnimatedLine
          x1="22"
          y1="71"
          x2="80"
          y2="71"
          stroke="#B0BEC5"
          strokeWidth="6"
          strokeLinecap="round"
          style={{ transform: [{ translateX: translateX2 }] }}
        />
        <AnimatedLine
          x1="25"
          y1="84"
          x2="95"
          y2="84"
          stroke="#B0BEC5"
          strokeWidth="6"
          strokeLinecap="round"
          style={{ transform: [{ translateX: translateX3 }] }}
        />
      </Svg>
    </View>
  );
}

function WeatherIcon({ type = 'clear', isNight = false, size = 96 }) {
  if (type === 'thunder') {
    return <ThunderWeather size={size} />;
  }
  if (type === 'fog') {
    return <ForecastFogAnimation size={size} />;
  }
  const isRain = type === 'rain' || type === 'showers';
  const isSnow = type === 'snow';
  let content = null;
  let driftingCloud = null;
  if (type === 'clear') {
    content = isNight
      ? <MoonCrescent transform="translate(8 8) scale(2)" />
      : <SunCore x={32} y={32} s={1.25} />;
  } else if (type === 'partly') {
    content = isNight ? (
      <MoonCrescent transform="translate(20 0) scale(1.5)" />
    ) : (
      <SunCore x={22} y={20} s={0.85} />
    );
    driftingCloud = { fill: ICON_COLORS.cloudDark, offsetX: 4, offsetY: 8, s: 0.85 };
  } else if (type === 'fog') {
    content = (
      <G>
        <Line x1={14} y1={53} x2={50} y2={53} stroke={ICON_COLORS.fog} strokeWidth={3.5} strokeLinecap="round" />
        <Line x1={20} y1={59} x2={44} y2={59} stroke={ICON_COLORS.fog} strokeWidth={3.5} strokeLinecap="round" />
      </G>
    );
    driftingCloud = { fill: ICON_COLORS.cloudDark, offsetY: -6 };
  } else if (type === 'snow') {
    content = <CloudShape y={-2} fill={ICON_COLORS.cloudDark} />;
  } else if (type === 'fog') {
    content = null;
  } else {
    content = (
      <CloudShape y={-2} fill={type === 'showers' ? ICON_COLORS.cloudDark : ICON_COLORS.cloudLight} />
    );
  }
  return (
    <View style={{ width: size, height: size, overflow: 'hidden' }}>
      {isRain && <RainLayer size={size} heavy={type === 'showers'} />}
      {isSnow && <SnowLayer size={size} />}
      <Svg width={size} height={size} viewBox="0 0 64 64">
        {content}
      </Svg>
      {driftingCloud && <DriftCloud size={size} {...driftingCloud} />}
    </View>
  );
}

function SunAnimation({ size = 96 }) {
  const rotate = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const spin = Animated.loop(
      Animated.timing(rotate, {
        toValue: 1,
        duration: 20000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(scale, { toValue: 1.05, duration: 1500, useNativeDriver: true }),
        Animated.timing(scale, { toValue: 1, duration: 1500, useNativeDriver: true }),
      ])
    );
    spin.start();
    pulse.start();
    return () => {
      spin.stop();
      pulse.stop();
    };
  }, [rotate, scale]);

  const rotateDeg = rotate.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <Animated.View
      style={{ width: size, height: size, transform: [{ rotate: rotateDeg }, { scale }] }}
    >
      <Svg width={size} height={size} viewBox="0 0 64 64">
        <SunCore x={32} y={32} s={1.25} />
      </Svg>
    </Animated.View>
  );
}

function FogAnimation({ size = 140 }) {
  const anim1 = useRef(new Animated.Value(0)).current;
  const anim2 = useRef(new Animated.Value(0)).current;
  const anim3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const createLoop = (anim, delay = 0) => {
      return Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(anim, {
            toValue: 1,
            duration: 4000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(anim, {
            toValue: 0,
            duration: 4000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      );
    };

    const l1 = createLoop(anim1, 0);
    const l2 = createLoop(anim2, 100);
    const l3 = createLoop(anim3, 200);

    l1.start();
    l2.start();
    l3.start();

    return () => {
      l1.stop();
      l2.stop();
      l3.stop();
    };
  }, [anim1, anim2, anim3]);

  const translateX1 = anim1.interpolate({ inputRange: [0, 1], outputRange: [0, 22] });
  const translateX2 = anim2.interpolate({ inputRange: [0, 1], outputRange: [0, 26] });
  const translateX3 = anim3.interpolate({ inputRange: [0, 1], outputRange: [0, 20] });

  return (
    <View style={{ width: size, height: size * 0.833, alignItems: 'center', justifyContent: 'center', marginLeft: -24 }}>
      <Svg width={size} height={size * 0.833} viewBox="0 0 120 100">
        <Defs />
        {/* Cloud Body */}
        <Path
          d="M 45 78
             L 95 78
             A 16 16 0 0 0 111 62
             A 15 15 0 0 0 99 48
             A 22 22 0 0 0 58 35
             A 25 25 0 0 0 35 55
             A 16 16 0 0 0 45 78 Z"
          fill="#CFD8DC"
        />

        {/* Wind Line 1 */}
        <AnimatedLine
          x1="35"
          y1="58"
          x2="75"
          y2="58"
          stroke="#B0BEC5"
          strokeWidth="6"
          strokeLinecap="round"
          style={{ transform: [{ translateX: translateX1 }] }}
        />

        {/* Wind Line 2 */}
        <AnimatedLine
          x1="22"
          y1="71"
          x2="80"
          y2="71"
          stroke="#B0BEC5"
          strokeWidth="6"
          strokeLinecap="round"
          style={{ transform: [{ translateX: translateX2 }] }}
        />

        {/* Wind Line 3 */}
        <AnimatedLine
          x1="25"
          y1="84"
          x2="95"
          y2="84"
          stroke="#B0BEC5"
          strokeWidth="6"
          strokeLinecap="round"
          style={{ transform: [{ translateX: translateX3 }] }}
        />
      </Svg>
    </View>
  );
}

const AnimatedLine = Animated.createAnimatedComponent(Line);

function weathercodeToType(code) {
  if (code === 0) return 'clear';
  if (code <= 3) return 'partly';
  if (code <= 48) return 'fog';
  if (code <= 67) return 'rain';
  if (code <= 77) return 'snow';
  if (code <= 86) return 'showers';
  return 'thunder';
}

const TEMP_UNIT_OPTIONS = [
  { value: 'C', labelKey: 'tempUnits.C.label', descKey: 'tempUnits.C.desc' },
  { value: 'F', labelKey: 'tempUnits.F.label', descKey: 'tempUnits.F.desc' },
];

const WIND_UNIT_OPTIONS = [
  { value: 'kmh', labelKey: 'windUnits.kmh.label', descKey: 'windUnits.kmh.desc' },
  { value: 'ms', labelKey: 'windUnits.ms.label', descKey: 'windUnits.ms.desc' },
  { value: 'mph', labelKey: 'windUnits.mph.label', descKey: 'windUnits.mph.desc' },
  { value: 'knots', labelKey: 'windUnits.knots.label', descKey: 'windUnits.knots.desc' },
  { value: 'beaufort', labelKey: 'windUnits.beaufort.label', descKey: 'windUnits.beaufort.desc' },
];

const LANGUAGE_OPTIONS = [
  { value: 'ru', labelKey: 'russian' },
  { value: 'en', labelKey: 'english' },
];

function beaufortFromMs(ms) {
  const v = Math.abs(ms);
  if (v <= 0.2) return 0;
  if (v <= 1.5) return 1;
  if (v <= 3.3) return 2;
  if (v <= 5.4) return 3;
  if (v <= 7.9) return 4;
  if (v <= 10.7) return 5;
  if (v <= 13.8) return 6;
  if (v <= 17.1) return 7;
  if (v <= 20.7) return 8;
  if (v <= 24.4) return 9;
  if (v <= 28.4) return 10;
  if (v <= 32.6) return 11;
  return 12;
}

function convertTemp(celsius, unit) {
  if (unit === 'F') return celsius * 9 / 5 + 32;
  return celsius;
}

function convertWind(speedKmh, unit) {
  if (unit === 'ms') return speedKmh / 3.6;
  if (unit === 'mph') return speedKmh / 1.609344;
  if (unit === 'knots') return speedKmh / 1.852;
  if (unit === 'beaufort') return beaufortFromMs(speedKmh / 3.6);
  return speedKmh;
}

function formatTemp(celsius, unit) {
  return `${Math.round(convertTemp(celsius, unit))}°`;
}

function formatWind(speedKmh, unit) {
  if (unit === 'beaufort') return `${beaufortFromMs(speedKmh / 3.6)} ${i18n.t('windLabels.beaufort')}`;
  const v = convertWind(speedKmh, unit);
  if (unit === 'kmh') return `${Math.round(v)} ${i18n.t('windLabels.kmh')}`;
  return `${v.toFixed(1)} ${i18n.t(`windLabels.${unit}`) || i18n.t('windLabels.kmh')}`;
}

export default function App() {
  const { t: tr } = useTranslation();
  const { theme, setThemeMode, themeMode, loaded: themeLoaded } = useTheme();
  const [isConnected, setIsConnected] = useState(null);
  const isConnectedRef = useRef(null);
  const updateConnection = (value) => {
    isConnectedRef.current = value;
    setIsConnected(value);
  };
  const [city, setCity] = useState('');
  const [loading, setLoading] = useState(false);
  const [locating, setLocating] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [weather, setWeather] = useState(null);
  const [error, setError] = useState(null);
  const [hostUnreachable, setHostUnreachable] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const [dismissedMsg, setDismissedMsg] = useState(null);
  const [cityTime, setCityTime] = useState(null);
  const [isSplashVisible, setIsSplashVisible] = useState(true);
  const [isContentVisible, setIsContentVisible] = useState(false);
  const [splashRendered, setSplashRendered] = useState(true);
  const [menuVisible, setMenuVisible] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const menuAnim = useRef(new Animated.Value(0)).current;

  const toggleMenu = () => {
    if (menuVisible) {
      Animated.timing(menuAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start(() => setMenuVisible(false));
    } else {
      setMenuVisible(true);
      Animated.timing(menuAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  };

  const closeMenu = () => {
    Animated.timing(menuAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => setMenuVisible(false));
  };

  const menuScale = menuAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.9, 1],
  });

  const menuOpacity = menuAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });
  const [rememberCity, setRememberCity] = useState(true);
  const [themePickerVisible, setThemePickerVisible] = useState(false);
  const [unitPickerVisible, setUnitPickerVisible] = useState(false);
  const [unitPickerMode, setUnitPickerMode] = useState('temp');
  const [languagePickerVisible, setLanguagePickerVisible] = useState(false);
  const [tempPickerAnim] = useState(() => new Animated.Value(0));
  const lastRequest = useRef(null);
  const rememberRef = useRef(true);
  const splashOpacity = useRef(new Animated.Value(1)).current;
  const contentOpacity = useRef(new Animated.Value(0)).current;
  const sunScale = useRef(new Animated.Value(1)).current;
  const sunRotate = useRef(new Animated.Value(0)).current;
  const settingsOverlayOpacity = useRef(new Animated.Value(0)).current;
  const settingsScreenX = useRef(new Animated.Value(SCREEN_WIDTH)).current;
  const pickerAnim = useRef(new Animated.Value(0)).current;
  const languagePickerAnim = useRef(new Animated.Value(0)).current;
  const fs = useFontSize();
  const styles = useMemo(() => buildStyles(theme, fs || { spacing: 16, base: 16, small: 12, large: 20, iconSize: 24, cardHeight: 80 }), [theme, fs]);
  const currentThemeLabel = useMemo(() => {
    const found = THEME_MODES.find((m) => m.value === themeMode);
    return found ? tr(found.labelKey) : tr('themeModes.author.label');
  }, [themeMode, tr]);
  const route = useRoute();
  const navigation = useNavigation();
  const cityParam = route.params?.city;
  const { isLoading, setLoading: setAppLoading } = useContext(LoadingContext);
  const { tempUnit, windUnit, setTempUnit, setWindUnit } = useContext(SettingsContext);
  const refreshColors =
    theme.mode === 'light' ? ['#3573c2', '#25945a'] : ['#4a90d9', '#38b06b'];
  const switchTrackOff = theme.mode === 'light' ? '#c9d3e6' : '#3a4560';
  useEffect(() => {
    const spin = Animated.loop(
      Animated.timing(sunRotate, { toValue: 1, duration: 6000, useNativeDriver: true })
    );
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(sunScale, { toValue: 1.15, duration: 900, useNativeDriver: true }),
        Animated.timing(sunScale, { toValue: 1, duration: 900, useNativeDriver: true }),
      ])
    );
    spin.start();
    pulse.start();
    const timer = setTimeout(() => {
      setIsSplashVisible(false);
      setIsContentVisible(true);
    }, 1500);
    return () => {
      spin.stop();
      pulse.stop();
      clearTimeout(timer);
    };
  }, []);
  useEffect(() => {
    let active = true;
    const init = async () => {
      const state = await NetInfo.fetch();
      if (!active) return;
      updateConnection(!!state.isConnected);
      const remember = await loadRememberCity();
      if (!active) return;
      rememberRef.current = remember;
      setRememberCity(remember);
      const saved = await loadLastCity();
      if (!active) return;
      if (!remember || !saved) {
        if (active && !saved) detectMyLocation();
        return;
      }
      setCity(saved);
      doSearch(saved);
    };
    init();
    const unsubscribe = NetInfo.addEventListener((state) => {
      updateConnection(!!state.isConnected);
      if (!state.isConnected) {
        setHostUnreachable(false);
      }
    });
     return () => {
       active = false;
       unsubscribe();
     };
   }, []);
  useFocusEffect(
    useCallback(() => {
      (async () => {
        const remember = await loadRememberCity();
        rememberRef.current = remember;
        setRememberCity(remember);
      })();
    }, [])
  );
   useEffect(() => {
     if (!isSplashVisible) {
      Animated.timing(splashOpacity, { toValue: 0, duration: 500, useNativeDriver: true }).start(
        ({ finished }) => {
          if (finished) setSplashRendered(false);
        }
      );
    }
  }, [isSplashVisible]);
  useEffect(() => {
    if (isContentVisible) {
      Animated.timing(contentOpacity, { toValue: 1, duration: 500, useNativeDriver: true }).start();
    }
  }, [isContentVisible]);
  useEffect(() => {
    if (!settingsOpen) return;
    Animated.parallel([
      Animated.timing(settingsOverlayOpacity, {
        toValue: 1,
        duration: 300,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(settingsScreenX, {
        toValue: 0,
        duration: 300,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [settingsOpen]);
  useEffect(() => {
    if (!themePickerVisible) return;
    Animated.timing(pickerAnim, {
      toValue: 1,
      duration: 200,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [themePickerVisible]);
  useEffect(() => {
    if (!unitPickerVisible) return;
    Animated.timing(tempPickerAnim, {
      toValue: 1,
      duration: 200,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [unitPickerVisible]);
  useEffect(() => {
    if (!languagePickerVisible) return;
    Animated.timing(languagePickerAnim, {
      toValue: 1,
      duration: 200,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [languagePickerVisible]);
  const openSettings = () => {
    navigation.getParent()?.navigate('Settings');
  };
  const closeSettings = () => {
    if (themePickerVisible) closeThemePicker();
    if (languagePickerVisible) closeLanguagePicker();
    Animated.parallel([
      Animated.timing(settingsOverlayOpacity, {
        toValue: 0,
        duration: 240,
        easing: Easing.in(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(settingsScreenX, {
        toValue: SCREEN_WIDTH,
        duration: 280,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => {
      if (finished) setSettingsOpen(false);
    });
  };
  const openThemePicker = () => {
    pickerAnim.setValue(0);
    setThemePickerVisible(true);
  };
  const closeThemePicker = () => {
    Animated.timing(pickerAnim, {
      toValue: 0,
      duration: 180,
      easing: Easing.in(Easing.quad),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) setThemePickerVisible(false);
    });
  };
  const selectThemeMode = async (value) => {
    setThemeMode(value);
    closeThemePicker();
  };
  const toggleRemember = async (value) => {
    setRememberCity(value);
    rememberRef.current = value;
    await saveRememberCity(value);
  };
  const showUnitPicker = (mode) => {
    setUnitPickerMode(mode);
    tempPickerAnim.setValue(0);
    setUnitPickerVisible(true);
  };
  const hideUnitPicker = () => {
    Animated.timing(tempPickerAnim, {
      toValue: 0,
      duration: 180,
      easing: Easing.in(Easing.quad),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) setUnitPickerVisible(false);
    });
  };
  const onSelectUnit = async (value) => {
    if (unitPickerMode === 'temp') {
      await setTempUnit(value);
    } else {
      await setWindUnit(value);
    }
    hideUnitPicker();
  };
  const openLanguagePicker = () => {
    languagePickerAnim.setValue(0);
    setLanguagePickerVisible(true);
  };
  const closeLanguagePicker = () => {
    Animated.timing(languagePickerAnim, {
      toValue: 0,
      duration: 180,
      easing: Easing.in(Easing.quad),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) setLanguagePickerVisible(false);
    });
  };
  const selectLanguage = async (value) => {
    await changeLanguage(value);
    closeLanguagePicker();
  };
  const openGitHub = async () => {
    try {
      await Linking.openURL(GITHUB_URL);
    } catch (e) {}
  };
  const geocode = async (query) => {
    const data = await fetchJson(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=1&language=${i18n.language}&format=json`
    );
    if (!data.results || data.results.length === 0) {
      throw new Error(tr('cityNotFound'));
    }
    return data.results[0];
  };
  const reverseGeocode = async (lat, lon) => {
    const data = await fetchJson(
      `https://geocoding-api.open-meteo.com/v1/reverse?latitude=${lat}&longitude=${lon}&count=1&language=${i18n.language}&format=json`
    );
    if (data.results && data.results.length > 0) {
      const p = data.results[0];
      return {
         name: p.name || p.admin1 || tr('currentLocation'),
         country: p.country || '',
         latitude: lat,
         longitude: lon,
       };
     }
     return {
       name: tr('currentLocation'),
       country: `${lat.toFixed(2)}, ${lon.toFixed(2)}`,
      latitude: lat,
      longitude: lon,
    };
  };
  const fetchWeather = async (lat, lon) => {
    const data = await fetchJson(
      `${BASE_URL}?latitude=${lat}&longitude=${lon}&current_weather=true&daily=weathercode,temperature_2m_max,temperature_2m_min&timezone=auto`
    );
    return data;
  };
  const loadByCoords = async (lat, lon, silent = false) => {
    if (!silent) setLoading(true);
    setError(null);
    try {
      const [place, data] = await Promise.all([reverseGeocode(lat, lon), fetchWeather(lat, lon)]);
      setWeather({ place, data });
      lastRequest.current = { type: 'coords', lat, lon };
      if (rememberRef.current && place.name && place.name !== tr('currentLocation')) {
        await saveLastCity(place.name);
      }
    } catch (e) {
       if (isConnectedRef.current === false) {
         setError(tr('noInternet'));
       } else if (e.kind === 'network') {
         setError(null);
         setHostUnreachable(true);
       } else {
         setError(e.message || tr('weatherFetchFailed'));
       }
       if (!silent) setWeather(null);
     } finally {
       setLoading(false);
     }
   };
   const detectMyLocation = async () => {
     if (isConnectedRef.current === false) {
       setError(tr('noInternet'));
       return;
     }
     setLocating(true);
     setError(null);
     try {
       const { status } = await Location.requestForegroundPermissionsAsync();
       if (status !== 'granted') {
        setError(tr('locationPermissionDenied'));
        return;
      }
      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const { latitude, longitude } = position.coords;
      await loadByCoords(latitude, longitude);
    } catch (e) {
       setError(tr('locationFailed'));
    } finally {
      setLocating(false);
    }
  };
  const doSearch = async (query, silent = false) => {
    if (!silent) setLoading(true);
    setError(null);
    try {
      const place = await geocode(query);
      const data = await fetchWeather(place.latitude, place.longitude);
      setWeather({ place, data });
      lastRequest.current = { type: 'city', query };
      if (rememberRef.current) {
        await saveLastCity(query);
      }
    } catch (e) {
      if (isConnectedRef.current === false) {
        setError(tr('noInternet'));
      } else if (e.kind === 'network') {
        setError(null);
        setHostUnreachable(true);
      } else {
        setError(e.message || tr('weatherFetchFailed'));
      }
      if (!silent) setWeather(null);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    if (cityParam) {
      setCity(cityParam);
      doSearch(cityParam);
    }
  }, [cityParam]);
  const search = () => {
    const query = city.trim();
    if (!query) {
      Alert.alert(tr('enterCity'), tr('enterCityMessage'));
      return;
    }
    doSearch(query);
  };
  const retryConnection = async () => {
    if (retrying) return;
    setRetrying(true);
    try {
      const state = await NetInfo.fetch();
      updateConnection(!!state.isConnected);
      if (!state.isConnected) return;
      setHostUnreachable(false);
      const last = lastRequest.current;
      if (!last) {
        await detectMyLocation();
      } else if (last.type === 'coords') {
        await loadByCoords(last.lat, last.lon);
      } else {
        await doSearch(last.query);
      }
    } finally {
      setRetrying(false);
    }
  };
  const onRefresh = async () => {
    if (refreshing) return;
    setRefreshing(true);
    try {
      const last = lastRequest.current;
      if (!last) {
        await detectMyLocation();
      } else if (last.type === 'coords') {
        await loadByCoords(last.lat, last.lon, true);
      } else {
        await doSearch(last.query, true);
      }
    } finally {
      setRefreshing(false);
    }
  };
  const spinInterpolate = sunRotate.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });
  const getSkyIsNight = () => {
    if (weather && weather.data) {
      const d = weather.data;
      const cwTime = d.current_weather && d.current_weather.time;
      if (typeof cwTime === 'string' && cwTime.length >= 13) {
        const h = parseInt(cwTime.slice(11, 13), 10);
        if (!Number.isNaN(h)) return h >= 21 || h < 6;
      }
      const offset =
        typeof d.utc_offset_seconds === 'number' ? d.utc_offset_seconds : 0;
      const now = new Date();
      const cityMs =
        now.getTime() + now.getTimezoneOffset() * 60000 + offset * 1000;
      const h = new Date(cityMs).getHours();
      return h >= 21 || h < 6;
    }
    const h = new Date().getHours();
    return h >= 21 || h < 6;
  };
  const skyIsNight = getSkyIsNight();
  let bannerType = null;
  let bannerMessage = null;
  if (isConnected === false) {
    bannerType = 'offline';
    bannerMessage = tr('noInternet');
  } else if (hostUnreachable) {
    bannerType = 'vpn';
    bannerMessage = tr('vpnWarning');
  } else if (error) {
    bannerType = 'gps';
    bannerMessage = error;
  }
  const showBanner = !!bannerMessage && bannerMessage !== dismissedMsg;
  useEffect(() => {
    if (bannerType === 'vpn' || bannerType === 'gps') {
      const timer = setTimeout(() => {
        if (bannerType === 'vpn') setHostUnreachable(false);
        else setError(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [bannerType, bannerMessage]);
  useEffect(() => {
    if (!weather || !weather.data) {
      setCityTime(null);
      return;
    }
    const tick = () => setCityTime(computeCityClock(weather.data));
    tick();
    const timer = setInterval(tick, 30000);
    return () => clearInterval(timer);
  }, [weather]);
  useEffect(() => {
    const busy =
      isSplashVisible ||
      !themeLoaded ||
      ((loading || locating) && weather === null);
    setAppLoading(busy);
  }, [isSplashVisible, themeLoaded, loading, locating, weather]);
  useLayoutEffect(() => {
    const hideTabs =
      settingsOpen ||
      isSplashVisible ||
      !themeLoaded ||
      ((loading || locating) && weather === null);
     navigation.setOptions({
      tabBarStyle: {
        backgroundColor: theme.background,
        borderTopColor: theme.border,
        height: 70,
        paddingBottom: 8,
        display: hideTabs ? 'none' : 'flex',
      },
      tabBarActiveTintColor: theme.mode === 'light' ? '#3b82f6' : '#fbbf24',
      tabBarInactiveTintColor: theme.mode === 'light' ? '#94a3b8' : '#94a3b8',
    });
  }, [settingsOpen, isSplashVisible, themeLoaded, loading, locating, weather, theme, navigation]);
  const currentIsNight =
    weather &&
    weather.data &&
    weather.data.current_weather &&
    typeof weather.data.current_weather.is_day === 'number'
      ? weather.data.current_weather.is_day === 0
      : skyIsNight;
  const currentType = weather
    ? weathercodeToType(weather.data.current_weather.weathercode)
    : 'clear';
  const conditionFor = (code) => {
    if (code === 0) return tr('condition.clear');
    if (code <= 3) return tr('condition.cloudy');
    if (code <= 48) return tr('condition.fog');
    if (code <= 67) return tr('condition.rain');
    if (code <= 77) return tr('condition.snow');
    if (code <= 86) return tr('condition.showers');
    return tr('condition.thunder');
  };
  if (!themeLoaded || !fs) {
    return (
      <SafeAreaView style={preloadStyles.safe}>
        <View style={preloadStyles.fill} />
      </SafeAreaView>
    );
  }
  return (
    <SafeAreaView style={styles.safe}>
        <Animated.View style={[styles.container, { opacity: contentOpacity }]}>
          <View style={styles.titleRow}>
            <Text style={styles.title}>{tr('weather')}</Text>
            <TouchableOpacity style={styles.gearButton} onPress={toggleMenu} activeOpacity={0.7}>
              <Ionicons name="ellipsis-vertical" size={24} color={theme.text} />
            </TouchableOpacity>
          </View>

          <Modal
            visible={menuVisible}
            transparent={true}
            animationType="none"
            onRequestClose={closeMenu}
          >
            <TouchableWithoutFeedback onPress={closeMenu}>
              <View style={styles.menuBackdrop}>
                <Animated.View
                  style={[
                    styles.dropdownMenu,
                    {
                      backgroundColor: theme.surfaceRaised || '#253043',
                      borderColor: theme.border || 'rgba(255,255,255,0.1)',
                      opacity: menuOpacity,
                      transform: [{ scale: menuScale }],
                    },
                  ]}
                >
                  <TouchableOpacity
                    style={styles.menuItem}
                    onPress={() => {
                      closeMenu();
                      navigation.navigate('CityList');
                    }}
                  >
                    <Ionicons name="list" size={20} color={theme.text} style={styles.menuIcon} />
                    <Text style={[styles.menuItemText, { color: theme.text }]}>Управление городами</Text>
                  </TouchableOpacity>
                  <View style={[styles.menuDivider, { backgroundColor: theme.border || 'rgba(255,255,255,0.1)' }]} />
                  <TouchableOpacity
                    style={styles.menuItem}
                    onPress={() => {
                      closeMenu();
                      openSettings();
                    }}
                  >
                    <Ionicons name="settings-outline" size={20} color={theme.text} style={styles.menuIcon} />
                    <Text style={[styles.menuItemText, { color: theme.text }]}>{tr('settings')}</Text>
                  </TouchableOpacity>
                </Animated.View>
              </View>
            </TouchableWithoutFeedback>
          </Modal>
          <View style={styles.searchRow}>
            <TextInput
              style={styles.input}
              placeholder={tr('enterCity')}
              placeholderTextColor={switchTrackOff}
              value={city}
              onChangeText={setCity}
              onSubmitEditing={search}
              returnKeyType="search"
            />
            <TouchableOpacity style={styles.button} onPress={search} activeOpacity={0.7}>
              <Text style={styles.buttonText}>{tr('search')}</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity
            style={[styles.button, styles.locButton, locating && styles.buttonDisabled]}
            onPress={detectMyLocation}
            disabled={locating}
            activeOpacity={0.7}
          >
            <Text style={styles.buttonText}>{tr('detectLocation')}</Text>
          </TouchableOpacity>
          {showBanner && (
            <View
              style={[
                styles.infoBanner,
                bannerType === 'offline' && styles.infoBannerOffline,
                bannerType === 'vpn' && styles.infoBannerVpn,
              ]}
            >
              <Text
                style={[
                  styles.infoBannerText,
                  bannerType === 'offline' && styles.infoBannerTextOffline,
                ]}
              >
                {bannerMessage}
              </Text>
              <TouchableOpacity style={styles.bannerButton} onPress={retryConnection} disabled={retrying}>
                <Text style={styles.bannerButtonText}>{retrying ? '…' : tr('retry')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.bannerClose} onPress={() => setDismissedMsg(bannerMessage)}>
                <Text style={styles.bannerCloseText}>✕</Text>
              </TouchableOpacity>
            </View>
          )}
          {(loading || locating) && (
            <View style={styles.center}>
              <Animated.View
                style={[
                  styles.skyIconWrap,
                  { transform: [{ scale: sunScale }, { rotate: spinInterpolate }] },
                ]}
              >
                <WeatherIcon type="clear" isNight={skyIsNight} size={72} />
              </Animated.View>
              <ActivityIndicator size="large" color={theme.accent} />
              <Text style={styles.loadingText}>
                {locating ? tr('locating') : tr('loading')}
              </Text>
            </View>
          )}
          {weather && !loading && !locating && (
            <ScrollView
              style={styles.result}
              contentContainerStyle={styles.resultContent}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={onRefresh}
                  tintColor={refreshColors[0]}
                  colors={refreshColors}
                  progressBackgroundColor={theme.surface}
                  titleColor={theme.textSecondary}
                />
              }
            >
              <Text style={styles.cityName}>{weather.place.name}</Text>
              <Text style={styles.subLabel}>
                {weather.place.country} · {weather.place.latitude.toFixed(2)},
                {weather.place.longitude.toFixed(2)}
              </Text>
              {cityTime && <Text style={styles.cityTime}>{tr('localTime')} {cityTime}</Text>}
              <View style={styles.bigIconWrap}>
                {currentType === 'clear' ? (
                  <SunAnimation size={100} />
                ) : currentType === 'fog' ? (
                  <FogAnimation size={100} />
                ) : (
                  <WeatherIcon type={currentType} isNight={currentIsNight} size={100} />
                )}
              </View>
              <Text style={styles.temperature}>
                 {formatTemp(weather.data.current_weather.temperature, tempUnit)}
              </Text>
              <Text style={styles.condition}>
                {conditionFor(weather.data.current_weather.weathercode)}
              </Text>
              <View style={styles.detailRow}>
                <View style={styles.detailCard}>
                   <Text style={styles.detailValue}>{formatWind(weather.data.current_weather.windspeed, windUnit)}</Text>
                   <Text style={styles.detailLabel}>{tr('wind')}</Text>
                </View>
                <View style={styles.detailCard}>
                  <Text style={styles.detailValue}>
                     {weather.data.current_weather.is_day ? tr('day') : tr('night')}
                  </Text>
                   <Text style={styles.detailLabel}>{tr('timeOfDay')}</Text>
                </View>
              </View>
               <Text style={styles.sectionTitle}>{tr('weeklyForecast')}</Text>
              {weather.data.daily.time.map((day, i) => (
                <View key={day} style={styles.forecastRow}>
                  <Text style={styles.forecastDay}>{formatDay(day)}</Text>
                  <View style={styles.forecastIconCell}>
                    <WeatherIcon
                      type={weathercodeToType(weather.data.daily.weathercode[i])}
                      isNight={false}
                      size={26}
                    />
                  </View>
                  <Text style={styles.forecastTemp}>
                    {formatTemp(weather.data.daily.temperature_2m_min[i], tempUnit)} /{' '}
                    {formatTemp(weather.data.daily.temperature_2m_max[i], tempUnit)}
                  </Text>
                </View>
              ))}
            </ScrollView>
          )}
           {!loading && !locating && !weather && (
             <View style={styles.center}>
               <Text style={styles.hint}>
                 {tr('enterCityOrLocation')}
               </Text>
             </View>
           )}
        </Animated.View>
        {splashRendered && (
          <Animated.View
            style={[styles.splash, { opacity: splashOpacity }]}
            pointerEvents={isSplashVisible ? 'auto' : 'none'}
          >
            <Animated.View
              style={[
                styles.splashIconWrap,
                { transform: [{ scale: sunScale }, { rotate: spinInterpolate }] },
              ]}
            >
              <WeatherIcon type="clear" isNight={skyIsNight} size={120} />
            </Animated.View>
            <Text style={styles.splashText}>{tr('splashText')}</Text>
          </Animated.View>
        )}
        {settingsOpen && (
          <View style={styles.settingsLayer} pointerEvents="box-none">
            <Animated.View style={[styles.settingsDim, { opacity: settingsOverlayOpacity }]} />
            <Animated.View
              style={[styles.settingsScreen, { transform: [{ translateX: settingsScreenX }] }]}
            >
              <SafeAreaView style={styles.settingsSafe}>
                <View style={styles.settingsHeader}>
                  <TouchableOpacity
                    style={styles.settingsBackButton}
                    onPress={closeSettings}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.settingsBackIcon}>←</Text>
                  </TouchableOpacity>
                   <Text style={styles.settingsHeaderTitle}>{tr('about')}</Text>
                </View>
                <ScrollView
                  style={styles.settingsBody}
                  contentContainerStyle={styles.settingsBodyContent}
                >
                  <View style={styles.settingsHero}>
                     <Image source={APP_ICON_SOURCE} style={styles.heroAppIcon} resizeMode="contain" />
                     <Text style={styles.heroTitle}>{tr('weather')}</Text>
                     <Text style={styles.heroAuthor}>{tr('byAuthor')}</Text>
                     <Text style={styles.heroVersion}>{tr('version', { version: APP_VERSION })}</Text>
                  </View>
                    <Text style={styles.settingsSectionTitle}>{tr('settings')}</Text>
                    <View style={styles.cardStack}>
                       <View style={styles.aboutCard}>
                         <View style={[styles.aboutCardTextWrap, { flex: 1 }]}>
                           <Text style={styles.aboutCardTitle}>{tr('rememberCity')}</Text>
                           <Text style={styles.aboutCardDesc}>
                             {tr('rememberCityDesc')}
                           </Text>
                         </View>
                         <Switch
                           style={{ flexShrink: 0, alignSelf: 'center', marginLeft: 10 }}
                           value={rememberCity}
                           onValueChange={toggleRemember}
                           trackColor={{ false: switchTrackOff, true: theme.accent2 }}
                           thumbColor="#ffffff"
                           ios_backgroundColor={switchTrackOff}
                         />
                       </View>
                    </View>
                    <Text style={styles.settingsSectionTitle}>{tr('interface')}</Text>
                   <View style={styles.cardStack}>
                      <TouchableOpacity
                        style={styles.aboutCard}
                        onPress={openThemePicker}
                        activeOpacity={0.6}
                      >
                        <View style={styles.interfaceIconWrap}>
                          <Text style={styles.interfaceIconEmoji}>🎨</Text>
                        </View>
                        <View style={[styles.aboutCardTextWrap, { flex: 1 }]}>
                          <Text style={styles.aboutCardTitle}>{tr('appTheme')}</Text>
                          <Text style={styles.aboutCardDesc}>{currentThemeLabel}</Text>
                        </View>
                        <Text style={styles.settingsChevron}>›</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.aboutCard}
                        onPress={openLanguagePicker}
                        activeOpacity={0.6}
                      >
                        <View style={styles.interfaceIconWrap}>
                          <Text style={styles.interfaceIconEmoji}>🌐</Text>
                        </View>
                        <View style={[styles.aboutCardTextWrap, { flex: 1 }]}>
                          <Text style={styles.aboutCardTitle}>{tr('language')}</Text>
                          <Text style={styles.aboutCardDesc}>
                            {i18n.language === 'ru' ? tr('russian') : tr('english')}
                          </Text>
                        </View>
                        <Text style={styles.settingsChevron}>›</Text>
                      </TouchableOpacity>
                    </View>
                    <Text style={styles.settingsSectionTitle}>{tr('units')}</Text>
                    <View style={styles.cardStack}>
                      <TouchableOpacity
                        style={styles.aboutCard}
                        onPress={() => showUnitPicker('temp')}
                        activeOpacity={0.6}
                      >
                        <View style={styles.interfaceIconWrap}>
                          <Text style={styles.interfaceIconEmoji}>🌡️</Text>
                        </View>
                        <View style={[styles.aboutCardTextWrap, { flex: 1 }]}>
                          <Text style={styles.aboutCardTitle}>{tr('temperature')}</Text>
                          <Text style={styles.aboutCardDesc}>
                            {tr(TEMP_UNIT_OPTIONS.find((o) => o.value === tempUnit)?.labelKey ?? 'tempUnits.C.label')}
                          </Text>
                        </View>
                        <Text style={styles.settingsChevron}>›</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.aboutCard}
                        onPress={() => showUnitPicker('wind')}
                        activeOpacity={0.6}
                      >
                        <View style={styles.interfaceIconWrap}>
                          <Text style={styles.interfaceIconEmoji}>💨</Text>
                        </View>
                        <View style={[styles.aboutCardTextWrap, { flex: 1 }]}>
                          <Text style={styles.aboutCardTitle}>{tr('windSpeed')}</Text>
                          <Text style={styles.aboutCardDesc}>
                            {tr(WIND_UNIT_OPTIONS.find((o) => o.value === windUnit)?.labelKey ?? 'windUnits.kmh.label')}
                          </Text>
                        </View>
                        <Text style={styles.settingsChevron}>›</Text>
                      </TouchableOpacity>
                    </View>
                   <Text style={styles.settingsSectionTitle}>{tr('aboutProject')}</Text>
                   <View style={styles.cardStack}>
                     <TouchableOpacity
                       style={styles.aboutCard}
                       onPress={openGitHub}
                       activeOpacity={0.6}
                      >
                        <View style={styles.githubIconWrap}>
                          <GithubIcon size={22} color={theme.text} />
                        </View>
                        <View style={[styles.aboutCardTextWrap, { flex: 1 }]}>
                          <Text style={styles.aboutCardTitle}>{tr('sourceCode')}</Text>
                          <Text style={styles.aboutCardDesc}>
                            {tr('githubDesc')}
                          </Text>
                        </View>
                        <Text style={styles.settingsChevron}>›</Text>
                      </TouchableOpacity>
                  </View>
                </ScrollView>
                {themePickerVisible && (
                  <View style={styles.pickerLayer} pointerEvents="box-none">
                    <Animated.View style={[styles.pickerBackdrop, { opacity: pickerAnim }]}>
                      <TouchableOpacity
                        style={StyleSheet.absoluteFill}
                        activeOpacity={1}
                        onPress={closeThemePicker}
                      />
                    </Animated.View>
                    <Animated.View
                      style={[
                        styles.pickerCard,
                        {
                          opacity: pickerAnim,
                          transform: [
                            {
                              scale: pickerAnim.interpolate({
                                inputRange: [0, 1],
                                outputRange: [0.92, 1],
                              }),
                            },
                          ],
                        },
                      ]}
                    >
                      <Text style={styles.pickerTitle}>{tr('appTheme')}</Text>
                      {THEME_MODES.map((m) => {
                        const selected = m.value === themeMode;
                        return (
                          <TouchableOpacity
                            key={m.value}
                            style={styles.pickerOption}
                            onPress={() => selectThemeMode(m.value)}
                            activeOpacity={0.6}
                          >
                            <View
                              style={[styles.radioOuter, selected && { borderColor: theme.accent }]}
                            >
                              {selected && (
                                <View
                                  style={[styles.radioInner, { backgroundColor: theme.accent }]}
                                />
                              )}
                            </View>
                            <View style={styles.pickerOptionTextWrap}>
                              <Text style={styles.pickerOptionLabel}>{tr(m.labelKey)}</Text>
                              <Text style={styles.pickerOptionDesc}>{tr(m.descKey)}</Text>
                            </View>
                          </TouchableOpacity>
                        );
                       })}
                     </Animated.View>
                   </View>
                 )}
                 {unitPickerVisible && (
                   <View style={styles.pickerLayer} pointerEvents="box-none">
                     <Animated.View style={[styles.pickerBackdrop, { opacity: tempPickerAnim }]}>
                       <TouchableOpacity
                         style={StyleSheet.absoluteFill}
                         activeOpacity={1}
                         onPress={hideUnitPicker}
                       />
                     </Animated.View>
                     <Animated.View
                       style={[
                         styles.pickerCard,
                         {
                           opacity: tempPickerAnim,
                           transform: [
                             {
                               scale: tempPickerAnim.interpolate({
                                 inputRange: [0, 1],
                                 outputRange: [0.92, 1],
                               }),
                             },
                           ],
                         },
                       ]}
                     >
                        <Text style={styles.pickerTitle}>
                          {unitPickerMode === 'temp' ? tr('temperature') : tr('windSpeed')}
                        </Text>
                        {(unitPickerMode === 'temp' ? TEMP_UNIT_OPTIONS : WIND_UNIT_OPTIONS).map(
                          (o) => {
                            const selected =
                              (unitPickerMode === 'temp'
                                ? o.value === tempUnit
                                : o.value === windUnit) || false;
                            return (
                              <TouchableOpacity
                                key={o.value}
                                style={styles.pickerOption}
                                onPress={() => onSelectUnit(o.value)}
                                activeOpacity={0.6}
                              >
                                <View
                                  style={[styles.radioOuter, selected && { borderColor: theme.accent }]}
                                >
                                  {selected && (
                                    <View
                                      style={[styles.radioInner, { backgroundColor: theme.accent }]}
                                    />
                                  )}
                                </View>
                                <View style={styles.pickerOptionTextWrap}>
                                  <Text style={styles.pickerOptionLabel}>{tr(o.labelKey)}</Text>
                                  <Text style={styles.pickerOptionDesc}>{tr(o.descKey)}</Text>
                                </View>
                              </TouchableOpacity>
                            );
                          },
                        )}
                     </Animated.View>
                   </View>
                 )}
                   {languagePickerVisible && (
                     <View style={styles.pickerLayer} pointerEvents="box-none">
                       <Animated.View style={[styles.pickerBackdrop, { opacity: languagePickerAnim }]}>
                         <TouchableOpacity
                           style={StyleSheet.absoluteFill}
                           activeOpacity={1}
                           onPress={closeLanguagePicker}
                         />
                       </Animated.View>
                       <Animated.View
                         style={[
                           styles.pickerCard,
                           {
                             opacity: languagePickerAnim,
                             transform: [
                               {
                                 scale: languagePickerAnim.interpolate({
                                   inputRange: [0, 1],
                                   outputRange: [0.92, 1],
                                 }),
                               },
                             ],
                           },
                         ]}
                       >
                         <Text style={styles.pickerTitle}>{tr('language')}</Text>
                         {LANGUAGE_OPTIONS.map((lang) => {
                           const selected = lang.value === i18n.language;
                           return (
                             <TouchableOpacity
                               key={lang.value}
                               style={styles.pickerOption}
                               onPress={() => selectLanguage(lang.value)}
                               activeOpacity={0.6}
                             >
                               <View
                                 style={[styles.radioOuter, selected && { borderColor: theme.accent }]}
                               >
                                 {selected && (
                                   <View
                                     style={[styles.radioInner, { backgroundColor: theme.accent }]}
                                   />
                                 )}
                               </View>
                               <View style={styles.pickerOptionTextWrap}>
                                 <Text style={styles.pickerOptionLabel}>{tr(lang.labelKey)}</Text>
                               </View>
                             </TouchableOpacity>
                           );
                         })}
                       </Animated.View>
                     </View>
                   )}
                 </SafeAreaView>
            </Animated.View>
          </View>
        )}
      </SafeAreaView>
  );
}

function formatDay(iso) {
  const d = new Date(iso + 'T00:00:00');
  const locale = i18n.language === 'en' ? 'en-US' : 'ru-RU';
  return d.toLocaleDateString(locale, { weekday: 'short', day: 'numeric' });
}

function computeCityClock(data) {
  if (!data || typeof data.utc_offset_seconds !== 'number') return null;
  const now = new Date();
  const cityMs = now.getTime() + now.getTimezoneOffset() * 60000 + data.utc_offset_seconds * 1000;
  const d = new Date(cityMs);
  return (
    String(d.getHours()).padStart(2, '0') +
    ':' +
    String(d.getMinutes()).padStart(2, '0')
  );
}

const preloadStyles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#1c2333' },
  fill: { flex: 1 },
});

const buildStyles = (theme, fs) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: theme.background },
    splash: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: theme.background, alignItems: 'center', justifyContent: 'center' },
    splashIconWrap: { marginBottom: fs.spacing },
    splashText: { color: theme.textSecondary, fontSize: fs.small },
    title: { fontSize: fs.base * 2, fontWeight: '700', color: theme.text, textAlign: 'center', marginTop: 0, marginLeft: 0 },
    container: { flex: 1, position: 'relative', paddingHorizontal: fs.spacing * 2, paddingTop: (StatusBar.currentHeight || 0) },
    titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: fs.spacing, marginTop: fs.spacing * 0.5 },
    gearButton: { marginRight: 0, marginTop: 0, padding: fs.spacing * 0.375, zIndex: 1 },
    gearIcon: { fontSize: fs.iconSize },
    menuBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-start', alignItems: 'flex-end', paddingTop: 60, paddingRight: 16 },
    dropdownMenu: { width: 220, borderRadius: 16, borderWidth: 1, paddingVertical: 6, elevation: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 },
    menuItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 16 },
    menuIcon: { marginRight: 12 },
    menuItemText: { fontSize: 16, fontWeight: '600' },
    menuDivider: { height: 1, width: '100%', marginVertical: 2 },
    searchRow: { flexDirection: 'row', marginBottom: fs.spacing * 0.625 },
    input: { flex: 1, height: fs.spacing * 3, backgroundColor: theme.surface, borderRadius: 10, paddingHorizontal: fs.spacing * 0.875, color: theme.text, fontSize: fs.base, marginRight: fs.spacing * 0.625 },
    button: { height: fs.spacing * 3, paddingHorizontal: fs.spacing * 1.25, backgroundColor: theme.accent, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
    locButton: { backgroundColor: theme.accent2, marginBottom: fs.spacing },
    buttonDisabled: { opacity: 0.5 },
    buttonText: { color: theme.onAccent, fontSize: fs.base, fontWeight: '600' },
    infoBanner: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff9c4', borderRadius: 10, paddingVertical: fs.spacing * 0.625, paddingHorizontal: fs.spacing * 0.75, marginBottom: fs.spacing },
    infoBannerVpn: { backgroundColor: '#ffe0b2' },
    infoBannerOffline: { backgroundColor: '#fdecea' },
    infoBannerText: { flex: 1, color: '#4a3000', fontSize: fs.small, fontWeight: '600', marginRight: fs.spacing * 0.5 },
    infoBannerTextOffline: { color: '#7a1c1c' },
    bannerButton: { backgroundColor: '#4a3000', borderRadius: 8, paddingVertical: fs.spacing * 0.375, paddingHorizontal: fs.spacing * 0.625, marginRight: fs.spacing * 0.5 },
    bannerButtonText: { color: '#fff3cd', fontSize: fs.small, fontWeight: '700' },
    bannerClose: { padding: fs.spacing * 0.25 },
    bannerCloseText: { color: '#4a3000', fontSize: fs.base, fontWeight: '700' },
    center: { alignItems: 'center', justifyContent: 'center', flex: 1 },
    skyIconWrap: { marginBottom: fs.spacing },
    loadingText: { color: theme.textMuted, marginTop: fs.spacing * 0.625, fontSize: fs.base },
    hint: { color: theme.textMuted, fontSize: fs.base, textAlign: 'center' },
    result: { flex: 1 },
    resultContent: { paddingBottom: fs.spacing * 1.875 },
    cityName: { fontSize: fs.large * 1.15, fontWeight: '700', color: theme.text, textAlign: 'center' },
    subLabel: { fontSize: fs.small, color: theme.textMuted, textAlign: 'center', marginTop: fs.spacing * 0.125 },
    cityTime: { fontSize: fs.base, color: theme.textSecondary, textAlign: 'center', marginTop: fs.spacing * 0.25 },
    bigIconWrap: { alignItems: 'center', marginTop: fs.spacing },
    temperature: { fontSize: fs.large * 2.5, fontWeight: '300', color: theme.text, textAlign: 'center' },
    condition: { fontSize: fs.base * 1.25, color: theme.textSecondary, textAlign: 'center', marginBottom: fs.spacing },
    detailRow: { flexDirection: 'row', justifyContent: 'space-around', marginVertical: fs.spacing },
    detailCard: { backgroundColor: theme.surface, borderRadius: 12, paddingVertical: fs.spacing * 0.875, paddingHorizontal: fs.spacing * 1.25, alignItems: 'center', minHeight: fs.cardHeight * 0.7 },
    detailValue: { color: theme.text, fontSize: fs.base, fontWeight: '600' },
    detailLabel: { color: theme.textMuted, fontSize: fs.small, marginTop: fs.spacing * 0.25 },
    sectionTitle: { fontSize: fs.base * 1.125, fontWeight: '600', color: theme.text, marginTop: fs.spacing * 0.625, marginBottom: fs.spacing * 0.5 },
    forecastRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: theme.surfaceAlt, borderRadius: 8, paddingHorizontal: fs.spacing * 0.875, paddingVertical: fs.spacing * 0.625, marginBottom: fs.spacing * 0.375 },
    forecastDay: { color: theme.textSecondary, fontSize: fs.base * 0.9375, flex: 1 },
    forecastIconCell: { width: 32, alignItems: 'center', marginRight: fs.spacing * 0.75 },
    forecastTemp: { color: theme.text, fontSize: fs.base * 0.9375, fontWeight: '600' },
    settingsLayer: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 100 },
    settingsDim: { ...StyleSheet.absoluteFillObject, backgroundColor: theme.dim },
    settingsScreen: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: theme.background },
    settingsSafe: { flex: 1 },
    settingsHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: fs.spacing, paddingTop: (StatusBar.currentHeight || 0) + fs.spacing, paddingBottom: fs.spacing * 0.75, borderBottomWidth: 1, borderBottomColor: theme.border },
    settingsBackButton: { width: fs.spacing * 2.5, height: fs.spacing * 2.5, borderRadius: 12, backgroundColor: theme.surfaceRaised, alignItems: 'center', justifyContent: 'center', marginRight: fs.spacing * 0.625 },
    settingsBackIcon: { fontSize: fs.base * 1.375, color: theme.textSecondary },
    settingsHeaderTitle: { fontSize: fs.large * 1.15, fontWeight: '700', color: theme.text },
    settingsBody: { flex: 1 },
    settingsBodyContent: { paddingHorizontal: fs.spacing * 1.25, paddingTop: fs.spacing * 0.5, paddingBottom: fs.spacing * 2.125 },
    settingsHero: { alignItems: 'center', paddingTop: fs.spacing * 0.875, paddingBottom: fs.spacing * 0.5, marginBottom: fs.spacing },
    heroAppIcon: { width: fs.iconSize * 3.8, height: fs.iconSize * 3.8, borderRadius: 26, backgroundColor: '#FFFFFF', borderWidth: 0, marginBottom: fs.spacing * 0.75, alignItems: 'center', justifyContent: 'center', padding: fs.spacing },
    heroTitle: { fontSize: fs.large * 1.15, fontWeight: '700', color: theme.text },
    heroAuthor: { fontSize: fs.small, color: theme.textMuted, marginTop: fs.spacing * 0.25 },
    heroVersion: { fontSize: fs.small * 0.846, color: theme.textMuted, marginTop: fs.spacing * 0.125 },
    settingsSectionTitle: { fontSize: fs.small, fontWeight: '700', color: theme.textMuted, letterSpacing: 0.8, marginBottom: fs.spacing * 0.625, marginTop: fs.spacing * 1.375 },
    cardStack: { gap: fs.spacing * 0.625 },
    aboutCard: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: theme.surface, borderRadius: 16, paddingHorizontal: fs.spacing, paddingVertical: fs.spacing * 0.875, minHeight: 70 * fs.fontScale },
    aboutCardTextWrap: { flex: 1, marginRight: fs.spacing * 0.5, minWidth: 0 },
    aboutCardTitle: { fontSize: fs.base, fontWeight: '600', color: theme.text },
    aboutCardDesc: { fontSize: fs.small, color: theme.textMuted, marginTop: fs.spacing * 0.125, lineHeight: fs.small * 1.3 },
    interfaceIconWrap: {
      width: fs.spacing * 2.625, height: fs.spacing * 2.625, borderRadius: 12,
      backgroundColor: theme.background,
      alignItems: 'center', justifyContent: 'center',
      marginRight: fs.spacing * 0.75,
    },
    interfaceIconEmoji: { fontSize: fs.iconSize * 0.77 },
    githubIconWrap: {
      width: fs.spacing * 2.625, height: fs.spacing * 2.625, borderRadius: 12,
      backgroundColor: theme.background,
      alignItems: 'center', justifyContent: 'center',
      marginRight: fs.spacing * 0.75,
    },
    settingsChevron: { fontSize: fs.base * 1.5, color: theme.textMuted, marginLeft: 'auto', flexShrink: 0 },
    pickerLayer: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 20, alignItems: 'center', justifyContent: 'center', paddingHorizontal: fs.spacing * 1.5 },
    pickerBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0, 0, 0, 0.45)' },
    pickerCard: { width: '100%', maxWidth: 360, backgroundColor: theme.surface, borderRadius: 20, borderWidth: 1, borderColor: theme.border, padding: fs.spacing * 1.125 },
    pickerTitle: { fontSize: fs.large * 1.15, fontWeight: '700', color: theme.text, marginBottom: fs.spacing * 0.75 },
    pickerOption: { flexDirection: 'row', alignItems: 'center', paddingVertical: fs.spacing * 0.6875 },
    radioOuter: { width: fs.spacing * 1.375, height: fs.spacing * 1.375, borderRadius: fs.spacing * 0.6875, borderWidth: 2, borderColor: theme.border, alignItems: 'center', justifyContent: 'center', marginRight: fs.spacing * 0.75 },
    radioInner: { width: fs.spacing * 0.625, height: fs.spacing * 0.625, borderRadius: fs.spacing * 0.3125 },
    pickerOptionTextWrap: { flex: 1 },
    pickerOptionLabel: { fontSize: fs.base, fontWeight: '600', color: theme.text },
    pickerOptionDesc: { fontSize: fs.small, color: theme.textMuted, marginTop: fs.spacing * 0.125 },
  });
