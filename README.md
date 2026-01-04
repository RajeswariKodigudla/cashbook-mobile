# 📱 Cashbook Mobile App

React Native mobile app for the Cashbook application.

## 🚀 Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Start Development Server

```bash
npm start
```

### 3. Run on Device

- **Android:** Press `a` in terminal or scan QR code with Expo Go app
- **iOS:** Press `i` in terminal or scan QR code with Camera app

## 📦 Dependencies

- **Expo** - React Native framework
- **React Navigation** - Navigation library
- **AsyncStorage** - Local storage (replaces localStorage)
- **Axios** - HTTP client

## 🔗 Backend Connection

The app connects to the same Django backend:
- **Production:** `https://rajeswari.pythonanywhere.com/api`
- **Local Dev:** `http://127.0.0.1:8000/api`

For physical device testing, replace `127.0.0.1` with your computer's IP address.

## 📱 Features

- ✅ User Login/Register
- ✅ View Transactions
- ✅ Create Income
- ✅ Create Expense
- ✅ Transaction Summary

## 🏗️ Project Structure

```
cashbook-mobile/
├── App.js                 # Main app entry
├── src/
│   ├── screens/           # Screen components
│   ├── services/          # API services
│   └── config/            # Configuration
└── assets/                # Images, fonts
```

## 📚 Next Steps

1. Complete remaining screens (AllTransactions, Settings, etc.)
2. Add offline support
3. Add push notifications
4. Build for production (APK/IPA)

