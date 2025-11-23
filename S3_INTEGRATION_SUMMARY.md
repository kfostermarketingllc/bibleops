# S3 Integration Summary

## What Changed

BibleOps now uses **AWS S3 with temporary download links** instead of sending PDF attachments via email.

---

## Before vs After

### Before (Email Attachments):
```
User submits → Generate PDFs → Create ZIP → Email ZIP (20-30 MB) → User downloads
```

**Problems:**
- ❌ Large email attachments (20-30 MB)
- ❌ Email deliverability issues
- ❌ Size limits (Gmail/Outlook)
- ❌ Slow email delivery

### After (S3 Download Links):
```
User submits → Generate PDFs → Upload to S3 → Email download links → User clicks links
```

**Benefits:**
- ✅ Small emails (just HTML with links)
- ✅ Better deliverability
- ✅ No size limits
- ✅ Fast email delivery
- ✅ Links expire after 14 days
- ✅ Auto-cleanup (lifecycle policy)

---

## Technical Implementation

### New Files Created:

1. **`src/s3-service.js`** (New)
   - Handles PDF upload to S3
   - Generates presigned URLs (14-day expiration)
   - Tests S3 connection

2. **`src/email-service-s3.js`** (New)
   - Sends emails with download links instead of attachments
   - Beautiful HTML email template
   - Shows expiration date clearly

3. **`AWS_S3_SETUP.md`** (New)
   - Complete setup guide
   - Step-by-step AWS instructions
   - Cost breakdown and monitoring

### Files Modified:

1. **`package.json`**
   - Added AWS SDK dependencies:
     - `@aws-sdk/client-s3`
     - `@aws-sdk/s3-request-presigner`

2. **`src/server.js`**
   - Changed from `sendCurriculumEmail` to `sendCurriculumEmailWithLinks`
   - Added S3 health check
   - Shows S3 configuration status on startup

3. **`.env`**
   - Added AWS credentials:
     - `AWS_ACCESS_KEY_ID`
     - `AWS_SECRET_ACCESS_KEY`
     - `AWS_REGION`
     - `AWS_S3_BUCKET_NAME`

---

## How It Works

### 1. Generate PDFs (Same as before)
```javascript
const result = await generateBibleStudy(formData);
// result contains 14 PDFs
```

### 2. Upload to S3 (New)
```javascript
const pdfsWithLinks = await uploadPDFsToS3(pdfs);
// Each PDF now has a downloadUrl
```

### 3. Generate Presigned URLs (New)
```javascript
const url = await generatePresignedUrl(s3Key, 1209600); // 14 days in seconds
// Returns: https://bibleops-pdfs.s3.amazonaws.com/pdfs/12345/file.pdf?X-Amz-Signature=...
```

### 4. Send Email with Links (New)
```javascript
await sendCurriculumEmailWithLinks({
    toEmail: 'user@example.com',
    passage: 'John 3:16',
    pdfs: pdfsWithLinks
});
```

### 5. User Downloads PDFs
- User receives email with 14 download buttons
- Each button links to S3 presigned URL
- Links work for 14 days
- After 14 days, files auto-delete (lifecycle policy)

---

## Email Template

The new email includes:

### Header:
- BibleOps branding
- Clean, professional design

### Content:
- Study focus (passage/theme/book)
- Number of materials generated
- **Expiration notice** (prominent, red border)
- Individual download buttons for each PDF

### Download Section:
```
📄 Foundational Framework          [Download]
📖 Bible Translation Recommendation [Download]
✝️  Denominational Theology         [Download]
... (14 total)
```

### Footer:
- "Build Another Study" CTA
- BibleOps branding
- Links to website

---

## S3 Bucket Configuration

### Bucket Settings:
- **Name**: `bibleops-pdfs` (or your custom name)
- **Region**: `us-east-1` (or your choice)
- **Public Access**: BLOCKED (all access blocked)
- **Access Method**: Presigned URLs only

### Folder Structure:
```
bibleops-pdfs/
  └── pdfs/
      └── 1737654321/        (timestamp)
          ├── foundation_1737654321.pdf
          ├── bible_version_1737654321.pdf
          ├── theology_1737654321.pdf
          └── ... (14 PDFs total)
```

### Lifecycle Policy:
```
Rule: auto-delete-old-pdfs
Scope: All objects
Action: Expire current versions
Days: 14
```

**Result**: All files automatically deleted 14 days after upload.

---

## Cost Analysis

### S3 Costs (us-east-1):
- **Storage**: $0.023 per GB/month
- **PUT requests**: $0.005 per 1,000 requests
- **GET requests**: $0.0004 per 1,000 requests

### Per Curriculum:
- 14 PDFs × 500 KB = ~7 MB
- Stored for 14 days = ~$0.0001
- Upload + Downloads = ~$0.0001

**Total: ~$0.0002 per curriculum (less than 1 cent!)**

### Monthly Estimates:
| Curricula/Month | Storage | Requests | Total  |
|-----------------|---------|----------|--------|
| 10              | $0.00   | $0.00    | $0.00  |
| 100             | $0.01   | $0.01    | $0.02  |
| 1,000           | $0.11   | $0.04    | $0.15  |
| 10,000          | $1.08   | $0.40    | $1.48  |

**Extremely affordable** - S3 is one of the cheapest storage options.

---

## Security Features

### ✅ What We Implemented:

1. **Private Bucket**
   - No public access enabled
   - All access via presigned URLs only

2. **Temporary Links**
   - URLs expire after 14 days
   - Cannot be reused after expiration

3. **Auto-Cleanup**
   - Files deleted after 14 days
   - No manual cleanup needed

4. **IAM User (Not Root)**
   - Dedicated credentials for BibleOps
   - Limited to S3 access only

5. **Credentials in .env**
   - Not committed to Git
   - Secure environment variables

---

## Deployment Steps

### You Need To Do:

1. **Create AWS Account**
   - Go to https://aws.amazon.com/
   - Sign up (credit card required)

2. **Create S3 Bucket**
   - Bucket name: `bibleops-pdfs` (or custom)
   - Region: `us-east-1` (or your choice)
   - Block all public access: ✅

3. **Set Up Lifecycle Policy**
   - Rule: auto-delete-old-pdfs
   - Expire objects after: 14 days

4. **Create IAM User**
   - Username: `bibleops-app`
   - Access type: Programmatic
   - Policy: S3 Full Access (or custom policy)
   - **Save credentials!**

5. **Update .env (Local)**
   ```bash
   AWS_ACCESS_KEY_ID=your_key_here
   AWS_SECRET_ACCESS_KEY=your_secret_here
   AWS_REGION=us-east-1
   AWS_S3_BUCKET_NAME=bibleops-pdfs
   ```

6. **Add to Render.com (Production)**
   - Go to Render dashboard
   - Environment variables
   - Add all 4 AWS variables
   - Save (auto-redeploys)

7. **Install & Deploy**
   ```bash
   npm install
   git add .
   git commit -m "Add S3 integration"
   git push origin main
   ```

8. **Test**
   - Submit test request
   - Check email for download links
   - Verify links work
   - Verify S3 bucket has files

---

## Testing Checklist

### Local Testing:

- [ ] `npm install` completes successfully
- [ ] AWS credentials in .env file
- [ ] `npm start` shows "✅ S3 connection successful"
- [ ] Submit test form (passage/theme/book)
- [ ] Check server logs for S3 upload messages
- [ ] Receive email with download links
- [ ] Click links to download PDFs
- [ ] Verify all 14 PDFs download correctly

### Production Testing (Render.com):

- [ ] AWS credentials added to Render environment
- [ ] Deploy successful
- [ ] Logs show "✅ S3 connection successful"
- [ ] Health check: `curl https://bibleops.onrender.com/api/health`
- [ ] `s3Configured: true` in response
- [ ] Submit real request
- [ ] Receive email with links
- [ ] Links work for all PDFs
- [ ] Check S3 bucket for files

### AWS Console Testing:

- [ ] Log into AWS Console
- [ ] Navigate to S3
- [ ] Bucket `bibleops-pdfs` exists
- [ ] Folder structure: `pdfs/timestamp/`
- [ ] PDFs visible in folders
- [ ] Lifecycle policy is active
- [ ] Check billing (should be ~$0.00)

---

## Monitoring

### Server Logs:

```
📦 Uploading 14 PDFs to S3...
✅ Uploaded to S3: pdfs/1737654321/foundation_1737654321.pdf
✅ Uploaded to S3: pdfs/1737654321/bible_version_1737654321.pdf
... (14 uploads)
✅ All 14 PDFs uploaded to S3
✅ Email sent successfully to user@example.com with 14 download links
```

### Health Check:

```bash
curl http://localhost:3001/api/health
```

**Response:**
```json
{
  "status": "healthy",
  "anthropicConfigured": true,
  "emailConfigured": true,
  "s3Configured": true,
  "emailService": "mailchimp-with-s3-links"
}
```

### AWS Console:

1. **S3 Dashboard**: Monitor storage usage
2. **Cost Explorer**: Track S3 costs
3. **CloudWatch**: Set up alerts (optional)

---

## Troubleshooting

### "S3 connection failed"

**Cause**: Invalid AWS credentials or permissions

**Fix**:
1. Verify credentials in .env are correct
2. Check IAM user has S3 permissions
3. Verify bucket name matches
4. Check AWS region matches

### "Access Denied" when uploading

**Cause**: IAM user doesn't have PutObject permission

**Fix**:
1. Go to IAM → Users → `bibleops-app`
2. Verify `AmazonS3FullAccess` policy attached
3. Or verify custom policy includes `s3:PutObject`

### "Links don't work"

**Cause**: Links expired or incorrect presigned URL

**Fix**:
1. Check if 14 days passed (expected behavior)
2. Verify bucket name in URL matches
3. Check presigned URL generation code
4. Verify S3 bucket is private (not public)

### "Files not deleting after 14 days"

**Cause**: Lifecycle policy not configured

**Fix**:
1. Go to S3 → Bucket → Management tab
2. Verify lifecycle rule exists
3. Check rule is enabled
4. Verify rule scope is "all objects"

---

## Rollback Plan

If issues arise, you can rollback to email attachments:

### 1. Revert server.js:

```javascript
// Change this line:
const { sendCurriculumEmailWithLinks } = require('./email-service-s3');

// Back to this:
const { sendCurriculumEmail } = require('./email-service');
```

### 2. Revert the send call:

```javascript
// Change this:
await sendCurriculumEmailWithLinks({...});

// Back to this:
await sendCurriculumEmail({...});
```

### 3. Redeploy:

```bash
git add .
git commit -m "Rollback to email attachments"
git push origin main
```

---

## Future Enhancements

### Possible Improvements:

1. **Email with both attachments AND links**
   - Provide both options to users
   - Fallback if links expire

2. **Custom expiration per user**
   - Allow users to choose 7, 14, or 30 days
   - Enterprise users get longer expiration

3. **Download tracking**
   - Track which PDFs were downloaded
   - Send reminder email if not downloaded

4. **CloudFront CDN**
   - Add CloudFront in front of S3
   - Faster downloads globally
   - Custom domain: downloads.bibleops.com

5. **Batch download link**
   - Single link to download all 14 PDFs as ZIP
   - Generated on-demand from S3

6. **Email notifications before expiry**
   - Send reminder 1 day before links expire
   - "Your links expire tomorrow!"

---

## Summary

### What You Get:

✅ Better email deliverability (no large attachments)
✅ No email size limits
✅ Faster email delivery
✅ Beautiful email with individual download buttons
✅ Automatic file cleanup after 14 days
✅ Extremely low cost (~$0.0002 per curriculum)
✅ Scalable (handles any number of curricula)
✅ Secure (private bucket, temporary links)

### What You Need:

- AWS account (free tier available)
- S3 bucket (~$0.15/month for 1,000 curricula)
- IAM user credentials
- 10 minutes to set up

### Next Steps:

1. Follow `AWS_S3_SETUP.md` guide
2. Create AWS account and S3 bucket
3. Update .env with credentials
4. Deploy to production
5. Test with real submission
6. Monitor costs in AWS Console

---

**Status**: ✅ Ready for Deployment
**Version**: 3.0 (S3 Integration)
**Date**: 2025-01-23
**Author**: Claude Code

---

## Questions?

Refer to:
- `AWS_S3_SETUP.md` - Detailed setup instructions
- `ASYNC_WORKFLOW.md` - Async processing documentation
- AWS Documentation: https://docs.aws.amazon.com/s3/
