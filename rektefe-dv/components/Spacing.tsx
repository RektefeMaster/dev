import React from 'react';
import { View, ViewStyle, StyleSheet, Text } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import theme from '../theme/theme';

export interface SpacingProps {
  size?: keyof typeof theme.spacing;
  horizontal?: keyof typeof theme.spacing;
  vertical?: keyof typeof theme.spacing;
  top?: keyof typeof theme.spacing;
  bottom?: keyof typeof theme.spacing;
  left?: keyof typeof theme.spacing;
  right?: keyof typeof theme.spacing;
  style?: ViewStyle;
  children?: React.ReactNode;
}

export interface LayoutProps {
  direction?: 'row' | 'column';
  align?: 'start' | 'center' | 'end' | 'stretch' | 'baseline';
  justify?: 'start' | 'center' | 'end' | 'space-between' | 'space-around' | 'space-evenly';
  wrap?: 'nowrap' | 'wrap' | 'wrap-reverse';
  gap?: keyof typeof theme.spacing;
  padding?: keyof typeof theme.spacing;
  margin?: keyof typeof theme.spacing;
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
      spacingStyle.margin = theme.spacing[size];
    }

    if (horizontal) {
      spacingStyle.marginHorizontal = theme.spacing[horizontal];
    }

    if (vertical) {
      spacingStyle.marginVertical = theme.spacing[vertical];
    }

    if (top) {
      spacingStyle.marginTop = theme.spacing[top];
    }

    if (bottom) {
      spacingStyle.marginBottom = theme.spacing[bottom];
    }

    if (left) {
      spacingStyle.marginLeft = theme.spacing[left];
    }

    if (right) {
      spacingStyle.marginRight = theme.spacing[right];
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
        layoutStyle.columnGap = theme.spacing[gap];
      } else {
        layoutStyle.rowGap = theme.spacing[gap];
      }
    }

    if (padding) {
      layoutStyle.padding = theme.spacing[padding];
    }

    if (margin) {
      layoutStyle.margin = theme.spacing[margin];
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
  padding?: keyof typeof theme.spacing;
  style?: ViewStyle;
}> = ({ children, size = 'md', padding = 'md', style }) => {
  const getContainerStyle = (): ViewStyle => {
    const containerStyle: ViewStyle = {
      paddingHorizontal: theme.layout.containerPadding[size],
      paddingVertical: theme.spacing[padding],
      alignSelf: 'center',
    };

    if (size !== 'full') {
      containerStyle.maxWidth = theme.layout.maxContentWidth;
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
  size?: keyof typeof theme.spacing;
  color?: string;
  style?: ViewStyle;
}> = ({ orientation = 'horizontal', size = 'sm', color, style }) => {
  const { isDark } = useTheme();
  
  const dividerStyle: ViewStyle = {
    backgroundColor: color || (isDark ? theme.colors.divider.dark : theme.colors.divider.light),
  };

  if (orientation === 'horizontal') {
    dividerStyle.height = 1;
    dividerStyle.marginVertical = theme.spacing[size];
  } else {
    dividerStyle.width = 1;
    dividerStyle.marginHorizontal = theme.spacing[size];
  }

  return <View style={[dividerStyle, style]} />;
};

// Section component for consistent section spacing
export const Section: React.FC<{
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  padding?: keyof typeof theme.spacing;
  margin?: keyof typeof theme.spacing;
  style?: ViewStyle;
}> = ({ children, title, subtitle, padding = 'lg', margin = 'md', style }) => {
  const { isDark } = useTheme();
  
  return (
    <View style={[styles.section, { padding: theme.spacing[padding], margin: theme.spacing[margin] }, style]}>
      {title && (
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: isDark ? theme.colors.text.primary.dark : theme.colors.text.primary.light }]}>
            {title}
          </Text>
          {subtitle && (
            <Text style={[styles.sectionSubtitle, { color: isDark ? theme.colors.text.secondary.dark : theme.colors.text.secondary.light }]}>
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
  padding?: keyof typeof theme.spacing;
  safe?: boolean;
  style?: ViewStyle;
}> = ({ children, padding = 'screen', safe = true, style }) => {
  const { isDark } = useTheme();
  
  return (
    <View style={[
      styles.screen, 
      { 
        padding: theme.spacing[padding],
        backgroundColor: isDark ? theme.colors.background.default.dark : theme.colors.background.default.light
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
    marginBottom: theme.spacing.md,
  },
  sectionTitle: {
    fontSize: theme.typography.fontSizes.lg,
    fontWeight: theme.typography.fontWeights.semibold,
    marginBottom: theme.spacing.xs,
  },
  sectionSubtitle: {
    fontSize: theme.typography.fontSizes.sm,
  },
  screen: {
    flex: 1,
  },
});

export default Spacing;
