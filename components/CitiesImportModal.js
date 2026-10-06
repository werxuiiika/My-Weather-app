// Backup bottom sheet (Settings → "Резервная копия").
//
// Primary "Export now" action on top plus the MyWeather-cities-*.json list
// from the app's own folder (MyWeatherApp/cities). Tap a file → confirm
// dialog with the parsed city count → import replaces the current list
// and flags it for reload.
//
// Dismiss: X button, overlay tap, or swipe-down on the header zone
// (raw touch events + Animated, list scrolling untouched). All dialogs go
// through the parent-hosted CustomAlert (a nested Modal mispositions on
// some MIUI builds) — the system Alert renders light and breaks dark
// theme. Shell mirrors CrashLogViewer (bottom sheet + overlay tap).
import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
  ScrollView,
  ActivityIndicator,
  Animated,
  Dimensions,
  StyleSheet,
} from 'react-native';

// Definite overlay height. The modal content host on some MIUI builds
// measures children wrap-content: top:0+bottom:0 of an EMPTY absolutely
// positioned view can't resolve then (measured 394x0 on device), and
// minHeight doesn't save it. An explicit height can't collapse.
const DISPLAY_H = (() => {
  try {
    const w = Dimensions.get('window')?.height || 0;
    const s = Dimensions.get('screen')?.height || 0;
    return Math.max(w, s) || 800;
  } catch (e) {
    return 800;
  }
})();
const DISPLAY_W = (() => {
  try {
    const w = Dimensions.get('window')?.width || 0;
    const s = Dimensions.get('screen')?.width || 0;
    return Math.max(w, s) || 400;
  } catch (e) {
    return 400;
  }
})();
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system/legacy';
import {
  listBackupFiles,
  importCitiesFromUri,
  deleteBackupFile,
  exportCities,
} from '../utils/citiesBackup';
export default function CitiesImportModal({ visible, onClose, theme, fs, onImported, showAlert, hideAlert, menuStyle }) {
  // Presentation follows the global menu style: bottom sheet, centered
  // window, or an inline panel under the settings card.
  const mode = menuStyle === 'center' ? 'center' : menuStyle === 'inline' ? 'inline' : 'bottom';
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [working, setWorking] = useState(false);

  // Dismiss animation driver. Applied to the whole sheet; the gesture is
  // captured on the header zone only so the file list keeps scrolling.
  const slideY = useRef(new Animated.Value(0)).current;
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const overlayOpacity = useMemo(
    () =>
      slideY.interpolate({
        // At rest opacity is 1 — the dim level comes from the background
        // color itself. (0.5 here would multiply with the rgba alpha and
        // halve the backdrop to an effective 25%.)
        inputRange: [0, 400],
        outputRange: [1, 0],
        extrapolate: 'clamp',
      }),
    [slideY]
  );
  // Swipe-down to dismiss, tracked with raw touch events instead of
  // PanResponder: onTouchMove bubbles from ANY header child (handle, title,
  // X) uniformly, so there is no responder-negotiation asymmetry between
  // start points. The touch target is fixed at touch-start, so moves keep
  // arriving here even after the finger slides down over the export button
  // or the file list — and the list never sees them, so it can't steal the
  // drag. Taps (no movement) pass through untouched, so X keeps working.
  const drag = useRef({ id: null, y0: 0, moved: false, vy: 0, lastY: 0, lastT: 0 }).current;
  const headerTouchStart = (e) => {
    const t = e.nativeEvent;
    if (drag.id !== null) return;
    drag.id = t.identifier;
    drag.y0 = t.pageY;
    drag.lastY = t.pageY;
    drag.lastT = t.timestamp;
    drag.moved = false;
    drag.vy = 0;
  };
  const headerTouchMove = (e) => {
    const t = e.nativeEvent;
    if (t.identifier !== drag.id) return;
    const dy = t.pageY - drag.y0;
    if (!drag.moved) {
      if (dy < 6) return;
      drag.moved = true;
    }
    if (t.pageY > drag.y0) slideY.setValue(t.pageY - drag.y0);
    drag.vy = (t.pageY - drag.lastY) / Math.max(1, t.timestamp - drag.lastT);
    drag.lastY = t.pageY;
    drag.lastT = t.timestamp;
  };
  const headerTouchEnd = (e) => {
    const t = e.nativeEvent;
    if (t.identifier !== drag.id) return;
    drag.id = null;
    if (!drag.moved) return; // plain tap — X handles it
    drag.moved = false;
    const dy = Math.max(0, t.pageY - drag.y0);
    const vy = drag.vy || 0;
    drag.vy = 0;
    if (dy > 110 || vy > 0.7) {
      Animated.timing(slideY, {
        // Full screen height: guarantees the sheet is truly off-screen when
        // the animation ends, on any display size.
        toValue: Dimensions.get('window').height,
        duration: 200,
        useNativeDriver: true,
      }).start(() => {
        // Unmount FIRST, reset later. setValue(0) here would apply instantly
        // on the native side while the unmount (parent state update) still
        // needs a frame — that single frame at position 0 is the flash.
        // The reset happens in the on-open effect instead.
        onCloseRef.current();
      });
    } else {
      Animated.spring(slideY, {
        toValue: 0,
        tension: 120,
        friction: 14,
        useNativeDriver: true,
      }).start();
    }
  };

  const refresh = async () => {
    setLoading(true);
    try {
      setFiles(await listBackupFiles());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (visible) {
      if (mode === 'bottom') {
        // Enter exactly like the settings option sheets: spring up from
        // below the screen. (The overlay fades in on its own — it is
        // interpolated from slideY.)
        slideY.setValue(Dimensions.get('window').height);
        Animated.spring(slideY, { toValue: 0, friction: 22, useNativeDriver: true }).start();
      } else {
        slideY.setValue(0);
      }
      refresh();
    }
  }, [visible, mode]);



  const showError = (message) => {
    showAlert({ title: t('backupFailedTitle'), message, buttons: [{ text: t('ok') }] });
  };

  const handleExportNow = async () => {
    if (working) return;
    setWorking(true);
    try {
      const { count } = await exportCities();
      showAlert({
        toast: true,
        title: t('backupExportedTitle'),
        message: t('backupSavedCount', { count }),
      });
      refresh();
    } catch (e) {
      showError(t('backupErrorMsg'));
    } finally {
      setWorking(false);
    }
  };

  const confirmDeleteFile = (file) => {
    showAlert({
      title: t('backupDeleteTitle'),
      message: t('backupDeleteMsg', { name: file.name }),
      buttons: [
        { text: t('cancel'), style: 'cancel' },
        {
          text: t('backupDelete'),
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteBackupFile(file.path);
              refresh();
            } catch (e) {
              showError(t('backupBadFile'));
            }
          },
        },
      ],
    });
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
        showError(t('backupBadFile'));
        return;
      }
      const arr = Array.isArray(parsed) ? parsed : parsed?.cities;
      const count = Array.isArray(arr) ? arr.length : 0;
      if (count === 0) {
        showError(t('backupBadFile'));
        return;
      }
      showAlert({
        title: t('backupReplaceTitle'),
        message: t('backupReplaceMsg', { count }),
        buttons: [
          { text: t('cancel'), style: 'cancel' },
          {
            text: t('backupImport'),
            style: 'destructive',
            onPress: async () => {
              try {
                const res = await importCitiesFromUri(path);
                onClose();
                onImported(res.count);
              } catch (e) {
                showError(t('backupBadFile'));
              }
            },
          },
        ],
      });
    } catch (e) {
      showError(t('backupBadFile'));
    } finally {
      setWorking(false);
    }
  };

  const styles = StyleSheet.create({
    overlay: {
      ...StyleSheet.absoluteFillObject,
      height: DISPLAY_H,
      backgroundColor: theme.dim ?? 'rgba(0,0,0,0.5)',
    },
    centerWrap: {
      // Explicit geometry (same wrap-content host trap as the overlay):
      // an absoluteFill wrapper collapses and zeroes width:'100%' children.
      position: 'absolute',
      top: 0,
      left: 0,
      width: DISPLAY_W,
      height: DISPLAY_H,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingBottom: insets.bottom,
    },
    sheetCenter: {
      width: '100%',
      maxWidth: 440,
      maxHeight: '75%',
      backgroundColor: theme.sheet ?? theme.surface,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: theme.border,
      // Lift the sheet above the dimmed screen (same recipe as the
      // settings option sheets).
      shadowColor: '#000',
      shadowOffset: { width: 0, height: -6 },
      shadowOpacity: 0.25,
      shadowRadius: 12,
      elevation: 24,
      paddingHorizontal: 20,
      paddingTop: 16,
      paddingBottom: 16,
    },
    sheetBottom: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      maxHeight: '70%',
      backgroundColor: theme.sheet ?? theme.surface,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      // Crisp top edge on light theme where shadows are faint.
      borderTopWidth: 1,
      borderColor: theme.border,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: -6 },
      shadowOpacity: 0.25,
      shadowRadius: 12,
      elevation: 24,
      paddingHorizontal: 20,
      paddingTop: 8,
      paddingBottom: 24 + insets.bottom,
    },
    inlineBox: {
      backgroundColor: theme.surfaceAlt,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: theme.border,
      marginTop: 8,
      paddingHorizontal: 16,
      paddingTop: 14,
      paddingBottom: 16,
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
      backgroundColor: theme.textMuted,
      opacity: 0.5,
      alignSelf: 'center',
      marginBottom: 12,
    },
    title: {
      color: theme.text,
      fontSize: fs.large,
      fontWeight: '700',
      marginBottom: 12,
    },
    btnPrimary: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.accent,
      borderRadius: 12,
      paddingVertical: 12,
      marginBottom: 14,
    },
    btnDisabled: {
      opacity: 0.6,
    },
    btnPrimaryText: {
      color: theme.onAccent,
      fontWeight: '700',
      fontSize: fs.base * 0.95,
    },
    sectionTitle: {
      color: theme.textMuted,
      fontSize: fs.small,
      fontWeight: '700',
      marginBottom: 4,
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
  });

  // The null-gate below is load-bearing (mirrors CrashLogViewer): the
  // Modal's bare `visible` prop is always true, so without this gate the
  // sheet would be permanently mounted and no Close handler could ever
  // dismiss it — the stuck-modal bug. Never drop this gate.
  if (!visible) return null;

  const titleBlock =
    mode === 'bottom' ? (
      <View
        onTouchStart={headerTouchStart}
        onTouchMove={headerTouchMove}
        onTouchEnd={headerTouchEnd}
        onTouchCancel={headerTouchEnd}
      >
        <View style={styles.handle} />
        <View style={styles.titleRow}>
          <Text style={[styles.title, { flex: 1, marginBottom: 0 }]}>{t('backupFilesTitle')}</Text>
          <TouchableOpacity onPress={onClose} hitSlop={14} activeOpacity={0.6}>
            <Ionicons name="close" size={26} color={theme.textSecondary} />
          </TouchableOpacity>
        </View>
      </View>
    ) : (
      <View style={styles.titleRow}>
        <Text style={[styles.title, { flex: 1, marginBottom: 0 }]}>{t('backupFilesTitle')}</Text>
        <TouchableOpacity onPress={onClose} hitSlop={14} activeOpacity={0.6}>
          <Ionicons name="close" size={26} color={theme.textSecondary} />
        </TouchableOpacity>
      </View>
    );

  const body = (
    <>
      {titleBlock}
      <TouchableOpacity
        style={[styles.btnPrimary, working && styles.btnDisabled]}
        onPress={handleExportNow}
        disabled={working}
        activeOpacity={0.7}
      >
        {working ? (
          <ActivityIndicator size="small" color={theme.onAccent} />
        ) : (
          <Ionicons name="download-outline" size={20} color={theme.onAccent} style={{ marginRight: 8 }} />
        )}
        <Text style={styles.btnPrimaryText}>{t('backupExportNow')}</Text>
      </TouchableOpacity>
      <Text style={styles.sectionTitle}>{t('backupSavedTitle')}</Text>
      {loading ? (
        <ActivityIndicator size="large" color={theme.accent} style={{ marginVertical: 24 }} />
      ) : files.length === 0 ? (
        <Text style={styles.empty}>{t('backupNoFiles')}</Text>
      ) : (
        <ScrollView>
          {files.map((f, i) => (
            <TouchableOpacity
              key={f.path}
              style={[styles.row, i === files.length - 1 && { borderBottomWidth: 0 }]}
              onPress={() => confirmImport(f.path)}
              activeOpacity={0.6}
            >
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
    </>
  );

  if (mode === 'inline') {
    return <View style={styles.inlineBox}>{body}</View>;
  }

  const sheetStyle = mode === 'center' ? styles.sheetCenter : styles.sheetBottom;
  const sheetNode = (
    <Animated.View style={[sheetStyle, { transform: [{ translateY: slideY }] }]}>{body}</Animated.View>
  );

  return (
    <Modal
      transparent
      visible
      animationType={mode === 'bottom' ? 'none' : 'fade'}
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <Animated.View style={[styles.overlay, { opacity: overlayOpacity }]} />
      </TouchableWithoutFeedback>
      {mode === 'center' ? <View style={styles.centerWrap}>{sheetNode}</View> : sheetNode}
    </Modal>
  );
}
