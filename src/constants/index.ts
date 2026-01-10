/**
 * Mobile App Constants - Professional & Minimal Design
 */

export const API_BASE_URL = 'http://localhost:8000/api';

// Professional Color Palette - Minimal & Modern
export const COLORS = {
  // Primary - Professional Blue
  primary: '#2563EB',
  primaryLight: '#3B82F6',
  primaryDark: '#1E40AF',
  
  // Neutral Grays
  background: '#F8FAFC',
  surface: '#FFFFFF',
  surfaceElevated: '#FFFFFF',
  border: '#E2E8F0',
  borderLight: '#F1F5F9',
  
  // Text
  text: '#0F172A',
  textSecondary: '#64748B',
  textTertiary: '#94A3B8',
  textInverse: '#FFFFFF',
  
  // Status Colors
  success: '#10B981',
  successLight: '#D1FAE5',
  error: '#EF4444',
  errorLight: '#FEE2E2',
  warning: '#F59E0B',
  warningLight: '#FEF3C7',
  
  // Financial
  income: '#10B981',
  incomeLight: '#D1FAE5',
  expense: '#EF4444',
  expenseLight: '#FEE2E2',
  
  // Overlay
  overlay: 'rgba(15, 23, 42, 0.5)',
};

// Categories with Professional Icons
export interface Category {
  id: string;
  label: string;
  icon: string; // Icon name from @expo/vector-icons
  type: 'INCOME' | 'EXPENSE';
}

export const CATEGORIES: Category[] = [
  // Expenses
  { id: 'food', label: 'Food & Dining', icon: 'restaurant', type: 'EXPENSE' },
  { id: 'coffee', label: 'Coffee', icon: 'cafe', type: 'EXPENSE' },
  { id: 'transport', label: 'Transport', icon: 'car', type: 'EXPENSE' },
  { id: 'shopping', label: 'Shopping', icon: 'bag', type: 'EXPENSE' },
  { id: 'bills', label: 'Bills & Utilities', icon: 'flash', type: 'EXPENSE' },
  { id: 'rent', label: 'Rent/Home', icon: 'home', type: 'EXPENSE' },
  { id: 'entertainment', label: 'Entertainment', icon: 'play-circle', type: 'EXPENSE' },
  { id: 'health', label: 'Health', icon: 'medical', type: 'EXPENSE' },
  { id: 'travel', label: 'Travel', icon: 'airplane', type: 'EXPENSE' },
  { id: 'edu', label: 'Education', icon: 'school', type: 'EXPENSE' },
  { id: 'other_exp', label: 'Other', icon: 'ellipsis-horizontal', type: 'EXPENSE' },

  // Income
  { id: 'salary', label: 'Salary', icon: 'cash', type: 'INCOME' },
  { id: 'invest', label: 'Investment', icon: 'trending-up', type: 'INCOME' },
  { id: 'freelance', label: 'Freelance', icon: 'briefcase', type: 'INCOME' },
  { id: 'bonus', label: 'Bonus', icon: 'star', type: 'INCOME' },
  { id: 'gift', label: 'Gift', icon: 'gift', type: 'INCOME' },
  { id: 'other_inc', label: 'Other Income', icon: 'add-circle', type: 'INCOME' },
];

// Date Filter Options
export type DateFilterRange = 'TODAY' | 'WEEK' | 'MONTH' | 'LAST_MONTH' | 'YEAR' | 'ALL';

export interface DateFilterOption {
  value: DateFilterRange;
  label: string;
}

export const DATE_FILTER_OPTIONS: DateFilterOption[] = [
  { value: 'ALL', label: 'All Time' },
  { value: 'TODAY', label: 'Today' },
  { value: 'WEEK', label: 'This Week' },
  { value: 'MONTH', label: 'This Month' },
  { value: 'LAST_MONTH', label: 'Last Month' },
  { value: 'YEAR', label: 'This Year' },
];

// Typography
export const TYPOGRAPHY = {
  h1: { fontSize: 32, fontWeight: '700' as const, lineHeight: 40 },
  h2: { fontSize: 24, fontWeight: '600' as const, lineHeight: 32 },
  h3: { fontSize: 20, fontWeight: '600' as const, lineHeight: 28 },
  body: { fontSize: 16, fontWeight: '400' as const, lineHeight: 24 },
  bodyBold: { fontSize: 16, fontWeight: '600' as const, lineHeight: 24 },
  caption: { fontSize: 14, fontWeight: '400' as const, lineHeight: 20 },
  captionBold: { fontSize: 14, fontWeight: '600' as const, lineHeight: 20 },
  small: { fontSize: 12, fontWeight: '400' as const, lineHeight: 16 },
};

// Spacing
export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

// Border Radius
export const RADIUS = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  full: 9999,
};

// Shadows
export const SHADOWS = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
  },
};
