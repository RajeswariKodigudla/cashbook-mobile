# 🧪 Cashbook App - Complete Testing Guide

This guide will help you verify that all features are working correctly.

## 📋 Quick Test Checklist

### ✅ 1. Authentication & Login
- [ ] **Login**: Enter username and password → Should navigate to Home screen
- [ ] **Signup**: Create new account → Should redirect to Login after success
- [ ] **Logout**: Click logout button (top right) → Should return to Login screen

---

### ✅ 2. Basic Transaction Operations

#### **Add Income Transaction**
1. From Home screen, tap the **"+" button** (floating action button)
2. Select **"Income"**
3. Fill in the form:
   - **Amount**: Enter any amount (e.g., `5000`)
   - **Category**: Select a category (e.g., "Salary", "Business")
   - **Payment Mode**: Select (Cash, Card, UPI, etc.)
   - **Note** (optional): Add a note
4. Tap **"Save"** or **"Add Transaction"**
5. ✅ **Expected**: 
   - Success message appears
   - Returns to Home screen
   - New income transaction appears in the list
   - Balance increases

#### **Add Expense Transaction**
1. From Home screen, tap the **"+" button**
2. Select **"Expense"**
3. Fill in the form:
   - **Amount**: Enter any amount (e.g., `500`)
   - **Category**: Select a category (e.g., "Food", "Transport")
   - **Payment Mode**: Select
   - **Note** (optional): Add a note
4. Tap **"Save"**
5. ✅ **Expected**: 
   - Success message appears
   - Returns to Home screen
   - New expense transaction appears in the list
   - Balance decreases

#### **Edit Transaction**
1. From Home screen, tap on any transaction in the list
2. Modify any field (amount, category, note, etc.)
3. Tap **"Update Transaction"**
4. ✅ **Expected**: 
   - Success message appears
   - Transaction is updated in the list
   - Balance recalculates

#### **Delete Transaction**
1. From Home screen, tap on any transaction
2. Tap **"Delete"** button
3. Confirm deletion
4. ✅ **Expected**: 
   - Transaction is removed from the list
   - Balance recalculates

---

### ✅ 3. Filtering & Search

#### **Filter by Date Range**
1. From Home screen, tap the **filter icon** (top right)
2. Select a date range (Today, Week, Month, Year, All)
3. Tap **"Apply"**
4. ✅ **Expected**: 
   - Only transactions within the selected range are shown
   - Filter badge appears showing active filter

#### **Filter by Transaction Type**
1. Open filter modal
2. Select "Income" or "Expense"
3. Tap **"Apply"**
4. ✅ **Expected**: 
   - Only selected type is shown

#### **Filter by Category**
1. Open filter modal
2. Select a category
3. Tap **"Apply"**
4. ✅ **Expected**: 
   - Only transactions with that category are shown

#### **Search Transactions**
1. From Home screen, use the search bar at the top
2. Type a keyword (amount, note, category name)
3. ✅ **Expected**: 
   - Transactions matching the search are shown

---

### ✅ 4. Analytics & Reports Screens

#### **Summary Screen**
1. Navigate to **Summary** from the menu/drawer
2. ✅ **Expected**: 
   - Shows total income, expenses, balance
   - Shows savings rate
   - Shows transaction count
   - Date range filters work
   - Financial insights are displayed

#### **Analytics Screen**
1. Navigate to **Analytics** from the menu
2. ✅ **Expected**: 
   - Income vs Expenses chart (line chart)
   - Category breakdown (pie chart)
   - Top spending categories
   - Summary cards with key metrics
   - Date filters work

#### **Budget Screen**
1. Navigate to **Budget** from the menu
2. ✅ **Expected**: 
   - Shows monthly expenses
   - Category-wise spending breakdown
   - Budget tips and recommendations

#### **Reports Screen**
1. Navigate to **Reports** from the menu
2. Select date range and transaction type
3. Tap **"Generate Report"**
4. ✅ **Expected**: 
   - Report summary is displayed
   - Export options work (PDF, CSV, Share)

---

### ✅ 5. Shared Accounts (If Implemented)

#### **Switch to Personal Account**
1. Look for account switcher in header/menu
2. Select "Personal Account"
3. ✅ **Expected**: 
   - All transactions are shown
   - No permission restrictions

#### **Create Shared Account**
1. Open account switcher
2. Tap "Create New Account"
3. Enter account name
4. ✅ **Expected**: 
   - Account is created
   - Switched to new account

#### **Switch to Shared Account**
1. Open account switcher
2. Select a shared account
3. ✅ **Expected**: 
   - Only transactions for that account are shown
   - Permissions are enforced

#### **Test Permissions (Shared Account)**
1. Switch to a shared account where you have limited permissions
2. Try to add a transaction
3. ✅ **Expected**: 
   - If you have `canAddEntry` permission → Transaction is added
   - If you don't have permission → Alert shows "Permission Denied"

4. Try to edit a transaction
5. ✅ **Expected**: 
   - If you have `canEditOwnEntry` or `canEditAllEntries` → Edit works
   - If you don't have permission → Alert shows "Permission Denied"

6. Try to delete a transaction
7. ✅ **Expected**: 
   - If you have `canDeleteEntry` → Delete works
   - If you don't have permission → Alert shows "Permission Denied"

---

### ✅ 6. Other Features

#### **Calendar View**
1. Navigate to **Calendar** from the menu
2. ✅ **Expected**: 
   - Calendar is displayed
   - Transactions are shown on their dates

#### **All Transactions**
1. Navigate to **All Transactions** from the menu
2. ✅ **Expected**: 
   - Complete list of all transactions
   - Can filter and search

#### **Export**
1. Navigate to **Export** from the menu
2. Select export format
3. ✅ **Expected**: 
   - Export file is generated
   - Can share or save

---

## 🔍 How to Verify Everything is Working

### **Check Console Logs**
Open your browser's developer console (F12) or Metro bundler terminal. Look for:

✅ **Success indicators:**
- `✅ Transaction created successfully`
- `✅ Transaction updated successfully`
- `✅ Transaction deleted successfully`
- `✅ API Response: 200`

❌ **Error indicators:**
- `❌ Error creating transaction`
- `❌ Permission Denied`
- `❌ API Response Error`

### **Visual Verification**

1. **Home Screen**:
   - Transactions list is visible
   - Balance is displayed correctly
   - Summary cards show correct totals
   - Filters work

2. **Transaction Forms**:
   - All fields are visible
   - Category icons are displayed
   - Payment mode selection works
   - Form validation works (empty amount shows error)

3. **Charts (Analytics)**:
   - Charts render without errors
   - Data is displayed correctly
   - Filters update charts

### **Functional Verification**

1. **Add Transaction**:
   - Form opens correctly
   - All fields are editable
   - Save button works
   - Success message appears
   - Transaction appears in list immediately

2. **Edit Transaction**:
   - Transaction details load correctly
   - Fields are pre-filled
   - Update button works
   - Changes are reflected immediately

3. **Delete Transaction**:
   - Confirmation dialog appears
   - Transaction is removed
   - Balance updates

---

## 🐛 Common Issues & Solutions

### **Issue: Transaction not appearing after save**
- **Solution**: Check console for errors. Verify backend API is working.

### **Issue: Permission Denied error**
- **Solution**: This is expected for shared accounts with limited permissions. Switch to personal account to test.

### **Issue: Charts not showing**
- **Solution**: Charts only work on native platforms. On web, you'll see a fallback message.

### **Issue: 404 errors for notifications**
- **Solution**: This is normal if the backend doesn't have notifications endpoint. App will work without it.

---

## 📝 Testing Notes

- **Personal Account**: All operations should work without restrictions
- **Shared Accounts**: Permissions are enforced based on user role
- **Offline Mode**: App should handle network errors gracefully
- **Form Validation**: Empty required fields should show errors
- **Navigation**: All screens should navigate correctly

---

## ✅ Final Checklist

Before considering the app complete, verify:

- [ ] Can add income transactions
- [ ] Can add expense transactions
- [ ] Can edit transactions
- [ ] Can delete transactions
- [ ] Filters work (date, type, category)
- [ ] Search works
- [ ] Summary screen shows correct data
- [ ] Analytics screen shows charts/data
- [ ] Budget screen shows spending breakdown
- [ ] Reports can be generated
- [ ] Logout works
- [ ] No console errors (except expected 404s for optional features)

---

## 🎯 Quick Test Script

Run through this quick test in 5 minutes:

1. **Login** → Should see Home screen
2. **Add Income** (₹1000) → Should appear in list
3. **Add Expense** (₹500) → Should appear in list
4. **Check Balance** → Should show ₹500
5. **Edit Expense** → Change to ₹300 → Balance should update to ₹700
6. **Delete Expense** → Balance should update to ₹1000
7. **Open Summary** → Should show correct totals
8. **Open Analytics** → Should show charts
9. **Logout** → Should return to Login

If all these work, your app is functioning correctly! 🎉

