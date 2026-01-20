# 🚀 Quick Guide: Update Your App on Google Play

## Current Version: 1.0.3 (Version Code: 3)

---

## ⚡ Quick Steps (5 Minutes)

### Step 1: Update Version Numbers ⏱️ 1 min

Edit `cashbook-mobile/app.json`:

**Change this:**
```json
"version": "1.0.3",
"android": {
  "versionCode": 3
}
```

**To this:**
```json
"version": "1.0.4",    // ← Change to next version
"android": {
  "versionCode": 4     // ← Change to next number (must be higher!)
}
```

---

### Step 2: Build New AAB ⏱️ 15-20 min

Open terminal in `cashbook-mobile` folder:

```bash
cd cashbook-mobile
eas build --platform android --profile production
```

**Wait for build to complete** (you'll see progress in terminal)

---

### Step 3: Download AAB ⏱️ 1 min

1. Go to: https://expo.dev/accounts/[your-account]/projects/byjan-cashbook/builds
2. Find your latest build (status: "Finished")
3. Click "Download" → Save the `.aab` file

---

### Step 4: Upload to Google Play ⏱️ 2 min

1. **Go to Google Play Console:**
   - https://play.google.com/console
   - Select "Byjan Cashbook" app

2. **Navigate to Production:**
   - Click "Production" in left menu
   - Click "Create new release" (or "Edit release")

3. **Upload AAB:**
   - Click "Upload" button
   - Select your downloaded `.aab` file
   - Wait for upload (2-5 minutes)

4. **Add Release Notes:**
   - Example: "Bug fixes and performance improvements"
   - Click "Save"

5. **Submit:**
   - Click "Review release"
   - Click "Start rollout to Production"
   - **Done!** ✅

---

## 📋 Complete Command List

```bash
# 1. Navigate to app folder
cd cashbook-mobile

# 2. Build new AAB (after updating version in app.json)
eas build --platform android --profile production

# 3. Check build status
eas build:list

# 4. (Optional) Submit directly to Google Play
eas submit --platform android --profile production
```

---

## ⚠️ Important Reminders

✅ **Version Code MUST be higher** than previous (3 → 4 → 5...)  
✅ **Test your app** before building  
✅ **Write release notes** describing changes  
✅ **Wait for Google Play review** (usually 1-7 days, updates faster)

---

## 🎯 What Happens Next?

1. **Build completes** → AAB file ready
2. **Upload to Google Play** → Processing
3. **Google reviews** → Usually 1-7 days (updates faster)
4. **App goes live** → Users get update notification

---

## 📱 Check Update Status

- **Expo Dashboard:** https://expo.dev → Your Project → Builds
- **Google Play Console:** https://play.google.com/console → Your App → Releases

---

**That's it! Your app will be updated in a few days.** 🎉

