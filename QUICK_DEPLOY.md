# ⚡ BibleOps Quick Deploy Guide

**Target:** Deploy to https://bibleops.com in under 30 minutes

---

## Step 1: Railway Backend (10 minutes)

### A. GitHub Setup
```bash
cd /Users/kevinfoster/currforge/bible-study-website
git init
git add .
git commit -m "Initial commit - BibleOps"
```

Go to https://github.com/new:
- Name: `bibleops-generator`
- Private repository
- Create

```bash
git remote add origin https://github.com/YOUR_USERNAME/bibleops-generator.git
git branch -M main
git push -u origin main
```

### B. Railway Deployment
1. Go to https://railway.app → Sign up with GitHub
2. New Project → Deploy from GitHub repo
3. Select `bibleops-generator`
4. Go to Variables tab, add:
   ```
   ANTHROPIC_API_KEY=sk-ant-your-key-here
   NODE_ENV=production
   PORT=3001
   ```
5. Wait for deploy (2-3 minutes)
6. Settings → Generate Domain
7. **Copy your Railway URL** (e.g., `https://xyz.up.railway.app`)

### C. Test Backend
Visit: `https://your-railway-url.up.railway.app/api/health`

Should see:
```json
{
  "status": "healthy",
  "anthropicConfigured": true,
  "agents": 11
}
```

✅ Backend deployed!

---

## Step 2: Update Frontend (5 minutes)

Edit `public/app.js` line 2:

```javascript
// Change from:
const API_BASE_URL = 'http://localhost:3001/api';

// To (use YOUR Railway URL):
const API_BASE_URL = 'https://your-railway-url.up.railway.app/api';
```

**Save the file!**

---

## Step 3: Hostinger Upload (10 minutes)

### A. Connect via FTP
**FTP Details from Hostinger:**
- Host: `ftp.bibleops.com`
- Username: (from Hostinger)
- Password: (from Hostinger)
- Port: 21

### B. Upload Files to `public_html/`
Upload these 4 files:
```
✅ index.html
✅ styles.css
✅ app.js (with updated API URL!)
✅ .htaccess
```

### C. Enable SSL
In Hostinger control panel:
1. Go to SSL section
2. Enable "Free SSL" for bibleops.com
3. Wait 5-10 minutes

---

## Step 4: Test Live Site (5 minutes)

### A. Visit https://bibleops.com
Check:
- ✅ Page loads
- ✅ Logo displays
- ✅ Blue/gold styling
- ✅ No console errors (F12)

### B. Generate Test Study
- Passage: "Psalm 23"
- Email: your@email.com
- Denomination: Any
- Bible Version: ESV
- Age Group: Adults
- Duration: 2 weeks
- Click "Generate Curriculum"

Wait 5-8 minutes, verify:
- ✅ Progress shows 1/11 through 11/11
- ✅ All 11 PDFs available
- ✅ PDFs download successfully

---

## 🎉 You're Live!

**BibleOps is now deployed at https://bibleops.com**

---

## If Something Goes Wrong

### Backend Issues
**Symptom:** Health check fails
**Fix:**
1. Check Railway logs
2. Verify environment variables
3. Redeploy Railway project

### Frontend Issues
**Symptom:** Page won't load
**Fix:**
1. Check file upload was successful
2. Verify SSL is active
3. Clear browser cache

### CORS Errors
**Symptom:** API connection fails
**Fix:**
1. Verify `app.js` has correct Railway URL
2. Re-upload `app.js` to Hostinger
3. Clear browser cache

### Generation Fails
**Symptom:** "Failed to generate" error
**Fix:**
1. Check Anthropic API key is valid
2. Verify API has credits
3. Check Railway deployment status

---

## Quick Links

- **Your Site:** https://bibleops.com
- **Railway Dashboard:** https://railway.app/dashboard
- **Anthropic Console:** https://console.anthropic.com/
- **Hostinger Panel:** https://hpanel.hostinger.com/

---

## Cost Estimate

**Per Curriculum Generation:**
- ~$0.80-1.50 per complete study
- 11 AI agents
- 45+ pages of content

**Monthly with 100 generations:**
- ~$80-150 in API costs
- Railway: Free (or $5/month for better performance)
- Hostinger: Your existing hosting plan

---

## Next Steps After Deployment

1. **Share with beta testers** - Get feedback
2. **Monitor Railway metrics** - Watch performance
3. **Check Anthropic usage** - Track API costs
4. **Add rate limiting** - Prevent abuse (see DEPLOYMENT_GUIDE.md)
5. **Set spending limits** - In Anthropic console

---

**That's it! Your AI-powered Bible study generator is live!** ✝️
