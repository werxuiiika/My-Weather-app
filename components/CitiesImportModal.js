// File list for cities backup import (Settings → "Import cities").
//
// Lists MyWeather-cities-*.json files from the app's own folder
// (MyWeatherApp/cities, same dir the export writes to). Tap a file →
// confirm dialog with the parsed city count → import replaces the current
// list and flags it for reload. Shell mirrors CrashLogViewer
// (bottom sheet + overlay tap).
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
  ScrollView,
  ActivityIndicator,
  Alert,
  StyleSheet,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system/legacy';
import {
  listBackupFiles,
  importCitiesFromUri,
  deleteBackupFile,
} from '../utils/citiesBackup';

export default function CitiesImportModal({ visible, onClose, theme, fs, onImported }) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [working, setWorking] = useState(false);

  const refresh = async () => {
    setLoading(true);
    try {
      setFiles(await listBackupFiles());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (visible) refresh();
  }, [visible]);

  const confirmDeleteFile = (file) => {
    Alert.alert(t('backupDeleteTitle'), t('backupDeleteMsg', { name: file.name }), [
      { text: t('cancel'), style: 'cancel' },
      {
        text: t('backupDelete'),
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteBackupFile(file.path);
            refresh();
          } catch (e) {
            Alert.alert(t('backupFailedTitle'), t('backupBadFile'));
          }
        },
      },
    ]);
  };

  const confirmImport = async (path) => {
    if (working) return;
    setWorking(true);
    try {
      // Parse first so the confirm dialog states the real city count.
      const text = await FileSystem.readAsStringAsync(path);
      let parsed;
      try {
        parsed = JSON.parse(text);
      } catch (e) {
        Alert.alert(t('backupFailedTitle'), t('backupBadFile'));
        return;
      }
      const arr = Array.isArray(parsed) ? parsed : parsed?.cities;
      const count = Array.isArray(arr) ? arr.length : 0;
      if (count === 0) {
        Alert.alert(t('backupFailedTitle'), t('backupBadFile'));
        return;
      }
      Alert.alert(t('backupReplaceTitle'), t('backupReplaceMsg', { count }), [
        { text: t('cancel'), style: 'cancel' },
        {
          text: t('backupImport'),
          onPress: async () => {
            try {
              const res = await importCitiesFromUri(path);
              onClose();
              onImported(res.count);
            } catch (e) {
              Alert.alert(t('backupFailedTitle'), t('backupBadFile'));
            }
          },
        },
      ]);
    } catch (e) {
      Alert.alert(t('backupFailedTitle'), t('backupBadFile'));
    } finally {
      setWorking(false);
    }
  };

  const styles = StyleSheet.create({
    overlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(0,0,0,0.5)',
    },
    sheet: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      maxHeight: '70%',
      backgroundColor: theme.surface,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      paddingHorizontal: 20,
      paddingTop: 8,
      // Footer taps near the screen bottom edge are eaten by the system
      // navigation bar (3-button nav / gestures). Lift the sheet above it.
      paddingBottom: 24 + insets.bottom,
    },
    titleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 12,
    },
    handle: {
      width: 40,
      height: 4,
      borderRadius: 2,
      backgroundColor: theme.border,
      alignSelf: 'center',
      marginBottom: 12,
    },
    title: {
      color: theme.text,
      fontSize: fs.large,
      fontWeight: '700',
      marginBottom: 12,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    fileName: {
      flex: 1,
      color: theme.text,
      fontSize: fs.base * 0.9,
      fontWeight: '600',
    },
    empty: {
      color: theme.textMuted,
      fontSize: fs.base * 0.9,
      textAlign: 'center',
      marginVertical: 20,
    },
    footer: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      marginTop: 14,
    },
    btnGhost: {
      borderRadius: 10,
      paddingVertical: 10,
      paddingHorizontal: 16,
      borderWidth: 1,
      borderColor: theme.border,
      marginRight: 8,
    },
    btnGhostText: {
      color: theme.text,
      fontWeight: '600',
      fontSize: fs.base * 0.9,
    },
  });

  // The null-gate below is load-bearing (mirrors CrashLogViewer): the
  // Modal's bare `visible` prop is always true, so without this gate the
  // sheet would be permanently mounted and no Close handler could ever
  // dismiss it — the stuck-modal bug. Never drop this gate.
  if (!visible) return null;

  return (
    <Modal transparent visible animationType="fade" statusBarTranslucent navigationBarTranslucent onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay} />
      </TouchableWithoutFeedback>
      <View style={styles.sheet}>
        <View style={styles.handle} />
        <View style={styles.titleRow}>
          <Text style={[styles.title, { flex: 1, marginBottom: 0 }]}>{t('backupFilesTitle')}</Text>
          <TouchableOpacity onPress={onClose} hitSlop={14} activeOpacity={0.6}>
            <Ionicons name="close" size={26} color={theme.textSecondary} />
          </TouchableOpacity>
        </View>
        {loading ? (
          <ActivityIndicator size="large" color={theme.accent} style={{ marginVertical: 24 }} />
        ) : files.length === 0 ? (
          <Text style={styles.empty}>{t('backupNoFiles')}</Text>
        ) : (
          <ScrollView>
            {files.map((f) => (
              <TouchableOpacity key={f.path} style={styles.row} onPress={() => confirmImport(f.path)} activeOpacity={0.6}>
                <Ionicons name="document-text-outline" size={22} color={theme.textSecondary} style={{ marginRight: 12 }} />
                <Text style={styles.fileName} numberOfLines={1} ellipsizeMode="middle">
                  {f.name}
                </Text>
                <TouchableOpacity onPress={() => confirmDeleteFile(f)} hitSlop={10} style={{ padding: 8 }} activeOpacity={0.6}>
                  <Ionicons name="trash-outline" size={20} color={theme.danger} />
                </TouchableOpacity>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
        <View style={styles.footer}>
          <TouchableOpacity style={styles.btnGhost} onPress={onClose} activeOpacity={0.6}>
            <Text style={styles.btnGhostText}>{t('netdiagClose')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}
