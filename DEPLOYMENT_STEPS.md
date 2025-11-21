# 🚀 BibleOps Production Deployment Steps

**Date:** November 20, 2025
**Status:** In Progress

---

## ✅ Completed Steps:

### 1. Git Repository Setup
- ✅ Git initialized
- ✅ .gitignore created (excludes .env and sensitive files)
- ✅ Initial commit created (24 files, 8,778 lines)
- ✅ Remote added: https://gitlab.com/kfostermarketingllc/bibleops.git
- ✅ Branch renamed to `main`

### Commit Details:
```
Commit: c8787b7
Message: Initial commit: BibleOps Bible Study Curriculum Generator
Files: 24 files changed, 8778 insertions(+)
```

---

## 🔄 Next Steps:

### Step 2: Push to GitLab

You'll need to authenticate with GitLab. Choose one option:

#### Option A: HTTPS (Recommended for first-time)
```bash
git push -u origin main
```
When prompted, enter your GitLab credentials.

#### Option B: SSH (If you have SSH keys set up)
```bash
# Change remote to SSH
git remote set-url origin git@gitlab.com:kfostermarketingllc/bibleops.git
git push -u origin main
```

#### Option C: Personal Access Token
1. Go to: https://gitlab.com/-/profile/personal_access_tokens
2. Create token with `write_repository` scope
3. Use token as password when pushing

---

### Step 3: Create Render Account & Web Service

1. **Sign up/Log in to Render:**
   - Go to: https://render.com
   - Sign in with GitLab

2. **Connect GitLab:**
   - Click "New +" → "Web Service"
   - Connect your GitLab account
   - Select repository: `kfostermarketingllc/bibleops`

3. **Configure Web Service:**
   ```
   Name: bibleops-backend
   Environment: Node
   Region: Oregon (US West) or closest to you
   Branch: main
   Build Command: npm install
   Start Command: npm start
   Instance Type: Starter ($7/month) or Free
   ```

---

### Step 4: Add Environment Variables in Render

In Render dashboard, add these environment variables:

```bash
# Required - Anthropic API
ANTHROPIC_API_KEY=your_anthropic_api_key_here

# Required - Mailchimp Email
EMAIL_SERVICE=mailchimp
MAILCHIMP_API_KEY=your_mailchimp_api_key_here
MAILCHIMP_FROM_EMAIL=noreply@bibleops.com
MAILCHIMP_FROM_NAME=BibleOps

# Required - Server Config
NODE_ENV=production
PORT=3001
```

**⚠️ IMPORTANT:**
- Use your actual API keys from your local `.env` file
- Do not add quotes around values

---

### Step 5: Deploy on Render

1. Click "Create Web Service"
2. Render will automatically:
   - Pull code from GitLab
   - Run `npm install`
   - Start server with `npm start`
   - Assign a URL like: `https://bibleops-backend.onrender.com`

3. **Monitor deployment:**
   - Watch logs in Render dashboard
   - Should see: "Bible Study Curriculum Generator Started!"
   - Look for: "Anthropic API: ✅ Configured"
   - Look for: "Email Service: ✅ Configured (Mailchimp)"

4. **First deployment takes ~5-10 minutes**

---

### Step 6: Test Backend on Render

Once deployed, test these endpoints:

```bash
# Health check
curl https://bibleops-backend.onrender.com/api/health

# Expected response:
{
  "status": "healthy",
  "anthropicConfigured": true,
  "emailConfigured": true,
  "emailService": "mailchimp",
  "agents": 11
}

# Email test
curl https://bibleops-backend.onrender.com/api/test-email

# Expected response:
{
  "success": true,
  "message": "Email service connected successfully",
  "service": "Mailchimp Transactional"
}
```

---

### Step 7: Update Frontend for Production

Edit `public/app.js` and change the API URL:

**Current (Local):**
```javascript
const API_BASE_URL = 'http://localhost:3001/api';
```

**Change to (Production with Auto-detection):**
```javascript
// Auto-detect environment
const API_BASE_URL = window.location.hostname === 'localhost'
    ? 'http://localhost:3001/api'
    : 'https://bibleops-backend.onrender.com/api';
```

**OR use your actual Render URL:**
```javascript
const API_BASE_URL = 'https://YOUR-ACTUAL-RENDER-URL.onrender.com/api';
```

Then commit and push:
```bash
git add public/app.js
git commit -m "Update API URL for production"
git push
```

---

### Step 8: Deploy Frontend to Hostinger

1. **Upload files to Hostinger via FTP/SFTP:**
   - Upload everything in `public/` folder to your web root
   - Files to upload:
     - `index.html`
     - `styles.css`
     - `app.js` (with updated API URL)
     - `.htaccess`

2. **Or use Hostinger File Manager:**
   - Log in to Hostinger control panel
   - Navigate to File Manager
   - Upload files to `public_html/` or your domain folder

3. **Verify files uploaded:**
   - https://bibleops.com/index.html
   - https://bibleops.com/styles.css
   - https://bibleops.com/app.js

---

### Step 9: Configure Email Domain (CRITICAL!)

For emails to send from `noreply@bibleops.com`, add DNS records:

1. **Log in to Mailchimp/Mandrill:**
   - Go to Settings → Sending Domains
   - Add `bibleops.com`

2. **Get DNS records from Mailchimp**

3. **Add to your DNS provider (where bibleops.com is registered):**

   Typical records needed:
   ```
   Type: TXT
   Name: @
   Value: v=spf1 include:servers.mcsv.net ?all

   Type: CNAME
   Name: k1._domainkey
   Value: dkim.mcsv.net

   Type: CNAME
   Name: k2._domainkey
   Value: dkim2.mcsv.net
   ```

4. **Wait for DNS propagation** (~1 hour, sometimes up to 24 hours)

5. **Verify domain in Mailchimp**

---

### Step 10: Final Testing

1. **Visit:** https://bibleops.com

2. **Fill out form:**
   - Passage: "Psalm 23"
   - Email: (your email)
   - Denomination: "Non-denominational"
   - Bible Version: "NIV"
   - Age Group: "Adults"

3. **Submit and wait 5-8 minutes**

4. **Check your email** for 11 PDFs

5. **Verify:**
   - ✅ Form submits successfully
   - ✅ Progress shows 11 agents
   - ✅ Email arrives with all PDFs
   - ✅ PDFs are properly formatted
   - ✅ Links work in email

---

## 📊 Deployment Checklist

### Git & Version Control:
- [x] Git initialized
- [x] .gitignore created
- [x] Initial commit made
- [ ] Pushed to GitLab
- [ ] GitLab repository accessible

### Backend (Render):
- [ ] Render account created
- [ ] GitLab connected to Render
- [ ] Web service created
- [ ] Environment variables configured
- [ ] First deployment successful
- [ ] Health check passing
- [ ] Email test passing

### Frontend (Hostinger):
- [ ] API URL updated in app.js
- [ ] Files uploaded to Hostinger
- [ ] Site accessible at bibleops.com
- [ ] Form loads correctly
- [ ] Styling displays properly

### Email (Mailchimp):
- [ ] Domain added to Mailchimp
- [ ] DNS records added
- [ ] Domain verified
- [ ] Test email sent successfully

### End-to-End Testing:
- [ ] Form submission works
- [ ] AI agents generate curriculum
- [ ] PDFs created successfully
- [ ] Email delivered with attachments
- [ ] User receives complete curriculum

---

## 🆘 Troubleshooting

### If Git push fails:
```bash
# Create personal access token at:
# https://gitlab.com/-/profile/personal_access_tokens

# Use token as password when pushing
git push -u origin main
# Username: kfostermarketingllc
# Password: <your-token>
```

### If Render build fails:
- Check Node version (needs 18+)
- Verify package.json has engines specified
- Check build logs in Render dashboard

### If API calls fail:
- Verify CORS includes bibleops.com
- Check environment variables are set
- Test health endpoint first

### If email doesn't arrive:
- Check spam folder
- Verify domain is verified in Mailchimp
- Check Mailchimp sending logs
- Test with different email address

---

## 🎯 Current Status

**Git:** ✅ Ready to push
**Backend:** ⏳ Awaiting Render setup
**Frontend:** ⏳ Awaiting upload
**Email:** ⏳ Awaiting domain verification

---

## 📞 What's Next?

**I'm ready to help you with:**

1. **Pushing to GitLab** (if you need authentication help)
2. **Setting up Render** (I can guide you through the UI)
3. **Uploading to Hostinger** (step-by-step instructions)
4. **Configuring DNS** (for email domain)
5. **Testing everything** (end-to-end verification)

**Just let me know what you need help with next!**
