import React from 'react';
import { View, ViewStyle, StyleSheet, Text } from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { spacing as spacingValues } from '@/theme/theme';

export interface SpacingProps {
  size?: keyof typeof spacingValues;
  horizontal?: keyof typeof spacingValues;
  vertical?: keyof typeof spacingValues;
  top?: keyof typeof spacingValues;
  bottom?: keyof typeof spacingValues;
  left?: keyof typeof spacingValues;
  right?: keyof typeof spacingValues;
  style?: ViewStyle;
  children?: React.ReactNode;
}

export interface LayoutProps {
  direction?: 'row' | 'column';
  align?: 'start' | 'center' | 'end' | 'stretch' | 'baseline';
  justify?: 'start' | 'center' | 'end' | 'space-between' | 'space-around' | 'space-evenly';
  wrap?: 'nowrap' | 'wrap' | 'wrap-reverse';
  gap?: keyof typeof spacingValues;
  padding?: keyof typeof spacingValues;
  margin?: keyof typeof spacingValues;
  fullWidth?: boolean;
  fullHeight?: boolean;
  style?: ViewStyle;
  children?: React.ReactNode;
}

// Spacing component for consistent margins and paddings
export const Spacing: React.FC<SpacingProps> = ({
  size,
  horizontal,
  vertical,
  top,
  bottom,
  left,
  right,
  style,
  children,
}) => {
  const getSpacingStyle = (): ViewStyle => {
    const spacingStyle: ViewStyle = {};

    if (size) {
      spacingStyle.margin = spacingValues[size as keyof typeof spacingValues];
    }

    if (horizontal) {
      spacingStyle.marginHorizontal = spacingValues[horizontal as keyof typeof spacingValues];
    }

    if (vertical) {
      spacingStyle.marginVertical = spacingValues[vertical as keyof typeof spacingValues];
    }

    if (top) {
      spacingStyle.marginTop = spacingValues[top as keyof typeof spacingValues];
    }

    if (bottom) {
      spacingStyle.marginBottom = spacingValues[bottom as keyof typeof spacingValues];
    }

    if (left) {
      spacingStyle.marginLeft = spacingValues[left as keyof typeof spacingValues];
    }

    if (right) {
      spacingStyle.marginRight = spacingValues[right as keyof typeof spacingValues];
    }

    return spacingStyle;
  };

  if (children) {
    return (
      <View style={[getSpacingStyle(), style]}>
        {children}
      </View>
    );
  }

  return <View style={[getSpacingStyle(), style]} />;
};

// Layout component for flexible layouts
export const Layout: React.FC<LayoutProps> = ({
  direction = 'column',
  align = 'start',
  justify = 'start',
  wrap = 'nowrap',
  gap,
  padding,
  margin,
  fullWidth = false,
  fullHeight = false,
  style,
  children,
}) => {
  const getLayoutStyle = (): ViewStyle => {
    const layoutStyle: ViewStyle = {
      flexDirection: direction,
      alignItems: align === 'start' ? 'flex-start' : 
                 align === 'end' ? 'flex-end' : 
                 align === 'stretch' ? 'stretch' : 
                 align === 'baseline' ? 'baseline' : 'center',
      justifyContent: justify === 'start' ? 'flex-start' : 
                     justify === 'end' ? 'flex-end' : 
                     justify === 'space-between' ? 'space-between' : 
                     justify === 'space-around' ? 'space-around' : 
                     justify === 'space-evenly' ? 'space-evenly' : 'center',
      flexWrap: wrap,
    };

    if (gap) {
      if (direction === 'row') {
        layoutStyle.columnGap = spacingValues[gap];
      } else {
        layoutStyle.rowGap = spacingValues[gap];
      }
    }

    if (padding) {
      layoutStyle.padding = spacingValues[padding];
    }

    if (margin) {
      layoutStyle.margin = spacingValues[margin];
    }

    if (fullWidth) {
      layoutStyle.width = '100%';
    }

    if (fullHeight) {
      layoutStyle.height = '100%';
    }

    return layoutStyle;
  };

  return (
    <View style={[getLayoutStyle(), style]}>
      {children}
    </View>
  );
};

// Container component for consistent content width
export const Container: React.FC<{
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'full';
  padding?: keyof typeof spacingValues;
  style?: ViewStyle;
}> = ({ children, size = 'md', padding = 'md', style }) => {
  const { theme } = useTheme();
  
  const getContainerStyle = (): ViewStyle => {
    const containerPaddingMap: Record<string, number> = {
      sm: theme?.layout?.containerPadding?.sm || 16,
      md: theme?.layout?.containerPadding?.md || 20,
      lg: theme?.layout?.containerPadding?.lg || 24,
      full: 0,
    };
    
    const containerStyle: ViewStyle = {
      paddingHorizontal: containerPaddingMap[size] || 20,
      paddingVertical: spacingValues[padding],
      alignSelf: 'center',
    };

    if (size !== 'full') {
      containerStyle.maxWidth = theme?.layout?.maxContentWidth || 1200;
    }

    return containerStyle;
  };

  return (
    <View style={[getContainerStyle(), style]}>
      {children}
    </View>
  );
};

// Grid system components
export const Row: React.FC<Omit<LayoutProps, 'direction'>> = (props) => (
  <Layout direction="row" {...props} />
);

export const Column: React.FC<Omit<LayoutProps, 'direction'>> = (props) => (
  <Layout direction="column" {...props} />
);

// Flex components
export const Flex: React.FC<{
  flex?: number;
  children?: React.ReactNode;
  style?: ViewStyle;
}> = ({ flex = 1, children, style }) => (
  <View style={[{ flex }, style]}>
    {children}
  </View>
);

// Divider component with dark mode support
export const Divider: React.FC<{
  orientation?: 'horizontal' | 'vertical';
  size?: keyof typeof spacingValues;
  color?: string;
  style?: ViewStyle;
}> = ({ orientation = 'horizontal', size = 'sm', color, style }) => {
  const { theme, isDark } = useTheme();
  
  const dividerStyle: ViewStyle = {
    backgroundColor: color || (isDark 
      ? (theme?.colors?.border?.tertiary || '#1C1C1E')
      : (theme?.colors?.border?.secondary || '#C7C7CC')),
  };

  if (orientation === 'horizontal') {
    dividerStyle.height = 1;
    dividerStyle.marginVertical = spacingValues[size];
  } else {
    dividerStyle.width = 1;
    dividerStyle.marginHorizontal = spacingValues[size];
  }

  return <View style={[dividerStyle, style]} />;
};

// Section component for consistent section spacing
export const Section: React.FC<{
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  padding?: keyof typeof spacingValues;
  margin?: keyof typeof spacingValues;
  style?: ViewStyle;
}> = ({ children, title, subtitle, padding = 'lg', margin = 'md', style }) => {
  const { theme, isDark } = useTheme();
  
  return (
    <View style={[styles.section, { padding: spacingValues[padding], margin: spacingValues[margin] }, style]}>
      {title && (
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { 
            color: isDark 
              ? (theme?.colors?.text?.inverse || '#FFFFFF')
              : (theme?.colors?.text?.primary || '#000000')
          }]}>
            {title}
          </Text>
          {subtitle && (
            <Text style={[styles.sectionSubtitle, { 
              color: isDark 
                ? (theme?.colors?.text?.tertiary || '#8E8E93')
                : (theme?.colors?.text?.secondary || '#8E8E93')
            }]}>
              {subtitle}
            </Text>
          )}
        </View>
      )}
      {children}
    </View>
  );
};

// Screen component for full screen layouts
export const Screen: React.FC<{
  children: React.ReactNode;
  padding?: keyof typeof spacingValues;
  safe?: boolean;
  style?: ViewStyle;
}> = ({ children, padding = 'screenPadding', safe = true, style }) => {
  const { theme, isDark } = useTheme();
  
  return (
    <View style={[
      styles.screen, 
      { 
        padding: spacingValues[padding as keyof typeof spacingValues],
        backgroundColor: isDark 
          ? (theme?.colors?.background?.quaternary || '#000000')
          : (theme?.colors?.background?.primary || '#F2F2F7')
      }, 
      style
    ]}>
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  section: {
    width: '100%',
  },
  sectionHeader: {
    marginBottom: 16, // theme.spacing.md yerine sabit değer
  },
  sectionTitle: {
    fontSize: 17, // theme.typography.fontSizes.lg yerine sabit değer
    fontWeight: '600', // theme.typography.fontWeights.semibold yerine sabit değer
    marginBottom: 4, // theme.spacing.xs yerine sabit değer
  },
  sectionSubtitle: {
    fontSize: 13, // theme.typography.fontSizes.sm yerine sabit değer
  },
  screen: {
    flex: 1,
  },
});

export default Spacing;
