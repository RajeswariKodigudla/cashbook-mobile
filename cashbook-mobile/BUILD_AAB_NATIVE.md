# 📱 Build AAB File Using Native Android Setup

## ✅ **Setup Complete!**

I've already:
- ✅ Generated Android native code (`android/` folder exists)
- ✅ Created `key.properties` template
- ✅ Configured signing in `build.gradle`
- ✅ Updated version to 1.0.6 (Code: 6)

---

## ⚠️ **Step 1: Update Keystore Passwords**

**Edit `android/key.properties`** and replace with your actual values:

```properties
storePassword=YOUR_ACTUAL_KEYSTORE_PASSWORD
keyPassword=YOUR_ACTUAL_KEY_PASSWORD
keyAlias=YOUR_ACTUAL_KEY_ALIAS
storeFile=../cashbook-final-key.jks
```

**⚠️ Important:** Replace `YOUR_ACTUAL_*` with your real keystore passwords!

---

## 🚀 **Step 2: Build AAB File**

### **Option A: Using Gradle Command Line (Recommended)**

**On Windows PowerShell:**
```powershell
cd "C:\Users\rajes\OneDrive\Dokumen\Desktop\New Cashbook Project\cashbook-mobile\android"
.\gradlew.bat bundleRelease
```

**On Mac/Linux:**
```bash
cd android
./gradlew bundleRelease
```

**Build time:** ~5-10 minutes

### **Option B: Using Android Studio**

1. **Open Android Studio**
2. **File → Open** → Select `cashbook-mobile/android` folder
3. Wait for Gradle sync to complete
4. **Build → Generate Signed Bundle / APK**
5. Select **Android App Bundle**
6. Choose keystore: `cashbook-final-key.jks`
7. Enter passwords from `key.properties`
8. Click **Next** → **Finish**

---

## 📦 **Step 3: Find Your AAB File**

After build completes, your AAB file will be at:

```
cashbook-mobile/android/app/build/outputs/bundle/release/app-release.aab
```

---

## ✅ **What's Configured:**

- ✅ **Version:** 1.0.6
- ✅ **Version Code:** 6
- ✅ **Package:** com.rajeswari.cashbook
- ✅ **Signing:** Configured (needs passwords in key.properties)
- ✅ **Keystore:** cashbook-final-key.jks

---

## 📋 **Quick Build Command:**

```powershell
# Navigate to android folder
cd "C:\Users\rajes\OneDrive\Dokumen\Desktop\New Cashbook Project\cashbook-mobile\android"

# Build AAB
.\gradlew.bat bundleRelease

# AAB will be at: app/build/outputs/bundle/release/app-release.aab
```

---

## 🆘 **Troubleshooting:**

### Error: "Keystore file not found"
- Make sure `cashbook-final-key.jks` is in `cashbook-mobile` folder
- Check path in `key.properties` is correct: `../cashbook-final-key.jks`

### Error: "Wrong password"
- Double-check passwords in `key.properties`
- Make sure no extra spaces

### Error: "Gradle build failed"
- Check Java/JDK is installed
- Try: `.\gradlew.bat clean` then rebuild

### Error: "Android SDK not found"
- Install Android Studio
- Or set `ANDROID_HOME` environment variable

---

## 🎯 **After Build:**

1. **Find AAB:** `android/app/build/outputs/bundle/release/app-release.aab`
2. **Upload to Google Play Console**
3. **Done!** ✅

---

**First, update `android/key.properties` with your keystore passwords, then build!** 🚀
