# BibleOps Premium - Quick Start Guide

**5 Simple Steps to Get Your Freemium System Running**

---

## What You're Setting Up

Your BibleOps platform will have a **freemium model**:

- **Free Tier:** 3 curricula every 45 days (no credit card)
- **Premium:** $19.97/month for 25 curricula + $4.99 overages
- **Annual:** $197/year (save $42)
- **Church:** $49.97/month unlimited

**Good News:** Your existing free service keeps working. Nothing breaks!

---

## Step 1: Set Up Database (30 min)

### Using Render.com (Easiest)

1. Go to [dashboard.render.com](https://dashboard.render.com)
2. Click "New +" → "PostgreSQL"
3. Settings:
   - Name: `bibleops-premium-db`
   - Plan: **Free** (or Starter $7/mo for backups)
   - Click "Create Database"
4. Wait 2-3 minutes for it to initialize
5. Copy **"Internal Database URL"**
   - Example: `postgresql://user:pass@dpg-xxxxx-internal/db_name`
6. Run the database schema:

   ```bash
   # Connect and run schema
   psql "YOUR_DATABASE_URL_HERE" < database/schema.sql
   ```

7. Verify it worked:
   ```bash
   psql "YOUR_DATABASE_URL_HERE"
   \dt
   # Should see: users, subscriptions, curriculum_generations, etc.
   \q
   ```

**Save for later:**
```
DATABASE_URL=postgresql://...
```

---

## Step 2: Set Up Stripe (45 min)

### Create Account

1. Sign up at [stripe.com](https://stripe.com)
2. Toggle to **"Test mode"** (top right)

### Create 3 Products

**Product 1: Individual Monthly**
- Go to Products → Add product
- Name: `BibleOps Premium - Individual`
- Price: `$19.97` per month
- Click Save
- **Copy Price ID** (starts with `price_...`)
- Save as: `STRIPE_PRICE_INDIVIDUAL_MONTHLY=price_xxxxx`

**Product 2: Annual**
- Name: `BibleOps Premium - Annual`
- Price: `$197` per year
- **Copy Price ID**
- Save as: `STRIPE_PRICE_INDIVIDUAL_ANNUAL=price_xxxxx`

**Product 3: Church**
- Name: `BibleOps Premium - Church`
- Price: `$49.97` per month
- **Copy Price ID**
- Save as: `STRIPE_PRICE_CHURCH_MONTHLY=price_xxxxx`

### Get API Key

1. Go to Developers → API Keys
2. Copy **"Secret key"** (starts with `sk_test_...`)
3. Save as: `STRIPE_SECRET_KEY=sk_test_xxxxx`

**Don't create webhook yet** - you'll do that after deploying

---

## Step 3: Configure Environment (10 min)

### Generate JWT Secret

```bash
openssl rand -base64 32
```
Copy the output.

### Update `.env` File

Open your `.env` file and add these NEW lines (keep existing ones):

```bash
# NEW - Database
DATABASE_URL=postgresql://user:pass@dpg-xxxxx-internal/db_name

# NEW - JWT Authentication
JWT_SECRET=paste_the_generated_secret_here

# NEW - Stripe Test Keys
STRIPE_SECRET_KEY=sk_test_xxxxx
STRIPE_PRICE_INDIVIDUAL_MONTHLY=price_xxxxx
STRIPE_PRICE_INDIVIDUAL_ANNUAL=price_xxxxx
STRIPE_PRICE_CHURCH_MONTHLY=price_xxxxx
```

Save the file.

---

## Step 4: Test Connection (5 min)

```bash
# Install any new packages
npm install

# Test database connection
node -e "const db = require('./src/database'); db.testConnection();"
```

**You should see:**
```
✅ Database connected successfully
📊 Database connection test successful: 2025-11-28
```

If it works, you're done with setup! ✅

---

## Step 5: Tell Claude You're Ready

Once Steps 1-4 are complete, let me know and I'll:

1. **Integrate the backend routes** into your server
2. **Add free tier limits** to your existing generate endpoint
3. **Test everything end-to-end**
4. **Deploy to production**

---

## Quick Reference: What You Need

| What | Where to Get It | Format |
|------|----------------|--------|
| **Database URL** | Render DB dashboard | `postgresql://user:pass@host/db` |
| **JWT Secret** | `openssl rand -base64 32` | Long random string |
| **Stripe Secret** | Stripe → Developers → API Keys | `sk_test_...` |
| **Price IDs** | Stripe → Products (copy each one) | `price_...` |

---

## Need Help?

**Full instructions:** See `PREMIUM_SETUP_INSTRUCTIONS.md`

**Common issues:**
- Database won't connect → Check URL format
- Stripe errors → Make sure you're in "Test mode"
- Can't find Price IDs → They're in Stripe → Products → Click product → Copy ID

---

**Ready?** Complete Steps 1-4 above, then let me know!
