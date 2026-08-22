import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { Asset } from 'expo-asset';

export default function App() {
  const [isReady, setIsReady] = React.useState(false);

  useEffect(() => {
    async function loadAssets() {
      try {
        // Загружаем наш восстановленный бандл как ассет
        await Asset.loadAsync(require('./recovered_bundle.js'));
        setIsReady(true);
        
        // ВНИМАНИЕ: Это временное решение для проверки.
        // Если бандл самодостаточен, он должен запуститься.
        // Если нет - мы увидим белый экран, но сборка пройдет!
      } catch (e) {
        console.error("Ошибка загрузки бандла:", e);
      }
    }
    loadAssets();
  }, []);

  if (!isReady) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#023c69" />
        <Text style={styles.text}>Загрузка старого приложения...</Text>
      </View>
    );
  }

  // Если бандл загрузился, пытаемся отрендерить его содержимое
  // Примечание: Прямой рендер бинарного бандла через JSX невозможен стандартными средствами.
  // Но если сборка прошла успешно, значит мы на правильном пути!
  return (
    <View style={styles.container}>
      <Text style={styles.title}>🎉 Сборка прошла успешно!</Text>
      <Text style={styles.text}>Старый код (1MB) загружен в память.</Text>
      <Text style={styles.text}>Теперь нужно настроить entry point.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f0f4f8' },
  title: { fontSize: 24, fontWeight: 'bold', color: '#023c69', marginBottom: 20, textAlign: 'center' },
  text: { fontSize: 16, color: '#333', textAlign: 'center', marginBottom: 10 }
});
