/**
 * Professional Card Component - Responsive for Mobile & Web
 */

import React from 'react';
import { View, StyleSheet, ViewStyle, Platform } from 'react-native';
import { COLORS, RADIUS, SHADOWS, SPACING } from '../constants';
import { isWeb, getResponsiveValue } from '../utils/responsive';

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  elevated?: boolean;
  padding?: keyof typeof SPACING;
}

export const Card: React.FC<CardProps> = ({
  children,
  style,
  elevated = true,
  padding = 'md',
}) => {
  const paddingValue = getResponsiveValue(
    SPACING[padding],
    SPACING[padding] * 1.2,
    SPACING[padding] * 1.5
  );

  return (
    <View
      style={[
        styles.card,
        elevated && styles.elevated,
        { padding: paddingValue },
        isWeb && styles.webCard,
        style,
      ]}
    >
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
  },
  elevated: {
    ...SHADOWS.md,
  },
  webCard: {
    ...(Platform.OS === 'web' && {
      transition: 'box-shadow 0.2s ease, transform 0.2s ease',
    }),
  },
});

