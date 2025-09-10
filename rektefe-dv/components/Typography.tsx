import React from 'react';
import { Text, TextStyle, StyleSheet, TextProps } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { typography } from '../theme/theme';

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
        fontSize: typography.h1.fontSize,
        fontWeight: typography.h1.fontWeight as TextStyle['fontWeight'],
        lineHeight: typography.h1.lineHeight,
        letterSpacing: typography.h1.letterSpacing,
      },
      h2: {
        fontSize: typography.h2.fontSize,
        fontWeight: typography.h2.fontWeight as TextStyle['fontWeight'],
        lineHeight: typography.h2.lineHeight,
        letterSpacing: typography.h2.letterSpacing,
      },
      h3: {
        fontSize: typography.h3.fontSize,
        fontWeight: typography.h3.fontWeight as TextStyle['fontWeight'],
        lineHeight: typography.h3.lineHeight,
        letterSpacing: typography.h3.letterSpacing,
      },
      h4: {
        fontSize: typography.h4.fontSize,
        fontWeight: typography.h4.fontWeight as TextStyle['fontWeight'],
        lineHeight: typography.h4.lineHeight,
        letterSpacing: typography.h4.letterSpacing,
      },
      h5: {
        fontSize: typography.body1.fontSize,
        fontWeight: '500',
        lineHeight: typography.body1.lineHeight,
        letterSpacing: typography.body1.letterSpacing,
      },
      h6: {
        fontSize: typography.body2.fontSize,
        fontWeight: '500',
        lineHeight: typography.body2.lineHeight,
        letterSpacing: typography.body2.letterSpacing,
      },
      body: {
        fontSize: typography.body1.fontSize,
        fontWeight: typography.body1.fontWeight as TextStyle['fontWeight'],
        lineHeight: typography.body1.lineHeight,
        letterSpacing: typography.body1.letterSpacing,
      },
      body2: {
        fontSize: typography.body2.fontSize,
        fontWeight: typography.body2.fontWeight as TextStyle['fontWeight'],
        lineHeight: typography.body2.lineHeight,
        letterSpacing: typography.body2.letterSpacing,
      },
      caption: {
        fontSize: typography.caption.small.fontSize,
        fontWeight: typography.caption.small.fontWeight as TextStyle['fontWeight'],
        lineHeight: typography.caption.small.lineHeight,
        letterSpacing: typography.caption.small.letterSpacing,
      },
      overline: {
        fontSize: typography.caption.small.fontSize,
        fontWeight: typography.caption.small.fontWeight as TextStyle['fontWeight'],
        lineHeight: typography.caption.small.lineHeight,
        letterSpacing: typography.caption.small.letterSpacing,
        textTransform: 'uppercase',
      },
      button: {
        fontSize: typography.button.medium.fontSize,
        fontWeight: typography.button.medium.fontWeight as TextStyle['fontWeight'],
        lineHeight: typography.button.medium.lineHeight,
        letterSpacing: typography.button.medium.letterSpacing,
      },
    };

    // Size override (if provided, overrides variant size)
    const sizeStyles = size ? {
      fontSize: size === 'xs' ? 12 : size === 'sm' ? 14 : size === 'md' ? 16 : size === 'lg' ? 18 : size === 'xl' ? 20 : size === 'xxl' ? 24 : 28,
      lineHeight: (size === 'xs' ? 12 : size === 'sm' ? 14 : size === 'md' ? 16 : size === 'lg' ? 18 : size === 'xl' ? 20 : size === 'xxl' ? 24 : 28) * 1.4,
    } : {};

    // Weight override
    const weightStyles: TextStyle = weight ? {
      fontWeight: (weight === 'thin' ? '100' : weight === 'light' ? '300' : weight === 'regular' ? '400' : weight === 'medium' ? '500' : weight === 'semibold' ? '600' : weight === 'bold' ? '700' : weight === 'heavy' ? '800' : '900') as TextStyle['fontWeight'],
    } : {};

    // Color styles with dark mode support
    const colorStyles = {
      primary: { color: '#1E293B' },
      secondary: { color: '#475569' },
      success: { color: '#059669' },
      warning: { color: '#D97706' },
      error: { color: '#DC2626' },
      info: { color: '#2563EB' },
      light: { color: '#1E293B' },
      dark: { color: '#1E293B' },
      white: { color: '#FFFFFF' },
      custom: { color: customColor || '#1E293B' },
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
      tight: { letterSpacing: -0.5 },
      normal: { letterSpacing: 0 },
      wide: { letterSpacing: 0.5 },
      wider: { letterSpacing: 1 },
    };

    // Line height override
    const lineHeightStyles = {
      tight: { lineHeight: 1.2 },
      normal: { lineHeight: 1.4 },
      relaxed: { lineHeight: 1.6 },
      loose: { lineHeight: 1.8 },
    };

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
