# Step-by-Step Vercel Deployment Guide

This guide will walk you through deploying your Task App to Vercel with all features enabled.

## Prerequisites

Before starting, ensure you have:
- ✅ A GitHub account (or GitLab/Bitbucket)
- ✅ A Vercel account (sign up at [vercel.com](https://vercel.com))
- ✅ A Supabase project set up and configured
- ✅ OpenAI API key
- ✅ Stripe account (test or production)
- ✅ All Supabase Edge Functions deployed
- ✅ Your code pushed to a Git repository

---

## Step 1: Prepare Your Repository

1. **Ensure your code is committed and pushed to Git:**
   ```bash
   git add .
   git commit -m "Prepare for deployment"
   git push origin main
   ```

2. **Verify `.gitignore` excludes sensitive files:**
   - `.env.local` should be in `.gitignore`
   - `.env.test.local` should be in `.gitignore`
   - Any other sensitive files should be excluded

---

## Step 2: Set Up Supabase (If Not Already Done)

### 2.1 Deploy Database Migrations

1. **Link your Supabase project** (if not already linked):
   ```bash
   supabase link --project-ref your-project-ref
   ```

2. **Apply all database migrations:**
   ```bash
   supabase db push
   ```

   This will apply all migrations in `supabase/migrations/` in order.

### 2.2 Deploy Edge Functions

Deploy all required Edge Functions:

```bash
# Deploy AI task creation function
supabase functions deploy create-task-with-ai

# Deploy OpenAI chat function
supabase functions deploy openai-chat

# Deploy Stripe session creation function
supabase functions deploy create-stripe-session

# Deploy Stripe webhook handler
supabase functions deploy stripe-webhook
```

### 2.3 Configure Supabase Secrets

Set all required secrets for your Edge Functions:

```bash
# OpenAI API Key
supabase secrets set OPENAI_API_KEY="sk-your-openai-key"

# Stripe Configuration
supabase secrets set STRIPE_SECRET_KEY="sk_test_your-stripe-secret-key"
supabase secrets set STRIPE_PRICE_ID="price_your-price-id"
supabase secrets set STRIPE_WEBHOOK_SECRET="whsec_your-webhook-secret"
```

**Important:** For production, use your production Stripe keys (`sk_live_...` instead of `sk_test_...`).

### 2.4 Configure Supabase Settings

1. **Disable JWT Verification for Stripe Webhook:**
   - Go to Supabase Dashboard → Edge Functions → `stripe-webhook`
   - Click on the function → Details
   - **Uncheck** "Enforce JWT Verification"
   - Save

2. **Disable Email Confirmation (Optional):**
   - Go to Authentication → Providers → Email
   - **Uncheck** "Confirm email"
   - Save

3. **Get Your Supabase Credentials:**
   - Go to Project Settings → API
   - Copy your:
     - Project URL: `https://[project-id].supabase.co`
     - `anon` `public` key
     - `service_role` key (keep this secret!)

---

## Step 3: Configure Stripe

### 3.1 Create Stripe Product and Price

If you haven't already, create a subscription product:

```bash
stripe prices create \
  --currency=usd \
  --unit-amount=1000 \
  -d "recurring[interval]"=month \
  -d "recurring[trial_period_days]"=14 \
  -d "product_data[name]"="TaskMaster Premium"
```

Copy the `price_id` (starts with `price_...`).

### 3.2 Set Up Stripe Customer Portal

```bash
stripe billing_portal configurations create \
  -d "business_profile[privacy_policy_url]=https://your-domain.com/privacy" \
  -d "business_profile[terms_of_service_url]=https://your-domain.com/terms" \
  -d "default_return_url=https://your-domain.com/profile" \
  -d "features[subscription_cancel][enabled]=true" \
  -d "features[payment_method_update][enabled]=true"
```

**Note:** Replace `your-domain.com` with your actual Vercel deployment URL (you can update this later).

### 3.3 Configure Stripe Webhook

1. **Get your Supabase project ID** from your Supabase URL: `https://[PROJECT_ID].supabase.co`

2. **In Stripe Dashboard:**
   - Go to Developers → Webhooks
   - Click "Add endpoint"
   - Endpoint URL: `https://[PROJECT_ID].supabase.co/functions/v1/stripe-webhook`
   - Select events:
     - `checkout.session.completed`
     - `customer.subscription.updated`
     - `customer.subscription.deleted`
   - Click "Add endpoint"
   - Copy the **Signing secret** (starts with `whsec_...`)

3. **Store the webhook secret in Supabase:**
   ```bash
   supabase secrets set STRIPE_WEBHOOK_SECRET="whsec_your-webhook-secret"
   ```

### 3.4 Store Stripe Secret in Supabase Vault (Alternative Method)

For the Stripe webhook to access the secret key, you may also need to store it in the PostgreSQL vault:

1. Go to Supabase Dashboard → SQL Editor
2. Run this SQL (replace with your actual secret key):

```sql
-- Only run this if the secret doesn't already exist
INSERT INTO vault.secrets (name, secret)
SELECT 'stripe', 'sk_test_your-secret-key'
WHERE NOT EXISTS (
  SELECT 1 FROM vault.secrets WHERE name = 'stripe'
)
RETURNING key_id;
```

---

## Step 4: Deploy to Vercel

### 4.1 Import Your Project

1. **Go to [vercel.com](https://vercel.com)** and sign in
2. Click **"Add New..."** → **"Project"**
3. **Import your Git repository:**
   - If using GitHub, click "Import" next to your repository
   - If using GitLab/Bitbucket, connect your account first
4. Select your repository and click **"Import"**

### 4.2 Configure Project Settings

1. **Framework Preset:** Should auto-detect as "Next.js"
2. **Root Directory:** Leave as `./` (unless your Next.js app is in a subdirectory)
3. **Build Command:** Should be `npm run build` (default)
4. **Output Directory:** Leave as `.next` (default)
5. **Install Command:** Should be `npm install` (default)

### 4.3 Set Environment Variables

**Before deploying, add all required environment variables in Vercel:**

Click **"Environment Variables"** and add:

#### Required Variables:

```
NEXT_PUBLIC_SUPABASE_URL=https://[your-project-id].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

**Important Notes:**
- These are the **only** environment variables needed in Vercel
- The `NEXT_PUBLIC_` prefix makes them available to the browser
- Do **NOT** add `SUPABASE_SERVICE_KEY` to Vercel (it's only for server-side and should stay in Supabase)
- Do **NOT** add Stripe keys to Vercel (they're stored in Supabase secrets)
- Do **NOT** add OpenAI keys to Vercel (they're stored in Supabase secrets)

### 4.4 Deploy

1. Click **"Deploy"**
2. Wait for the build to complete (usually 1-3 minutes)
3. Once deployed, you'll get a URL like: `https://your-project.vercel.app`

---

## Step 5: Update URLs and Redirects

### 5.1 Update Stripe Configuration

After you have your Vercel URL, update your Stripe settings:

1. **Update Customer Portal return URL:**
   ```bash
   stripe billing_portal configurations update [config-id] \
     -d "default_return_url=https://your-project.vercel.app/profile"
   ```

2. **Verify Webhook URL** in Stripe Dashboard points to your Supabase function

### 5.2 Configure Supabase Auth Redirect URLs

1. **Go to Supabase Dashboard → Authentication → URL Configuration**
2. **Add your Vercel URL to:**
   - Site URL: `https://your-project.vercel.app`
   - Redirect URLs: `https://your-project.vercel.app/**`
   - Add any custom domains if you have them

### 5.3 Update OAuth Providers (If Using Google OAuth)

1. **Go to Supabase Dashboard → Authentication → Providers → Google**
2. **Add authorized redirect URIs:**
   - `https://[your-project-id].supabase.co/auth/v1/callback`
   - `https://your-project.vercel.app/auth/callback` (if you have a custom callback route)

---

## Step 6: Test Your Deployment

### 6.1 Basic Functionality Tests

1. **Visit your Vercel URL:** `https://your-project.vercel.app`
2. **Test Authentication:**
   - Sign up with email
   - Sign in
   - Test Google OAuth (if configured)

3. **Test Task Management:**
   - Create a task
   - Verify AI labeling works
   - Edit a task
   - Delete a task
   - Upload an image attachment

4. **Test Stripe Integration:**
   - Go to Profile page
   - Click "Upgrade to Premium"
   - Complete test checkout (use Stripe test card: `4242 4242 4242 4242`)
   - Verify subscription status updates

### 6.2 Verify Edge Functions

Check that all Edge Functions are accessible:

- `https://[project-id].supabase.co/functions/v1/create-task-with-ai`
- `https://[project-id].supabase.co/functions/v1/openai-chat`
- `https://[project-id].supabase.co/functions/v1/create-stripe-session`
- `https://[project-id].supabase.co/functions/v1/stripe-webhook`

---

## Step 7: Set Up Custom Domain (Optional)

1. **In Vercel Dashboard:**
   - Go to your project → Settings → Domains
   - Add your custom domain
   - Follow DNS configuration instructions

2. **Update Supabase Auth URLs** with your custom domain

3. **Update Stripe Customer Portal** return URL with your custom domain

---

## Step 8: Production Checklist

Before going live, verify:

- [ ] All environment variables are set in Vercel
- [ ] All Supabase Edge Functions are deployed
- [ ] All Supabase secrets are configured
- [ ] Database migrations are applied
- [ ] Stripe webhook is configured with production endpoint
- [ ] Using production Stripe keys (not test keys)
- [ ] Supabase Auth redirect URLs include your production domain
- [ ] OAuth providers are configured (if using)
- [ ] Custom domain is configured (if using)
- [ ] SSL/HTTPS is enabled (automatic with Vercel)
- [ ] All features tested and working

---

## Troubleshooting

### Build Fails

- **Check build logs** in Vercel dashboard
- **Verify Node.js version** (Vercel auto-detects, but you can set it in `package.json`):
  ```json
  "engines": {
    "node": "18.x"
  }
  ```

### Environment Variables Not Working

- Ensure variables start with `NEXT_PUBLIC_` if needed in browser
- **Redeploy** after adding new environment variables
- Check variable names match exactly (case-sensitive)

### Supabase Connection Issues

- Verify `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are correct
- Check Supabase project is active and not paused
- Verify Auth redirect URLs include your Vercel domain

### Edge Functions Not Working

- Verify functions are deployed: `supabase functions list`
- Check function logs in Supabase Dashboard
- Verify secrets are set: `supabase secrets list`
- Check CORS headers in function code

### Stripe Issues

- Verify webhook endpoint is correct
- Check webhook secret matches in Supabase
- Test with Stripe CLI locally first
- Check Stripe Dashboard → Events for webhook delivery status

### Image Upload Issues

- Verify Supabase Storage bucket exists and has correct policies
- Check `next.config.mjs` has correct image remote patterns
- Verify storage policies allow authenticated uploads

---

## Environment Variables Summary

### Vercel Environment Variables (Required):
```
NEXT_PUBLIC_SUPABASE_URL=https://[project-id].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### Supabase Secrets (Set via CLI):
```
OPENAI_API_KEY=sk-...
STRIPE_SECRET_KEY=sk_test_... (or sk_live_... for production)
STRIPE_PRICE_ID=price_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

### Not Needed in Vercel:
- `SUPABASE_SERVICE_KEY` (only used server-side in Supabase)
- `STRIPE_SECRET_KEY` (stored in Supabase secrets)
- `STRIPE_PRICE_ID` (stored in Supabase secrets)
- `STRIPE_WEBHOOK_SECRET` (stored in Supabase secrets)
- `OPENAI_API_KEY` (stored in Supabase secrets)

---

## Next Steps

After successful deployment:

1. **Monitor your application:**
   - Check Vercel Analytics
   - Monitor Supabase usage
   - Set up error tracking (e.g., Sentry)

2. **Set up CI/CD:**
   - Vercel automatically deploys on git push
   - Configure preview deployments for PRs

3. **Optimize:**
   - Enable Vercel Analytics
   - Set up caching strategies
   - Monitor performance

4. **Scale:**
   - Upgrade Supabase plan if needed
   - Monitor API usage limits
   - Set up alerts for errors

---

## Support

If you encounter issues:
1. Check Vercel deployment logs
2. Check Supabase function logs
3. Review this guide's troubleshooting section
4. Check project README.md for additional setup details

---

**Congratulations! Your Task App should now be live on Vercel! 🎉**
