/**
 * Premium Loader Component - Byjan Style
 */

import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, ActivityIndicator, Text } from 'react-native';
import { COLORS, TYPOGRAPHY, SPACING } from '../constants';
import { Ionicons } from '@expo/vector-icons';
import { isWeb } from '../utils/responsive';

interface LoaderProps {
  visible?: boolean;
  message?: string;
  size?: 'small' | 'large';
  fullScreen?: boolean;
  overlay?: boolean;
}

export const Loader: React.FC<LoaderProps> = ({
  visible = true,
  message,
  size = 'large',
  fullScreen = false,
  overlay = true,
}) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: false,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 8,
          tension: 40,
          useNativeDriver: false,
        }),
        Animated.loop(
          Animated.timing(rotateAnim, {
            toValue: 1,
            duration: 2000,
            useNativeDriver: false,
          })
        ),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: false,
        }),
        Animated.timing(scaleAnim, {
          toValue: 0.8,
          duration: 200,
          useNativeDriver: false,
        }),
      ]).start();
    }
  }, [visible]);

  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  if (!visible) return null;

  const content = (
    <Animated.View
      style={[
        styles.container,
        fullScreen && styles.fullScreen,
        {
          opacity: fadeAnim,
          transform: [{ scale: scaleAnim }],
        },
      ]}
    >
      <View style={styles.loaderBox}>
        <Animated.View style={{ transform: [{ rotate: spin }] }}>
          <View style={styles.iconContainer}>
            <Ionicons name="cash" size={48} color={COLORS.primary} />
          </View>
        </Animated.View>
        <View style={styles.pulseContainer}>
          <View style={[styles.pulse, styles.pulse1]} />
          <View style={[styles.pulse, styles.pulse2]} />
          <View style={[styles.pulse, styles.pulse3]} />
        </View>
        {message && message.trim().length > 0 ? <Text style={styles.message}>{message}</Text> : null}
      </View>
    </Animated.View>
  );

  if (overlay) {
    return (
      <View style={[styles.overlay, fullScreen && styles.fullScreen]}>
        {content}
      </View>
    );
  }

  return content;
};

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
  },
  fullScreen: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loaderBox: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.xl,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
    ...(isWeb ? {
      // @ts-ignore - web only
      boxShadow: `0 4px 8px rgba(37, 99, 235, 0.3)`,
    } : {
      shadowColor: COLORS.primary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 8,
    }),
  },
  pulseContainer: {
    position: 'absolute',
    width: 80,
    height: 80,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pulse: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    borderColor: COLORS.primary,
    opacity: 0,
  },
  pulse1: {
    // Pulse animation handled via Animated API in component
  },
  pulse2: {
    // Pulse animation handled via Animated API in component
  },
  pulse3: {
    // Pulse animation handled via Animated API in component
  },
  message: {
    ...TYPOGRAPHY.body,
    color: COLORS.textInverse,
    marginTop: SPACING.lg,
    textAlign: 'center',
  },
});

// Simple Loader Variant
export const SimpleLoader: React.FC<{ visible?: boolean; message?: string }> = ({
  visible = true,
  message,
}) => {
  if (!visible) return null;

  return (
    <View style={simpleStyles.container}>
      <ActivityIndicator size="large" color={COLORS.primary} />
      {message && message.trim().length > 0 ? <Text style={simpleStyles.message}>{message}</Text> : null}
    </View>
  );
};

const simpleStyles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xl,
  },
  message: {
    ...TYPOGRAPHY.body,
    color: COLORS.textSecondary,
    marginTop: SPACING.md,
    textAlign: 'center',
  },
});

