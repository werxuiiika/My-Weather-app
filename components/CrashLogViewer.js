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
import * as FileSystem from 'expo-file-system/legacy';
import {
  listInternalLogs,
  listDownloadLogs,
  readDownloadLog,
  deleteDownloadLog,
  ensureDownloadAccess,
  getSafDirUri,
  getInternalLogDir,
  testLogWrite,
} from '../utils/crashLogger';

const { StorageAccessFramework } = FileSystem;

export default function CrashLogViewer({ visible, onClose, theme, fs, onTestCrash }) {
  const [internalFiles, setInternalFiles] = useState([]);
  const [downloadFiles, setDownloadFiles] = useState([]);
  const [hasDownloadAccess, setHasDownloadAccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [expandedKey, setExpandedKey] = useState(null);
  const [contents, setContents] = useState({});
  const [loadingContent, setLoadingContent] = useState(null);
  const [selfTest, setSelfTest] = useState(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [internal, download, safUri] = await Promise.all([
        listInternalLogs(),
        listDownloadLogs(),
        getSafDirUri(),
      ]);
      setInternalFiles(internal);
      setDownloadFiles(download);
      setHasDownloadAccess(!!safUri);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (visible) {
      setExpandedKey(null);
      setContents({});
      setSelfTest(null);
      refresh();
    }
  }, [visible, refresh]);

  const readContent = async (file) => {
    if (file.location === 'download') {
      return readDownloadLog(file.path);
    }
    return FileSystem.readAsStringAsync(file.path);
  };

  const toggleExpand = async (file) => {
    const key = `${file.location}:${file.path}`;
    if (expandedKey === key) {
      setExpandedKey(null);
      return;
    }
    setExpandedKey(key);
    if (!contents[key]) {
      setLoadingContent(key);
      try {
        const text = await readContent(file);
        setContents((prev) => ({ ...prev, [key]: text }));
      } catch (e) {
        setContents((prev) => ({ ...prev, [key]: `Не удалось прочитать файл: ${e.message}` }));
      } finally {
        setLoadingContent(null);
      }
    }
  };

  const shareLog = async (file) => {
    try {
      const key = `${file.location}:${file.path}`;
      let text = contents[key];
      if (!text) text = await readContent(file);
      await Share.share({ message: `Crash log ${file.name}:\n\n${text}` });
    } catch (e) {}
  };

  const runSelfTest = async () => {
    setSelfTest({ running: true });
    const result = await testLogWrite();
    setSelfTest(result);
    if (result.ok) refresh();
  };

  const setupDownload = async () => {
    const uri = await ensureDownloadAccess();
    if (uri) {
      // Copy existing internal logs to Download so nothing is lost.
      try {
        for (const f of internalFiles) {
          const text = await FileSystem.readAsStringAsync(f.path);
          const base = f.name.replace(/\.txt$/, '');
          const dest = await StorageAccessFramework.createFileAsync(uri, base, 'text/plain');
          await StorageAccessFramework.writeAsStringAsync(dest, text);
        }
      } catch (e) {}
      refresh();
    } else {
      Alert.alert('Нет доступа', 'Не удалось получить доступ к папке Загрузки.');
    }
  };

  const clearInternal = () => {
    Alert.alert('Очистить внутренние логи?', `Будет удалено файлов: ${internalFiles.length}`, [
      { text: 'Отмена', style: 'cancel' },
      {
        text: 'Удалить',
        style: 'destructive',
        onPress: async () => {
          try {
            for (const f of internalFiles) {
              await FileSystem.deleteAsync(f.path, { idempotent: true });
            }
          } catch (e) {}
          refresh();
        },
      },
    ]);
  };

  const deleteOneDownload = async (file) => {
    try {
      await deleteDownloadLog(file.path);
    } catch (e) {}
    refresh();
  };

  const confirmTestCrash = () => {
    Alert.alert('Тестовый краш?', 'Приложение упадёт и запишет лог. Продолжить?', [
      { text: 'Отмена', style: 'cancel' },
      {
        text: 'Уронить',
        style: 'destructive',
        onPress: () => {
          if (onTestCrash) onTestCrash();
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
      maxHeight: '88%',
      paddingBottom: 24,
    },
    handle: { width: 48, height: 6, borderRadius: 3, backgroundColor: theme.border, alignSelf: 'center', marginTop: 10, marginBottom: 8 },
    title: { fontSize: fs.base, fontWeight: '700', color: theme.text, textAlign: 'center', marginBottom: 4 },
    subtitle: { fontSize: fs.small, color: theme.textMuted, textAlign: 'center', marginBottom: 10, paddingHorizontal: 16 },
    sectionTitle: { fontSize: fs.small, fontWeight: '700', color: theme.textMuted, paddingHorizontal: 16, marginTop: 8, marginBottom: 6 },
    list: { paddingHorizontal: 16 },
    fileCard: { backgroundColor: theme.surface, borderRadius: 12, padding: 12, marginBottom: 8 },
    fileName: { fontSize: fs.small, fontWeight: '600', color: theme.text },
    fileMeta: { fontSize: fs.small * 0.85, color: theme.textMuted, marginTop: 2 },
    row: { flexDirection: 'row', marginTop: 8, flexWrap: 'wrap' },
    btn: { backgroundColor: theme.accent, borderRadius: 10, paddingVertical: 8, paddingHorizontal: 12, marginRight: 8, marginBottom: 4 },
    btnText: { color: '#fff', fontSize: fs.small, fontWeight: '600' },
    btnGhost: { backgroundColor: theme.surfaceRaised, borderRadius: 10, paddingVertical: 8, paddingHorizontal: 12, marginRight: 8, marginBottom: 4 },
    btnGhostText: { color: theme.text, fontSize: fs.small, fontWeight: '600' },
    btnDangerText: { color: '#dc2626', fontSize: fs.small, fontWeight: '600' },
    content: { fontSize: fs.small * 0.85, color: theme.text, marginTop: 8, backgroundColor: theme.background, borderRadius: 8, padding: 8 },
    empty: { fontSize: fs.base, color: theme.textMuted, textAlign: 'center', marginVertical: 12, paddingHorizontal: 16 },
    selfTestOk: { fontSize: fs.small, color: '#16a34a', textAlign: 'center', paddingHorizontal: 16, marginBottom: 6 },
    selfTestFail: { fontSize: fs.small, color: '#dc2626', textAlign: 'center', paddingHorizontal: 16, marginBottom: 6 },
    footer: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 16, marginTop: 12 },
  });

  if (!visible) return null;

  const renderFile = (file) => {
    const key = `${file.location}:${file.path}`;
    return (
      <View key={key} style={styles.fileCard}>
        <Text style={styles.fileName}>{file.name}</Text>
        <Text style={styles.fileMeta}>
          {file.size ? `${(file.size / 1024).toFixed(1)} KB · ` : ''}
          {file.location === 'download' ? 'Загрузки' : 'Внутренние'}
          {file.mtime ? ` · ${new Date(file.mtime * 1000).toLocaleString()}` : ''}
        </Text>
        <View style={styles.row}>
          <TouchableOpacity style={styles.btnGhost} onPress={() => toggleExpand(file)}>
            <Text style={styles.btnGhostText}>{expandedKey === key ? 'Скрыть' : 'Показать'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.btn} onPress={() => shareLog(file)}>
            <Text style={styles.btnText}>Поделиться</Text>
          </TouchableOpacity>
          {file.location === 'download' && (
            <TouchableOpacity style={styles.btnGhost} onPress={() => deleteOneDownload(file)}>
              <Text style={styles.btnDangerText}>Удалить</Text>
            </TouchableOpacity>
          )}
        </View>
        {expandedKey === key &&
          (loadingContent === key ? (
            <ActivityIndicator size="small" color={theme.accent} style={{ marginTop: 8 }} />
          ) : (
            <Text style={styles.content} selectable>
              {contents[key] || ''}
            </Text>
          ))}
      </View>
    );
  };

  return (
    <Modal transparent visible animationType="slide" statusBarTranslucent onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay} />
      </TouchableWithoutFeedback>
      <View style={styles.sheet}>
        <View style={styles.handle} />
        <Text style={styles.title}>Логи ошибок</Text>
        <Text style={styles.subtitle}>Файлы сохраняются при каждом вылете приложения</Text>
        {selfTest && !selfTest.running && (
          selfTest.ok ? (
            <Text style={styles.selfTestOk}>Запись работает ✓ ({selfTest.dir})</Text>
          ) : (
            <Text style={styles.selfTestFail}>Запись НЕ работает: {selfTest.error}</Text>
          )
        )}
        {loading ? (
          <ActivityIndicator size="large" color={theme.accent} style={{ marginVertical: 24 }} />
        ) : (
          <ScrollView style={styles.list}>
            <Text style={styles.sectionTitle}>ЗАГРУЗКИ / WeatherLogs (доступны через adb)</Text>
            {downloadFiles.length === 0 ? (
              <Text style={styles.empty}>
                {hasDownloadAccess
                  ? 'В Загрузках логов пока нет'
                  : 'Папка Загрузки не подключена — нажмите «Подключить Загрузки» ниже'}
              </Text>
            ) : (
              downloadFiles.map(renderFile)
            )}
            <Text style={styles.sectionTitle}>ВНУТРЕННИЕ (только в приложении)</Text>
            {internalFiles.length === 0 ? (
              <Text style={styles.empty}>Внутренних логов нет</Text>
            ) : (
              internalFiles.map(renderFile)
            )}
            <Text style={styles.sectionTitle}>ДИАГНОСТИКА</Text>
            <Text style={[styles.fileMeta, { paddingHorizontal: 0, marginBottom: 8 }]}>
              Внутренняя папка: {getInternalLogDir() || 'недоступна'}
            </Text>
            <View style={styles.row}>
              <TouchableOpacity style={styles.btnGhost} onPress={runSelfTest} disabled={selfTest?.running}>
                <Text style={styles.btnGhostText}>
                  {selfTest?.running ? 'Проверка…' : 'Тест записи'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.btn} onPress={setupDownload}>
                <Text style={styles.btnText}>
                  {hasDownloadAccess ? 'Синхронизировать в Загрузки' : 'Подключить Загрузки'}
                </Text>
              </TouchableOpacity>
              {onTestCrash ? (
                <TouchableOpacity style={styles.btnGhost} onPress={confirmTestCrash}>
                  <Text style={styles.btnDangerText}>Тест краш</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          </ScrollView>
        )}
        <View style={styles.footer}>
          <TouchableOpacity style={styles.btnGhost} onPress={onClose}>
            <Text style={styles.btnGhostText}>Закрыть</Text>
          </TouchableOpacity>
          {internalFiles.length > 0 && (
            <TouchableOpacity style={styles.btnGhost} onPress={clearInternal}>
              <Text style={styles.btnDangerText}>Очистить внутренние</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Modal>
  );
}
