# BibleOps Premium Setup Instructions

Complete step-by-step guide to set up the freemium subscription system.

---

## Overview

Your BibleOps platform now has a **freemium model**:

- **Free Tier:** 3 curricula every 45 days (no credit card required)
- **Premium Tier:** $19.97/month for 25 curricula + $4.99 overages
- **Annual Tier:** $197/year (save $42)
- **Church Tier:** $49.97/month for unlimited curricula

**Important:** The existing free service continues to work. These steps add tracking and premium features WITHOUT breaking anything.

---

## Phase 1: Set Up PostgreSQL Database

### Option A: Using Render.com (Recommended - Same Platform)

1. **Log in to Render.com**
   - Go to [dashboard.render.com](https://dashboard.render.com)

2. **Create PostgreSQL Database**
   - Click "New +" → "PostgreSQL"
   - Name: `bibleops-premium-db`
   - Database: `bibleops_db`
   - User: `bibleops_user`
   - Region: Same as your web service (Oregon)
   - Plan: **Free** (or Starter $7/month for production)
   - Click "Create Database"

3. **Wait for Database to Initialize**
   - Takes 2-3 minutes
   - Status will change to "Available"

4. **Get Connection String**
   - Go to database dashboard
   - Copy **"Internal Database URL"** (faster, same region)
   - Format: `postgresql://bibleops_user:password@dpg-xxxxx-internal/bibleops_db`
   - Save this for later

5. **Run Database Schema**

   **Method 1: Using Render Shell (Easiest)**
   - In database dashboard, click "Connect" → "External Connection"
   - Copy the `psql` command shown
   - Open your terminal and run:
     ```bash
     # Connect to database
     psql "postgresql://bibleops_user:password@dpg-xxxxx.oregon-postgres.render.com/bibleops_db"

     # You'll see: bibleops_db=>

     # Copy the entire contents of database/schema.sql
     # Paste it into the psql terminal
     # Press Enter

     # You should see "CREATE TABLE" messages

     # Exit psql
     \q
     ```

   **Method 2: Using Local File**
   - Make sure you have PostgreSQL client installed
   - Run from your project directory:
     ```bash
     psql "postgresql://bibleops_user:password@dpg-xxxxx.oregon-postgres.render.com/bibleops_db" < database/schema.sql
     ```

6. **Verify Tables Were Created**
   ```bash
   psql "postgresql://..."

   # List all tables
   \dt

   # You should see:
   # users
   # subscriptions
   # curriculum_generations
   # pdf_files
   # payment_history
   # webhook_events

   \q
   ```

### Option B: Using Supabase (Alternative - Better Free Tier)

1. **Create Supabase Account**
   - Go to [supabase.com](https://supabase.com)
   - Sign up (free)

2. **Create New Project**
   - Click "New Project"
   - Name: `bibleops-premium`
   - Database Password: (generate strong password)
   - Region: West (Oregon)
   - Click "Create new project"

3. **Run Schema**
   - Go to "SQL Editor" in left sidebar
   - Click "New query"
   - Copy entire contents of `database/schema.sql`
   - Paste and click "Run"

4. **Get Connection String**
   - Go to Settings → Database
   - Copy "Connection string" under "Connection pooling"
   - Format: `postgresql://postgres:password@db.xxxxx.supabase.co:6543/postgres`

---

## Phase 2: Set Up Stripe Account

### Create Stripe Account

1. **Sign up for Stripe**
   - Go to [stripe.com](https://stripe.com)
   - Click "Start now" → Create account
   - Complete business verification

2. **Activate Test Mode**
   - Toggle "Test mode" in dashboard (top right)
   - You'll use test mode first, then switch to live

### Create Products and Prices

**Product 1: Individual Monthly**

1. Go to Products → Add product
2. Fill in:
   - Name: `BibleOps Premium - Individual`
   - Description: `25 Bible study curricula per month + unlimited overages at $4.99 each`
3. Pricing:
   - Price: `$19.97`
   - Billing period: `Monthly`
   - Type: `Recurring`
4. Click "Add pricing" → "Save product"
5. **COPY THE PRICE ID** (starts with `price_...`)
   - Example: `price_1OX2Y3Z4a5b6c7d8e9f0`
   - Save this as: `STRIPE_PRICE_INDIVIDUAL_MONTHLY`

**Product 2: Individual Annual**

1. Add another product:
   - Name: `BibleOps Premium - Annual`
   - Description: `25 Bible study curricula per month + unlimited overages. Save $42/year!`
2. Pricing:
   - Price: `$197.00`
   - Billing period: `Yearly`
3. Save and copy Price ID
   - Save as: `STRIPE_PRICE_INDIVIDUAL_ANNUAL`

**Product 3: Church Monthly**

1. Add another product:
   - Name: `BibleOps Premium - Church`
   - Description: `Unlimited Bible study curricula for your church or ministry`
2. Pricing:
   - Price: `$49.97`
   - Billing period: `Monthly`
3. Save and copy Price ID
   - Save as: `STRIPE_PRICE_CHURCH_MONTHLY`

### Get API Keys

1. Go to Developers → API Keys
2. Copy **"Secret key"** (starts with `sk_test_...`)
   - Save as: `STRIPE_SECRET_KEY`
3. **Publishable key** not needed for server-side integration

### Important: Webhook Setup (Do This AFTER Deploying Backend)

**You'll do this in Phase 4 after deploying the code.**

---

## Phase 3: Configure Environment Variables

### Local Development (.env file)

1. **Generate JWT Secret**
   ```bash
   openssl rand -base64 32
   ```
   Copy the output.

2. **Edit `.env` file**
   ```bash
   # Your existing variables (keep these)
   ANTHROPIC_API_KEY=sk-ant-xxxxx
   PORT=3001
   NODE_ENV=development

   # NEW - Database
   DATABASE_URL=postgresql://bibleops_user:password@dpg-xxxxx-internal/bibleops_db

   # NEW - JWT Authentication
   JWT_SECRET=paste_your_generated_secret_here

   # NEW - Stripe (Test Mode)
   STRIPE_SECRET_KEY=sk_test_xxxxx
   STRIPE_WEBHOOK_SECRET=whsec_xxxxx  # Leave blank for now

   # NEW - Stripe Price IDs
   STRIPE_PRICE_INDIVIDUAL_MONTHLY=price_xxxxx
   STRIPE_PRICE_INDIVIDUAL_ANNUAL=price_xxxxx
   STRIPE_PRICE_CHURCH_MONTHLY=price_xxxxx
   ```

3. **Save the file**

### Production (Render.com Environment Variables)

**Do this AFTER testing locally in Phase 5**

1. Go to Render web service dashboard
2. Click "Environment" tab
3. Add each variable:
   - Click "Add Environment Variable"
   - Key: `DATABASE_URL`
   - Value: `postgresql://...` (your connection string)
   - Click "Add"
4. Repeat for:
   - `JWT_SECRET`
   - `STRIPE_SECRET_KEY`
   - `STRIPE_PRICE_INDIVIDUAL_MONTHLY`
   - `STRIPE_PRICE_INDIVIDUAL_ANNUAL`
   - `STRIPE_PRICE_CHURCH_MONTHLY`
5. **Do NOT add `STRIPE_WEBHOOK_SECRET` yet** (will add after webhook setup)

---

## Phase 4: Test Database Connection Locally

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Test database connection**
   ```bash
   node -e "const db = require('./src/database'); db.testConnection();"
   ```

   **Expected output:**
   ```
   ✅ Database connected successfully
   📊 Database connection test successful: 2025-11-28 10:30:45
   ```

   **If you see an error:**
   - Check `DATABASE_URL` is correct in `.env`
   - Make sure database is running
   - Check firewall/network settings

---

## Phase 5: Deploy to Render.com

**Note: The backend integration with server.js needs to be completed first (Phase 3 of development). Once that's done:**

1. **Commit all changes**
   ```bash
   git add -A
   git commit -m "Add premium subscription system"
   git push
   ```

2. **Render Auto-Deploys**
   - Render will automatically detect changes
   - Wait for deployment to complete (~5 minutes)
   - Check logs for any errors

3. **Verify Deployment**
   - Visit `https://your-app.onrender.com/premium/index.html`
   - You should see the premium landing page

---

## Phase 6: Configure Stripe Webhook

**Do this AFTER deployment is complete**

1. **Get Your Live URL**
   - Example: `https://bibleops-abc123.onrender.com`

2. **Create Webhook in Stripe**
   - Go to Stripe Dashboard → Developers → Webhooks
   - Click "Add endpoint"
   - Endpoint URL: `https://your-app.onrender.com/api/stripe/webhook`
   - Description: `BibleOps Premium Webhooks`

3. **Select Events to Listen To**
   - Click "Select events"
   - Choose these events:
     - `checkout.session.completed`
     - `customer.subscription.created`
     - `customer.subscription.updated`
     - `customer.subscription.deleted`
     - `invoice.payment_succeeded`
     - `invoice.payment_failed`
   - Click "Add events"

4. **Save Webhook**
   - Click "Add endpoint"
   - Copy the **Signing secret** (starts with `whsec_...`)

5. **Add Webhook Secret to Render**
   - Go to Render web service → Environment
   - Add variable:
     - Key: `STRIPE_WEBHOOK_SECRET`
     - Value: `whsec_xxxxx` (paste signing secret)
   - Service will auto-redeploy

6. **Test Webhook**
   - In Stripe webhook dashboard, click "Send test webhook"
   - Select `checkout.session.completed`
   - Click "Send test webhook"
   - Check Render logs - you should see:
     ```
     📨 Stripe webhook: checkout.session.completed
     ✅ Webhook processed
     ```

---

## Phase 7: Test End-to-End

### Test Free User Flow

1. Go to `https://your-app.onrender.com`
2. Fill out form with a test email
3. Submit (should work - free generation)
4. Submit again (2nd generation)
5. Submit 3rd time (3rd generation)
6. Submit 4th time → Should see "Upgrade to Premium" message

### Test Premium Signup

1. Go to `/premium/signup.html`
2. Create account with test email
3. Enter password
4. Click "Sign Up"
5. Should redirect to Stripe Checkout

### Test Stripe Checkout (Test Mode)

1. Use Stripe test card:
   - Card: `4242 4242 4242 4242`
   - Expiry: Any future date
   - CVC: Any 3 digits
   - ZIP: Any 5 digits
2. Complete checkout
3. Should redirect to dashboard
4. Check Stripe dashboard → Payments → See successful payment

### Test Premium Generation

1. Log in to dashboard
2. Fill out generation form
3. Submit
4. Should see success message
5. Check usage stats updated

---

## Phase 8: Go Live

### Switch Stripe to Live Mode

1. **Complete Stripe Account Verification**
   - Stripe Dashboard → Settings → Account
   - Complete business verification
   - Add bank account for payouts

2. **Create Live Products**
   - Toggle to "Live mode" (top right)
   - Recreate the 3 products (same prices)
   - Copy NEW live Price IDs (start with `price_live_...`)

3. **Get Live API Keys**
   - Developers → API Keys (in Live mode)
   - Copy **Live Secret Key** (starts with `sk_live_...`)

4. **Update Render Environment Variables**
   - Change `STRIPE_SECRET_KEY` to live key
   - Update all three `STRIPE_PRICE_*` variables to live price IDs

5. **Recreate Webhook for Live Mode**
   - Developers → Webhooks (in Live mode)
   - Add same endpoint URL
   - Select same events
   - Copy new signing secret
   - Update `STRIPE_WEBHOOK_SECRET` on Render

6. **Change NODE_ENV**
   - On Render: Set `NODE_ENV=production`

### Final Production Checklist

- [ ] Database running on paid tier (Render Starter $7/mo recommended)
- [ ] All environment variables set correctly
- [ ] Stripe in live mode with verified account
- [ ] Webhook configured and tested
- [ ] SSL certificate active (automatic on Render)
- [ ] Test complete user journey
- [ ] Monitor Render logs for errors
- [ ] Set up error alerting (Render email notifications)

---

## Troubleshooting

### Database Connection Errors

**Error: `ECONNREFUSED`**
- Check DATABASE_URL is correct
- Make sure database is running on Render

**Error: `password authentication failed`**
- Check username/password in connection string
- Verify user has correct permissions

### Stripe Errors

**Error: `No such price`**
- Check Price IDs are correct in .env
- Make sure you're in correct mode (test vs live)

**Error: `Webhook signature verification failed`**
- Check STRIPE_WEBHOOK_SECRET is correct
- Make sure webhook endpoint URL matches exactly

### Authentication Errors

**Error: `Invalid token`**
- Check JWT_SECRET is set correctly
- Make sure same JWT_SECRET on all servers
- Clear browser localStorage and try again

---

## Support

If you encounter issues:

1. Check Render logs: Dashboard → Logs tab
2. Check Stripe webhook logs: Dashboard → Developers → Webhooks → Click endpoint
3. Check database logs: Database dashboard → Logs

---

## Next Steps

After setup is complete:

1. **Monitor Usage** - Check Stripe dashboard daily
2. **Set Up Email Notifications** - Configure Render to email on errors
3. **Add Analytics** - Track conversion rate (free → premium)
4. **Marketing** - Update homepage with freemium messaging

---

**Setup Complete!** 🎉

Your freemium subscription system is now live. Users can try 3 free curricula, then upgrade to premium.
