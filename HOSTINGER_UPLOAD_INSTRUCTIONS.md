# 📤 Hostinger Upload Instructions for BibleOps

**Ready to Go Live!** All files are prepared in the `hostinger-upload/` folder.

---

## 📁 Files Ready for Upload

Located in: `hostinger-upload/`

```
✅ index.html (20KB) - Main page with form
✅ styles.css (16KB) - V3.0 Classic Editorial design
✅ app.js (11KB) - Frontend logic (configured for production)
✅ .htaccess - Apache configuration (HTTPS, caching, security)
```

**Total Size:** ~47KB

---

## 🚀 Upload Methods

### Option 1: Hostinger File Manager (Easiest)

1. **Log in to Hostinger:**
   - Go to: https://hpanel.hostinger.com/
   - Log in with your credentials

2. **Navigate to File Manager:**
   - Click on your domain (bibleops.com)
   - Click "File Manager"

3. **Go to Web Root:**
   - Navigate to `public_html/` folder
   - (Or wherever bibleops.com points to)

4. **Upload Files:**
   - Click "Upload" button
   - Select all 4 files from `hostinger-upload/` folder:
     - index.html
     - styles.css
     - app.js
     - .htaccess
   - Wait for upload to complete

5. **Verify Upload:**
   - You should see all 4 files in your web root

---

### Option 2: FTP/SFTP (Advanced)

If you prefer FTP:

1. **Get FTP Credentials:**
   - Hostinger → Your Domain → FTP Accounts
   - Or use existing FTP credentials

2. **Connect with FTP Client:**
   - Host: ftp.bibleops.com (or IP provided by Hostinger)
   - Username: (your FTP username)
   - Password: (your FTP password)
   - Port: 21 (FTP) or 22 (SFTP)

3. **Upload:**
   - Navigate to `public_html/`
   - Upload all 4 files from `hostinger-upload/`

---

## ✅ After Upload - Verification

### Step 1: Check Files Are Accessible

Test these URLs in your browser:

```
https://bibleops.com/
https://bibleops.com/styles.css
https://bibleops.com/app.js
```

All should load without errors.

### Step 2: Test the Form

1. **Go to:** https://bibleops.com
2. **You should see:**
   - BibleOps header with classic newspaper style
   - White background
   - Bible study form
   - "Build Curriculum" button

### Step 3: Check Console (F12 Developer Tools)

1. Open browser console (F12 → Console tab)
2. Look for: No errors
3. The API_BASE_URL should be: `https://bibleops.onrender.com/api`

---

## 🧪 Full End-to-End Test

### Test Form Submission:

1. **Fill out form:**
   ```
   Study Focus: Passage
   Passage: Psalm 23
   Email: your-email@example.com
   Denomination: Non-denominational
   Bible Version: NIV
   Age Group: Adults (Ages 26-60)
   Duration: 8 weeks
   ```

2. **Click:** "Build Curriculum"

3. **You should see:**
   - Form disappears
   - Progress section appears
   - "Building Your Curriculum" header
   - "11 specialized agents working on your study"
   - Progress bar animating

4. **Wait 5-8 minutes**

5. **Check your email:**
   - Subject: "Your Psalm 23 Bible Study Curriculum - Ready to Use"
   - 11 PDF attachments
   - Beautiful HTML email with BibleOps branding

---

## 🔍 Troubleshooting

### If form doesn't submit:

1. **Check browser console (F12)** for errors
2. **Verify backend is running:**
   ```bash
   curl https://bibleops.onrender.com/api/health
   ```
3. **Check CORS:** Backend should allow bibleops.com

### If you see "localhost" in URLs:

- Make sure you uploaded the correct `app.js`
- The file should contain:
  ```javascript
  const API_BASE_URL = window.location.hostname === 'localhost'
      ? 'http://localhost:3001/api'
      : 'https://bibleops.onrender.com/api';
  ```

### If styling looks wrong:

- Verify `styles.css` uploaded correctly
- Clear browser cache (Ctrl+F5 or Cmd+Shift+R)
- Check browser console for 404 errors

---

## 📊 What Happens When User Submits Form

1. **Frontend (bibleops.com):**
   - Collects form data
   - Sends POST to `https://bibleops.onrender.com/api/generate`
   - Shows progress UI

2. **Backend (Render):**
   - Receives request
   - Runs 11 AI agents sequentially (~5-8 min)
   - Generates 11 PDFs
   - Sends email with all PDFs attached
   - Returns success response

3. **Frontend:**
   - Shows "Your Curriculum is Ready!" message
   - Displays download links
   - User receives email

---

## 🎨 Design Preview

Users will see:
- **Header:** "BIBLEOPS" in large serif font
- **Tagline:** "Build Your Bible Study Curriculum"
- **Clean white background**
- **Classic newspaper aesthetic**
- **Professional form layout**
- **"Build Curriculum" button**

---

## 📧 Email Domain (Important Next Step)

After upload, configure email domain:

1. **Log in to Mailchimp/Mandrill**
2. **Add sending domain:** bibleops.com
3. **Get DNS records** (SPF, DKIM)
4. **Add to your domain DNS** (usually in Hostinger DNS settings)
5. **Verify domain** in Mailchimp

Until verified, emails will work but may come from Mailchimp's domain.

---

## 🎯 Post-Upload Checklist

- [ ] Uploaded all 4 files to Hostinger
- [ ] Visited https://bibleops.com (site loads)
- [ ] Checked styles.css loads (site looks good)
- [ ] Checked app.js loads (no console errors)
- [ ] Tested form submission
- [ ] Received test email with PDFs
- [ ] Verified email domain in Mailchimp
- [ ] Added DNS records for email

---

## 🚀 You're Live!

Once files are uploaded, BibleOps is **LIVE** at:

**🌐 https://bibleops.com**

- Backend: https://bibleops.onrender.com ✅ (Already live)
- Frontend: https://bibleops.com ⏳ (Ready to upload)

---

**Ready to upload? The files are in `hostinger-upload/` folder!** 📤
