/**
 * API Service for mobile app
 */

import axios from 'axios';
import { API_BASE_URL } from '../constants';
import { Transaction } from '../types';

// Optional SecureStore - only use if available
let SecureStore: any = null;
try {
  const store = require('expo-secure-store');
  // Check if methods exist
  if (store && typeof store.getItemAsync === 'function' && typeof store.setItemAsync === 'function') {
    SecureStore = store;
  }
} catch (e) {
  // SecureStore not available
}

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const transactionService = {
  async getTransactions(): Promise<Transaction[]> {
    try {
      const response = await api.get<Transaction[]>('/transactions/');
      return response.data;
    } catch (error) {
      console.error('Error fetching transactions:', error);
      // Fallback to local storage if available
      if (SecureStore) {
        try {
          const stored = await SecureStore.getItemAsync('transactions');
          return stored ? JSON.parse(stored) : [];
        } catch (e) {
          console.warn('SecureStore fallback failed:', e);
        }
      }
      return [];
    }
  },

  async createTransaction(transaction: Omit<Transaction, 'id'>): Promise<Transaction[]> {
    // Don't send ID - let backend generate it
    const transactionData = {
      amount: transaction.amount,
      type: transaction.type,
      categoryId: transaction.categoryId,
      note: transaction.note || '',
      timestamp: transaction.timestamp || Date.now(),
    };

    try {
      const response = await api.post<Transaction[]>('/transactions/', transactionData);
      console.log('✅ API Response - Status:', response.status);
      console.log('✅ Response data:', response.data);
      console.log('✅ Is Array:', Array.isArray(response.data));
      
      // Backend returns array of all transactions on 201
      let transactions: Transaction[] = [];
      
      if (Array.isArray(response.data)) {
        transactions = response.data;
        console.log('✅ Direct array response:', transactions.length, 'transactions');
      } else if (response.data && typeof response.data === 'object') {
        // Try to extract array from response object
        if (Array.isArray(response.data.data)) {
          transactions = response.data.data;
          console.log('✅ Found in response.data.data:', transactions.length);
        } else if (Array.isArray(response.data.transactions)) {
          transactions = response.data.transactions;
          console.log('✅ Found in response.data.transactions:', transactions.length);
        } else {
          console.warn('⚠️ Response is object but no array found:', Object.keys(response.data));
        }
      }
      
      if (transactions.length >= 0) {
        console.log('✅ Saving', transactions.length, 'transactions to storage');
        // Save to SecureStore if available (optional - backend is source of truth)
        if (SecureStore) {
          try {
            await SecureStore.setItemAsync('transactions', JSON.stringify(transactions));
          } catch (e) {
            console.warn('Failed to save to SecureStore (non-critical):', e);
          }
        }
        return transactions;
      }
      
      // Fallback: reload all transactions
      console.log('⚠️ No transactions in response, reloading...');
      return await this.getTransactions();
    } catch (error: any) {
      console.error('❌ Create error:', error);
      console.error('Error status:', error.response?.status);
      console.error('Error data:', JSON.stringify(error.response?.data, null, 2));
      
      // Axios should not throw on 2xx, but handle it just in case
      if (error.response?.status >= 200 && error.response?.status < 300) {
        let transactions: Transaction[] = [];
        const responseData = error.response.data;
        
        if (Array.isArray(responseData)) {
          transactions = responseData;
        } else if (responseData?.data && Array.isArray(responseData.data)) {
          transactions = responseData.data;
        }
        
        if (transactions.length >= 0) {
          // Save to SecureStore if available
          if (SecureStore) {
            try {
              await SecureStore.setItemAsync('transactions', JSON.stringify(transactions));
            } catch (e) {
              console.warn('Failed to save to SecureStore (non-critical):', e);
            }
          }
          return transactions;
        }
      }
      
      // Extract error message
      const errorData = error.response?.data;
      let errorMessage = 'Failed to create transaction';
      
      if (errorData) {
        if (typeof errorData === 'string') {
          errorMessage = errorData;
        } else if (errorData.error) {
          errorMessage = typeof errorData.error === 'string' 
            ? errorData.error 
            : JSON.stringify(errorData.error);
        } else if (errorData.details) {
          if (typeof errorData.details === 'string') {
            errorMessage = errorData.details;
          } else if (typeof errorData.details === 'object') {
            // Get first error message from details object
            const firstError = Object.values(errorData.details)[0];
            errorMessage = Array.isArray(firstError) ? firstError[0] : String(firstError);
          }
        } else if (errorData.message) {
          errorMessage = errorData.message;
        }
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      throw new Error(errorMessage);
    }
  },

  async updateTransaction(id: string, updates: Partial<Transaction>): Promise<Transaction[]> {
    try {
      // Don't send ID in body, only in URL
      const updateData: any = {};
      if (updates.amount !== undefined) updateData.amount = updates.amount;
      if (updates.type !== undefined) updateData.type = updates.type;
      if (updates.categoryId !== undefined) updateData.categoryId = updates.categoryId;
      if (updates.note !== undefined) updateData.note = updates.note;
      if (updates.timestamp !== undefined) updateData.timestamp = updates.timestamp;
      
      const response = await api.put<Transaction[]>(`/transactions/${id}/`, updateData);
      // Save to SecureStore if available
      if (SecureStore) {
        try {
          await SecureStore.setItemAsync('transactions', JSON.stringify(response.data));
        } catch (e) {
          console.warn('Failed to save to SecureStore (non-critical):', e);
        }
      }
      return response.data;
    } catch (error: any) {
      console.error('Error updating transaction:', error);
      const errorMessage = error.response?.data?.message || 
                          error.response?.data?.error || 
                          'Failed to update transaction';
      throw new Error(errorMessage);
    }
  },

  async deleteTransaction(id: string): Promise<Transaction[]> {
    try {
      const response = await api.delete<Transaction[]>(`/transactions/${id}/`);
      // Save to SecureStore if available
      if (SecureStore) {
        try {
          await SecureStore.setItemAsync('transactions', JSON.stringify(response.data));
        } catch (e) {
          console.warn('Failed to save to SecureStore (non-critical):', e);
        }
      }
      return response.data;
    } catch (error: any) {
      console.error('Error deleting transaction:', error);
      const errorMessage = error.response?.data?.message || 
                          error.response?.data?.error || 
                          'Failed to delete transaction';
      throw new Error(errorMessage);
    }
  },
};

