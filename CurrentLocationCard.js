import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// Top card for the device's geolocation. Rendered ONLY when coordinates were
// successfully resolved (location !== null). Deliberately NOT a DraggableCityCard:
// no drag handle, no checkbox, no delete — it is not part of the saved list.
export default function CurrentLocationCard({ item, theme, fs, t, onPress, style }) {
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
    pinWrap: {
      width: fs.spacing * 2.5,
      height: fs.spacing * 2.5,
      borderRadius: 12,
      backgroundColor: 'rgba(255, 255, 255, 0.2)',
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: fs.spacing * 0.75,
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
    locationBadge: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    locationBadgeText: {
      fontSize: fs.small * 1.05,
      fontWeight: '500',
      marginLeft: 4,
      flexShrink: 1,
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
  }), [theme, fs]);

  const cardColor = safeItem.weathercode !== undefined
    ? getItemColor(safeItem.weathercode, safeItem.isNight)
    : '#4a6b8a';

  return (
    <View style={[styles.cardContainer, style]}>
      <Pressable onPress={onPress} disabled={!onPress}>
        <View style={[styles.cardBackground, { backgroundColor: cardColor }]}>
          <View style={styles.cardBody}>
            <View style={styles.pinWrap}>
              <Ionicons name="location-sharp" size={22} color={subText} />
            </View>
            <View style={styles.cardLeft}>
              <Text
                style={[styles.cityName, { color: mainText }]}
                numberOfLines={1}
                ellipsizeMode="tail"
                adjustsFontSizeToFit
                minimumFontScale={0.65}
              >
                {safeItem.name}
              </Text>
              <View style={styles.locationBadge}>
                <Ionicons
                  name="compass"
                  size={15}
                  color={isDarkText ? 'rgba(30, 41, 59, 0.75)' : 'rgba(255, 255, 255, 0.85)'}
                />
                <Text style={[styles.locationBadgeText, { color: subText }]} numberOfLines={1} ellipsizeMode="tail">
                  {t('cities.current_location')}
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
    </View>
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
