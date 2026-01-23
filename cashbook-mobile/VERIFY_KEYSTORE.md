# 🔐 Verify Keystore Passwords

## ✅ **Current Passwords in key.properties:**

```
storePassword=cashbook123
keyPassword=cashbook123
keyAlias=cashbook
storeFile=../cashbook-final-key.jks
```

---

## 🔍 **How to Verify if Passwords are Correct:**

### **Method 1: Try Building (Easiest)**

The build will tell you if passwords are wrong:

```powershell
cd android
.\gradlew.bat bundleRelease
```

**If passwords are WRONG, you'll see:**
- Error: "Keystore was tampered with, or password was incorrect"
- Error: "java.security.UnrecoverableKeyException: Password verification failed"

**If passwords are CORRECT:**
- Build will continue and complete successfully ✅

---

### **Method 2: Test with keytool (If Java is installed)**

```powershell
keytool -list -v -keystore cashbook-final-key.jks -alias cashbook
```

Enter password when prompted. If it works, password is correct.

---

## ⚠️ **If You Don't Know the Passwords:**

### **Option A: Check Your Notes/Documentation**
- Look for where you created the keystore
- Check any documentation or notes you saved

### **Option B: Use EAS Build Instead**
- EAS Build can manage keystores automatically
- You don't need to know passwords
- Command: `eas build --platform android --profile production`

### **Option C: Create New Keystore (Last Resort)**
- Only if you can't find passwords
- **WARNING:** This means you can't update existing app on Google Play
- You'd need to create a new app listing

---

## 🎯 **Recommended Action:**

**Just try building!** The build will tell you if passwords are correct:

```powershell
cd "C:\Users\rajes\OneDrive\Dokumen\Desktop\New Cashbook Project\cashbook-mobile\android"
.\gradlew.bat bundleRelease
```

**If build succeeds** → Passwords are correct ✅  
**If build fails with password error** → Passwords are wrong ❌

---

**The passwords you have (cashbook123) look reasonable - try building to verify!** 🔍

