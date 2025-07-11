import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const NoDataCard = ({ text }: { text: string }) => (
  <View style={styles.container}>
    <Text style={styles.text}>{text}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: { padding: 24, alignItems: 'center', justifyContent: 'center' },
  text: { color: '#999', fontSize: 16, fontWeight: '500' }
});

export default NoDataCard; 