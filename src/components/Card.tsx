/**
 * Professional Card Component
 */

import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { COLORS, RADIUS, SHADOWS, SPACING } from '../constants';

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
  return (
    <View
      style={[
        styles.card,
        elevated && styles.elevated,
        { padding: SPACING[padding] },
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
});

