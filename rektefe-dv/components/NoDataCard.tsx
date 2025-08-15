import React from 'react';
import { View, StyleSheet } from 'react-native';
import theme from '../theme/theme';
import Typography from './Typography';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const NoDataCard = ({ text }: { text: string }) => (
  <View style={styles.container}>
    <MaterialCommunityIcons 
      name="inbox-outline" 
      size={48} 
      color={theme.colors.text.secondary.dark} 
      style={styles.icon}
    />
    <Typography variant="h6" color="secondary" align="center" style={styles.text}>
      {text}
    </Typography>
  </View>
);

const styles = StyleSheet.create({
  container: { 
    padding: theme.spacing.xxl, 
    alignItems: 'center', 
    justifyContent: 'center',
    backgroundColor: theme.colors.background.surface.dark,
    borderRadius: theme.borderRadius.card,
    margin: theme.spacing.md,
  },
  icon: {
    marginBottom: theme.spacing.md,
    opacity: 0.6,
  },
  text: {
    textAlign: 'center',
  }
});

export default NoDataCard; 