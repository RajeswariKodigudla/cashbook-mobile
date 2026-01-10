# 🔧 Troubleshooting Guide

## TurboModule / PlatformConstants Error

If you see: `'PlatformConstants' could not be found. Verify that a module by this name is registered in the native binary.`

### Solution 1: Clear Cache and Restart

```bash
# Clear Expo cache
rm -rf .expo
rm -rf node_modules/.cache

# Clear Metro bundler cache
npx expo start --clear --reset-cache
```

**Windows PowerShell:**
```powershell
Remove-Item -Recurse -Force .expo -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force node_modules\.cache -ErrorAction SilentlyContinue
npx expo start --clear --reset-cache
```

### Solution 2: Reinstall Dependencies

```bash
# Remove node_modules and reinstall
rm -rf node_modules
npm install

# Or use yarn
yarn install
```

### Solution 3: Check Platform

This error often occurs when:
- Running on **web** platform but using native-only modules
- Metro bundler cache is corrupted
- Expo SDK version mismatch

**To fix:**
1. Make sure you're running on the correct platform:
   - For **native**: Use `npm run android` or `npm run ios`
   - For **web**: Use `npm run web`
2. Don't use native modules on web platform

### Solution 4: Update Expo and Dependencies

```bash
# Update Expo CLI
npm install -g expo-cli@latest

# Update dependencies
npm update

# Clear and restart
npx expo start --clear --reset-cache
```

### Solution 5: Check babel.config.js

Ensure `babel.config.js` exists in the root:

```javascript
module.exports = function(api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [],
  };
};
```

## Other Common Issues

### SDK Version Mismatch

**Error:** "Project is incompatible with this version of Expo Go"

**Solution:**
1. Update Expo Go app on your device
2. Clear cache: `npx expo start --clear`
3. Check `app.json` SDK version matches your Expo version

### Metro Bundler Won't Start

```bash
# Kill any running Metro processes
npx kill-port 8081

# Clear cache and restart
npx expo start --clear --reset-cache
```

### Module Not Found Errors

```bash
# Clear cache and reinstall
rm -rf node_modules .expo
npm install
npx expo start --clear
```

### Web Platform Issues

If running on web and seeing native module errors:
- Some modules (like `expo-status-bar`, `expo-secure-store`) are conditionally loaded
- The app should handle web platform gracefully
- Use `Platform.OS === 'web'` checks for web-specific code

## Still Having Issues?

1. **Check Expo version:**
   ```bash
   npx expo --version
   ```

2. **Check React Native version:**
   ```bash
   npx react-native --version
   ```

3. **Check Node version:**
   ```bash
   node --version  # Should be 18+
   ```

4. **Create a fresh Expo project and compare:**
   ```bash
   npx create-expo-app@latest test-app
   ```

5. **Check Expo documentation:**
   - https://docs.expo.dev/
   - https://docs.expo.dev/troubleshooting/clear-cache/

