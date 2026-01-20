# 🔧 App Crash Fix Guide

## ❌ **Problem:**
App opens and immediately closes (crashes on startup)

---

## 🔍 **Common Causes & Fixes:**

### **1. Backend Connection Issue** ⚠️ MOST LIKELY

**Problem:** App tries to connect to backend on startup and crashes if it fails

**Check:**
- Is backend accessible? Test: https://cashbook-backend-2.onrender.com/api/auth/status/
- If backend is down, app might crash

**Fix:** App should handle backend errors gracefully (check if this is implemented)

---

### **2. Missing Dependencies**

**Problem:** Some package might be missing or incompatible

**Check Build Logs:**
1. Go to Expo dashboard: https://expo.dev/accounts/byjanbookss-organization/projects/cashbook/builds
2. Check latest build logs
3. Look for any warnings or errors

---

### **3. API Configuration Issue**

**Problem:** API URL might be incorrect in production build

**Check:**
- Production builds should use: `https://cashbook-backend-2.onrender.com/api`
- NOT local IP: `192.168.29.89`

**Your config looks correct** - it uses `__DEV__` to switch between local and production.

---

### **4. Code Error on Startup**

**Problem:** Error in App.js or context initialization

**Common Issues:**
- Missing import
- Syntax error
- Async operation failing

---

## 🛠️ **How to Diagnose:**

### **Option 1: Check Android Logs (Recommended)**

1. **Connect phone via USB** (or use wireless debugging)
2. **Enable USB Debugging** on phone
3. **Run this command:**
   ```bash
   adb logcat | grep -i "react\|error\|crash\|exception"
   ```
4. **Open the app** and watch for error messages
5. **Look for:** Red error messages, stack traces, exception details

### **Option 2: Check Expo Build Logs**

1. Go to: https://expo.dev/accounts/byjanbookss-organization/projects/cashbook/builds
2. Click on latest build
3. Check "Build logs" for any errors

### **Option 3: Test Backend First**

**Before fixing app, verify backend works:**

```bash
# Test backend in browser:
https://cashbook-backend-2.onrender.com/api/auth/status/
```

**If backend is down:**
- App will crash trying to connect
- Fix backend first, then test app

---

## 🔧 **Quick Fixes to Try:**

### **Fix 1: Check Backend Status**

1. Open: https://cashbook-backend-2.onrender.com/api/auth/status/
2. If it doesn't load → Backend is down
3. Go to Render dashboard and restart backend

### **Fix 2: Rebuild with Error Handling**

The app might need better error handling. Check if:
- AuthContext has error boundaries
- API calls have try-catch blocks
- App.js has error handling

### **Fix 3: Check for Missing Permissions**

Android might need permissions. Check `app.json`:
```json
"android": {
  "permissions": []
}
```

If app needs internet, it should work by default.

---

## 📋 **Step-by-Step Diagnosis:**

1. **✅ First: Test Backend**
   - Open: https://cashbook-backend-2.onrender.com/api/auth/status/
   - Should return JSON (even if error)

2. **✅ Second: Check Build Logs**
   - Expo dashboard → Latest build → Logs
   - Look for errors

3. **✅ Third: Check Android Logs**
   - Use `adb logcat` to see crash details
   - Look for React Native errors

4. **✅ Fourth: Test on Different Device**
   - Try on another Android device
   - See if crash is device-specific

---

## 🆘 **Most Likely Issue:**

**Backend is not accessible** or **backend is down**

**Quick Test:**
1. Open browser on your phone
2. Go to: `https://cashbook-backend-2.onrender.com/api/auth/status/`
3. If it doesn't load → Backend is the problem
4. If it loads → App code is the problem

---

## 📝 **Next Steps:**

1. **Test backend first** (most likely issue)
2. **Check crash logs** using `adb logcat`
3. **Share error message** if you find one
4. **I'll help fix the specific error**

---

**First, test if backend is accessible from your phone's browser!** 🔍

