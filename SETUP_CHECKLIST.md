# BibleOps Setup Checklist
## Complete Configuration Guide for Testing & Production

---

## 📋 Overview

To get BibleOps fully functional, you'll need to configure:

1. **Anthropic API** - AI agents for curriculum generation
2. **GitLab** - Version control and CI/CD
3. **Render** - Backend hosting
4. **Email Service** - Delivery of PDFs (Mailchimp/Resend/SendGrid)
5. **Frontend Hosting** - Hostinger or Render

---

## 1️⃣ Anthropic API Setup

### What You Need:
- Anthropic API key for Claude AI

### Steps:

1. **Create Account:**
   - Go to: https://console.anthropic.com/
   - Sign up or log in

2. **Get API Key:**
   - Navigate to "API Keys" section
   - Click "Create Key"
   - Copy the key (starts with `sk-ant-api03-...`)

3. **Add to Local Environment:**
   ```bash
   # Copy example file
   cp .env.example .env

   # Edit .env and add your key
   ANTHROPIC_API_KEY=sk-ant-api03-your-actual-key-here
   ```

4. **Verify:**
   ```bash
   # Your API key should be visible (but keep it secret!)
   cat .env | grep ANTHROPIC_API_KEY
   ```

**Cost Estimate:**
- ~$0.50-$1.50 per Bible study curriculum generated
- Claude Sonnet 3.5 pricing applies

---

## 2️⃣ GitLab Repository Setup

### What You Need:
- GitLab account
- Repository for version control

### Steps:

1. **Create GitLab Account:**
   - Go to: https://gitlab.com/users/sign_up
   - Or use existing account

2. **Create New Repository:**
   ```
   Repository Name: bibleops
   Visibility: Private (recommended)
   Initialize with README: No (we already have code)
   ```

3. **Initialize Local Git (if not already done):**
   ```bash
   git init
   git remote add origin git@gitlab.com:YOUR_USERNAME/bibleops.git
   ```

4. **Create .gitignore:**
   ```bash
   cat > .gitignore << 'EOF'
   # Dependencies
   node_modules/

   # Environment variables
   .env
   .env.local
   .env.*.local

   # Generated files
   generated-pdfs/
   *.pdf

   # Logs
   logs/
   *.log
   npm-debug.log*

   # OS files
   .DS_Store
   Thumbs.db

   # IDE
   .vscode/
   .idea/
   EOF
   ```

5. **Initial Commit:**
   ```bash
   git add .
   git commit -m "Initial commit: BibleOps Bible Study Generator"
   git branch -M main
   git push -u origin main
   ```

### Information Needed:
- ✅ GitLab username: `___________________________`
- ✅ Repository URL: `___________________________`

---

## 3️⃣ Email Service Setup

### **Option A: Mailchimp Transactional (Recommended if using CurrForge pattern)**

#### What You Need:
- Mailchimp account with Transactional Email (formerly Mandrill)
- API key for sending emails

#### Steps:

1. **Sign Up for Mailchimp:**
   - Go to: https://mailchimp.com/
   - Create account or log in

2. **Enable Transactional Email:**
   - Navigate to "Transactional" or "Mandrill"
   - May require separate account: https://mandrillapp.com/

3. **Get API Key:**
   - Go to Settings → API Keys
   - Create new API key
   - Copy key (format: `md-xxxxxxxxxxxxxxxxxxxxxxxx`)

4. **Configure Domain:**
   - Add `bibleops.com` as verified sender domain
   - Add DNS records for SPF/DKIM
   - Verify domain ownership

5. **Create Email Template:**
   - Template name: `bible-study-delivery`
   - Include variables: `{{user_name}}`, `{{passage}}`, `{{pdf_links}}`

#### Information Needed:
- ✅ Mailchimp API Key: `___________________________`
- ✅ From Email: `noreply@bibleops.com`
- ✅ From Name: `BibleOps`
- ✅ Template ID: `___________________________`

**Cost:** ~$20/month for 25,000 emails

---

### **Option B: Resend (Modern Alternative - Recommended)**

#### What You Need:
- Resend account
- API key
- Verified domain

#### Steps:

1. **Sign Up:**
   - Go to: https://resend.com/
   - Create account (free tier: 100 emails/day)

2. **Get API Key:**
   - Dashboard → API Keys
   - Click "Create API Key"
   - Copy key (starts with `re_...`)

3. **Verify Domain:**
   - Add `bibleops.com`
   - Add DNS records provided by Resend
   - Wait for verification (~5-10 minutes)

4. **Test Email:**
   ```bash
   curl -X POST 'https://api.resend.com/emails' \
     -H 'Authorization: Bearer YOUR_API_KEY' \
     -H 'Content-Type: application/json' \
     -d '{
       "from": "noreply@bibleops.com",
       "to": "your-email@example.com",
       "subject": "Test Email",
       "html": "<p>BibleOps test email</p>"
     }'
   ```

#### Information Needed:
- ✅ Resend API Key: `___________________________`
- ✅ From Email: `noreply@bibleops.com`
- ✅ Domain Verified: ☐ Yes ☐ No

**Cost:** Free up to 100 emails/day, $20/month for 50,000 emails

---

### **Option C: SendGrid**

#### Steps:

1. **Sign Up:**
   - Go to: https://signup.sendgrid.com/
   - Free tier: 100 emails/day

2. **Get API Key:**
   - Settings → API Keys
   - Create API Key with "Full Access"
   - Copy key (starts with `SG.`)

3. **Verify Sender:**
   - Settings → Sender Authentication
   - Verify `bibleops.com` domain

#### Information Needed:
- ✅ SendGrid API Key: `___________________________`

**Cost:** Free tier available, $19.95/month for 50,000 emails

---

## 4️⃣ Render Backend Deployment

### What You Need:
- Render account
- GitHub/GitLab repository connected

### Steps:

1. **Create Render Account:**
   - Go to: https://render.com/
   - Sign up with GitLab

2. **Create New Web Service:**
   - Click "New +" → "Web Service"
   - Connect GitLab repository
   - Configure:
     ```
     Name: bibleops-backend
     Environment: Node
     Build Command: npm install
     Start Command: npm start
     Instance Type: Free (or Starter $7/month)
     ```

3. **Configure Environment Variables:**
   In Render dashboard, add these variables:

   ```
   ANTHROPIC_API_KEY=sk-ant-api03-your-key-here
   NODE_ENV=production
   PORT=3001

   # Email Service (choose one based on your selection above)

   # For Mailchimp:
   MAILCHIMP_API_KEY=md-your-mailchimp-key
   MAILCHIMP_FROM_EMAIL=noreply@bibleops.com

   # OR For Resend:
   RESEND_API_KEY=re_your-resend-key
   RESEND_FROM_EMAIL=noreply@bibleops.com

   # OR For SendGrid:
   SENDGRID_API_KEY=SG.your-sendgrid-key
   SENDGRID_FROM_EMAIL=noreply@bibleops.com
   ```

4. **Deploy:**
   - Render will auto-deploy from GitLab
   - Wait for build to complete (~5 minutes)

5. **Get Backend URL:**
   - Copy the URL: `https://bibleops-backend.onrender.com`

#### Information Needed:
- ✅ Render Backend URL: `___________________________`

---

## 5️⃣ Frontend Configuration

### Update API Endpoint

Once Render backend is deployed, update frontend to use production API:

1. **Edit `public/app.js`:**
   ```javascript
   // Change this line:
   const API_BASE_URL = 'http://localhost:3001/api';

   // To this:
   const API_BASE_URL = 'https://bibleops-backend.onrender.com/api';
   ```

2. **OR use environment detection:**
   ```javascript
   const API_BASE_URL = window.location.hostname === 'localhost'
       ? 'http://localhost:3001/api'
       : 'https://bibleops-backend.onrender.com/api';
   ```

---

## 6️⃣ Complete Environment Variables Reference

### Local Development (`.env` file):

```bash
# Required
ANTHROPIC_API_KEY=sk-ant-api03-xxxxxxxxxxxxx
NODE_ENV=development
PORT=3001

# Email Service (choose one)
# Option A: Mailchimp
MAILCHIMP_API_KEY=md-xxxxxxxxxxxxx
MAILCHIMP_FROM_EMAIL=noreply@bibleops.com
MAILCHIMP_FROM_NAME=BibleOps

# Option B: Resend (recommended)
RESEND_API_KEY=re_xxxxxxxxxxxxx
RESEND_FROM_EMAIL=noreply@bibleops.com

# Option C: SendGrid
SENDGRID_API_KEY=SG.xxxxxxxxxxxxx
SENDGRID_FROM_EMAIL=noreply@bibleops.com
```

### Production (Render Environment Variables):

Same as above, but with:
```
NODE_ENV=production
```

---

## 7️⃣ Testing Checklist

### Local Testing:

```bash
# 1. Install dependencies
npm install

# 2. Verify environment variables
cat .env

# 3. Start server
npm start

# 4. Test API health
curl http://localhost:3001/api/health

# 5. Test form submission (in browser)
# Open: http://localhost:3001
# Fill out form and submit
```

### Production Testing:

```bash
# 1. Test backend health
curl https://bibleops-backend.onrender.com/api/health

# 2. Test frontend form
# Visit: https://bibleops.com
# Fill out form and submit
# Check email for PDFs
```

---

## 8️⃣ DNS Configuration (for bibleops.com)

### Email Domain Verification:

You'll need to add DNS records for email delivery. The exact records depend on your email service:

#### For Resend:
```
Type: TXT
Name: _resend
Value: [provided by Resend]

Type: CNAME
Name: resend._domainkey
Value: [provided by Resend]
```

#### For Mailchimp/Mandrill:
```
Type: TXT
Name: @
Value: v=spf1 include:servers.mcsv.net ?all

Type: CNAME
Name: k1._domainkey
Value: dkim.mcsv.net
```

#### For SendGrid:
```
Type: CNAME
Name: em[####]
Value: u[#######].wl[###].sendgrid.net

Type: CNAME
Name: s1._domainkey
Value: s1.domainkey.u[#######].wl[###].sendgrid.net
```

---

## 📊 Quick Reference: What You Need to Provide Me

Please gather this information so we can configure the system:

### ✅ Checklist:

**Anthropic:**
- [ ] API Key: `sk-ant-api03-...`

**Email Service (choose one):**
- [ ] **Resend** API Key: `re_...` _(recommended)_
- [ ] **Mailchimp** API Key: `md-...`
- [ ] **SendGrid** API Key: `SG.`

**GitLab:**
- [ ] Username: `___________`
- [ ] Repository URL: `___________`

**Render:**
- [ ] Account created: Yes/No
- [ ] GitLab connected: Yes/No

**Domain:**
- [ ] DNS access for `bibleops.com`: Yes/No

---

## 🚀 Quick Start Commands

Once you provide the information, I'll help you:

1. **Update `.env` with your credentials**
2. **Add email sending to backend** (src/server.js)
3. **Install email package** (Resend/Mailchimp/SendGrid)
4. **Test locally**
5. **Deploy to Render**
6. **Update frontend API URL**
7. **Test production**

---

## 💡 Recommended Stack (Based on CurrForge Pattern)

If CurrForge uses this pattern, I recommend:

```
✅ Email: Resend (modern, great DX, affordable)
✅ Backend: Render (easy GitLab integration)
✅ Frontend: Hostinger (already owned)
✅ Version Control: GitLab
✅ AI: Anthropic Claude
```

---

## 📞 Next Steps

**Please provide me with:**

1. **Which email service do you want to use?**
   - Resend (recommended)
   - Mailchimp/Mandrill
   - SendGrid
   - Other (what does CurrForge use?)

2. **Your API keys for:**
   - Anthropic (if not already in `.env`)
   - Email service (whichever you choose)

3. **Preferences:**
   - Backend: Render or Railway?
   - GitLab username/repo name preferences?

Once you provide this info, I'll:
- Install necessary packages
- Configure email sending
- Update environment files
- Test the complete flow
- Help you deploy to production

---

**Ready to configure! What email service does CurrForge use?**
