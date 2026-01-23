/**
 * Responsive Grid Component for Mobile & Web
 */

import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { getGridColumns, getResponsiveValue, SPACING } from '../utils/responsive';

interface GridProps {
  children: React.ReactNode;
  columns?: number;
  gap?: number;
  style?: ViewStyle;
}

export const Grid: React.FC<GridProps> = ({
  children,
  columns,
  gap = SPACING.md,
  style,
}) => {
  const gridColumns = columns || getGridColumns();
  const gapValue = getResponsiveValue(gap, gap * 1.2, gap * 1.5);

  return (
    <View
      style={[
        styles.grid,
        {
          gap: gapValue,
          // @ts-ignore - web only
          gridTemplateColumns: `repeat(${gridColumns}, 1fr)`,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  grid: {
    // @ts-ignore - web only
    display: 'grid',
    width: '100%',
  },
});
