import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
  runOnJS,
  Layout,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';

export default function DraggableCityCard({
  item,
  index,
  isSelectionMode,
  isSelected,
  theme,
  fs,
  t,
  onSelectToggle,
  onLongPressCity,
  dragOffset,
  activeIndex,
  onReorder,
  itemCount,
}) {
  const safeItem = { ...item, isNight: item?.isNight ?? false };
  const isDarkText = !safeItem.isNight;
  const mainText = isDarkText ? '#1e293b' : '#FFFFFF';
  const subText = isDarkText ? 'rgba(30, 41, 59, 0.75)' : 'rgba(255, 255, 255, 0.8)';
  const minMaxColor = isDarkText ? 'rgba(30, 41, 59, 0.7)' : 'rgba(255, 255, 255, 0.7)';

  const styles = useMemo(() => StyleSheet.create({
    cardContainer: {
      borderRadius: 28,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: 'rgba(255, 255, 255, 0.15)',
      borderTopColor: 'rgba(255, 255, 255, 0.35)',
      elevation: 8,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.25,
      shadowRadius: 12,
      marginBottom: fs.spacing,
    },
    cardBackground: {
      borderRadius: 28,
      overflow: 'hidden',
      width: '100%',
    },
    cardBody: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: fs.spacing * 1.25,
      paddingVertical: fs.spacing,
      minHeight: fs.cardHeight * 1.375,
    },
    cardLeft: {
      flex: 0.65,
      justifyContent: 'center',
      paddingRight: fs.spacing * 0.5,
    },
    cardRight: {
      flex: 0.35,
      alignItems: 'flex-end',
      justifyContent: 'center',
    },
    cityName: {
      fontSize: fs.large * 1.1,
      fontWeight: '800',
      color: '#FFFFFF',
      marginBottom: 4,
      letterSpacing: 0.3,
    },
    cityCondition: {
      fontSize: fs.small * 1.05,
      color: 'rgba(255, 255, 255, 0.8)',
      fontWeight: '500',
      flexShrink: 1,
    },
    conditionRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    cityTemp: {
      fontSize: fs.large * 1.95,
      fontWeight: '700',
      color: '#FFFFFF',
      lineHeight: fs.large * 2.15,
      textAlign: 'right',
      fontVariant: ['tabular-nums'],
    },
    tempRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
    },
    tempDegree: {
      fontSize: fs.large * 1.1,
      fontWeight: '700',
      marginTop: 4,
      marginLeft: 1,
    },
    cityMinMax: {
      fontSize: fs.small * 1.25,
      color: 'rgba(255, 255, 255, 0.7)',
      marginTop: 2,
      fontWeight: '600',
      textAlign: 'right',
      fontVariant: ['tabular-nums'],
    },
    checkbox: {
      width: 24,
      height: 24,
      borderRadius: 12,
      borderWidth: 2,
      alignItems: 'center',
      justifyContent: 'center',
    },
    dragHandle: {
      padding: 8,
      marginRight: 8,
      alignItems: 'center',
      justifyContent: 'center',
    },
  }), [theme, fs]);

  const cardColor = safeItem.weathercode !== undefined
    ? getItemColor(safeItem.weathercode, safeItem.isNight)
    : '#4a6b8a';
  const weatherIcon = safeItem.weathercode !== undefined
    ? getWeatherIcon(safeItem.weathercode, safeItem.isNight)
    : 'cloudy';

  // Real slot height: min card height + bottom margin (matches styles above).
  const stride = fs.cardHeight * 1.375 + fs.spacing;

  const panGesture = useMemo(() => Gesture.Pan()
    .onStart(() => {
      'worklet';
      activeIndex.value = index;
      dragOffset.value = 0;
    })
    .onUpdate((e) => {
      'worklet';
      dragOffset.value = e.translationY;
    })
    .onEnd(() => {
      'worklet';
      const offset = dragOffset.value;
      const targetIndex = Math.round(offset / stride);
      const newIndex = index + targetIndex;
      const shouldReorder =
        newIndex >= 0 && newIndex < itemCount && newIndex !== index;
      // Glide everything back first: the dragged card AND the shifted
      // neighbours all follow dragOffset continuously, so keeping the active
      // state until the animation finishes avoids any snap. Only then drop
      // the active state and commit the swap — the Layout animation carries
      // the final settle softly.
      dragOffset.value = withTiming(
        0,
        { duration: 220, easing: Easing.out(Easing.cubic) },
        (finished) => {
          'worklet';
          if (!finished) return;
          activeIndex.value = -1;
          if (shouldReorder) {
            runOnJS(onReorder)(index, newIndex);
          }
        }
      );
    }),
    [index, itemCount, onReorder, stride]);

  const animatedStyle = useAnimatedStyle(() => {
    const active = activeIndex.value === index;
    const draggingIdx = activeIndex.value;
    const offset = dragOffset.value;

    let translateY = 0;
    let scale = 1;
    let zIndex = 1;
    let opacity = 1;
    let shadowOpacityVal = 0;
    let shadowRadiusVal = 12;

    if (active) {
      translateY = offset;
      scale = 1.05;
      zIndex = 1000;
      opacity = 0.95;
      shadowOpacityVal = 0.4;
      shadowRadiusVal = 20;
    } else if (draggingIdx >= 0 && draggingIdx !== index) {
      const activePos = draggingIdx * stride;
      const myPos = index * stride;
      const targetPos = activePos + offset;
      const delta = targetPos - myPos;

      if (delta > 0 && delta < stride) {
        translateY = -stride + delta;
      } else if (delta < 0 && delta > -stride) {
        translateY = stride + delta;
      }
    }

    return {
      transform: [
        { translateY },
        { scale },
      ],
      zIndex,
      opacity,
      // iOS shadow…
      shadowOpacity: shadowOpacityVal,
      shadowRadius: shadowRadiusVal,
      // …Android shadow (shadow* props are iOS-only; Android draws the card
      // above its siblings and renders the lift shadow only via elevation).
      elevation: active ? 20 : 8,
    };
  });

  const canSelectItem = isSelectionMode;

  return (
    <Animated.View
      style={[styles.cardContainer, animatedStyle]}
      layout={Layout.springify().damping(20).stiffness(200)}
    >
      <Pressable
        onPress={() => onSelectToggle(safeItem.id, safeItem.name, index)}
        onLongPress={() => onLongPressCity?.(safeItem.id, safeItem.name, index)}
        delayLongPress={400}
      >
      <View
        style={[styles.cardBackground, { backgroundColor: cardColor }]}
      >
        <View
          style={[styles.cardBody, canSelectItem ? { paddingLeft: fs.spacing * 0.75 } : {}]}
        >
          {canSelectItem && (
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <GestureDetector gesture={panGesture}>
                <View style={styles.dragHandle}>
                  <Ionicons name="menu" size={22} color={subText} />
                </View>
              </GestureDetector>
              <Pressable
                style={[
                  styles.checkbox,
                  { borderColor: mainText },
                  isSelected && { backgroundColor: theme.tint || '#3a7bd5', borderColor: theme.tint || '#3a7bd5' },
                ]}
                hitSlop={8}
                 onPress={() => onSelectToggle(safeItem.id, safeItem.name, index)}
              >
                {isSelected && <Ionicons name="checkmark" size={16} color="#FFFFFF" />}
              </Pressable>
            </View>
          )}
          <View style={[styles.cardLeft, canSelectItem ? { flex: 0.5 } : {}]}>
            <Text
              style={[styles.cityName, { color: mainText }]}
              numberOfLines={1}
              ellipsizeMode="tail"
              adjustsFontSizeToFit
              minimumFontScale={0.65}
            >
              {safeItem.name}
            </Text>
            <View style={styles.conditionRow}>
              <Ionicons name={weatherIcon} size={15} color={isDarkText ? 'rgba(30, 41, 59, 0.75)' : 'rgba(255, 255, 255, 0.85)'} />
              <Text style={[styles.cityCondition, { color: subText }]} numberOfLines={1} ellipsizeMode="tail">
                {safeItem.condition || t('condition.cloudy')}
              </Text>
            </View>
          </View>
          <View style={styles.cardRight}>
            <View style={styles.tempRow}>
            <Text style={[styles.cityTemp, { color: mainText }]}>{safeItem.temp || '0'}</Text>
                <Text style={[styles.tempDegree, { color: mainText }]}>°</Text>
              </View>
              <Text style={[styles.cityMinMax, { color: minMaxColor }]}>{safeItem.minMax || ''}</Text>
          </View>
        </View>
      </View>
      </Pressable>
    </Animated.View>
  );
}

const getItemColor = (code, isNight) => {
  if (isNight) return '#232f45';
  const c = code ?? 2;
  if (c === 0) return '#7cc0ee';
  if (c <= 3) return '#b9c9d8';
  if (c <= 48) return '#c3cad4';
  if (c <= 67) return '#7d9fc4';
  if (c <= 77) return '#cfe3f7';
  if (c <= 82) return '#8ba9cc';
  return '#9aa0c3';
};

const getWeatherIcon = (code, isNight) => {
  const c = code ?? 2;
  if (c === 0) return isNight ? 'moon' : 'sunny';
  if (c <= 3) {
    if (c === 1) return isNight ? 'cloudy-night' : 'partly-sunny';
    return 'cloudy';
  }
  if (c <= 48) return 'cloudy';
  if (c <= 67) return 'rainy';
  if (c <= 77) return 'snow';
  if (c <= 82) return 'rainy';
  return 'thunderstorm';
};
