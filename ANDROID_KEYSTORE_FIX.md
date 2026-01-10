# 🔐 Fix Android Keystore Signing Issue

## Problem
Your App Bundle is signed with a different key than the one registered on Google Play Store.

**Expected Key:** SHA1: `8A:19:67:D5:8F:9F:AC:F9:B2:02:19:C3:78:99:C0:1F:21:C3:61:84`
**Current Key:** SHA1: `8A:9E:AF:80:08:8C:AB:96:CF:51:C5:7B:84:20:78:83:F1:A9:95:D1`

## Solution: Upload Existing Keystore to EAS

### Option 1: If You Have the Original Keystore File

1. **Locate your keystore file** (usually `.keystore` or `.jks` file)
   - Check your previous build directories
   - Check your backup locations
   - Check where you originally created the app

2. **Upload keystore to EAS:**
   ```bash
   eas credentials --platform android
   ```
   - Select "production" profile
   - Choose "Update credentials"
   - Select "Upload a keystore"
   - Provide:
     - Keystore file path
     - Keystore password
     - Key alias
     - Key password

3. **Verify the fingerprint matches:**
   ```bash
   keytool -list -v -keystore your-keystore.keystore
   ```
   Look for SHA1: `8A:19:67:D5:8F:9F:AC:F9:B2:02:19:C3:78:99:C0:1F:21:C3:61:84`

### Option 2: If You Don't Have the Original Keystore

⚠️ **WARNING:** If you lost the original keystore, you **cannot** update the existing app on Google Play Store. You'll need to:

1. **Create a new app** on Google Play Console with a new package name
2. **Or** contact Google Play Support (they may help in rare cases)

### Option 3: Use Google Play App Signing (Recommended)

If your app uses Google Play App Signing, EAS can automatically use the correct key:

1. **Check if App Signing is enabled:**
   - Go to Google Play Console
   - Navigate to: Release → Setup → App signing
   - Check if "Google Play App Signing" is enabled

2. **If enabled, configure EAS to use it:**
   ```bash
   eas credentials --platform android
   ```
   - Select "production" profile
   - Choose "Use Google Play App Signing"
   - Follow the prompts

## Quick Fix Commands

```bash
# Check current credentials
eas credentials --platform android --profile production

# Update credentials interactively
eas credentials --platform android --profile production

# Build with correct credentials
eas build --platform android --profile production
```

## Verify After Fix

After uploading the correct keystore, rebuild and verify:

```bash
# Build new bundle
eas build --platform android --profile production

# Check the build details
eas build:view [BUILD_ID]
```

The SHA1 fingerprint should match: `8A:19:67:D5:8F:9F:AC:F9:B2:02:19:C3:78:99:C0:1F:21:C3:61:84`

## Important Notes

- ⚠️ **Never lose your keystore file** - Keep it in a secure backup location
- ⚠️ **Never commit keystore files** to Git - They're in `.gitignore` for a reason
- ✅ **Use Google Play App Signing** - It's more secure and easier to manage
- ✅ **Store credentials securely** - Use password managers or secure vaults
