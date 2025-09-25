import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/context/ThemeContext';

interface ProgressStep {
  number: number;
  title: string;
  icon: string;
}

interface ProgressIndicatorProps {
  currentStep: number;
  totalSteps?: number;
}

export const ProgressIndicator: React.FC<ProgressIndicatorProps> = ({
  currentStep,
  totalSteps = 5,
}) => {
  const { theme } = useTheme();

  const steps: ProgressStep[] = [
    { number: 1, title: 'Araç Seç', icon: 'car-outline' },
    { number: 2, title: 'Hizmet', icon: 'build-outline' },
    { number: 3, title: 'Detay', icon: 'document-text-outline' },
    { number: 4, title: 'Medya', icon: 'camera-outline' },
    { number: 5, title: 'Öncelik', icon: 'flag-outline' },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.stepIndicatorContainer}>
        {steps.map((step, index) => (
          <View key={step.number} style={styles.stepIndicatorWrapper}>
            <View
              style={[
                styles.stepIndicator,
                { backgroundColor: theme.colors.background.secondary },
                step.number === currentStep && styles.stepIndicatorActive,
                step.number < currentStep && styles.stepIndicatorCompleted,
              ]}
            >
              {step.number < currentStep ? (
                <Ionicons name="checkmark" size={18} color="#fff" />
              ) : (
                <Ionicons 
                  name={step.icon as any} 
                  size={18} 
                  color={step.number === currentStep ? '#fff' : theme.colors.text.secondary} 
                />
              )}
            </View>
            <Text style={[
              styles.stepTitle,
              { color: theme.colors.text.secondary },
              step.number === currentStep && { color: theme.colors.primary.main, fontWeight: '600' },
              step.number < currentStep && { color: theme.colors.success.main }
            ]}>
              {step.title}
            </Text>
            {index < steps.length - 1 && (
              <View
                style={[
                  styles.stepIndicatorLine,
                  { backgroundColor: theme.colors.border.primary },
                  step.number < currentStep && styles.stepIndicatorLineCompleted,
                ]}
              />
            )}
          </View>
        ))}
      </View>
      
      <View style={styles.progressBarContainer}>
        <View style={[styles.progressBarBackground, { backgroundColor: theme.colors.border.primary }]}>
          <View 
            style={[
              styles.progressBarFill, 
              { 
                backgroundColor: theme.colors.primary.main,
                width: `${(currentStep / totalSteps) * 100}%`,
              }
            ]} 
          />
        </View>
        <Text style={[styles.progressText, { color: theme.colors.text.secondary }]}>
          {currentStep}/{totalSteps} Adım
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  stepIndicatorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  stepIndicatorWrapper: {
    flex: 1,
    alignItems: 'center',
    position: 'relative',
  },
  stepIndicator: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  stepIndicatorActive: {
    backgroundColor: '#007AFF',
  },
  stepIndicatorCompleted: {
    backgroundColor: '#34C759',
  },
  stepTitle: {
    fontSize: 12,
    textAlign: 'center',
  },
  stepIndicatorLine: {
    position: 'absolute',
    top: 20,
    left: '50%',
    right: '-50%',
    height: 2,
    zIndex: -1,
  },
  stepIndicatorLineCompleted: {
    backgroundColor: '#34C759',
  },
  progressBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  progressBarBackground: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    marginRight: 12,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 2,
  },
  progressText: {
    fontSize: 12,
    fontWeight: '500',
  },
});
