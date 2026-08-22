import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function App() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>🌤️ Моя Погода</Text>
      <Text style={styles.text}>Приложение успешно собрано!</Text>
      <Text style={styles.text}>Репозиторий очищен.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center', 
    backgroundColor: '#f0f4f8',
    padding: 20 
  },
  title: { 
    fontSize: 28, 
    fontWeight: 'bold', 
    color: '#023c69', 
    marginBottom: 20 
  },
  text: { 
    fontSize: 18, 
    color: '#333', 
    textAlign: 'center',
    marginBottom: 10 
  }
});
