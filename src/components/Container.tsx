/**
 * Responsive Container Component for Mobile & Web
 */

import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { COLORS, SPACING } from '../constants';
import { isWeb, getContainerPadding, getMaxContentWidth } from '../utils/responsive';

interface ContainerProps {
  children: React.ReactNode;
  style?: ViewStyle;
  maxWidth?: boolean;
  padding?: number;
}

export const Container: React.FC<ContainerProps> = ({
  children,
  style,
  maxWidth = true,
  padding,
}) => {
  const containerPadding = padding !== undefined ? padding : getContainerPadding();
  const maxWidthValue = maxWidth ? getMaxContentWidth() : undefined;

  return (
    <View
      style={[
        styles.container,
        { padding: containerPadding },
        maxWidth && maxWidthValue && { maxWidth: maxWidthValue, alignSelf: 'center', width: '100%' },
        isWeb && styles.webContainer,
        style,
      ]}
    >
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  webContainer: {
    // Web-specific styles handled via inline styles with alignSelf
  },
});
