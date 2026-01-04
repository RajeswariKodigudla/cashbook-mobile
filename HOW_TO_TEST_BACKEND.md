# 🧪 How to Test Backend & Database Connection

## ✅ **Quick Test Checklist**

Follow these steps to verify your backend and database are working:

---

## 1️⃣ **Test Backend Connection**

### **Step 1: Check Backend URL**
Your mobile app is configured to use:
```
https://rajeswari.pythonanywhere.com/api
```

### **Step 2: Test Backend Accessibility**
Open your browser and visit:
```
https://rajeswari.pythonanywhere.com/api/
```
**Expected:** Should return JSON (not HTML error page)

---

## 2️⃣ **Test Authentication (Login/Register)**

### **Test Login:**
1. Open the mobile app
2. Enter your username and password
3. Click "Login"
4. **Check Console Logs:**
   ```
   📡 Sending API request: post /token/ ...
   ✅ API Response: 200 {access: "...", refresh: "..."}
   ✅ Login successful
   ```
5. **Expected Result:**
   - ✅ Should navigate to Home screen
   - ✅ Should see your transactions (if any)
   - ✅ No error messages

### **Test Registration:**
1. Click "Register" tab
2. Fill in the form
3. Click "Register"
4. **Check Console:**
   ```
   📡 Sending registration request: ...
   ✅ API Response: 200 {message: "User registered successfully"}
   ```
5. **Expected Result:**
   - ✅ Success message
   - ✅ Can login with new account

---

## 3️⃣ **Test Database Operations (CRUD)**

### **A. CREATE Transaction (Test Database Write)**

1. Click "+ Income" or "- Expense" button
2. Fill in the form:
   - Amount: `1000`
   - Name: `Test Transaction`
   - Remark: `Testing backend`
   - Date: Today's date
   - Time: Current time
   - Mode: Cash
3. Click "Save"
4. **Check Console:**
   ```
   📤 Sending transaction data: {amount: 1000, type: "Income", ...}
   ✅ Transaction created: {id: 123, amount: 1000, ...}
   ```
5. **Expected Result:**
   - ✅ Success message
   - ✅ Transaction appears in the list
   - ✅ Summary updates (Income/Expense/Total)

### **B. READ Transactions (Test Database Read)**

1. Go to Home screen
2. **Check Console:**
   ```
   📡 Sending API request: get /transactions/ ...
   ✅ API Response: 200 {results: [...], count: X}
   ```
3. **Expected Result:**
   - ✅ Transactions list displays
   - ✅ Summary shows correct totals
   - ✅ No loading errors

### **C. UPDATE Transaction (Test Database Update)**

1. Click on a transaction in the list
2. Edit the amount or name
3. Click "Save"
4. **Check Console:**
   ```
   📡 Sending API request: put /transactions/123/ ...
   ✅ API Response: 200 {id: 123, amount: 2000, ...}
   ```
5. **Expected Result:**
   - ✅ Transaction updates in the list
   - ✅ Changes persist after refresh

### **D. DELETE Transaction (Test Database Delete)**

1. Long press on a transaction (or click delete button)
2. Confirm deletion
3. **Check Console:**
   ```
   📡 Sending API request: delete /transactions/123/ ...
   ✅ API Response: 200
   ```
4. **Expected Result:**
   - ✅ Transaction removed from list
   - ✅ Summary updates
   - ✅ Deleted from database

---

## 4️⃣ **Check Console Logs**

### **How to View Console Logs:**

#### **Option 1: Expo Go App**
1. Shake your device
2. Select "Debug Remote JS"
3. Open browser DevTools (Chrome/Firefox)
4. Go to Console tab

#### **Option 2: Terminal/Command Line**
If running `npm start` or `expo start`, logs appear in terminal

#### **Option 3: React Native Debugger**
Install React Native Debugger for better logging

### **What to Look For:**

✅ **Good Signs:**
```
🌐 API Base URL: https://rajeswari.pythonanywhere.com/api
📱 Mobile App - Using production backend
📡 Sending API request: get /transactions/ ...
✅ API Response: 200 {success: true, data: [...]}
```

❌ **Bad Signs:**
```
❌ API Response Error: 500 Internal Server Error
❌ API Response Error: 404 Not Found
❌ Cannot connect to server
❌ Network request failed
```

---

## 5️⃣ **Test Summary/Statistics**

1. Go to Home screen
2. Check Summary Bar at bottom:
   - **Total Income:** Should show sum of all income
   - **Total Expense:** Should show sum of all expenses
   - **Balance:** Should show (Income - Expense)
3. **Check Console:**
   ```
   📡 Sending API request: get /transactions/summary/ ...
   ✅ API Response: 200 {total_income: 5000, total_expense: 2000, ...}
   ```
4. **Expected Result:**
   - ✅ Correct totals displayed
   - ✅ Updates when transactions change

---

## 6️⃣ **Test Data Persistence**

### **Test 1: Close and Reopen App**
1. Create a transaction
2. Close the app completely
3. Reopen the app
4. **Expected:** Transaction should still be there

### **Test 2: Refresh Data**
1. Pull down on Home screen to refresh
2. **Check Console:**
   ```
   📡 Sending API request: get /transactions/ ...
   ✅ API Response: 200
   ```
3. **Expected:** Data reloads from backend

### **Test 3: Login on Different Device**
1. Login on another device with same account
2. **Expected:** Should see same transactions (proves database is shared)

---

## 7️⃣ **Test Error Handling**

### **Test Network Error:**
1. Turn off WiFi/Mobile data
2. Try to create a transaction
3. **Expected:** Should show error message like "Cannot connect to server"

### **Test Invalid Data:**
1. Try to create transaction with empty amount
2. **Expected:** Should show validation error

### **Test Expired Token:**
1. Wait for token to expire (or manually clear token)
2. Try to access transactions
3. **Expected:** Should redirect to login or refresh token

---

## 8️⃣ **Verify Database Directly (Optional)**

### **If you have backend access:**

1. **Check Django Admin:**
   - Go to: `https://rajeswari.pythonanywhere.com/admin/`
   - Login with admin credentials
   - Check Transactions, Users, Accounts tables

2. **Check Database:**
   - Connect to your database
   - Run SQL query: `SELECT * FROM transactions;`
   - Verify transactions created from mobile app are there

---

## 9️⃣ **Quick Test Script**

Run these tests in order:

```
✅ Test 1: Backend URL accessible
   → Visit: https://rajeswari.pythonanywhere.com/api/

✅ Test 2: Login works
   → Login in mobile app
   → Check console for success

✅ Test 3: Create transaction
   → Add income/expense
   → Check it appears in list

✅ Test 4: View transactions
   → Check Home screen shows transactions

✅ Test 5: Update transaction
   → Edit a transaction
   → Verify changes saved

✅ Test 6: Delete transaction
   → Delete a transaction
   → Verify it's removed

✅ Test 7: Summary works
   → Check totals are correct

✅ Test 8: Data persists
   → Close/reopen app
   → Verify data still there
```

---

## 🔍 **Troubleshooting**

### **If Backend Not Working:**

1. **Check Backend URL:**
   - Verify: `https://rajeswari.pythonanywhere.com/api`
   - Test in browser first

2. **Check CORS:**
   - Backend must allow mobile app origin
   - Check backend `settings.py`:
     ```python
     CORS_ALLOW_ALL_ORIGINS = True
     ```

3. **Check Backend Logs:**
   - Check PythonAnywhere error logs
   - Look for API request errors

4. **Check Network:**
   - Mobile device must have internet
   - Check WiFi/Mobile data connection

### **If Database Not Working:**

1. **Check Database Connection:**
   - Verify backend can connect to database
   - Check database credentials in backend

2. **Check API Endpoints:**
   - Test endpoints directly:
     - `GET /api/transactions/`
     - `POST /api/transactions/`
     - `GET /api/transactions/summary/`

3. **Check Permissions:**
   - Verify user has permission to create/read/update/delete
   - Check authentication tokens are valid

---

## ✅ **Success Indicators**

Your backend and database are working if:

- ✅ Login/Register works
- ✅ Can create transactions
- ✅ Can view transactions
- ✅ Can update transactions
- ✅ Can delete transactions
- ✅ Summary shows correct totals
- ✅ Data persists after app restart
- ✅ No error messages in console
- ✅ API responses show status 200

---

## 📱 **Mobile App Console Commands**

### **View API Logs:**
All API requests are logged with:
- 📡 = Sending request
- ✅ = Success response
- ❌ = Error response

### **Test API Manually:**
You can also test API endpoints using:
- **Postman**
- **curl** command
- **Browser** (for GET requests)

---

## 🎯 **Summary**

**To verify backend and database are working:**

1. ✅ Test login/register
2. ✅ Create a transaction
3. ✅ View transactions
4. ✅ Check console logs
5. ✅ Verify data persists
6. ✅ Check summary totals

**If all tests pass → Backend and database are working! ✅**

**If any test fails → Check error messages and troubleshoot**

