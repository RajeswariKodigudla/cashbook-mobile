# 📱 Step-by-Step: Update Your App on Google Play

## 🎯 Your Current Status
- **Current Version:** 1.0.3
- **Current Version Code:** 3
- **Next Version:** 1.0.4
- **Next Version Code:** 4

---

## 📝 STEP 1: Update Version Numbers

### Open `cashbook-mobile/app.json`

**Find these lines (around line 5 and 28):**

```json
"version": "1.0.3",        ← Line 5
```

```json
"versionCode": 3,          ← Line 28
```

### Change them to:

```json
"version": "1.0.4",        ← Change to 1.0.4
```

```json
"versionCode": 4,          ← Change to 4 (must be higher!)
```

### Complete file should look like:

```json
{
  "expo": {
    "name": "Byjan Cashbook",
    "slug": "byjan-cashbook",
    "version": "1.0.4",              ← UPDATED
    "orientation": "portrait",
    ...
    "android": {
      "adaptiveIcon": {
        "foregroundImage": "./assets/adaptive-icon.png",
        "backgroundColor": "#3B82F6"
      },
      "package": "com.rajeswari.cashbook",
      "versionCode": 4,              ← UPDATED
      "permissions": []
    },
    ...
  }
}
```

**✅ Save the file!**

---

## 🔨 STEP 2: Build New AAB File

### Open Terminal/PowerShell

**Navigate to your app folder:**
```bash
cd "C:\Users\rajes\OneDrive\Dokumen\Desktop\New Cashbook Project\cashbook-mobile"
```

**Make sure you're logged into EAS:**
```bash
eas login
```
(Enter your Expo credentials if prompted)

**Build the production AAB:**
```bash
eas build --platform android --profile production
```

### What happens:
1. EAS will ask: "Would you like to submit this build to the Google Play Store?"
   - Type: **n** (No, we'll upload manually)
   
2. Build starts processing...
   - You'll see: "Build started, it may take a few minutes to complete"
   - **Wait 15-20 minutes** ⏱️

3. Build completes:
   - You'll see: "Build finished!"
   - You'll get a URL to download the AAB file

---

## 📥 STEP 3: Download AAB File

### Option A: From Terminal
After build completes, you'll see a download link. Copy and open it in browser.

### Option B: From Expo Dashboard
1. Go to: https://expo.dev
2. Login to your account
3. Click on your project "byjan-cashbook"
4. Click "Builds" tab
5. Find the latest build (should show "Finished" status)
6. Click "Download" button
7. Save the `.aab` file (e.g., `app-release.aab`)

**✅ You now have the updated AAB file!**

---

## 📤 STEP 4: Upload to Google Play Console

### Open Google Play Console

1. **Go to:** https://play.google.com/console
2. **Login** with your Google account
3. **Select your app:** "Byjan Cashbook"

### Navigate to Production

1. **Click "Production"** in the left sidebar
   - (Or "Internal testing" / "Closed testing" if you want to test first)

2. **Click "Create new release"** button
   - (Or "Edit release" if updating an existing release)

### Upload AAB File

1. **In the "App bundles" section:**
   - Click **"Upload"** button
   - OR drag and drop your `.aab` file

2. **Wait for upload:**
   - Status: "Processing..." (takes 2-5 minutes)
   - Status changes to: "Ready to publish"

### Add Release Notes

1. **Scroll down to "Release notes" section**
2. **Click "Add release notes"**
3. **Enter notes** (e.g., "Bug fixes and performance improvements")
4. **Click "Save"**

### Review and Submit

1. **Scroll to bottom of page**
2. **Click "Review release"** button
3. **Review all information:**
   - ✅ Version number matches (1.0.4)
   - ✅ Release notes are added
   - ✅ AAB file is uploaded
4. **Click "Start rollout to Production"**
   - (Or appropriate button for your track)

### ✅ Done!

You'll see: "Release is being processed"

---

## ⏳ STEP 5: Wait for Review

### What happens:
1. **Processing:** Google processes your update (few minutes)
2. **Review:** Google reviews your app (1-7 days, updates usually faster)
3. **Live:** App update goes live automatically

### Check Status:
- Go to Google Play Console → Your App → Releases
- Status will show: "Processing" → "Available"

### Users will:
- Get automatic update notification
- See new version in Play Store
- Update will install automatically (if auto-update enabled)

---

## 📋 Complete Command Summary

```bash
# 1. Navigate to app folder
cd "C:\Users\rajes\OneDrive\Dokumen\Desktop\New Cashbook Project\cashbook-mobile"

# 2. (First time only) Login to EAS
eas login

# 3. Build production AAB
eas build --platform android --profile production

# 4. (Optional) Check build status
eas build:list

# 5. Download AAB from Expo dashboard
# (Then upload manually to Google Play Console)
```

---

## ⚠️ Important Notes

### Version Code Rules:
- ✅ **MUST** be higher than previous (3 → 4 → 5...)
- ❌ Cannot reuse old numbers
- ❌ Cannot go backwards

### Version Name:
- ✅ Can be any format (1.0.4, 1.1.0, 2.0.0)
- ✅ Users see this in Play Store

### Before Each Update:
- [ ] Test app thoroughly
- [ ] Update version numbers in `app.json`
- [ ] Build new AAB
- [ ] Upload to Google Play
- [ ] Add release notes
- [ ] Submit for review

---

## 🆘 Troubleshooting

### Build Fails?
- Check: `eas build:list` to see error logs
- Verify: All code changes are saved
- Try: `eas build --platform android --profile production --clear-cache`

### Upload Fails?
- Check: Version code is higher than previous
- Verify: AAB file is not corrupted
- Ensure: You have proper permissions in Google Play Console

### Version Code Already Used?
- **Solution:** Increment to next number
- If last was 5, use 6
- If last was 10, use 11

---

## 🎉 Success!

Once submitted, your update will be:
- ✅ Processed by Google
- ✅ Reviewed (usually 1-7 days)
- ✅ Released to users automatically

**Check Google Play Console for status updates!**

---

**Need more help? See `HOW_TO_UPDATE_APP.md` for detailed guide.**

