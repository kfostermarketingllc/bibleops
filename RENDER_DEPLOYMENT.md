# 🚀 Render Deployment Instructions for BibleOps

**Status:** ✅ Code pushed to GitHub - Ready for Render deployment

**GitHub Repository:** https://github.com/kfostermarketingllc/bibleops

---

## 📋 Quick Deployment Steps

### Step 1: Log in to Render

Go to: https://dashboard.render.com/

- Sign in with GitHub (use your kfostermarketingllc account)

---

### Step 2: Create New Web Service

1. Click **"New +"** button (top right)
2. Select **"Web Service"**

---

### Step 3: Connect Repository

1. **Connect GitHub Repository:**
   - Find `kfostermarketingllc/bibleops` in the list
   - Click **"Connect"**

   *(If you don't see it, click "Configure account" to grant Render access)*

---

### Step 4: Configure Web Service

Fill in these settings:

```
Name: bibleops-backend
Region: Oregon (US West) or closest to you
Branch: main
Root Directory: (leave blank)
Runtime: Node
Build Command: npm install
Start Command: npm start
```

**Instance Type:**
- **Free** (for testing, sleeps after 15 min of inactivity)
- **Starter - $7/month** (recommended for production, always on)

---

### Step 5: Add Environment Variables

Click **"Advanced"** → **"Add Environment Variable"**

Add these variables ONE BY ONE:

#### Required Variables:

| Key | Value |
|-----|-------|
| `ANTHROPIC_API_KEY` | `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` |
| `EMAIL_SERVICE` | `mailchimp` |
| `MAILCHIMP_API_KEY` | `md-8ykab5BqZOWLnxTAfMikZA` |
| `MAILCHIMP_FROM_EMAIL` | `noreply@bibleops.com` |
| `MAILCHIMP_FROM_NAME` | `BibleOps` |
| `NODE_ENV` | `production` |
| `PORT` | `3001` |

**⚠️ IMPORTANT:**
- Do NOT add quotes around the values
- Copy-paste exactly as shown above

---

### Step 6: Deploy

1. Click **"Create Web Service"**
2. Render will automatically:
   - Clone your GitHub repository
   - Run `npm install`
   - Start the server with `npm start`
3. **Wait 5-10 minutes** for first deployment

---

### Step 7: Get Your Backend URL

Once deployed, Render will provide a URL like:

```
https://bibleops-backend.onrender.com
```

or

```
https://bibleops-backend-XXXX.onrender.com
```

**Copy this URL - you'll need it for the frontend!**

---

### Step 8: Test Your Backend

Test these endpoints to verify deployment:

#### Health Check:
```bash
curl https://YOUR-RENDER-URL.onrender.com/api/health
```

**Expected response:**
```json
{
  "status": "healthy",
  "anthropicConfigured": true,
  "emailConfigured": true,
  "emailService": "mailchimp",
  "agents": 11
}
```

#### Email Test:
```bash
curl https://YOUR-RENDER-URL.onrender.com/api/test-email
```

**Expected response:**
```json
{
  "success": true,
  "message": "Email service connected successfully",
  "service": "Mailchimp Transactional"
}
```

---

## ✅ Deployment Checklist

- [ ] Logged into Render
- [ ] Created new Web Service
- [ ] Connected GitHub repository: `kfostermarketingllc/bibleops`
- [ ] Configured service settings (name, region, commands)
- [ ] Added all 7 environment variables
- [ ] Clicked "Create Web Service"
- [ ] Waited for deployment to complete
- [ ] Copied backend URL
- [ ] Tested `/api/health` endpoint
- [ ] Tested `/api/test-email` endpoint
- [ ] Both tests passed ✅

---

## 🔍 Monitoring Deployment

### Check Deployment Logs:

In Render dashboard:
1. Click on your `bibleops-backend` service
2. Click "Logs" tab
3. You should see:

```
📖 Bible Study Curriculum Generator Started!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📍 Server running on: http://localhost:3001
🌐 Open in browser:   http://localhost:3001

🔑 Anthropic API:     ✅ Configured
📧 Email Service:     ✅ Configured (Mailchimp)
🤖 AI Agents:         11 specialized Bible study agents

✝️  Ready to generate transformative Bible studies!
```

### If Deployment Fails:

Check for these common issues:
- ❌ Missing environment variables
- ❌ Wrong Node version (needs 18+)
- ❌ Build command failed
- ❌ Port already in use

---

## 🎯 Next Steps After Deployment

Once your backend is deployed and tested:

1. **Update Frontend API URL**
   - Edit `public/app.js`
   - Change API_BASE_URL to your Render URL

2. **Upload Frontend to Hostinger**
   - Upload files from `public/` folder
   - Test form submission

3. **Configure Email Domain**
   - Add DNS records for `bibleops.com`
   - Verify domain in Mailchimp

4. **Test End-to-End**
   - Submit form on bibleops.com
   - Verify curriculum generation
   - Check email delivery

---

## 💡 Render Tips

### Free Tier Limitations:
- Sleeps after 15 minutes of inactivity
- First request after sleep takes ~30 seconds to wake up
- 750 hours/month free

### Starter Tier Benefits ($7/month):
- Always on, no sleeping
- Instant responses
- Perfect for production

### Auto-Deploy:
- Render automatically deploys when you push to GitHub
- No manual deployment needed
- Check "Auto-Deploy" setting (should be ON by default)

---

## 🚨 Troubleshooting

### "Build Failed" Error:
```bash
# Check package.json has engines specified
{
  "engines": {
    "node": ">=18.0.0"
  }
}
```

### "Application Failed to Start":
- Check environment variables are set correctly
- Verify no typos in variable names
- Check logs for specific error messages

### "Cannot Connect to API":
- Verify backend URL is correct
- Check CORS settings allow your frontend domain
- Test health endpoint directly

---

**Once deployment succeeds, let me know your Render URL and we'll update the frontend!** 🚀
