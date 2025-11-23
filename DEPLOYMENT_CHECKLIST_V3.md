# Deployment Checklist - v3.0 (S3 Integration + Rate Limiting Fix)

Complete checklist for deploying BibleOps with AWS S3 and batched agent execution.

---

## Pre-Deployment (Local Setup)

### ✅ Code Changes:

- [x] `package.json` - Added AWS SDK dependencies
- [x] `src/s3-service.js` - Created S3 upload/presigned URL service
- [x] `src/email-service-s3.js` - Created email service with download links
- [x] `src/server.js` - Updated to use S3 email service
- [x] `src/bible-study-generator.js` - Fixed rate limiting with batched execution
- [x] `.env` - Added AWS credentials (template)
- [x] `README.md` - Updated with S3 info
- [x] Documentation files created

### ✅ AWS Setup (You Need To Do):

- [ ] Create AWS account
- [ ] Create S3 bucket: `bibleops-pdfs` (or custom name)
- [ ] Set bucket region: `us-east-1` (or your choice)
- [ ] Enable "Block all public access" on bucket
- [ ] Create lifecycle rule: `auto-delete-old-pdfs` (14 days)
- [ ] Create IAM user: `bibleops-app`
- [ ] Attach policy: `AmazonS3FullAccess` (or custom)
- [ ] Save Access Key ID
- [ ] Save Secret Access Key

---

## Local Testing

### ✅ Environment Setup:

- [ ] Update `.env` file with AWS credentials:
  ```bash
  AWS_ACCESS_KEY_ID=AKIA...
  AWS_SECRET_ACCESS_KEY=wJal...
  AWS_REGION=us-east-1
  AWS_S3_BUCKET_NAME=bibleops-pdfs
  ```

### ✅ Install & Start:

- [ ] Run: `npm install`
- [ ] Verify dependencies installed (including @aws-sdk packages)
- [ ] Run: `npm start`
- [ ] Check startup logs for:
  ```
  ☁️  AWS S3:           ✅ Configured
  ✅ S3 connection successful
  ```

### ✅ Test Submission:

- [ ] Open: `http://localhost:3001`
- [ ] Fill out form (passage or book study)
- [ ] Submit form
- [ ] Verify immediate success message
- [ ] Check server logs for batched execution
- [ ] Verify NO rate limiting errors
- [ ] Check email inbox
- [ ] Verify email received with download buttons
- [ ] Click each download link
- [ ] Verify all 14 PDFs download successfully

---

## Production Deployment (Render.com)

### ✅ Environment Variables:

- [ ] Go to Render.com dashboard
- [ ] Select your BibleOps service
- [ ] Navigate to "Environment" tab
- [ ] Add AWS credentials (4 new variables)
- [ ] Click "Save Changes"

### ✅ Deploy Code:

- [ ] Commit all changes
- [ ] Push to main branch
- [ ] Verify Render auto-deploys
- [ ] Wait for deployment to complete

### ✅ Verify Deployment:

- [ ] Check logs for S3 connection success
- [ ] Test health endpoint
- [ ] Verify `s3Configured: true` in response

---

## Production Testing

### ✅ Submit Real Request:

- [ ] Submit form on live site
- [ ] Monitor server logs for batched execution
- [ ] Verify NO rate limiting errors
- [ ] Wait for email (5-8 minutes)
- [ ] Check email received
- [ ] Test all download links

---

## Success Criteria

### ✅ Deployment Successful When:

- [ ] S3 connection test passes
- [ ] Test submission completes successfully
- [ ] All 14 PDFs upload to S3
- [ ] Email sent with download links
- [ ] All download links work
- [ ] No rate limiting errors in logs
- [ ] Total generation time: 5-8 minutes

---

**When all boxes checked, you're ready! 🚀**

See `AWS_S3_SETUP.md` for detailed AWS instructions.
