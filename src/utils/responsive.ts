/**
 * Responsive Utilities for Mobile and Web
 */

import { Dimensions, Platform } from 'react-native';

// Get screen dimensions - handle web properly
const getDimensions = () => {
  if (Platform.OS === 'web') {
    // @ts-ignore - web only
    return {
      width: typeof window !== 'undefined' ? window.innerWidth : 768,
      height: typeof window !== 'undefined' ? window.innerHeight : 1024,
    };
  }
  return Dimensions.get('window');
};

const { width, height } = getDimensions();

// Breakpoints
export const BREAKPOINTS = {
  mobile: 768,
  tablet: 1024,
  desktop: 1440,
};

// Device detection
export const isWeb = Platform.OS === 'web';
export const isMobile = !isWeb || width < BREAKPOINTS.mobile;
export const isTablet = !isWeb ? false : width >= BREAKPOINTS.mobile && width < BREAKPOINTS.tablet;
export const isDesktop = !isWeb ? false : width >= BREAKPOINTS.tablet;

// Responsive values
export const getResponsiveValue = <T,>(mobile: T, tablet?: T, desktop?: T): T => {
  if (isDesktop && desktop !== undefined) return desktop;
  if (isTablet && tablet !== undefined) return tablet;
  return mobile;
};

// Responsive spacing
export const getSpacing = (base: number): number => {
  return getResponsiveValue(base, base * 1.2, base * 1.5);
};

// Responsive font size
export const getFontSize = (base: number): number => {
  return getResponsiveValue(base, base * 1.1, base * 1.2);
};

// Max width for content
export const getMaxContentWidth = (): number => {
  return getResponsiveValue(width, BREAKPOINTS.tablet, BREAKPOINTS.desktop);
};

// Grid columns
export const getGridColumns = (): number => {
  return getResponsiveValue(1, 2, 3);
};

// Container padding
export const getContainerPadding = (): number => {
  return getResponsiveValue(16, 24, 32);
};

// Card width
export const getCardWidth = (): number | string => {
  return getResponsiveValue('100%', '48%', '32%');
};
