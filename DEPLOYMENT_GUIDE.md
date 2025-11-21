# 🚀 BibleOps Deployment Guide

## Complete step-by-step guide to deploy BibleOps to bibleops.com

---

## 📋 Overview

This guide will walk you through deploying:
- **Backend API** → Railway.app (free tier)
- **Frontend** → Hostinger (your existing hosting at bibleops.com)
- **Configuration** → Environment variables and API endpoints
- **Testing** → Verification and troubleshooting

**Estimated Time:** 30-45 minutes

---

## 🎯 Pre-Deployment Checklist

Before starting, ensure you have:
- ✅ Anthropic API key (from console.anthropic.com)
- ✅ GitHub account (for Railway deployment)
- ✅ Access to bibleops.com hosting (Hostinger or similar)
- ✅ FTP/SFTP credentials for bibleops.com
- ✅ All files tested locally and working

---

## Part 1: Backend Deployment to Railway

### Step 1: Prepare Backend for Deployment

**1.1: Create Railway-specific files**

Create `railway.json` in the project root:

```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS"
  },
  "deploy": {
    "startCommand": "npm start",
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

**1.2: Update package.json engines**

Add to your `package.json`:
```json
{
  "engines": {
    "node": ">=18.0.0",
    "npm": ">=9.0.0"
  }
}
```

**1.3: Update server.js for production**

Update the CORS configuration in `src/server.js`:

```javascript
// Update CORS to allow bibleops.com
app.use(cors({
    origin: process.env.NODE_ENV === 'production'
        ? ['https://bibleops.com', 'https://www.bibleops.com']
        : '*',
    credentials: true
}));
```

### Step 2: Create GitHub Repository

**2.1: Initialize Git (if not already)**

```bash
cd /Users/kevinfoster/currforge/bible-study-website
git init
git add .
git commit -m "Initial commit - BibleOps Bible Study Generator"
```

**2.2: Create GitHub Repository**

1. Go to https://github.com/new
2. Repository name: `bibleops-generator` (or your preferred name)
3. Set to **Private** (to protect your code)
4. Do NOT initialize with README (we already have one)
5. Click "Create repository"

**2.3: Push to GitHub**

```bash
git remote add origin https://github.com/YOUR_USERNAME/bibleops-generator.git
git branch -M main
git push -u origin main
```

### Step 3: Deploy to Railway

**3.1: Create Railway Account**

1. Go to https://railway.app
2. Sign up with GitHub (recommended)
3. Verify your email

**3.2: Create New Project**

1. Click "New Project"
2. Select "Deploy from GitHub repo"
3. Connect your GitHub account if prompted
4. Select your `bibleops-generator` repository
5. Railway will automatically detect it's a Node.js project

**3.3: Configure Environment Variables**

1. In Railway dashboard, click on your deployment
2. Go to "Variables" tab
3. Add these variables:

```
ANTHROPIC_API_KEY=your_actual_api_key_here
NODE_ENV=production
PORT=3001
```

**3.4: Deploy**

1. Railway will automatically build and deploy
2. Wait 2-3 minutes for deployment to complete
3. Once deployed, you'll see a status indicator turn green

**3.5: Get Your Backend URL**

1. In Railway dashboard, click "Settings"
2. Under "Domains", click "Generate Domain"
3. You'll get a URL like: `https://bibleops-generator-production.up.railway.app`
4. **Copy this URL** - you'll need it for frontend configuration

**3.6: Test Backend API**

Open in browser:
```
https://your-railway-url.up.railway.app/api/health
```

You should see:
```json
{
  "status": "healthy",
  "anthropicConfigured": true,
  "agentsCount": 11
}
```

---

## Part 2: Frontend Deployment to bibleops.com

### Step 4: Configure Frontend for Production

**4.1: Update API Base URL**

Edit `public/app.js` and update the API_BASE_URL:

```javascript
// Change from:
const API_BASE_URL = 'http://localhost:3001/api';

// To:
const API_BASE_URL = 'https://your-railway-url.up.railway.app/api';
```

Replace `your-railway-url.up.railway.app` with your actual Railway domain.

**4.2: Optimize Files for Production**

Files to deploy:
```
public/
├── index.html
├── styles.css
├── app.js
└── (any other assets)
```

### Step 5: Deploy to Hostinger

**5.1: Connect via FTP/SFTP**

Using FileZilla or similar FTP client:

1. **Host:** ftp.bibleops.com (or provided by Hostinger)
2. **Username:** Your Hostinger FTP username
3. **Password:** Your Hostinger FTP password
4. **Port:** 21 (FTP) or 22 (SFTP)

**5.2: Upload Files**

1. Navigate to your `public_html` folder (or `www` or `htdocs`)
2. Upload these files from your `public/` folder:
   - `index.html`
   - `styles.css`
   - `app.js`
3. Ensure file permissions are set to 644

**5.3: Create .htaccess (Optional but Recommended)**

Create a `.htaccess` file in the root directory:

```apache
# Force HTTPS
RewriteEngine On
RewriteCond %{HTTPS} off
RewriteRule ^(.*)$ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]

# Set default page
DirectoryIndex index.html

# Enable compression
<IfModule mod_deflate.c>
    AddOutputFilterByType DEFLATE text/html text/plain text/xml text/css text/javascript application/javascript
</IfModule>

# Browser caching
<IfModule mod_expires.c>
    ExpiresActive On
    ExpiresByType text/css "access plus 1 month"
    ExpiresByType application/javascript "access plus 1 month"
    ExpiresByType text/html "access plus 1 hour"
</IfModule>
```

### Step 6: DNS Configuration

**6.1: Verify DNS Settings**

In your Hostinger control panel:

1. Go to "Domains" → "bibleops.com"
2. Click "DNS Zone"
3. Ensure you have these records:

```
Type    Name    Content                     TTL
A       @       [Your Server IP]           3600
A       www     [Your Server IP]           3600
```

**6.2: SSL Certificate**

1. In Hostinger, go to "SSL"
2. Enable "Free SSL" for bibleops.com
3. Wait 5-10 minutes for activation
4. Verify HTTPS works: https://bibleops.com

---

## Part 3: Testing & Verification

### Step 7: Complete System Test

**7.1: Test Frontend Access**

Visit: https://bibleops.com

✅ Check:
- Page loads without errors
- BibleOps logo displays correctly
- Form fields are functional
- Styling looks correct (blue/gold theme)

**7.2: Test Backend Connection**

Open browser console (F12) and watch for:

✅ No CORS errors
✅ API connection successful when form is submitted

**7.3: Generate Test Curriculum**

Fill out the form with test data:
- Study Focus: Passage
- Passage: "Psalm 23"
- Email: Your email address
- Denomination: Your denomination
- Bible Version: ESV
- Age Group: Adults
- Duration: 2 weeks

Click "Generate Curriculum" and verify:
- ✅ Progress bar appears
- ✅ Agents show progress (1/11, 2/11, etc.)
- ✅ Generation completes in 5-8 minutes
- ✅ Download links appear
- ✅ PDFs download successfully

**7.4: Test Multiple Scenarios**

Test these variations:
- [ ] Passage-based study
- [ ] Theme-based study
- [ ] Different denominations
- [ ] Different age groups
- [ ] With and without user thoughts

---

## Part 4: Post-Deployment Configuration

### Step 8: Monitor and Optimize

**8.1: Railway Monitoring**

In Railway dashboard:
- Check "Metrics" for usage
- Monitor deployment logs
- Set up alerts for failures

**8.2: API Key Management**

- Set spending limits in Anthropic console
- Monitor API usage regularly
- Consider implementing rate limiting for public access

**8.3: Error Tracking**

Add error logging to `src/server.js`:

```javascript
// Add after other middleware
app.use((err, req, res, next) => {
    console.error('Server Error:', err);
    res.status(500).json({
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? err.message : 'An error occurred'
    });
});
```

### Step 9: Security Enhancements

**9.1: Rate Limiting (Recommended)**

Install rate limiting:
```bash
npm install express-rate-limit
```

Add to `src/server.js`:
```javascript
const rateLimit = require('express-rate-limit');

const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 requests per 15 minutes
    message: 'Too many curriculum generation requests, please try again later.'
});

app.use('/api/generate', limiter);
```

**9.2: Input Validation**

Already implemented in server.js, but verify these validations work:
- Email format validation
- Required field validation
- Passage/theme input sanitization

**9.3: Environment Security**

✅ Verify:
- [ ] `.env` is in `.gitignore`
- [ ] API keys are only in Railway environment variables
- [ ] No secrets committed to GitHub
- [ ] Repository is private

---

## Part 5: Troubleshooting

### Common Issues and Solutions

**Issue: CORS Errors**

**Symptom:** Browser console shows CORS policy errors

**Solution:**
1. Verify `src/server.js` CORS configuration includes bibleops.com
2. Redeploy backend to Railway
3. Clear browser cache and test again

---

**Issue: "API Key Not Configured"**

**Symptom:** Health check fails or generation doesn't start

**Solution:**
1. Check Railway environment variables
2. Verify `ANTHROPIC_API_KEY` is set correctly
3. Restart Railway deployment
4. Test health endpoint: `/api/health`

---

**Issue: Frontend Shows "Failed to Generate"**

**Symptom:** Form submits but shows error message

**Solution:**
1. Check Railway logs for errors
2. Verify Anthropic API key is valid and has credits
3. Check Railway deployment status (should be green)
4. Test backend health endpoint directly

---

**Issue: Slow Generation Times**

**Symptom:** Takes longer than 8 minutes

**Solution:**
1. Normal for complex studies (e.g., 12-week, detailed themes)
2. Check Railway instance isn't sleeping (free tier has sleep after inactivity)
3. Consider upgrading Railway plan for better performance
4. Optimize agent prompts if consistently slow

---

**Issue: PDFs Won't Download**

**Symptom:** Download links don't work or files are corrupt

**Solution:**
1. Check Railway logs for PDF generation errors
2. Verify `generated-pdfs/` directory exists on Railway
3. Check file permissions in Railway deployment
4. Test download endpoint directly in browser

---

**Issue: Railway Deployment Fails**

**Symptom:** Build fails or deployment won't start

**Solution:**
1. Check Railway build logs for specific errors
2. Verify `package.json` has correct dependencies
3. Ensure Node version is compatible (>=18.0.0)
4. Check for missing environment variables
5. Verify GitHub repository synced correctly

---

## Part 6: Ongoing Maintenance

### Monthly Tasks

**Monitor Usage:**
- [ ] Check Anthropic API usage and costs
- [ ] Review Railway usage metrics
- [ ] Analyze generation success rates
- [ ] Check storage usage (PDFs)

**Security:**
- [ ] Review API key access logs
- [ ] Update dependencies (`npm update`)
- [ ] Check for security vulnerabilities (`npm audit`)
- [ ] Verify SSL certificate is active

**Optimization:**
- [ ] Review agent performance
- [ ] Optimize slow-running agents
- [ ] Clean up old PDFs (if stored long-term)
- [ ] Update Bible resources if needed

---

## Part 7: Scaling Considerations

### When Usage Grows

**Backend Scaling:**
- Upgrade Railway plan for better performance
- Consider dedicated hosting (AWS, DigitalOcean)
- Implement caching for repeated requests
- Add database for usage tracking

**Frontend Optimization:**
- Add CDN for static assets
- Implement progressive web app features
- Add offline support for generated PDFs
- Consider building mobile app

**Features to Add:**
- User accounts and saved studies
- Curriculum library and sharing
- Payment system for premium features
- Analytics dashboard
- Email delivery of PDFs

---

## 🎉 Deployment Complete!

Once you've completed all steps, your BibleOps curriculum generator will be live at:

**🌐 https://bibleops.com**

**Backend API:** https://your-railway-url.up.railway.app

---

## 📞 Quick Reference

**Railway Dashboard:** https://railway.app/dashboard

**Anthropic Console:** https://console.anthropic.com/

**Hostinger Control Panel:** https://hpanel.hostinger.com/

**GitHub Repository:** https://github.com/YOUR_USERNAME/bibleops-generator

---

## 🆘 Need Help?

**Check These First:**
1. Railway deployment logs
2. Browser console (F12) for frontend errors
3. Railway metrics for performance issues
4. Anthropic console for API usage/limits

**Common Support Resources:**
- Railway Docs: https://docs.railway.app/
- Anthropic API Docs: https://docs.anthropic.com/
- Express.js Docs: https://expressjs.com/

---

**Built with excellence. Grounded in Scripture. Powered by AI.** ✝️

**BibleOps - Streamline Your Bible Study Preparation**

---

## Appendix: Environment Variables Reference

### Development (.env)
```bash
ANTHROPIC_API_KEY=sk-ant-your-key-here
PORT=3001
NODE_ENV=development
```

### Production (Railway)
```bash
ANTHROPIC_API_KEY=sk-ant-your-key-here
NODE_ENV=production
PORT=3001
```

### Frontend (app.js)
```javascript
// Development
const API_BASE_URL = 'http://localhost:3001/api';

// Production
const API_BASE_URL = 'https://your-railway-url.up.railway.app/api';
```

---

## Appendix: File Checklist for Deployment

### Backend Files (Railway via GitHub)
- [x] `src/server.js`
- [x] `src/bible-study-generator.js`
- [x] `src/pdf-generator.js`
- [x] `agents/agent-prompts.js`
- [x] `package.json`
- [x] `package-lock.json`
- [x] `.gitignore`
- [x] `railway.json` (create this)
- [x] Environment variables in Railway dashboard

### Frontend Files (Hostinger)
- [x] `public/index.html`
- [x] `public/styles.css`
- [x] `public/app.js` (with updated API_BASE_URL)
- [x] `.htaccess` (create this)

### Documentation (Keep for Reference)
- [x] `README.md`
- [x] `START_HERE.md`
- [x] `BRANDING_GUIDE.md`
- [x] `DEPLOYMENT_GUIDE.md` (this file)
