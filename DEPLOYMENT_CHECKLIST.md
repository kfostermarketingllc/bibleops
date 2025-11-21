# 🚀 BibleOps Deployment Checklist

## Pre-Deployment

### ✅ Local Testing
- [ ] Application runs locally without errors (`npm start`)
- [ ] Test complete curriculum generation (passage-based)
- [ ] Test complete curriculum generation (theme-based)
- [ ] All 11 PDFs generate successfully
- [ ] Forms validate correctly
- [ ] Styling looks correct (blue/gold BibleOps branding)

### ✅ API Key Setup
- [ ] Anthropic API key obtained from console.anthropic.com
- [ ] API key tested locally in `.env` file
- [ ] Spending limits set in Anthropic console
- [ ] API key has sufficient credits

### ✅ GitHub Repository
- [ ] GitHub repository created (private recommended)
- [ ] `.gitignore` includes `.env` and `node_modules/`
- [ ] All code committed to GitHub
- [ ] Repository pushed to GitHub

---

## Backend Deployment (Railway)

### ✅ Railway Setup
- [ ] Railway account created at railway.app
- [ ] GitHub account connected to Railway
- [ ] New project created in Railway
- [ ] Repository connected to Railway project

### ✅ Railway Configuration
- [ ] `railway.json` file exists in project root
- [ ] `package.json` includes engines field
- [ ] Environment variables set in Railway:
  - [ ] `ANTHROPIC_API_KEY=your_key_here`
  - [ ] `NODE_ENV=production`
  - [ ] `PORT=3001`

### ✅ Railway Deployment
- [ ] Railway deployment successful (green status)
- [ ] Railway domain generated (e.g., `*.up.railway.app`)
- [ ] Health endpoint works: `https://your-url.up.railway.app/api/health`
- [ ] Health check returns `anthropicConfigured: true`

### ✅ Railway Domain
**Your Railway URL:** `https://_________________________________.up.railway.app`

_(Write your actual Railway URL here)_

---

## Frontend Deployment (Hostinger)

### ✅ Update Frontend Configuration
- [ ] `public/app.js` updated with Railway URL
  ```javascript
  const API_BASE_URL = 'https://your-railway-url.up.railway.app/api';
  ```
- [ ] Test locally with production API URL

### ✅ Hostinger Setup
- [ ] FTP/SFTP credentials obtained from Hostinger
- [ ] FTP client installed (FileZilla, Cyberduck, etc.)
- [ ] Connected to Hostinger via FTP

### ✅ File Upload
Files to upload to `public_html/` or `www/`:
- [ ] `index.html`
- [ ] `styles.css`
- [ ] `app.js` (with production API URL)
- [ ] `.htaccess`

### ✅ Hostinger Configuration
- [ ] File permissions set to 644
- [ ] SSL certificate enabled for bibleops.com
- [ ] HTTPS working: https://bibleops.com
- [ ] DNS records verified (A records pointing to server)

---

## Testing Production

### ✅ Frontend Access
- [ ] https://bibleops.com loads correctly
- [ ] BibleOps logo displays
- [ ] Blue/gold branding shows correctly
- [ ] Form fields are functional
- [ ] No console errors (check F12 Developer Tools)

### ✅ Backend Connection
- [ ] No CORS errors in browser console
- [ ] Health check accessible from frontend
- [ ] API connection successful

### ✅ Full Integration Test
**Test 1: Simple Passage Study**
- [ ] Study Focus: Passage
- [ ] Passage: "Psalm 23"
- [ ] Email: Your email
- [ ] Denomination: (your choice)
- [ ] Bible Version: ESV
- [ ] Age Group: Adults
- [ ] Duration: 2 weeks
- [ ] Generate and verify all 11 PDFs download

**Test 2: Theme Study**
- [ ] Study Focus: Theme
- [ ] Theme: "God's Love"
- [ ] Add user thoughts/goals
- [ ] Generate and verify completion

**Test 3: Different Configuration**
- [ ] Different denomination
- [ ] Different Bible version
- [ ] Different age group
- [ ] Longer duration (8 weeks)
- [ ] Generate and verify

### ✅ Performance Check
- [ ] Generation completes in 5-8 minutes
- [ ] Progress bar updates correctly
- [ ] All 11 agents show status
- [ ] PDFs download successfully
- [ ] Page remains responsive during generation

---

## Post-Deployment

### ✅ Monitoring Setup
- [ ] Railway metrics dashboard reviewed
- [ ] Anthropic API usage dashboard checked
- [ ] Error tracking in place
- [ ] Logs accessible in Railway

### ✅ Security Review
- [ ] `.env` file not committed to GitHub
- [ ] API keys secure (only in Railway environment)
- [ ] Repository private (if containing sensitive logic)
- [ ] SSL certificate active and valid
- [ ] HTTPS enforced (HTTP redirects to HTTPS)

### ✅ Documentation
- [ ] README.md updated with deployment info
- [ ] DEPLOYMENT_GUIDE.md reviewed
- [ ] Team members have access to necessary credentials
- [ ] Backup of all credentials stored securely

---

## Optional Enhancements

### 🎯 Rate Limiting (Recommended)
- [ ] Install `express-rate-limit`: `npm install express-rate-limit`
- [ ] Add rate limiting to `/api/generate` endpoint (5 requests per 15 minutes)
- [ ] Redeploy to Railway
- [ ] Test rate limiting works

### 🎯 Analytics (Optional)
- [ ] Google Analytics added to `index.html`
- [ ] Conversion tracking set up
- [ ] User flow tracking configured

### 🎯 Error Monitoring (Optional)
- [ ] Error tracking service integrated (Sentry, LogRocket)
- [ ] Error alerts configured
- [ ] Email notifications for critical errors

### 🎯 Email Delivery (Future)
- [ ] Email service configured (SendGrid, Mailgun)
- [ ] Email templates created
- [ ] PDF attachment delivery working

---

## Troubleshooting Checklist

### ❌ If Generation Fails

**Check:**
1. [ ] Railway logs for errors
2. [ ] Anthropic API key is valid
3. [ ] API key has credits remaining
4. [ ] Railway deployment is active (not sleeping)
5. [ ] CORS configuration includes bibleops.com

**Actions:**
- [ ] Restart Railway deployment
- [ ] Verify environment variables
- [ ] Check API usage limits
- [ ] Test health endpoint

### ❌ If Frontend Won't Load

**Check:**
1. [ ] DNS records point to correct server
2. [ ] SSL certificate is active
3. [ ] Files uploaded to correct directory
4. [ ] File permissions are correct (644)
5. [ ] `.htaccess` is uploaded

**Actions:**
- [ ] Clear browser cache
- [ ] Check Hostinger error logs
- [ ] Verify FTP upload successful
- [ ] Test in different browser

### ❌ If CORS Errors Occur

**Check:**
1. [ ] `server.js` CORS config includes bibleops.com
2. [ ] Railway redeployed after CORS update
3. [ ] API_BASE_URL in `app.js` is correct
4. [ ] Using HTTPS (not HTTP) for API calls

**Actions:**
- [ ] Update CORS configuration
- [ ] Commit and push to GitHub
- [ ] Verify Railway auto-deployed
- [ ] Clear browser cache

---

## Deployment Complete! 🎉

Once all checkboxes are complete, your BibleOps curriculum generator is live!

**Production URLs:**
- **Website:** https://bibleops.com
- **API:** https://your-railway-url.up.railway.app

**Next Steps:**
1. Share with beta testers
2. Monitor usage and costs
3. Gather feedback
4. Iterate and improve

---

## Contact Information

**Railway Dashboard:** https://railway.app/dashboard

**Anthropic Console:** https://console.anthropic.com/

**Hostinger Panel:** https://hpanel.hostinger.com/

**GitHub Repository:** https://github.com/YOUR_USERNAME/bibleops-generator

---

**Built with excellence. Grounded in Scripture. Powered by AI.** ✝️

**BibleOps - Streamline Your Bible Study Preparation**
