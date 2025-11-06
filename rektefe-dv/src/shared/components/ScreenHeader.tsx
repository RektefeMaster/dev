import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ViewStyle,
  StyleProp,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/context/ThemeContext';
import BackButton from './BackButton';

// Spacing ve borderRadius'u doğrudan tanımla (modül yükleme sırasından bağımsız)
const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  xxxl: 64,
  screenPadding: 20,
  cardPadding: 16,
  buttonPadding: 12,
  iconSpacing: 8,
};

const borderRadius = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  round: 50,
  card: 16,
  button: 12,
  input: 12,
  modal: 20,
  avatar: 25,
  full: 9999,
};

export interface ScreenHeaderProps {
  title: string;
  subtitle?: string;
  showBackButton?: boolean;
  onBackPress?: () => void;
  rightComponent?: React.ReactNode;
  leftComponent?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  titleStyle?: StyleProp<ViewStyle>;
}

const ScreenHeader: React.FC<ScreenHeaderProps> = ({
  title,
  subtitle,
  showBackButton = true,
  onBackPress,
  rightComponent,
  leftComponent,
  style,
  titleStyle,
}) => {
  const { theme, isDark } = useTheme();
  const navigation = useNavigation();

  const handleBackPress = () => {
    if (onBackPress) {
      onBackPress();
    } else {
      navigation.goBack();
    }
  };

  return (
    <View
      style={[
        styles.header,
        {
          backgroundColor: isDark
            ? theme.colors.background.primary
            : '#FFFFFF',
          borderBottomColor: isDark
            ? theme.colors.border.light
            : '#E5E5E5',
        },
        style,
      ]}
    >
      <View style={styles.headerContent}>
        {/* Left Section */}
        <View style={styles.headerLeft}>
          {leftComponent || (showBackButton && (
            <BackButton 
              onPress={handleBackPress} 
              accessibilityLabel="Geri"
            />
          ))}
        </View>

        {/* Center Section - Title */}
        <View style={[styles.headerCenter, titleStyle]}>
          <Text
            style={[
              styles.headerTitle,
              { color: theme.colors.text.primary }
            ]}
            numberOfLines={1}
          >
            {title}
          </Text>
          {subtitle && (
            <Text
              style={[
                styles.headerSubtitle,
                {
                  color: isDark
                    ? theme.colors.text.tertiary
                    : theme.colors.text.secondary,
                }
              ]}
              numberOfLines={1}
            >
              {subtitle}
            </Text>
          )}
        </View>

        {/* Right Section */}
        <View style={styles.headerRight}>
          {rightComponent || <View style={{ width: 40 }} />}
        </View>
      </View>
    </View>
  );
};

// Styles - theme'e bağımlı değil, doğrudan spacing kullanıyor
const styles = StyleSheet.create({
  header: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    minHeight: 44, // Minimum touch target
  },
  headerLeft: {
    width: 40,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: 13,
    marginTop: 2,
    textAlign: 'center',
  },
  headerRight: {
    width: 40,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
});

export default ScreenHeader;

