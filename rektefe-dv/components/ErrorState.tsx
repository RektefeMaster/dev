import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const ErrorState = ({ message }: { message: string }) => (
  <View style={styles.container}>
    <Text style={styles.text}>Hata: {message}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  text: { color: '#FF3B30', fontSize: 16, fontWeight: '600', textAlign: 'center' }
});

export default ErrorState; 