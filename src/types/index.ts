/**
 * TypeScript types for mobile app
 */

export type TransactionType = 'INCOME' | 'EXPENSE';
export type DateFilterRange =
  | 'TODAY'
  | 'WEEK'
  | 'MONTH'
  | 'LAST_MONTH'
  | 'YEAR'
  | 'ALL';

export interface Transaction {
  id: string;
  amount: number;
  type: TransactionType;

  /* ===========================
     ✅ BACKEND-SAFE FIELDS
     =========================== */
  date?: string;          // ← FIX
  time?: string;          // ← FIX
  timestamp: number;      // already used everywhere

  /* ===========================
     CATEGORY & NOTE
     =========================== */
  categoryId: string;
  category?: string;
  note?: string;
  remark?: string;        // ← FIX (backend sometimes uses this)

  mode?: string;
  location?: string;

  /* ===========================
     INCOME / SALARY
     =========================== */
  employer_name?: string;
  salary_month?: string;
  tax_deducted?: number;
  net_amount?: number;

  /* ===========================
     EXPENSE
     =========================== */
  vendor_name?: string;
  invoice_number?: string;
  receipt_number?: string;
  tax_amount?: number;
  tax_percentage?: number;

  /* ===========================
     RECURRING
     =========================== */
  recurring?: boolean;
  recurring_frequency?: string;
  next_due_date?: string;

  /* ===========================
     CUSTOM / EXTENSIBLE
     =========================== */
  custom_fields?: Record<string, any>;

  /* ===========================
     ✅ VERY IMPORTANT
     Allows backend to send
     extra keys without TS errors
     =========================== */
  [key: string]: any;
}

export interface FinancialStats {
  balance: number;
  income: number;
  expenses: number;
  transactionCount: number;
}

export type PaymentMode = 'CASH' | 'CARD' | 'UPI' | 'BANK_TRANSFER' | 'ONLINE' | 'OTHER';

export interface TransactionFilters {
  type?: TransactionType;
  categoryId?: string;
  dateRange?: DateFilterRange;
  searchQuery?: string;
}

// ===========================
// SHARED ACCOUNTS TYPES
// ===========================

export type AccountMemberRole = 'OWNER' | 'MEMBER';
export type AccountMemberStatus = 'INVITED' | 'ACCEPTED' | 'REJECTED' | 'PENDING';

export interface AccountMemberPermissions {
  canAddEntry: boolean;
  canEditOwnEntry: boolean;
  canEditAllEntries: boolean;
  canDeleteEntry: boolean;
}

export interface AccountMember {
  id: string;
  accountId: string;
  userId: string;
  user?: {
    id: string;
    username: string;
    email?: string;
  };
  role: AccountMemberRole;
  permissions: AccountMemberPermissions;
  status: AccountMemberStatus;
  invitedAt?: string;
  acceptedAt?: string;
  invitedBy?: string;
}

export interface Account {
  id: string;
  accountName: string;
  ownerId: string;
  owner?: {
    id: string;
    username: string;
    email?: string;
  };
  createdAt: string;
  updatedAt: string;
  memberCount?: number;
  members?: AccountMember[];
}

export interface AccountInvite {
  id: string;
  accountId: string;
  accountName: string;
  invitedBy: string;
  invitedByUser?: {
    id: string;
    username: string;
  };
  email?: string;
  userId?: string;
  status: AccountMemberStatus;
  permissions?: AccountMemberPermissions;
  createdAt: string;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  accountId?: string;
  accountName?: string;
  triggeredBy: string;
  triggeredByUser?: {
    id: string;
    username: string;
  };
  type: 'INVITATION' | 'INVITATION_ACCEPTED' | 'TRANSACTION_ADDED' | 'TRANSACTION_EDITED' | 'PERMISSION_CHANGED' | 'MEMBER_REMOVED';
  read: boolean;
  timestamp: string;
  data?: Record<string, any>;
}

