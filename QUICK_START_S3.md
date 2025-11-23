# Quick Start: AWS S3 Setup (5 Minutes)

Fast-track guide to get S3 working with BibleOps.

---

## Step 1: AWS Console (2 minutes)

### Create S3 Bucket:
1. Login: https://console.aws.amazon.com/s3/
2. Click "Create bucket"
3. **Bucket name**: `bibleops-pdfs` (or add suffix if taken)
4. **Region**: `us-east-1`
5. **Block Public Access**: Keep all ✅ (default)
6. Click "Create bucket"

### Create IAM User:
1. Go to: https://console.aws.amazon.com/iam/
2. Click "Users" → "Create user"
3. **Username**: `bibleops-app`
4. **Access type**: Programmatic access
5. **Permissions**: Attach `AmazonS3FullAccess`
6. Click through → "Create user"
7. **SAVE THESE** (you won't see them again!):
   - Access Key ID: `AKIA...`
   - Secret Access Key: `wJal...`

### Create Lifecycle Rule:
1. Go back to S3 → Your bucket
2. "Management" tab → "Create lifecycle rule"
3. **Name**: `auto-delete-old-pdfs`
4. **Scope**: All objects
5. **Action**: ✅ Expire current versions
6. **Days**: `14`
7. Create rule

---

## Step 2: Local Setup (1 minute)

### Update .env:
```bash
# Add these 4 lines to .env:
AWS_ACCESS_KEY_ID=AKIA...              # Your Access Key ID
AWS_SECRET_ACCESS_KEY=wJal...         # Your Secret Access Key
AWS_REGION=us-east-1
AWS_S3_BUCKET_NAME=bibleops-pdfs
```

### Install & Test:
```bash
npm install
npm start
```

**Look for**:
```
☁️  AWS S3:           ✅ Configured
✅ S3 connection successful
```

---

## Step 3: Production Setup (2 minutes)

### Render.com:
1. Go to Render dashboard → Your service
2. "Environment" tab
3. Add 4 environment variables:
   - `AWS_ACCESS_KEY_ID` = `AKIA...`
   - `AWS_SECRET_ACCESS_KEY` = `wJal...`
   - `AWS_REGION` = `us-east-1`
   - `AWS_S3_BUCKET_NAME` = `bibleops-pdfs`
4. Click "Save Changes" (auto-redeploys)

### Deploy:
```bash
git add .
git commit -m "Add S3 integration"
git push origin main
```

---

## Step 4: Test (1 minute)

### Health Check:
```bash
curl https://bibleops.onrender.com/api/health
```

**Expected**:
```json
{
  "s3Configured": true,
  "emailService": "mailchimp-with-s3-links"
}
```

### Submit Test:
1. Go to https://bibleops.com
2. Fill form → Submit
3. Check email for download links
4. Click links to download PDFs
5. ✅ Done!

---

## Troubleshooting

### "S3 connection failed"
- Double-check AWS credentials in .env
- Verify bucket name is correct
- Check IAM user has S3 permissions

### "Access Denied"
- IAM user needs `AmazonS3FullAccess` policy
- Or custom policy with PutObject permission

### "Links don't work"
- Check bucket is private (not public)
- Verify presigned URLs are generated
- Check 14 days haven't passed

---

## Cost Estimate

- **Per curriculum**: < $0.01
- **1,000 curricula/month**: ~$0.15
- **Extremely cheap!**

---

## Summary

✅ S3 bucket created
✅ Lifecycle policy (14-day auto-delete)
✅ IAM user with credentials
✅ .env updated locally
✅ Render.com environment variables added
✅ Deployed to production
✅ Tested with real submission

**Total time**: ~5 minutes
**Cost**: ~$0.15/month for 1,000 curricula

---

For detailed guide, see: `AWS_S3_SETUP.md`
