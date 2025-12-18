# Vercel Deployment Quick Checklist

Use this checklist to ensure everything is configured before deploying.

## Pre-Deployment

- [ ] Code is committed and pushed to Git repository
- [ ] Supabase project is created and active
- [ ] All database migrations are applied (`supabase db push`)
- [ ] All Edge Functions are deployed:
  - [ ] `create-task-with-ai`
  - [ ] `openai-chat`
  - [ ] `create-stripe-session`
  - [ ] `stripe-webhook`
- [ ] Supabase secrets are set:
  - [ ] `OPENAI_API_KEY`
  - [ ] `STRIPE_SECRET_KEY`
  - [ ] `STRIPE_PRICE_ID`
  - [ ] `STRIPE_WEBHOOK_SECRET`
- [ ] Stripe webhook JWT verification is **disabled** in Supabase Dashboard
- [ ] Stripe webhook endpoint is configured in Stripe Dashboard
- [ ] Stripe product and price are created
- [ ] GitHub/GitLab/Bitbucket repository is ready

## Vercel Configuration

- [ ] Project imported from Git repository
- [ ] Environment variables added:
  - [ ] `NEXT_PUBLIC_SUPABASE_URL`
  - [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- [ ] Build settings verified (auto-detected Next.js)
- [ ] Initial deployment completed successfully

## Post-Deployment

- [ ] Vercel URL is working (e.g., `https://your-project.vercel.app`)
- [ ] Supabase Auth redirect URLs updated with Vercel domain
- [ ] Stripe Customer Portal return URL updated
- [ ] OAuth providers configured (if using Google OAuth)
- [ ] Test authentication (sign up/sign in)
- [ ] Test task creation with AI labeling
- [ ] Test image uploads
- [ ] Test Stripe checkout flow
- [ ] Test subscription status updates

## Production Readiness

- [ ] Using production Stripe keys (not test keys)
- [ ] Custom domain configured (if applicable)
- [ ] SSL/HTTPS enabled (automatic with Vercel)
- [ ] Error monitoring set up (optional)
- [ ] Analytics configured (optional)
- [ ] All features tested and working

---

**Quick Command Reference:**

```bash
# Deploy Edge Functions
supabase functions deploy create-task-with-ai
supabase functions deploy openai-chat
supabase functions deploy create-stripe-session
supabase functions deploy stripe-webhook

# Set Secrets
supabase secrets set OPENAI_API_KEY="sk-..."
supabase secrets set STRIPE_SECRET_KEY="sk_test_..."
supabase secrets set STRIPE_PRICE_ID="price_..."
supabase secrets set STRIPE_WEBHOOK_SECRET="whsec_..."

# Apply Migrations
supabase db push
```
