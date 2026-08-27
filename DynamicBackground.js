import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet } from 'react-native';

const BASE_COLOR = '#0f172a';

const BG_CLEAR_DAY = '#1e3a8a';
const BG_CLEAR_NIGHT = '#020617';
const BG_CLOUDY = '#1e293b';
const BG_FOG = '#64748b';
const BG_RAIN = '#334155';
const BG_SNOW = '#475569';

const COLOR_INDEX_MAP = [
  BASE_COLOR,
  BG_CLEAR_DAY,
  BG_CLEAR_NIGHT,
  BG_CLOUDY,
  BG_FOG,
  BG_RAIN,
  BG_SNOW,
];

function getTargetColorIndex(weatherCode, isDay, isEnabled) {
  if (!isEnabled || weatherCode == null) return 0;
  if (weatherCode === 0) return isDay ? 1 : 2;
  if (weatherCode <= 3) return 3;
  if (weatherCode <= 48) return 4;
  if (weatherCode <= 67) return 5;
  if (weatherCode <= 77) return 6;
  if (weatherCode <= 82) return 5;
  if (weatherCode <= 86) return 6;
  return 5;
}

function DynamicBackground({ weatherCode, isDay, isEnabled }) {
  const animValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const target = getTargetColorIndex(weatherCode, isDay, isEnabled);
    Animated.timing(animValue, {
      toValue: target,
      duration: 800,
      easing: Easing.out(Easing.quad),
      useNativeDriver: false,
    }).start();
  }, [weatherCode, isDay, isEnabled, animValue]);

  const backgroundColor = animValue.interpolate({
    inputRange: [0, 1, 2, 3, 4, 5, 6],
    outputRange: COLOR_INDEX_MAP,
  });

  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.background, { backgroundColor }]}
    />
  );
}

const styles = StyleSheet.create({
  background: {
    position: 'absolute',
    inset: 0,
    zIndex: -1,
  },
});

export default DynamicBackground;
