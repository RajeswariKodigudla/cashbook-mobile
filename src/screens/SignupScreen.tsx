/**
 * Professional Signup Screen - Modern Design
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  ScrollView,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaViewWrapper } from '../components/SafeAreaWrapper';
import { Input } from '../components/Input';
import { Button } from '../components/Button';
import { Container } from '../components/Container';
import { Card } from '../components/Card';
import { Loader } from '../components/Loader';
import { COLORS, TYPOGRAPHY, SPACING, RADIUS, SHADOWS } from '../constants';
import { Ionicons } from '@expo/vector-icons';
import { isWeb, getResponsiveValue } from '../utils/responsive';
import { register } from '../services/auth';

interface SignupScreenProps {
  navigation: any;
}

const SignupScreen: React.FC<SignupScreenProps> = ({ navigation }) => {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    password_confirm: '',
    first_name: '',
    last_name: '',
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);
  const [success, setSuccess] = useState(false);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.username.trim()) {
      newErrors.username = 'Username is required';
    } else if (formData.username.length < 3) {
      newErrors.username = 'Username must be at least 3 characters';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    }

    if (!formData.password_confirm) {
      newErrors.password_confirm = 'Please confirm your password';
    } else if (formData.password !== formData.password_confirm) {
      newErrors.password_confirm = 'Passwords do not match';
    }

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSignup = async () => {
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    setErrors({});

    try {
      const result = await register(
        formData.username,
        formData.email,
        formData.password,
        formData.password_confirm,
        formData.first_name,
        formData.last_name
      );

      if (result.success) {
        // Stop loading immediately
        setLoading(false);
        
        // Show success state briefly
        setSuccess(true);
        
        // Navigate to login after a short delay
        setTimeout(() => {
          setSuccess(false);
          // Navigate to login and pre-fill username
          navigation.navigate('Login', { 
            username: result.username || formData.username 
          });
        }, 1500);
      } else {
        // Handle registration failure with detailed error messages
        const errorMessage = result.message || 'Registration failed. Please try again.';
        
        // Check if there are field-specific errors
        if (result.errors) {
          setErrors(result.errors);
          Alert.alert(
            'Registration Failed',
            errorMessage,
            [{ text: 'OK' }]
          );
        } else {
          setErrors({ general: errorMessage });
          Alert.alert(
            'Registration Failed',
            errorMessage,
            [{ text: 'OK' }]
          );
        }
      }
    } catch (error: any) {
      console.error('Signup error:', error);
      
      // Enhanced error handling with field-specific errors
      let errorMessages: Record<string, string> = {};
      let alertMessage = 'An error occurred. Please try again.';
      
      if (error.response?.data) {
        // Handle validation errors from backend
        if (error.response.data.errors) {
          const backendErrors = error.response.data.errors;
          
          Object.keys(backendErrors).forEach((key) => {
            if (Array.isArray(backendErrors[key])) {
              errorMessages[key] = backendErrors[key][0];
            } else if (typeof backendErrors[key] === 'string') {
              errorMessages[key] = backendErrors[key];
            } else {
              errorMessages[key] = String(backendErrors[key]);
            }
          });
          
          // Set field-specific errors
          setErrors(errorMessages);
          
          // Create alert message from first error
          const firstErrorKey = Object.keys(errorMessages)[0];
          alertMessage = errorMessages[firstErrorKey] || 'Please check the form and try again.';
        } else if (error.response.data.message) {
          alertMessage = error.response.data.message;
          setErrors({ general: alertMessage });
        } else if (error.response.data.detail) {
          alertMessage = error.response.data.detail;
          setErrors({ general: alertMessage });
        }
      } else if (error.message) {
        alertMessage = error.message;
        setErrors({ general: alertMessage });
      }
      
      Alert.alert('Registration Failed', alertMessage, [{ text: 'OK' }]);
    } finally {
      setLoading(false);
    }
  };

  const updateField = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
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
              {/* Header Section */}
              <View style={styles.headerSection}>
                <TouchableOpacity
                  style={styles.backButton}
                  onPress={() => navigation.goBack()}
                >
                  <Ionicons name="arrow-back" size={24} color={COLORS.text} />
                </TouchableOpacity>
                <View style={styles.logoContainer}>
                  <View
                    style={[
                      styles.logoCircle,
                      { width: logoSize, height: logoSize, borderRadius: logoSize / 2 },
                    ]}
                  >
                    <View style={styles.logoInner}>
                      <Ionicons name="person-add" size={iconSize} color={COLORS.primary} />
                    </View>
                  </View>
                </View>
                <View style={styles.titleContainer}>
                  <Text style={styles.title}>Create Account</Text>
                  <Text style={styles.subtitle}>
                    Join Cashbook and manage your finances
                  </Text>
                </View>
              </View>

              {/* Success Overlay */}
              {success && (
                <View style={styles.successOverlay}>
                  <View style={styles.successCard}>
                    <View style={styles.successIconContainer}>
                      <Ionicons name="checkmark-circle" size={64} color={COLORS.success} />
                    </View>
                    <Text style={styles.successTitle}>Account Created!</Text>
                    <Text style={styles.successMessage}>
                      Welcome, {formData.username}!{'\n'}Redirecting to login...
                    </Text>
                  </View>
                </View>
              )}

              {/* Form Card */}
              <Card style={styles.formCard} elevated padding="xl">
                <View style={styles.formSection}>
                  {/* Name Fields */}
                  <View style={styles.row}>
                    <View style={[styles.inputGroup, styles.halfWidth]}>
                      <Input
                        label="First Name"
                        placeholder="John"
                        value={formData.first_name}
                        onChangeText={(text) => updateField('first_name', text)}
                        autoCapitalize="words"
                        editable={!loading}
                        error={errors.first_name}
                      />
                    </View>
                    <View style={[styles.inputGroup, styles.halfWidth]}>
                      <Input
                        label="Last Name"
                        placeholder="Doe"
                        value={formData.last_name}
                        onChangeText={(text) => updateField('last_name', text)}
                        autoCapitalize="words"
                        editable={!loading}
                        error={errors.last_name}
                      />
                    </View>
                  </View>

                  {/* Username */}
                  <View style={styles.inputGroup}>
                    <Input
                      label="Username"
                      placeholder="Choose a username"
                      value={formData.username}
                      onChangeText={(text) => updateField('username', text.toLowerCase().trim())}
                      autoCapitalize="none"
                      autoCorrect={false}
                      editable={!loading}
                      error={errors.username}
                      autoFocus={isWeb}
                    />
                    {errors.username && (
                      <Text style={styles.fieldErrorText}>{errors.username}</Text>
                    )}
                  </View>

                  {/* Email */}
                  <View style={styles.inputGroup}>
                    <Input
                      label="Email (Optional)"
                      placeholder="your.email@example.com"
                      value={formData.email}
                      onChangeText={(text) => updateField('email', text)}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoCorrect={false}
                      editable={!loading}
                      error={errors.email}
                    />
                  </View>

                  {/* Password */}
                  <View style={styles.inputGroup}>
                    <Input
                      label="Password"
                      placeholder="At least 8 characters"
                      value={formData.password}
                      onChangeText={(text) => updateField('password', text)}
                      secureTextEntry={!showPassword}
                      autoCapitalize="none"
                      autoCorrect={false}
                      editable={!loading}
                      error={errors.password}
                      rightIcon={
                        <TouchableOpacity
                          onPress={() => setShowPassword(!showPassword)}
                          style={styles.iconButton}
                        >
                          <Ionicons
                            name={showPassword ? 'eye-off' : 'eye'}
                            size={20}
                            color={COLORS.textSecondary}
                          />
                        </TouchableOpacity>
                      }
                    />
                  </View>

                  {/* Confirm Password */}
                  <View style={styles.inputGroup}>
                    <Input
                      label="Confirm Password"
                      placeholder="Re-enter your password"
                      value={formData.password_confirm}
                      onChangeText={(text) => updateField('password_confirm', text)}
                      secureTextEntry={!showPasswordConfirm}
                      autoCapitalize="none"
                      autoCorrect={false}
                      editable={!loading}
                      error={errors.password_confirm}
                      rightIcon={
                        <TouchableOpacity
                          onPress={() => setShowPasswordConfirm(!showPasswordConfirm)}
                          style={styles.iconButton}
                        >
                          <Ionicons
                            name={showPasswordConfirm ? 'eye-off' : 'eye'}
                            size={20}
                            color={COLORS.textSecondary}
                          />
                        </TouchableOpacity>
                      }
                    />
                  </View>
                </View>

                {/* Action Section */}
                <View style={styles.actionSection}>
                  <Button
                    title={loading ? 'Creating Account...' : 'Create Account'}
                    onPress={handleSignup}
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
                    <Ionicons name="shield-checkmark" size={18} color={COLORS.success} />
                    <View style={styles.infoContent}>
                      <Text style={styles.infoTitle}>Secure Registration</Text>
                      <Text style={styles.infoText}>
                        Your data is encrypted and secure. We never share your information.
                      </Text>
                    </View>
                  </View>
                </View>
              </Card>

              {/* Footer Section */}
              <View style={styles.footerSection}>
                <Text style={styles.footerText}>Already have an account?</Text>
                <TouchableOpacity
                  onPress={() => navigation.navigate('Login')}
                  style={styles.linkButton}
                >
                  <Text style={styles.linkText}>Sign In</Text>
                </TouchableOpacity>
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
    ...(isWeb && {
      // @ts-ignore - web only
      backgroundImage: `linear-gradient(135deg, ${COLORS.background} 0%, ${COLORS.surface} 100%)`,
    }),
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
    position: 'relative',
  },
  backButton: {
    position: 'absolute',
    left: 0,
    top: 0,
    padding: SPACING.sm,
    zIndex: 1,
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
  formSection: {
    marginBottom: SPACING.lg,
  },
  row: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  inputGroup: {
    marginBottom: SPACING.lg,
  },
  halfWidth: {
    flex: 1,
  },
  iconButton: {
    padding: SPACING.xs,
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
    backgroundColor: COLORS.successLight + '08',
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    gap: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.successLight + '20',
  },
  infoContent: {
    flex: 1,
  },
  infoTitle: {
    ...TYPOGRAPHY.captionBold,
    color: COLORS.success,
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
    flexDirection: 'row',
    justifyContent: 'center',
    gap: SPACING.xs,
  },
  footerText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textTertiary,
    fontSize: 14,
  },
  linkButton: {
    padding: SPACING.xs,
  },
  linkText: {
    ...TYPOGRAPHY.captionBold,
    color: COLORS.primary,
    fontSize: 14,
  },
  // Success Overlay
  successOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
    padding: SPACING.xl,
  },
  successCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: SPACING.xxl,
    alignItems: 'center',
    maxWidth: 400,
    width: '100%',
    ...SHADOWS.lg,
  },
  successIconContainer: {
    marginBottom: SPACING.lg,
  },
  successTitle: {
    ...TYPOGRAPHY.h2,
    fontSize: getResponsiveValue(24, 28, 32),
    color: COLORS.text,
    marginBottom: SPACING.md,
    fontWeight: '700',
    textAlign: 'center',
  },
  successMessage: {
    ...TYPOGRAPHY.body,
    fontSize: getResponsiveValue(15, 16, 17),
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: SPACING.xl,
    lineHeight: 24,
  },
  fieldErrorText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.error,
    fontSize: 12,
    marginTop: SPACING.xs / 2,
    marginLeft: SPACING.xs,
  },
});

export default SignupScreen;

