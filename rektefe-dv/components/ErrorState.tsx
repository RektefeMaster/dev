import React from 'react';
import { View, StyleSheet } from 'react-native';
import theme from '../theme/theme';
import Typography from './Typography';

const ErrorState = ({ message }: { message: string }) => (
  <View style={styles.container}>
    <Typography variant="h5" color="error" align="center" style={styles.title}>
      Hata
    </Typography>
    <Typography variant="body" color="secondary" align="center" style={styles.message}>
      {message}
    </Typography>
  </View>
);

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center', 
    padding: theme.spacing.xxl,
    backgroundColor: theme.colors.background.quaternary,
  },
  title: {
    marginBottom: theme.spacing.md,
  },
  message: {
    maxWidth: '80%',
  }
});

export default ErrorState; 