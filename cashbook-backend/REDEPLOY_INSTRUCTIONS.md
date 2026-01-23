# How to Redeploy on Render

## Quick Steps

### Step 1: Commit Your Changes

```bash
# Add the important files we modified
git add transactions/serializers.py
git add transactions/views.py
git add transactions/urls.py
git add urls.py
git add README.md
git add env.txt

# Commit the changes
git commit -m "Fix: Add authentication endpoints and fix category_id database error"

# Push to GitHub
git push origin main
```

### Step 2: Redeploy on Render

**Option A: Automatic Deploy (if Git is connected)**
- After pushing to GitHub, Render will automatically detect the changes
- Go to Render Dashboard → Your Service → Check "Events" tab
- You'll see a new deployment starting automatically

**Option B: Manual Deploy**
1. Go to [Render Dashboard](https://dashboard.render.com)
2. Click on your service: `cashbook-backend-2`
3. Click the **"Manual Deploy"** button (top right)
4. Select **"Deploy latest commit"**
5. Wait for deployment to complete (usually 2-5 minutes)

### Step 3: Verify Deployment

1. Check deployment logs in Render Dashboard
2. Wait for status to show "Live" (green)
3. Test the endpoint:
   ```bash
   curl https://cashbook-backend-2.onrender.com/api/auth/status/
   ```
4. Test summary endpoint (after logging in):
   ```bash
   curl -H "Authorization: Bearer YOUR_TOKEN" \
        https://cashbook-backend-2.onrender.com/api/transactions/summary/
   ```

## What Was Fixed

1. ✅ Added authentication endpoints:
   - `/api/auth/status/` - Check auth configuration
   - `/api/user/` - Get/Update user profile
   - `/api/password/change/` - Change password
   - `/api/token/verify/` - Verify JWT token

2. ✅ Fixed database schema error:
   - Fixed `category_id` column error in transactions summary
   - Properly marked `categoryId` as SerializerMethodField

## Troubleshooting

If deployment fails:
1. Check Render logs for errors
2. Verify environment variables are set correctly
3. Ensure database connection is working
4. Check that all dependencies are in `requirements.txt`

## Environment Variables to Check

Make sure these are set in Render Dashboard → Environment:
- `SECRET_KEY`
- `DEBUG=False`
- `ALLOWED_HOSTS`
- `DATABASE_URL`
- `CORS_ALLOWED_ORIGINS`

