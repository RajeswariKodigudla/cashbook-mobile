/**
 * Professional Button Component - Responsive for Mobile & Web
 */

import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, ViewStyle, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
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
  icon?: string;
  iconPosition?: 'left' | 'right';
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
  icon,
  iconPosition = 'left',
  style,
}) => {
  const isDisabled = disabled || loading;
  const iconColor = variant === 'primary' ? COLORS.textInverse : COLORS.primary;
  const iconSize = size === 'sm' ? 16 : size === 'lg' ? 20 : 18;

  const buttonStyle = [
    styles.button,
    styles[variant],
    styles[`size_${size}`],
    fullWidth && styles.fullWidth,
    isDisabled && styles.disabled,
    isWeb && styles.webButton,
    isDisabled && { pointerEvents: 'none' as const },
    style,
  ];

  // On web, don't use disabled prop to avoid pointerEvents deprecation warning
  // Use style.pointerEvents instead
  if (isWeb) {
    return (
      <TouchableOpacity
        style={buttonStyle}
        onPress={isDisabled ? undefined : onPress}
        activeOpacity={0.7}
        // @ts-ignore - web only
        onMouseEnter={(e: any) => {
          if (!isDisabled) {
            e.currentTarget.style.opacity = '0.9';
          }
        }}
        // @ts-ignore - web only
        onMouseLeave={(e: any) => {
          e.currentTarget.style.opacity = '1';
        }}
      >
        {loading ? (
          <ActivityIndicator color={iconColor} size="small" />
        ) : (
          <>
            {icon && iconPosition === 'left' && (
              <Ionicons name={icon as any} size={iconSize} color={iconColor} style={styles.iconLeft} />
            )}
            <Text style={[styles.text, styles[`text_${variant}`], styles[`textSize_${size}`]]}>
              {title}
            </Text>
            {icon && iconPosition === 'right' && (
              <Ionicons name={icon as any} size={iconSize} color={iconColor} style={styles.iconRight} />
            )}
          </>
        )}
      </TouchableOpacity>
    );
  }

  // Native platforms - use disabled prop
  return (
    <TouchableOpacity
      style={buttonStyle}
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.7}
    >
      {loading ? (
        <ActivityIndicator color={iconColor} size="small" />
      ) : (
        <>
          {icon && iconPosition === 'left' && (
            <Ionicons name={icon as any} size={iconSize} color={iconColor} style={styles.iconLeft} />
          )}
          <Text style={[styles.text, styles[`text_${variant}`], styles[`textSize_${size}`]]}>
            {title}
          </Text>
          {icon && iconPosition === 'right' && (
            <Ionicons name={icon as any} size={iconSize} color={iconColor} style={styles.iconRight} />
          )}
        </>
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
  iconLeft: {
    marginRight: SPACING.xs,
  },
  iconRight: {
    marginLeft: SPACING.xs,
  },
});

