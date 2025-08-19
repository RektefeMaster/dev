import React from 'react';
import { Text, TextStyle, StyleSheet, TextProps } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import theme from '../theme/theme';

export interface TypographyProps extends TextProps {
  variant?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'body' | 'body2' | 'caption' | 'overline' | 'button';
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'xxl' | 'xxxl';
  weight?: 'thin' | 'light' | 'regular' | 'medium' | 'semibold' | 'bold' | 'heavy' | 'black';
  color?: 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info' | 'light' | 'dark' | 'white' | 'custom';
  customColor?: string;
  align?: 'left' | 'center' | 'right' | 'justify';
  transform?: 'none' | 'uppercase' | 'lowercase' | 'capitalize';
  decoration?: 'none' | 'underline' | 'line-through';
  spacing?: 'tight' | 'normal' | 'wide' | 'wider';
  lineHeight?: 'tight' | 'normal' | 'relaxed' | 'loose';
  truncate?: boolean;
  numberOfLines?: number;
  style?: TextStyle;
  children: React.ReactNode;
}

const Typography: React.FC<TypographyProps> = ({
  variant = 'body',
  size,
  weight,
  color = 'primary',
  customColor,
  align = 'left',
  transform = 'none',
  decoration = 'none',
  spacing = 'normal',
  lineHeight = 'normal',
  truncate = false,
  numberOfLines,
  style,
  children,
  ...props
}) => {
  const { isDark } = useTheme();

  const getTypographyStyle = (): TextStyle => {
    // Variant-based styles
    const variantStyles: Record<string, TextStyle> = {
      h1: {
        fontSize: theme.typography.fontSizes.xxxl,
        fontWeight: theme.typography.fontWeights.bold,
        lineHeight: theme.typography.fontSizes.xxxl * 1.2,
        letterSpacing: theme.typography.letterSpacing.tight,
      },
      h2: {
        fontSize: theme.typography.fontSizes.xxl,
        fontWeight: theme.typography.fontWeights.bold,
        lineHeight: theme.typography.fontSizes.xxl * 1.2,
        letterSpacing: theme.typography.letterSpacing.tight,
      },
      h3: {
        fontSize: theme.typography.fontSizes.xl,
        fontWeight: theme.typography.fontWeights.semibold,
        lineHeight: theme.typography.fontSizes.xl * 1.3,
        letterSpacing: theme.typography.letterSpacing.normal,
      },
      h4: {
        fontSize: theme.typography.fontSizes.lg,
        fontWeight: theme.typography.fontWeights.semibold,
        lineHeight: theme.typography.fontSizes.lg * 1.3,
        letterSpacing: theme.typography.letterSpacing.normal,
      },
      h5: {
        fontSize: theme.typography.fontSizes.md,
        fontWeight: theme.typography.fontWeights.medium,
        lineHeight: theme.typography.fontSizes.md * 1.4,
        letterSpacing: theme.typography.letterSpacing.normal,
      },
      h6: {
        fontSize: theme.typography.fontSizes.sm,
        fontWeight: theme.typography.fontWeights.medium,
        lineHeight: theme.typography.fontSizes.sm * 1.4,
        letterSpacing: theme.typography.letterSpacing.normal,
      },
      body: {
        fontSize: theme.typography.fontSizes.md,
        fontWeight: theme.typography.fontWeights.regular,
        lineHeight: theme.typography.fontSizes.md * 1.5,
        letterSpacing: theme.typography.letterSpacing.normal,
      },
      body2: {
        fontSize: theme.typography.fontSizes.sm,
        fontWeight: theme.typography.fontWeights.regular,
        lineHeight: theme.typography.fontSizes.sm * 1.5,
        letterSpacing: theme.typography.letterSpacing.normal,
      },
      caption: {
        fontSize: theme.typography.fontSizes.xs,
        fontWeight: theme.typography.fontWeights.regular,
        lineHeight: theme.typography.fontSizes.xs * 1.4,
        letterSpacing: theme.typography.letterSpacing.wide,
      },
      overline: {
        fontSize: theme.typography.fontSizes.xs,
        fontWeight: theme.typography.fontWeights.medium,
        lineHeight: theme.typography.fontSizes.xs * 1.4,
        letterSpacing: theme.typography.letterSpacing.wider,
        textTransform: 'uppercase',
      },
      button: {
        fontSize: theme.typography.fontSizes.md,
        fontWeight: theme.typography.fontWeights.semibold,
        lineHeight: theme.typography.fontSizes.md * 1.2,
        letterSpacing: theme.typography.letterSpacing.wide,
      },
    };

    // Size override (if provided, overrides variant size)
    const sizeStyles = size ? {
      fontSize: theme.typography.fontSizes[size],
      lineHeight: theme.typography.fontSizes[size] * 1.4,
    } : {};

    // Weight override
    const weightStyles = weight ? {
      fontWeight: theme.typography.fontWeights[weight],
    } : {};

    // Color styles with dark mode support
    const colorStyles = {
      primary: { color: isDark ? theme.colors.text.primary.dark : theme.colors.text.primary.light },
      secondary: { color: isDark ? theme.colors.text.secondary.dark : theme.colors.text.secondary.light },
      success: { color: theme.colors.success.main },
      warning: { color: theme.colors.warning.main },
      error: { color: theme.colors.error.main },
      info: { color: theme.colors.primary.main },
      light: { color: isDark ? theme.colors.text.primary.dark : theme.colors.text.primary.light },
      dark: { color: isDark ? theme.colors.text.primary.dark : theme.colors.text.primary.light },
      white: { color: isDark ? theme.colors.text.inverse.dark : theme.colors.text.inverse.light },
      custom: { color: customColor || (isDark ? theme.colors.text.primary.dark : theme.colors.text.primary.light) },
    };

    // Alignment
    const alignStyles: Record<string, TextStyle> = {
      left: { textAlign: 'left' },
      center: { textAlign: 'center' },
      right: { textAlign: 'right' },
      justify: { textAlign: 'justify' },
    };

    // Text transform
    const transformStyles: Record<string, TextStyle> = {
      none: { textTransform: 'none' },
      uppercase: { textTransform: 'uppercase' },
      lowercase: { textTransform: 'lowercase' },
      capitalize: { textTransform: 'capitalize' },
    };

    // Text decoration
    const decorationStyles: Record<string, TextStyle> = {
      none: { textDecorationLine: 'none' },
      underline: { textDecorationLine: 'underline' },
      'line-through': { textDecorationLine: 'line-through' },
    };

    // Letter spacing
    const spacingStyles = {
      tight: { letterSpacing: theme.typography.letterSpacing.tight },
      normal: { letterSpacing: theme.typography.letterSpacing.normal },
      wide: { letterSpacing: theme.typography.letterSpacing.wide },
      wider: { letterSpacing: theme.typography.letterSpacing.wider },
    };

    // Line height override
    const lineHeightStyles = {
      tight: { lineHeight: theme.typography.lineHeights.tight * (size ? theme.typography.fontSizes[size] : 16) },
      normal: { lineHeight: theme.typography.lineHeights.normal * (size ? theme.typography.fontSizes[size] : 16) },
      relaxed: { lineHeight: theme.typography.lineHeights.relaxed * (size ? theme.typography.fontSizes[size] : 16) },
      loose: { lineHeight: theme.typography.lineHeights.loose * (size ? theme.typography.fontSizes[size] : 16) },
    };

    // Truncate styles
    const truncateStyles = truncate ? {
      numberOfLines: 1,
      ellipsizeMode: 'tail',
    } : {};

    return {
      ...variantStyles[variant],
      ...sizeStyles,
      ...weightStyles,
      ...colorStyles[color],
      ...alignStyles[align],
      ...transformStyles[transform],
      ...decorationStyles[decoration],
      ...spacingStyles[spacing],
      ...lineHeightStyles[lineHeight],
      ...truncateStyles,
    };
  };

  return (
    <Text
      style={[getTypographyStyle(), style]}
      numberOfLines={numberOfLines || (truncate ? 1 : undefined)}
      ellipsizeMode={truncate ? 'tail' : undefined}
      {...props}
    >
      {children}
    </Text>
  );
};

// Convenience components for common use cases
export const H1: React.FC<Omit<TypographyProps, 'variant'>> = (props) => (
  <Typography variant="h1" {...props} />
);

export const H2: React.FC<Omit<TypographyProps, 'variant'>> = (props) => (
  <Typography variant="h2" {...props} />
);

export const H3: React.FC<Omit<TypographyProps, 'variant'>> = (props) => (
  <Typography variant="h3" {...props} />
);

export const H4: React.FC<Omit<TypographyProps, 'variant'>> = (props) => (
  <Typography variant="h4" {...props} />
);

export const H5: React.FC<Omit<TypographyProps, 'variant'>> = (props) => (
  <Typography variant="h5" {...props} />
);

export const H6: React.FC<Omit<TypographyProps, 'variant'>> = (props) => (
  <Typography variant="h6" {...props} />
);

export const Body: React.FC<Omit<TypographyProps, 'variant'>> = (props) => (
  <Typography variant="body" {...props} />
);

export const Body2: React.FC<Omit<TypographyProps, 'variant'>> = (props) => (
  <Typography variant="body2" {...props} />
);

export const Caption: React.FC<Omit<TypographyProps, 'variant'>> = (props) => (
  <Typography variant="caption" {...props} />
);

export const Overline: React.FC<Omit<TypographyProps, 'variant'>> = (props) => (
  <Typography variant="overline" {...props} />
);

export const ButtonText: React.FC<Omit<TypographyProps, 'variant'>> = (props) => (
  <Typography variant="button" {...props} />
);

export default Typography;
