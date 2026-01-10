/**
 * Professional Login Screen - Minimal Design
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  ScrollView,
  Alert,
} from 'react-native';
import { SafeAreaViewWrapper } from '../components/SafeAreaWrapper';
import { Input } from '../components/Input';
import { Button } from '../components/Button';
import { Container } from '../components/Container';
import { Card } from '../components/Card';
import { useApp } from '../contexts/AppContext';
import { COLORS, TYPOGRAPHY, SPACING, RADIUS, SHADOWS } from '../constants';
import { Ionicons } from '@expo/vector-icons';
import { isWeb, getResponsiveValue } from '../utils/responsive';

const LoginScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { setAuth } = useApp();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!username.trim() || !password.trim()) {
      Alert.alert('Error', 'Please enter both username and password');
      return;
    }

    setLoading(true);

    // Simple authentication
    setTimeout(() => {
      if (username === 'admin' && password === 'admin123') {
        setAuth(username);
        navigation.replace('Dashboard');
      } else {
        Alert.alert('Error', 'Invalid credentials');
      }
      setLoading(false);
    }, 500);
  };

  const logoSize = getResponsiveValue(72, 88, 96);
  const iconSize = getResponsiveValue(36, 44, 48);

  return (
    <SafeAreaViewWrapper style={styles.container} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        behavior={isWeb ? undefined : 'padding'}
        style={styles.keyboardView}
        enabled={!isWeb}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Container maxWidth style={styles.containerInner}>
            <View style={styles.content}>
              {/* Professional Header Section */}
              <View style={styles.headerSection}>
                <View style={styles.logoContainer}>
                  <View style={[styles.logoCircle, { width: logoSize, height: logoSize, borderRadius: logoSize / 2 }]}>
                    <View style={styles.logoInner}>
                      <Ionicons name="wallet" size={iconSize} color={COLORS.primary} />
                    </View>
                  </View>
                </View>
                <View style={styles.titleContainer}>
                  <Text style={styles.title}>Cashbook</Text>
                  <Text style={styles.subtitle}>Financial Management Made Simple</Text>
                </View>
              </View>

              {/* Professional Form Card */}
              <Card style={styles.formCard} elevated padding="xl">
                {/* Form Header */}
                <View style={styles.formHeader}>
                  <Text style={styles.formTitle}>Welcome Back</Text>
                  <Text style={styles.formSubtitle}>Sign in to continue to your account</Text>
                </View>

                {/* Form Fields Section */}
                <View style={styles.formSection}>
                  <View style={styles.inputGroup}>
                    <Input
                      label="Username"
                      placeholder="Enter your username"
                      value={username}
                      onChangeText={setUsername}
                      autoCapitalize="none"
                      autoCorrect={false}
                      editable={!loading}
                      autoFocus={isWeb}
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <Input
                      label="Password"
                      placeholder="Enter your password"
                      value={password}
                      onChangeText={setPassword}
                      secureTextEntry
                      autoCapitalize="none"
                      autoCorrect={false}
                      editable={!loading}
                      onSubmitEditing={handleLogin}
                    />
                  </View>
                </View>

                {/* Action Section */}
                <View style={styles.actionSection}>
                  <Button
                    title={loading ? 'Signing In...' : 'Sign In'}
                    onPress={handleLogin}
                    loading={loading}
                    disabled={loading}
                    fullWidth
                    size="lg"
                    style={styles.button}
                  />
                </View>

                {/* Info Section */}
                <View style={styles.infoSection}>
                  <View style={styles.infoCard}>
                    <Ionicons name="information-circle" size={18} color={COLORS.primary} />
                    <View style={styles.infoContent}>
                      <Text style={styles.infoTitle}>Demo Credentials</Text>
                      <Text style={styles.infoText}>Username: admin | Password: admin123</Text>
                    </View>
                  </View>
                </View>
              </Card>

              {/* Footer Section */}
              <View style={styles.footerSection}>
                <View style={styles.footerCard}>
                  <Ionicons name="shield-checkmark" size={20} color={COLORS.success} />
                  <Text style={styles.footerText}>Secure & Encrypted</Text>
                </View>
              </View>
            </View>
          </Container>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaViewWrapper>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    // @ts-ignore - web only
    background: isWeb ? `linear-gradient(135deg, ${COLORS.background} 0%, ${COLORS.surface} 100%)` : COLORS.background,
  },
  containerInner: {
    minHeight: '100%',
    justifyContent: 'center',
    paddingVertical: getResponsiveValue(SPACING.xl, SPACING.xxl, SPACING.xxl * 1.5),
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    minHeight: '100%',
  },
  content: {
    width: '100%',
    maxWidth: getResponsiveValue(420, 480, 520),
    alignSelf: 'center',
  },
  // Header Section
  headerSection: {
    alignItems: 'center',
    marginBottom: SPACING.xl * 1.5,
    paddingBottom: SPACING.xl,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  logoContainer: {
    marginBottom: SPACING.lg,
    alignItems: 'center',
  },
  logoCircle: {
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.md,
    borderWidth: 3,
    borderColor: COLORS.primary + '20',
    position: 'relative',
  },
  logoInner: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 9999,
    backgroundColor: COLORS.primaryLight + '08',
  },
  titleContainer: {
    alignItems: 'center',
  },
  title: {
    ...TYPOGRAPHY.h1,
    fontSize: getResponsiveValue(36, 40, 44),
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: SPACING.xs,
    fontWeight: '800',
    letterSpacing: -1,
  },
  subtitle: {
    ...TYPOGRAPHY.body,
    fontSize: getResponsiveValue(15, 16, 17),
    color: COLORS.textSecondary,
    textAlign: 'center',
    fontWeight: '500',
  },
  // Form Card
  formCard: {
    width: '100%',
    marginBottom: SPACING.lg,
  },
  formHeader: {
    marginBottom: SPACING.xl,
    paddingBottom: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
    alignItems: 'flex-start',
  },
  formTitle: {
    ...TYPOGRAPHY.h2,
    fontSize: getResponsiveValue(24, 26, 28),
    color: COLORS.text,
    marginBottom: SPACING.xs,
    fontWeight: '700',
  },
  formSubtitle: {
    ...TYPOGRAPHY.body,
    fontSize: getResponsiveValue(14, 15, 16),
    color: COLORS.textSecondary,
  },
  // Form Section
  formSection: {
    marginBottom: SPACING.lg,
  },
  inputGroup: {
    marginBottom: SPACING.lg,
  },
  // Action Section
  actionSection: {
    marginTop: SPACING.lg,
    marginBottom: SPACING.md,
  },
  button: {
    // Button styles handled by component
  },
  // Info Section
  infoSection: {
    marginTop: SPACING.lg,
    paddingTop: SPACING.lg,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: COLORS.primaryLight + '08',
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    gap: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.primaryLight + '20',
  },
  infoContent: {
    flex: 1,
  },
  infoTitle: {
    ...TYPOGRAPHY.captionBold,
    color: COLORS.primary,
    marginBottom: SPACING.xs / 2,
    fontSize: 13,
  },
  infoText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    fontSize: 12,
    lineHeight: 18,
  },
  // Footer Section
  footerSection: {
    marginTop: SPACING.lg,
    alignItems: 'center',
  },
  footerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  footerText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textTertiary,
    fontSize: 12,
  },
});

export default LoginScreen;
