# AWS S3 Setup Guide for BibleOps

Complete guide to set up AWS S3 for 14-day temporary PDF download links.

---

## Why S3 with Presigned URLs?

**Before (Email Attachments):**
- ❌ Large emails (20-30 MB ZIP files)
- ❌ Email deliverability issues
- ❌ Gmail/Outlook size limits
- ❌ Slow email delivery

**After (S3 Download Links):**
- ✅ Small emails (just links)
- ✅ Better email deliverability
- ✅ No size limits
- ✅ Fast email delivery
- ✅ Links expire after 14 days (auto-cleanup)

---

## Step 1: Create AWS Account

1. Go to https://aws.amazon.com/
2. Click "Create an AWS Account"
3. Follow signup process (credit card required)
4. **Cost**: Very cheap (~$0.01-0.05 per curriculum generated)

---

## Step 2: Create S3 Bucket

1. **Log into AWS Console**: https://console.aws.amazon.com/
2. **Search for "S3"** in the top search bar
3. **Click "Create bucket"**

### Bucket Settings:

- **Bucket name**: `bibleops-pdfs` (must be globally unique - add suffix if taken)
- **AWS Region**: `us-east-1` (US East - N. Virginia)
  - Or choose region closest to your users
- **Block Public Access settings**:
  - ✅ Keep ALL enabled (Block all public access)
  - We'll use presigned URLs, not public access
- **Bucket Versioning**: Disabled (not needed)
- **Tags**: (Optional) Add tags for organization
- **Default encryption**: Server-side encryption (SSE-S3) - Enabled by default
- **Click "Create bucket"**

---

## Step 3: Set Up Lifecycle Policy (Auto-Delete After 14 Days)

This is CRITICAL - it automatically deletes old files so you don't pay for storage forever.

1. Go to your bucket (`bibleops-pdfs`)
2. Click the **"Management"** tab
3. Click **"Create lifecycle rule"**

### Lifecycle Rule Settings:

- **Rule name**: `auto-delete-old-pdfs`
- **Rule scope**: "Apply to all objects in the bucket"
- **Lifecycle rule actions**:
  - ✅ Check "Expire current versions of objects"
- **Days after object creation**: `14`
- **Review** and click "Create rule"

**Result**: All PDFs uploaded to S3 will automatically be deleted 14 days after upload.

---

## Step 4: Create IAM User for Programmatic Access

This gives BibleOps permission to upload files and generate download links.

1. **Search for "IAM"** in AWS Console
2. Go to **"Users"** in left sidebar
3. Click **"Create user"**

### User Settings:

- **User name**: `bibleops-app`
- **Access type**: Select "Programmatic access" (no console access needed)
- Click **"Next"**

### Permissions:

**Option 1: Quick Setup (Full S3 Access)**
- Click "Attach policies directly"
- Search for: `AmazonS3FullAccess`
- Check the box next to `AmazonS3FullAccess`
- Click "Next" → "Create user"

**Option 2: Secure Setup (Bucket-Only Access)** - Recommended
- Click "Create policy" (opens new tab)
- Click "JSON" tab
- Paste this policy (replace `bibleops-pdfs` with your bucket name):

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "s3:PutObject",
                "s3:GetObject",
                "s3:DeleteObject",
                "s3:ListBucket"
            ],
            "Resource": [
                "arn:aws:s3:::bibleops-pdfs",
                "arn:aws:s3:::bibleops-pdfs/*"
            ]
        }
    ]
}
```

- Click "Next: Tags" → "Next: Review"
- **Policy name**: `bibleops-s3-policy`
- Click "Create policy"
- Go back to user creation tab, refresh policies, and attach `bibleops-s3-policy`

### Save Your Credentials:

After creating the user, you'll see:
- **Access Key ID**: `AKIAIOSFODNN7EXAMPLE` (example)
- **Secret Access Key**: `wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY` (example)

**⚠️ IMPORTANT**: Save these NOW - you won't see the secret key again!

---

## Step 5: Configure BibleOps

### Local Development (.env file):

Update `/Users/kevinfoster/bibleops/.env`:

```bash
# AWS S3 Configuration
AWS_ACCESS_KEY_ID=your_access_key_here
AWS_SECRET_ACCESS_KEY=your_secret_key_here
AWS_REGION=us-east-1
AWS_S3_BUCKET_NAME=bibleops-pdfs
```

### Production (Render.com):

1. Go to Render.com dashboard
2. Select your BibleOps service
3. Go to **"Environment"** tab
4. Add these environment variables:

```
AWS_ACCESS_KEY_ID = your_access_key_here
AWS_SECRET_ACCESS_KEY = your_secret_key_here
AWS_REGION = us-east-1
AWS_S3_BUCKET_NAME = bibleops-pdfs
```

5. Click "Save Changes"
6. Render will automatically redeploy

---

## Step 6: Install Dependencies & Deploy

### Local:

```bash
cd /Users/kevinfoster/bibleops
npm install
npm start
```

Check the startup logs for:
```
☁️  AWS S3:           ✅ Configured
✅ S3 connection successful
```

### Production (Render.com):

1. **Commit and push changes:**

```bash
git add .
git commit -m "Add AWS S3 integration for download links"
git push origin main
```

2. Render will auto-deploy (if auto-deploy is enabled)
3. Check logs for S3 connection confirmation

---

## Step 7: Test the Integration

### Test API Health:

```bash
# Local
curl http://localhost:3001/api/health

# Production
curl https://bibleops.onrender.com/api/health
```

**Expected Response:**
```json
{
  "status": "healthy",
  "anthropicConfigured": true,
  "emailConfigured": true,
  "s3Configured": true,
  "emailService": "mailchimp-with-s3-links",
  "agents": 14
}
```

### Submit Test Request:

1. Go to http://localhost:3001 (or https://bibleops.com)
2. Fill out form and submit
3. Wait for email (6-10 minutes)
4. Check email for download links
5. Click links to download PDFs
6. Verify files download successfully

---

## Monitoring & Troubleshooting

### Check S3 Bucket:

1. Go to AWS Console → S3
2. Click your bucket (`bibleops-pdfs`)
3. You should see folders: `pdfs/1234567890/...`
4. Each folder contains PDFs from one curriculum generation

### Monitor Costs:

1. Go to AWS Console → Billing Dashboard
2. Check "Cost Explorer" for S3 costs
3. **Expected costs**: $0.01-0.05 per curriculum (very cheap!)

### Common Issues:

**"S3 connection failed"**
- Check AWS credentials are correct in .env
- Verify IAM user has S3 permissions
- Check AWS region matches your bucket

**"Access Denied"**
- IAM user doesn't have permissions
- Check bucket name matches in .env
- Verify lifecycle policy didn't delete files too early

**"Links don't work after 14 days"**
- This is expected behavior! Links expire after 14 days
- Users need to download files within 14 days
- Old files are automatically deleted by lifecycle policy

---

## Cost Breakdown

### S3 Pricing (us-east-1):

- **Storage**: $0.023 per GB per month
- **PUT requests**: $0.005 per 1,000 requests
- **GET requests**: $0.0004 per 1,000 requests

### Example Cost Per Curriculum:

**Assumptions:**
- 14 PDFs per curriculum
- Average 500 KB per PDF = 7 MB total
- Files deleted after 14 days

**Calculation:**
- Storage: 0.007 GB × $0.023 × (14 days / 30 days) = $0.000075
- PUT requests: 14 × $0.005 / 1000 = $0.00007
- GET requests: 14 × $0.0004 / 1000 = $0.0000056

**Total per curriculum: ~$0.0001456 (less than $0.01!)**

### Monthly Cost Estimates:

- **10 curricula/month**: ~$0.001 ($0.00)
- **100 curricula/month**: ~$0.01 ($0.01)
- **1,000 curricula/month**: ~$0.15 ($0.15)

**Extremely affordable!** 🎉

---

## Security Best Practices

### ✅ What We Did Right:

1. **No public access** - Bucket is completely private
2. **Presigned URLs** - Temporary links that expire
3. **Lifecycle policy** - Auto-delete after 14 days
4. **IAM user** - Dedicated credentials (not root account)
5. **Limited permissions** - Only S3 access needed

### 🔐 Additional Security (Optional):

1. **Enable MFA for AWS root account**
2. **Rotate IAM credentials** every 90 days
3. **Enable CloudTrail** for audit logs
4. **Use AWS Secrets Manager** for credential storage (more advanced)

---

## Rollback Plan

If you need to revert to email attachments:

1. **Update server.js:**

```javascript
// Change this:
const { sendCurriculumEmailWithLinks } = require('./email-service-s3');

// Back to this:
const { sendCurriculumEmail } = require('./email-service');
```

2. **Update the send call:**

```javascript
// Change this:
await sendCurriculumEmailWithLinks({ ... });

// Back to this:
await sendCurriculumEmail({ ... });
```

3. **Redeploy**

---

## Summary Checklist

- ✅ Created AWS account
- ✅ Created S3 bucket: `bibleops-pdfs`
- ✅ Set up lifecycle policy (14-day auto-delete)
- ✅ Created IAM user: `bibleops-app`
- ✅ Saved Access Key ID and Secret Access Key
- ✅ Updated .env file with AWS credentials
- ✅ Added environment variables to Render.com
- ✅ Installed AWS SDK: `npm install`
- ✅ Tested locally: `npm start`
- ✅ Deployed to production
- ✅ Verified email with download links works

---

## Support

**Questions?**
- AWS Documentation: https://docs.aws.amazon.com/s3/
- AWS Support: https://console.aws.amazon.com/support/

**Status**: ✅ Ready for Production
**Version**: 3.0 (S3 Integration)
**Date**: 2025-01-23
