/**
 * Professional Button Component - Responsive for Mobile & Web
 */

import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, ViewStyle, Platform } from 'react-native';
import { COLORS, TYPOGRAPHY, RADIUS, SPACING } from '../constants';
import { isWeb, getResponsiveValue } from '../utils/responsive';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  style?: ViewStyle;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  fullWidth = false,
  style,
}) => {
  const isDisabled = disabled || loading;

  const buttonStyle = [
    styles.button,
    styles[variant],
    styles[`size_${size}`],
    fullWidth && styles.fullWidth,
    isDisabled && styles.disabled,
    isWeb && styles.webButton,
    style,
  ];

  return (
    <TouchableOpacity
      style={buttonStyle}
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.7}
      // @ts-ignore - web only
      onMouseEnter={(e: any) => {
        if (isWeb && !isDisabled) {
          e.currentTarget.style.opacity = '0.9';
        }
      }}
      // @ts-ignore - web only
      onMouseLeave={(e: any) => {
        if (isWeb) {
          e.currentTarget.style.opacity = '1';
        }
      }}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'primary' ? COLORS.textInverse : COLORS.primary} size="small" />
      ) : (
        <Text style={[styles.text, styles[`text_${variant}`], styles[`textSize_${size}`]]}>
          {title}
        </Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  primary: {
    backgroundColor: COLORS.primary,
  },
  secondary: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  outline: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: COLORS.primary,
  },
  ghost: {
    backgroundColor: 'transparent',
  },
  size_sm: {
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    minHeight: 36,
  },
  size_md: {
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    minHeight: 44,
  },
  size_lg: {
    paddingVertical: SPACING.md + 4,
    paddingHorizontal: SPACING.xl,
    minHeight: 52,
  },
  fullWidth: {
    width: '100%',
  },
  disabled: {
    opacity: 0.5,
  },
  text: {
    ...TYPOGRAPHY.bodyBold,
  },
  text_primary: {
    color: COLORS.textInverse,
  },
  text_secondary: {
    color: COLORS.text,
  },
  text_outline: {
    color: COLORS.primary,
  },
  text_ghost: {
    color: COLORS.primary,
  },
  textSize_sm: {
    fontSize: 14,
  },
  textSize_md: {
    fontSize: 16,
  },
  textSize_lg: {
    fontSize: 18,
  },
  webButton: {
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    ...(Platform.OS === 'web' && {
      userSelect: 'none',
      WebkitUserSelect: 'none',
    }),
  },
});

