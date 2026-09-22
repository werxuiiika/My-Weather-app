import React, { useMemo } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, TouchableWithoutFeedback } from 'react-native';
import Animated, { LinearTransition } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from './ThemeContext';
import { useFontSize } from './FontSizeContext';
import { useTranslation } from 'react-i18next';
import { getPluralSelectedText } from './utils/plural';

export default function ConfirmDeleteModal({ visible, cityName, count, onCancel, onConfirm }) {
  const { theme } = useTheme();
  const fs = useFontSize();
  const { t } = useTranslation();

  // Adaptive density: single-city dialog is minimal, multi-city gets room
  // for the prominent count line. Height transitions animate via layout.
  const isMulti = count > 1;

  const styles = useMemo(() => StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: fs.spacing,
    },
    card: {
      width: '100%',
      maxWidth: isMulti ? 320 : 296,
      backgroundColor: theme.surface,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: theme.border,
      paddingVertical: fs.spacing * (isMulti ? 1 : 0.75),
      paddingHorizontal: fs.spacing * 1.125,
      alignItems: 'center',
    },
    iconCircle: {
      width: isMulti ? 44 : 36,
      height: isMulti ? 44 : 36,
      borderRadius: isMulti ? 22 : 18,
      backgroundColor: (theme.danger || '#FF453A') + '1A',
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: fs.spacing * (isMulti ? 0.625 : 0.375),
    },
    headerLabel: {
      fontSize: fs.small * (isMulti ? 1 : 0.95),
      fontWeight: '500',
      color: theme.textMuted,
      textAlign: 'center',
      marginBottom: fs.spacing * 0.25,
    },
    cityName: {
      fontSize: fs.large * (isMulti ? 1.1 : 0.95),
      fontWeight: '800',
      color: theme.text,
      textAlign: 'center',
      marginBottom: fs.spacing * (isMulti ? 1.125 : 0.75),
      lineHeight: fs.large * (isMulti ? 1.35 : 1.2),
      letterSpacing: 0.3,
    },
    buttonRow: {
      flexDirection: 'row',
      gap: fs.spacing * 0.5,
      width: '100%',
    },
    button: {
      flex: 1,
      paddingVertical: fs.spacing * 0.5,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    buttonText: {
      fontSize: fs.base * 0.875,
      fontWeight: '600',
    },
  }), [theme, fs, isMulti]);

  const handleConfirm = () => {
    onConfirm();
  };

  const handleCancel = () => {
    onCancel();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={handleCancel}
    >
      <TouchableWithoutFeedback onPress={handleCancel}>
        <View style={styles.backdrop}>
          <TouchableWithoutFeedback>
            <Animated.View
              style={styles.card}
              layout={LinearTransition.duration(220)}
            >
              <View style={styles.iconCircle}>
                <Ionicons name="trash-outline" size={Math.round((fs.iconSize || 24) * (isMulti ? 0.85 : 0.7))} color={theme.danger || '#FF453A'} />
              </View>
              <Text style={styles.headerLabel}>
                {isMulti ? t('cities.delete_multiple_question', 'Удалить выбранные города?') : t('cities.delete_question', 'Удалить город из списка?')}
              </Text>
              {isMulti ? (
                <Text style={styles.cityName} numberOfLines={2}>
                  {getPluralSelectedText(count, t)}
                </Text>
              ) : cityName ? (
                <Text style={styles.cityName} numberOfLines={2}>
                  {cityName}
                </Text>
              ) : null}
              <View style={styles.buttonRow}>
                <TouchableOpacity
                  style={[styles.button, { backgroundColor: theme.surfaceAlt }]}
                  onPress={handleCancel}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.buttonText, { color: theme.textMuted }]}>
                    {t('cities.cancel')}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.button, { backgroundColor: theme.danger || '#FF453A' }]}
                  onPress={handleConfirm}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.buttonText, { color: '#FFFFFF', fontWeight: '700' }]}>
                    {t('cities.delete')}
                  </Text>
                </TouchableOpacity>
              </View>
            </Animated.View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}
