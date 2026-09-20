import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
  ScrollView,
  ActivityIndicator,
  Share,
  Alert,
  StyleSheet,
} from 'react-native';
import * as FileSystem from 'expo-file-system';
import { getLogDirs } from '../utils/crashLogger';

export async function getCrashLogFiles() {
  const files = [];
  for (const { dir: logsDir, location } of getLogDirs()) {
    try {
      const dirInfo = await FileSystem.getInfoAsync(logsDir);
      if (!dirInfo.exists) continue;
      const names = await FileSystem.readDirectoryAsync(logsDir);
      for (const name of names) {
        if (!name.endsWith('.txt')) continue;
        try {
          const info = await FileSystem.getInfoAsync(`${logsDir}/${name}`);
          files.push({ name, path: `${logsDir}/${name}`, size: info.size ?? 0, mtime: info.modificationTime ?? 0, location });
        } catch (e) {}
      }
    } catch (e) {}
  }
  files.sort((a, b) => (b.mtime || 0) - (a.mtime || 0) || (a.name < b.name ? 1 : -1));
  return files;
}

export default function CrashLogViewer({ visible, onClose, theme, fs }) {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [expandedName, setExpandedName] = useState(null);
  const [contents, setContents] = useState({});
  const [loadingContent, setLoadingContent] = useState(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setFiles(await getCrashLogFiles());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (visible) {
      setExpandedName(null);
      setContents({});
      refresh();
    }
  }, [visible, refresh]);

  const toggleExpand = async (file) => {
    if (expandedName === file.name) {
      setExpandedName(null);
      return;
    }
    setExpandedName(file.name);
    if (!contents[file.name]) {
      setLoadingContent(file.name);
      try {
        const text = await FileSystem.readAsStringAsync(file.path);
        setContents((prev) => ({ ...prev, [file.name]: text }));
      } catch (e) {
        setContents((prev) => ({ ...prev, [file.name]: `Не удалось прочитать файл: ${e.message}` }));
      } finally {
        setLoadingContent(null);
      }
    }
  };

  const shareLog = async (file) => {
    try {
      let text = contents[file.name];
      if (!text) {
        text = await FileSystem.readAsStringAsync(file.path);
      }
      await Share.share({ message: `Crash log ${file.name}:\n\n${text}` });
    } catch (e) {}
  };

  const clearLogs = () => {
    Alert.alert('Очистить логи?', `Будет удалено файлов: ${files.length}`, [
      { text: 'Отмена', style: 'cancel' },
      {
        text: 'Удалить',
        style: 'destructive',
        onPress: async () => {
          try {
            for (const { dir } of getLogDirs()) {
              try {
                const names = await FileSystem.readDirectoryAsync(dir);
                for (const name of names) {
                  if (name.endsWith('.txt')) {
                    await FileSystem.deleteAsync(`${dir}/${name}`, { idempotent: true });
                  }
                }
              } catch (e) {}
            }
          } catch (e) {}
          setFiles([]);
          setContents({});
          setExpandedName(null);
        },
      },
    ]);
  };

  const styles = StyleSheet.create({
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
    sheet: {
      backgroundColor: theme.background,
      borderTopLeftRadius: 22,
      borderTopRightRadius: 22,
      maxHeight: '85%',
      paddingBottom: 24,
    },
    handle: { width: 48, height: 6, borderRadius: 3, backgroundColor: theme.border, alignSelf: 'center', marginTop: 10, marginBottom: 8 },
    title: { fontSize: fs.base, fontWeight: '700', color: theme.text, textAlign: 'center', marginBottom: 4 },
    subtitle: { fontSize: fs.small, color: theme.textMuted, textAlign: 'center', marginBottom: 10, paddingHorizontal: 16 },
    list: { paddingHorizontal: 16 },
    fileCard: { backgroundColor: theme.surface, borderRadius: 12, padding: 12, marginBottom: 8 },
    fileName: { fontSize: fs.small, fontWeight: '600', color: theme.text },
    fileMeta: { fontSize: fs.small * 0.85, color: theme.textMuted, marginTop: 2 },
    row: { flexDirection: 'row', marginTop: 8 },
    btn: { backgroundColor: theme.accent, borderRadius: 10, paddingVertical: 8, paddingHorizontal: 12, marginRight: 8 },
    btnText: { color: '#fff', fontSize: fs.small, fontWeight: '600' },
    btnGhost: { backgroundColor: theme.surfaceRaised, borderRadius: 10, paddingVertical: 8, paddingHorizontal: 12 },
    btnGhostText: { color: theme.text, fontSize: fs.small, fontWeight: '600' },
    content: { fontSize: fs.small * 0.85, color: theme.text, marginTop: 8, backgroundColor: theme.background, borderRadius: 8, padding: 8 },
    empty: { fontSize: fs.base, color: theme.textMuted, textAlign: 'center', marginVertical: 24 },
    footer: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 16, marginTop: 12 },
  });

  if (!visible) return null;

  return (
    <Modal transparent visible animationType="slide" statusBarTranslucent onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay} />
      </TouchableWithoutFeedback>
      <View style={styles.sheet}>
        <View style={styles.handle} />
        <Text style={styles.title}>Логи ошибок</Text>
        <Text style={styles.subtitle}>Файлы сохраняются при каждом вылете приложения</Text>
        {loading ? (
          <ActivityIndicator size="large" color={theme.accent} style={{ marginVertical: 24 }} />
        ) : files.length === 0 ? (
          <Text style={styles.empty}>Логов пока нет — приложение не вылетало</Text>
        ) : (
          <ScrollView style={styles.list}>
            {files.map((file) => (
              <View key={file.name} style={styles.fileCard}>
                <Text style={styles.fileName}>{file.name}</Text>
                <Text style={styles.fileMeta}>
                  {(file.size / 1024).toFixed(1)} KB
                  {file.location === 'external' ? ' · внешняя' : ' · внутренняя'}
                  {file.mtime ? ` · ${new Date(file.mtime * 1000).toLocaleString()}` : ''}
                </Text>
                <View style={styles.row}>
                  <TouchableOpacity style={styles.btnGhost} onPress={() => toggleExpand(file)}>
                    <Text style={styles.btnGhostText}>{expandedName === file.name ? 'Скрыть' : 'Показать'}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.btn} onPress={() => shareLog(file)}>
                    <Text style={styles.btnText}>Поделиться</Text>
                  </TouchableOpacity>
                </View>
                {expandedName === file.name && (
                  loadingContent === file.name ? (
                    <ActivityIndicator size="small" color={theme.accent} style={{ marginTop: 8 }} />
                  ) : (
                    <Text style={styles.content} selectable>{contents[file.name] || ''}</Text>
                  )
                )}
              </View>
            ))}
          </ScrollView>
        )}
        <View style={styles.footer}>
          <TouchableOpacity style={styles.btnGhost} onPress={onClose}>
            <Text style={styles.btnGhostText}>Закрыть</Text>
          </TouchableOpacity>
          {files.length > 0 && (
            <TouchableOpacity style={styles.btnGhost} onPress={clearLogs}>
              <Text style={[styles.btnGhostText, { color: '#dc2626' }]}>Очистить логи</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Modal>
  );
}
