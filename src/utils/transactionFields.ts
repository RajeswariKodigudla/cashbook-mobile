/**
 * Transaction Field Configuration
 * Defines which fields to show based on category and transaction type
 */

export interface FieldConfig {
  key: string;
  label: string;
  type: 'text' | 'number' | 'date' | 'select' | 'boolean';
  required: boolean;
  placeholder?: string;
  options?: string[];
  categoryIds?: string[]; // If empty, applies to all categories of this type
}

export const getFieldsForCategory = (
  categoryId: string,
  transactionType: 'INCOME' | 'EXPENSE'
): FieldConfig[] => {
  const baseFields: FieldConfig[] = [
    {
      key: 'amount',
      label: 'Amount',
      type: 'number',
      required: true,
      placeholder: '0.00',
    },
    {
      key: 'note',
      label: 'Note',
      type: 'text',
      required: false,
      placeholder: 'Add a note...',
    },
    {
      key: 'location',
      label: 'Location',
      type: 'text',
      required: false,
      placeholder: 'Enter location',
    },
  ];

  // Salary-specific fields
  if (categoryId === 'salary' && transactionType === 'INCOME') {
    return [
      ...baseFields,
      {
        key: 'employer_name',
        label: 'Employer Name',
        type: 'text',
        required: true,
        placeholder: 'Enter employer name',
      },
      {
        key: 'salary_month',
        label: 'Salary Month',
        type: 'date',
        required: true,
        placeholder: 'Select month',
      },
      {
        key: 'tax_deducted',
        label: 'Tax Deducted',
        type: 'number',
        required: false,
        placeholder: '0.00',
      },
      {
        key: 'net_amount',
        label: 'Net Amount',
        type: 'number',
        required: false,
        placeholder: 'Auto-calculated',
      },
    ];
  }

  // Expense-specific fields
  if (transactionType === 'EXPENSE') {
    return [
      ...baseFields,
      {
        key: 'vendor_name',
        label: 'Vendor/Store Name',
        type: 'text',
        required: false,
        placeholder: 'Enter vendor name',
      },
      {
        key: 'invoice_number',
        label: 'Invoice Number',
        type: 'text',
        required: false,
        placeholder: 'Enter invoice number',
      },
      {
        key: 'receipt_number',
        label: 'Receipt Number',
        type: 'text',
        required: false,
        placeholder: 'Enter receipt number',
      },
      {
        key: 'tax_amount',
        label: 'Tax Amount',
        type: 'number',
        required: false,
        placeholder: '0.00',
      },
      {
        key: 'tax_percentage',
        label: 'Tax Percentage',
        type: 'number',
        required: false,
        placeholder: '0.00',
      },
    ];
  }

  // Default for other income types
  return baseFields;
};

export const getPaymentModes = (): string[] => {
  return ['Cash', 'Online', 'Card', 'UPI', 'Bank Transfer', 'Other'];
};

export const getRecurringFrequencies = (): string[] => {
  return ['Daily', 'Weekly', 'Monthly', 'Yearly'];
};

