import React, { useMemo } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, TouchableWithoutFeedback } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from './ThemeContext';
import { useFontSize } from './FontSizeContext';
import { useTranslation } from 'react-i18next';
import { getPluralSelectedText } from './utils/plural';

export default function ConfirmDeleteModal({ visible, cityName, count, onCancel, onConfirm }) {
  const { theme } = useTheme();
  const fs = useFontSize();
  const { t } = useTranslation();

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
      maxWidth: 320,
      backgroundColor: theme.surface,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: theme.border,
      paddingVertical: fs.spacing * 0.875,
      paddingHorizontal: fs.spacing * 1.125,
      alignItems: 'center',
    },
    iconCircle: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: (theme.danger || '#FF453A') + '1A',
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: fs.spacing * 0.5,
    },
    headerLabel: {
      fontSize: fs.small,
      fontWeight: '500',
      color: theme.textMuted,
      textAlign: 'center',
      marginBottom: fs.spacing * 0.25,
    },
    cityName: {
      fontSize: fs.large,
      fontWeight: '800',
      color: theme.text,
      textAlign: 'center',
      marginBottom: fs.spacing,
      lineHeight: fs.large * 1.25,
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
  }), [theme, fs]);

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
            <View style={styles.card}>
              <View style={styles.iconCircle}>
                <Ionicons name="trash-outline" size={Math.round((fs.iconSize || 24) * 0.8)} color={theme.danger || '#FF453A'} />
              </View>
              <Text style={styles.headerLabel}>
                {count > 1 ? t('cities.delete_multiple_question', 'Удалить выбранные города?') : t('cities.delete_question', 'Удалить город из списка?')}
              </Text>
              <Text style={styles.cityName} numberOfLines={2}>
                {count > 1 ? getPluralSelectedText(count, t) : cityName}
              </Text>
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
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}
