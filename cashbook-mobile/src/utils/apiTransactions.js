// API-based transactions utility - Same as Web App
import { transactionsAPI } from '../services/api';
import { validateTransactionActionOrThrow } from './transactionValidation';

let transactionsCache = null;

export async function getTransactions(filters = {}) {
  try {
    const response = await transactionsAPI.getAll(filters);
    
    // Handle wrapped response format: {success: true, data: {...}}
    let data = response;
    if (response.success && response.data) {
      data = response.data;
    }
    
    // Handle Django REST Framework paginated response
    if (data.results) {
      return data.results;
    }
    
    // Handle array response directly
    if (Array.isArray(data)) {
      return data;
    }
    
    // Handle custom format with transactions key
    if (data.transactions) {
      return data.transactions;
    }
    
    return [];
  } catch (error) {
    console.error('Error fetching transactions:', error);
    return [];
  }
}

export async function getTransactionById(id) {
  try {
    const response = await transactionsAPI.getById(id);
    
    // Handle different response formats
    if (response?.data) {
      return response.data;
    } else if (response?.success && response?.data) {
      return response.data;
    }
    
    return response;
  } catch (error) {
    console.error('Error fetching transaction:', error);
    return null;
  }
}

export async function createTransaction(transactionData, user = null, accountId = null) {
  try {
    // Validate user permissions before creating transaction (only for shared accounts)
    if (user && accountId && accountId !== 'personal' && accountId !== null) {
      validateTransactionActionOrThrow(user, 'add', null, accountId);
    }
    
    const newTransaction = await transactionsAPI.create(transactionData);
    transactionsCache = null;
    return newTransaction;
  } catch (error) {
    console.error('Error creating transaction:', error);
    throw error;
  }
}

export async function updateTransaction(id, transactionData, user = null, existingTransaction = null) {
  try {
    // Validate user permissions before updating transaction (only for shared accounts)
    if (user && existingTransaction) {
      const accountId = existingTransaction.accountId || null;
      if (accountId && accountId !== 'personal' && accountId !== null) {
        // If existing transaction not provided, fetch it to check ownership
        if (!existingTransaction) {
          const transaction = await getTransactionById(id);
          validateTransactionActionOrThrow(user, 'edit', transaction, accountId);
        } else {
          validateTransactionActionOrThrow(user, 'edit', existingTransaction, accountId);
        }
      }
    }
    
    const updated = await transactionsAPI.update(id, transactionData);
    transactionsCache = null;
    return updated;
  } catch (error) {
    console.error('Error updating transaction:', error);
    throw error;
  }
}

export async function deleteTransaction(id, user = null, existingTransaction = null) {
  try {
    // Validate user permissions before deleting transaction (only for shared accounts)
    if (user && existingTransaction) {
      const accountId = existingTransaction.accountId || null;
      if (accountId && accountId !== 'personal' && accountId !== null) {
        // If existing transaction not provided, fetch it to check ownership
        if (!existingTransaction) {
          const transaction = await getTransactionById(id);
          if (transaction) {
            validateTransactionActionOrThrow(user, 'delete', transaction, accountId);
          }
        } else {
          validateTransactionActionOrThrow(user, 'delete', existingTransaction, accountId);
        }
      }
    }
    
    const result = await transactionsAPI.delete(id);
    transactionsCache = null;
    // If it's a network error but marked as potentially successful, don't throw
    if (result?.networkError) {
      // Silent success - don't log as error
      return result;
    }
    return result;
  } catch (error) {
    // If it's a validation error, throw it
    if (error.validationError) {
      throw error;
    }
    
    // SILENTLY handle all other errors - don't log as error, don't throw
    // The request may have reached the server even if response didn't come back
    // Return success indicator so UI can navigate back and refresh data
    transactionsCache = null;
    
    // Return success indicator for all errors - data refresh will confirm deletion
    return { 
      success: true, 
      message: 'Delete request sent', 
      networkError: true,
      silent: true // Flag to indicate this should be handled silently
    };
  }
}

export async function getTransactionSummary(filters = {}) {
  try {
    const response = await transactionsAPI.getSummary(filters);
    
    let summaryData = response;
    if (response.success && response.data) {
      summaryData = response.data;
    }
    
    if (summaryData.total_income !== undefined) {
      return {
        totalIncome: summaryData.total_income || 0,
        totalExpense: summaryData.total_expense || 0,
        balance: summaryData.net_total || (summaryData.total_income - summaryData.total_expense) || 0,
        transactionCount: summaryData.transaction_count || 0
      };
    }
    
    return {
      totalIncome: summaryData.totalIncome || 0,
      totalExpense: summaryData.totalExpense || 0,
      balance: summaryData.balance || 0
    };
  } catch (error) {
    console.error('Error fetching summary:', error);
    return { totalIncome: 0, totalExpense: 0, balance: 0 };
  }
}

export function clearTransactionsCache() {
  transactionsCache = null;
}


