# 🔧 Fix TurboModuleRegistry Error

## ❌ Error
```
TurboModuleRegistry.getEnforcing(...):
'PlatformConstants' could not be found.
```

## ✅ Solution

This error occurs when dependencies aren't properly installed or versions are mismatched.

### **Step 1: Clean Install**

```bash
cd C:\Users\rajes\OneDrive\Dokumen\Desktop\React\cashbook-mobile

# Remove node_modules and package-lock.json
rm -rf node_modules
rm package-lock.json

# Or on Windows PowerShell:
Remove-Item -Recurse -Force node_modules
Remove-Item package-lock.json
```

### **Step 2: Reinstall with Expo**

```bash
# Install dependencies using Expo (ensures correct versions)
npm install

# Install Expo packages with correct versions
npx expo install expo@latest
npx expo install react@latest react-native@latest
npx expo install @react-navigation/native @react-navigation/native-stack
npx expo install react-native-screens react-native-safe-area-context
npx expo install @react-native-async-storage/async-storage
```

### **Step 3: Clear Cache and Restart**

```bash
# Clear Expo cache
npx expo start -c

# Or clear Metro bundler cache
npx react-native start --reset-cache
```

### **Step 4: Restart Expo**

```bash
npm start
```

Then press `r` to reload, or scan QR code again.

---

## 🔄 Alternative: Create Fresh Project

If the error persists, create a fresh project:

```bash
cd C:\Users\rajes\OneDrive\Dokumen\Desktop\React

# Create new project with SDK 54
npx create-expo-app@latest cashbook-mobile-new --template blank

# Copy your src folder
# Then install dependencies
cd cashbook-mobile-new
npm install
npx expo install @react-navigation/native @react-navigation/native-stack
npx expo install react-native-screens react-native-safe-area-context
npx expo install @react-native-async-storage/async-storage
```

---

## ✅ Quick Fix Commands

Run these in order:

```bash
cd C:\Users\rajes\OneDrive\Dokumen\Desktop\React\cashbook-mobile
Remove-Item -Recurse -Force node_modules
npm install
npx expo install --fix
npx expo start -c
```

---

**After running these commands, scan the QR code again!** 📱

