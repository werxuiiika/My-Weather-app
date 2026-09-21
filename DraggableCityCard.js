import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
  runOnJS,
  LinearTransition,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { saveDragTrace } from '../utils/dragTrace';

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
  activeId,
  setDragging,
  onReorder,
  itemCount,
  trace,
}) {
  const safeItem = { ...item, isNight: item?.isNight ?? false };
  // Stable per-instance identity for the active branch (see below).
  const itemId = safeItem.id ?? String(index);
  // Per-card swap displacement (overlap-and-swap model): 0 at rest,
  // exactly one slot (±stride) while the dragged card overlaps this one.
  const slotShift = useSharedValue(0);
  const slotTarget = useSharedValue(0);
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
      activeId.value = itemId;
      dragOffset.value = 0;
      trace.value = [];
      runOnJS(setDragging)(true);
    })
    .onUpdate((e) => {
      'worklet';
      // The dragged card slides OVER the static neighbours — their swap is
      // driven separately by the center-crossing rule in animatedStyle.
      dragOffset.value = e.translationY;
    })
    .onEnd(() => {
      'worklet';
      const offset = dragOffset.value;
      // 75% overlap rule (matches the visual swap threshold below): a full
      // slot counts once the finger carried the card three quarters in.
      const steps =
        offset >= 0
          ? Math.floor(offset / stride + 0.25)
          : -Math.floor(-offset / stride + 0.25);
      const newIndex = index + steps;
      const shouldReorder =
        newIndex >= 0 && newIndex < itemCount && newIndex !== index;
      if (trace.value.length < 1500) {
        trace.value.push(['e', Date.now(), Math.round(offset), shouldReorder ? newIndex : -1]);
      }
      if (shouldReorder) {
        // Commit FIRST so layouts update immediately: the dragged card then
        // glides exactly once from the finger to its new slot (layout
        // transition + residual transform easing out together). No
        // glide-back phase, no second motion.
        activeIndex.value = newIndex;
        runOnJS(onReorder)(index, newIndex);
      }
      // Single residual glide to rest for every card. NOTE: the data swap
      // was already committed above — committing again here would apply the
      // same (index, newIndex) splice to the NEW array, i.e. swap a second,
      // wrong pair (for adjacent swaps: swap straight back). One commit.
      dragOffset.value = withTiming(
        0,
        { duration: 220, easing: Easing.out(Easing.quad) },
        () => {
          'worklet';
          activeIndex.value = -1;
          activeId.value = null;
          runOnJS(setDragging)(false);
          const snapshot = trace.value;
          trace.value = [];
          runOnJS(saveDragTrace)(snapshot);
        }
      );
    }),
    [index, itemCount, onReorder, stride, itemId, setDragging]);

  const animatedStyle = useAnimatedStyle(() => {
    // Branch by stable item id, NOT by numeric index: at the commit frame
    // the data swaps (index props change) 1–3 frames before/after the shared
    // values settle, and an index-based branch would teleport the dragged
    // card between the active and neighbour branches for those frames —
    // that teleport is exactly the release flicker. The id survives reorder,
    // so the dragged card never leaves its branch mid-flight.
    const active = activeId.value === itemId;
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
      // Drag telemetry: one sample per frame (~60Hz) for offline analysis.
      if (trace.value.length < 1500) {
        trace.value.push(['s', Date.now(), Math.round(offset), 0]);
      }
    } else if (draggingIdx >= 0 && draggingIdx !== index) {
      const activePos = draggingIdx * stride;
      const myPos = index * stride;
      // Overlap & swap with hysteresis: step aside once the dragged card
      // covers 75% of this card, but step back only when the overlap drops
      // below 50%. The deadband between the two thresholds stops the swap
      // from chattering when the finger hovers right at the boundary —
      // that chatter is the visible jitter.
      const atRest = slotTarget.value === 0;
      let desired = atRest ? 0 : slotTarget.value;
      if (myPos > activePos) {
        if (atRest && offset > (myPos - activePos) - stride / 4) {
          desired = -stride; // card below the dragged one: move up
        } else if (!atRest && offset < (myPos - activePos) - stride / 2) {
          desired = 0;
        }
      } else if (myPos < activePos) {
        if (atRest && offset < (myPos - activePos) + stride / 4) {
          desired = stride; // card above the dragged one: move down
        } else if (!atRest && offset > (myPos - activePos) + stride / 2) {
          desired = 0;
        }
      }
      if (slotTarget.value !== desired) {
        slotTarget.value = desired;
        slotShift.value = withTiming(desired, { duration: 200, easing: Easing.out(Easing.quad) });
        if (trace.value.length < 1500) {
          trace.value.push(['x', Date.now(), index, desired > 0 ? 1 : -1]);
        }
      }
      translateY = slotShift.value;
    } else if (slotTarget.value !== 0) {
      // No active drag — ease back to rest (covers release frames).
      slotTarget.value = 0;
      slotShift.value = withTiming(0, { duration: 200, easing: Easing.out(Easing.quad) });
      translateY = slotShift.value;
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
      layout={LinearTransition.duration(220).easing(Easing.out(Easing.quad))}
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
