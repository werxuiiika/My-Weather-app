import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

// Временно показываем сообщение об успехе
export default function App() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>🎉 Код восстановлен!</Text>
      <Text style={styles.text}>Файл recovered_bundle.js содержит 1MB кода.</Text>
      <Text style={styles.text}>Твоя погода внутри!</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20, backgroundColor: '#f0f4f8' },
  title: { fontSize: 24, fontWeight: 'bold', color: '#023c69', marginBottom: 20 },
  text: { fontSize: 16, color: '#333', textAlign: 'center', marginBottom: 10 }
});
