# 📱 How to Update Your App on Google Play

## Step 1: Update Version Numbers

**IMPORTANT:** You MUST increment version numbers for each update!

### Current Version:
- **Version:** `1.0.3`
- **Version Code:** `3`

### Update `app.json`:

Open `cashbook-mobile/app.json` and update:

```json
{
  "expo": {
    "version": "1.0.4",        // ← Increment this (e.g., 1.0.3 → 1.0.4)
    "android": {
      "versionCode": 4         // ← Increment this (e.g., 3 → 4)
    }
  }
}
```

**Rules:**
- **version** (e.g., "1.0.4"): User-visible version (can be any format)
- **versionCode**: Must be a number higher than previous (3 → 4 → 5...)

---

## Step 2: Build New AAB File

### Option A: Build Locally with EAS (Recommended)

```bash
# Navigate to your app directory
cd cashbook-mobile

# Make sure you're logged in
eas login

# Build production AAB
eas build --platform android --profile production
```

**Build time:** ~15-20 minutes

### Option B: Build on EAS Servers (Cloud Build)

```bash
cd cashbook-mobile
eas build --platform android --profile production --non-interactive
```

---

## Step 3: Download the AAB File

After build completes:

1. **Check EAS Dashboard:**
   - Go to https://expo.dev/accounts/[your-account]/projects/byjan-cashbook/builds
   - Find your latest build
   - Click "Download" to get the `.aab` file

2. **Or use command line:**
   ```bash
   eas build:list
   # Then download using the build ID
   ```

---

## Step 4: Upload to Google Play Console

### Method 1: Upload via Google Play Console (Web)

1. **Login to Google Play Console:**
   - Go to https://play.google.com/console
   - Select your app "Byjan Cashbook"

2. **Go to Production/Testing Track:**
   - Click "Production" (or "Internal testing" / "Closed testing" / "Open testing")
   - Click "Create new release" (or "Edit release" if updating existing)

3. **Upload AAB File:**
   - Click "Upload" or drag & drop your `.aab` file
   - Wait for upload to complete (may take a few minutes)

4. **Add Release Notes:**
   - Fill in "Release notes" section
   - Example: "Bug fixes and performance improvements"
   - You can add notes in multiple languages

5. **Review Release:**
   - Click "Review release"
   - Check all information is correct
   - Click "Start rollout to Production" (or appropriate track)

### Method 2: Upload via EAS Submit (Automated)

```bash
# This automatically uploads to Google Play
eas submit --platform android --profile production
```

**Note:** You need to configure credentials first:
```bash
eas credentials
```

---

## Step 5: Monitor Release

1. **Check Release Status:**
   - Go to Google Play Console → Your App → Releases
   - Status will show: "Processing" → "Available"

2. **Review Time:**
   - Usually 1-7 days for first review
   - Updates are typically faster (few hours to 2 days)

3. **Check for Issues:**
   - Google Play Console will notify you of any problems
   - Check "Issues" section in the console

---

## 📋 Quick Command Reference

```bash
# 1. Update version in app.json (manually edit file)

# 2. Build new AAB
eas build --platform android --profile production

# 3. Download AAB (from Expo dashboard or use build:list)

# 4. Upload to Google Play (via web console or eas submit)
eas submit --platform android --profile production
```

---

## ⚠️ Important Notes

### Version Code Rules:
- ✅ **MUST** be higher than previous version
- ✅ Can increment by 1 each time (3 → 4 → 5)
- ❌ Cannot reuse old version codes
- ❌ Cannot go backwards

### Version Name Rules:
- ✅ Can be any format (1.0.4, 1.1.0, 2.0.0)
- ✅ Should follow semantic versioning (major.minor.patch)
- ✅ Users see this in Play Store

### Before Each Update:
- [ ] Test the app thoroughly
- [ ] Update version numbers
- [ ] Write release notes
- [ ] Build AAB file
- [ ] Upload to Google Play
- [ ] Monitor for issues

---

## 🔄 Complete Update Workflow

```bash
# 1. Make your code changes
# (Edit files, fix bugs, add features)

# 2. Update version in app.json
# (Change version: "1.0.3" → "1.0.4")
# (Change versionCode: 3 → 4)

# 3. Test locally
npm start
# or
npx expo start

# 4. Build production AAB
eas build --platform android --profile production

# 5. Wait for build to complete (~15-20 min)

# 6. Download AAB file from Expo dashboard

# 7. Upload to Google Play Console
# (Via web interface or eas submit)

# 8. Add release notes and submit for review
```

---

## 🆘 Troubleshooting

### Build Fails:
- Check EAS build logs: `eas build:list`
- Verify all dependencies are compatible
- Check for syntax errors in your code

### Upload Fails:
- Verify version code is higher than previous
- Check AAB file is not corrupted
- Ensure you have proper permissions in Google Play Console

### Version Code Already Used:
- You cannot reuse version codes
- Increment to next number (if last was 5, use 6)

### App Not Updating:
- Wait for Google Play review (can take time)
- Check release status in Google Play Console
- Verify version code is actually higher

---

## 📝 Example: Updating from Version 1.0.3 to 1.0.4

1. **Edit `app.json`:**
   ```json
   "version": "1.0.4",
   "android": {
     "versionCode": 4
   }
   ```

2. **Build:**
   ```bash
   eas build --platform android --profile production
   ```

3. **Upload:**
   - Download `.aab` from Expo dashboard
   - Upload to Google Play Console → Production → Create new release
   - Add release notes: "Version 1.0.4 - Bug fixes and improvements"
   - Submit for review

4. **Done!** ✅

---

**That's it! Follow these steps each time you want to update your app.** 🚀

