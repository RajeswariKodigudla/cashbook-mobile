# Cashbook Mobile App

React Native mobile application for the Cashbook financial management system.

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Expo Go app installed on your mobile device (for testing)
- For Android: Android Studio (for emulator)
- For iOS: Xcode (Mac only, for simulator)

### Installation

```bash
# Install dependencies
npm install

# Generate app assets (icons, splash screens)
npm run generate-assets

# Start the development server
npm start
```

### Running the App

1. **On Physical Device:**
   - Install Expo Go from App Store (iOS) or Play Store (Android)
   - Scan the QR code displayed in terminal
   - The app will load on your device

2. **On Emulator/Simulator:**
   - Press `a` for Android emulator
   - Press `i` for iOS simulator (Mac only)
   - Press `w` for web browser

### Development Commands

```bash
# Start with cache cleared (recommended if you see SDK version errors)
npm start

# Start Android
npm run android

# Start iOS (Mac only)
npm run ios

# Start Web
npm run web

# Generate assets
npm run generate-assets
```

## 📱 Features

- 💵 **INR Currency** - All amounts in Indian Rupees (₹)
- 📊 **Transaction Management** - Add, edit, delete transactions
- 🔍 **Search & Filter** - Filter by date, type, category
- 📈 **Financial Overview** - Balance, income, expenses
- 🔒 **Secure Storage** - Uses Expo SecureStore for authentication
- 🎨 **Modern UI** - Clean, responsive design

## 🛠️ Troubleshooting

### SDK Version Mismatch Error

If you see "Project is incompatible with this version of Expo Go":
1. Clear cache: Delete `.expo` folder
2. Restart with: `npm start` (uses `--clear` flag)
3. Make sure Expo Go app is updated to latest version

### Missing Assets Error

If you see "Unable to resolve asset":
```bash
npm run generate-assets
```

### Metro Bundler Issues

```bash
# Clear Metro cache
npx expo start --clear

# Reset Metro bundler
npx expo start --reset-cache
```

## 📦 Project Structure

```
cashbook-mobile/
├── assets/          # App icons and splash screens
├── src/
│   ├── components/ # Reusable UI components
│   ├── screens/    # Screen components
│   ├── services/   # API services
│   ├── contexts/   # React contexts
│   ├── types/      # TypeScript types
│   └── utils/      # Utility functions
├── App.tsx         # Root component
├── app.json        # Expo configuration
└── package.json    # Dependencies
```

## 🔗 API Configuration

The app connects to the Django backend API. Update the API URL in:
- `app.json` → `extra.apiUrl` (for build-time)
- `src/services/apiService.ts` (for runtime)

Default: `http://localhost:8000/api`

For production, update to your deployed backend URL.

## 📱 Building for Production

### Android (APK/AAB)

```bash
# Install EAS CLI
npm install -g eas-cli

# Login to Expo
eas login

# Configure build
eas build:configure

# Build for Android
eas build --platform android
```

### iOS (IPA)

```bash
# Build for iOS (requires Apple Developer account)
eas build --platform ios
```

See [DEPLOYMENT.md](../DEPLOYMENT.md) for detailed deployment instructions.

## 🎨 Customization

### App Icons & Splash Screen

Replace the generated placeholder assets in `assets/`:
- `icon.png` (1024x1024px)
- `adaptive-icon.png` (1024x1024px)
- `splash.png` (1242x2436px recommended)
- `favicon.png` (48x48px)

Or regenerate with: `npm run generate-assets`

### Colors & Theme

Edit `src/constants/index.ts` for theme colors and styling.

## 📝 License

MIT

---

**Built with React Native & Expo** 🚀
