/**
 * TypeScript types for mobile app
 */

export type TransactionType = 'INCOME' | 'EXPENSE';
export type DateFilterRange = 'TODAY' | 'WEEK' | 'MONTH' | 'LAST_MONTH' | 'YEAR' | 'ALL';

export interface Transaction {
  id: string;
  amount: number;
  type: TransactionType;
  categoryId: string;
  note?: string;
  timestamp: number;
}

export interface FinancialStats {
  balance: number;
  income: number;
  expenses: number;
  transactionCount: number;
}

export interface TransactionFilters {
  type?: TransactionType;
  categoryId?: string;
  dateRange?: DateFilterRange;
  searchQuery?: string;
}

