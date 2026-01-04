# 🚀 Quick Start Guide - Mobile App

## ✅ Mobile App Created!

Your mobile app structure is ready. Follow these steps to run it:

---

## 📋 Step 1: Install Dependencies

```bash
cd C:\Users\rajes\OneDrive\Dokumen\Desktop\React\cashbook-mobile
npm install
```

---

## 📋 Step 2: Install Expo CLI (if not already installed)

```bash
npm install -g expo-cli
```

Or use npx (recommended):
```bash
npx expo start
```

---

## 📋 Step 3: Start Development Server

```bash
npm start
```

This will:
- Start the Expo development server
- Show a QR code in the terminal
- Open Expo DevTools in your browser

---

## 📋 Step 4: Run on Your Phone

### **Option A: Using Expo Go App (Easiest)**

1. **Install Expo Go** on your phone:
   - **Android:** [Google Play Store](https://play.google.com/store/apps/details?id=host.exp.exponent)
   - **iOS:** [App Store](https://apps.apple.com/app/expo-go/id982107779)

2. **Scan QR Code:**
   - **Android:** Open Expo Go app → Scan QR code from terminal
   - **iOS:** Open Camera app → Scan QR code → Tap notification

### **Option B: Using Emulator**

**Android:**
```bash
npm run android
```
(Requires Android Studio and emulator setup)

**iOS:**
```bash
npm run ios
```
(Requires Xcode and macOS)

---

## 🔧 Configuration

### **For Physical Device Testing:**

If testing on a physical device, update the API URL in `src/config/api.js`:

```javascript
// Replace 127.0.0.1 with your computer's IP address
export const API_BASE_URL = __DEV__
  ? 'http://192.168.1.100:8000/api'  // Your computer's IP
  : 'https://rajeswari.pythonanywhere.com/api';
```

**Find your IP:**
- **Windows:** Run `ipconfig` in CMD, look for "IPv4 Address"
- **Mac/Linux:** Run `ifconfig`, look for "inet"

---

## ✅ What's Included

### **Screens Created:**
- ✅ LoginScreen - Login/Register
- ✅ HomeScreen - Dashboard with transactions
- ✅ IncomeScreen - Add income
- ✅ ExpenseScreen - Add expense

### **Services:**
- ✅ API configuration (AsyncStorage)
- ✅ API service layer (axios)
- ✅ Authentication handling

### **Navigation:**
- ✅ React Navigation setup
- ✅ Stack navigator
- ✅ Protected routes

---

## 🧪 Test the App

1. **Start the app** (npm start)
2. **Scan QR code** with Expo Go
3. **Register/Login** with your credentials
4. **Create transactions** (Income/Expense)
5. **View transactions** on home screen

---

## 📱 Build for Production

### **Android APK:**

```bash
# Install EAS CLI
npm install -g eas-cli

# Login
eas login

# Configure
eas build:configure

# Build
eas build --platform android --profile preview
```

### **iOS IPA:**

```bash
eas build --platform ios --profile preview
```

---

## 🔗 Backend Connection

**No changes needed!** Your backend stays the same:
- ✅ API URL: `https://rajeswari.pythonanywhere.com/api`
- ✅ Same endpoints
- ✅ Same authentication
- ✅ Same data format

---

## 🐛 Troubleshooting

### **"Cannot connect to server" error:**
- Check if backend is running
- For physical device, use your computer's IP instead of 127.0.0.1
- Check firewall settings

### **"Module not found" error:**
- Run `npm install` again
- Clear cache: `npx expo start -c`

### **QR code not working:**
- Make sure phone and computer are on same WiFi network
- Try using tunnel mode: `npx expo start --tunnel`

---

## 📚 Next Steps

1. ✅ Test the app on your phone
2. ✅ Add remaining screens (if needed)
3. ✅ Customize styling
4. ✅ Build production APK/IPA
5. ✅ Deploy to app stores

---

## 🎉 You're Ready!

Your mobile app is set up and ready to test! 🚀

**Run `npm start` and scan the QR code with Expo Go app!**

