# 🔄 Restart Instructions - Fix Babel Error

## ⚠️ Important: Stop Metro Bundler First!

**Before restarting, make sure to:**
1. Stop the current Metro bundler (press `Ctrl+C` in the terminal where it's running)
2. Close any browser tabs with the app open
3. Wait for all processes to stop

## ✅ Fixed Issues

- ✅ Installed `babel-preset-expo@~54.0.0` (matching Expo SDK 54)
- ✅ Moved to `dependencies` (required for Metro bundler)
- ✅ Created `babel.config.js` with correct configuration
- ✅ Cleared caches

## 🚀 Restart Steps

### Option 1: Use Reset Script (Recommended)
```bash
cd cashbook-mobile
npm run reset
```

### Option 2: Manual Restart with Full Cache Clear
```bash
cd cashbook-mobile

# Kill any running Metro processes
npx kill-port 8081

# Clear all caches
Remove-Item -Recurse -Force .expo -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force node_modules\.cache -ErrorAction SilentlyContinue

# Start with cleared cache
npx expo start --clear --reset-cache
```

### Option 3: Fresh Start (If still having issues)
```bash
cd cashbook-mobile

# Remove caches
Remove-Item -Recurse -Force .expo -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force node_modules\.cache -ErrorAction SilentlyContinue

# Reinstall dependencies (optional, only if needed)
npm install

# Start fresh
npx expo start --clear --reset-cache
```

## 📱 After Restart

1. **For Web:** Press `w` or open http://localhost:8081
2. **For Android:** Press `a` (requires Android emulator)
3. **For iOS:** Press `i` (Mac only, requires iOS simulator)
4. **For Expo Go:** Scan QR code with Expo Go app

## ✅ Verification

After restart, you should see:
- ✅ No Babel errors
- ✅ Metro bundler starts successfully
- ✅ App loads without module errors

## 🐛 If Still Having Issues

1. **Check Node version:** `node --version` (should be 18+)
2. **Check npm version:** `npm --version`
3. **Verify installation:**
   ```bash
   npm list babel-preset-expo
   ```
   Should show: `babel-preset-expo@54.0.x`

4. **Check babel.config.js exists:**
   ```bash
   Test-Path babel.config.js
   ```
   Should return: `True`

5. **Try complete reinstall:**
   ```bash
   Remove-Item -Recurse -Force node_modules
   Remove-Item package-lock.json
   npm install
   npx expo start --clear --reset-cache
   ```

