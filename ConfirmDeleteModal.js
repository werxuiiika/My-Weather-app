import React, { useMemo } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, TouchableWithoutFeedback } from 'react-native';
import { useTheme } from './ThemeContext';
import { useFontSize } from './FontSizeContext';
import { useTranslation } from 'react-i18next';

export default function ConfirmDeleteModal({ visible, cityName, onCancel, onConfirm }) {
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
      maxWidth: 360,
      backgroundColor: theme.surface,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: theme.border,
      paddingVertical: fs.spacing * 1.25,
      paddingHorizontal: fs.spacing * 1.5,
      alignItems: 'center',
    },
    question: {
      fontSize: fs.base * 1.125,
      fontWeight: '600',
      color: theme.text,
      textAlign: 'center',
      marginBottom: fs.spacing * 1.25,
      lineHeight: fs.base * 1.5,
    },
    buttonRow: {
      flexDirection: 'row',
      gap: fs.spacing * 0.75,
      width: '100%',
    },
    button: {
      flex: 1,
      paddingVertical: fs.spacing * 0.75,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
    },
    buttonText: {
      fontSize: fs.base * 0.95,
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
              <Text style={styles.question}>
                {t('cities.delete_message', { name: cityName })}
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
