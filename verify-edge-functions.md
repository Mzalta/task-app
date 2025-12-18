# How to Verify Supabase Edge Functions are Deployed

## Method 1: Using Supabase Dashboard (Easiest)

1. Go to your Supabase Dashboard:
   https://supabase.com/dashboard/project/byhrlccxrdviqrzekpbw

2. Navigate to **Edge Functions** in the left sidebar

3. You should see a list of all deployed functions:
   - ✅ `create-task-with-ai`
   - ✅ `openai-chat`
   - ✅ `create-stripe-session`
   - ✅ `stripe-webhook`

4. Click on each function to see:
   - Deployment status
   - Last deployed date
   - Function logs
   - Configuration

## Method 2: Using Supabase CLI

Run this command in your terminal:

```bash
npx supabase functions list --project-ref byhrlccxrdviqrzekpbw
```

This will show all deployed functions for your project.

## Method 3: Test the Endpoints Directly

You can test if the functions are accessible by making HTTP requests:

### Test `create-task-with-ai`:
```bash
curl -X POST https://byhrlccxrdviqrzekpbw.supabase.co/functions/v1/create-task-with-ai \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"title":"Test","description":"Test task"}'
```

### Test `openai-chat`:
```bash
curl -X POST https://byhrlccxrdviqrzekpbw.supabase.co/functions/v1/openai-chat \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"prompt":"Hello"}'
```

### Test `create-stripe-session`:
```bash
curl -X POST https://byhrlccxrdviqrzekpbw.supabase.co/functions/v1/create-stripe-session \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json"
```

**Note:** These will return errors without proper authentication, but if you get a response (even an error), it means the function is deployed and accessible.

## Method 4: Deploy Functions (If Not Already Deployed)

If any functions are missing, deploy them:

```bash
# Make sure you're linked to your project first
npx supabase link --project-ref byhrlccxrdviqrzekpbw

# Deploy each function
npx supabase functions deploy create-task-with-ai
npx supabase functions deploy openai-chat
npx supabase functions deploy create-stripe-session
npx supabase functions deploy stripe-webhook
```

## Quick Check URLs

Your functions should be accessible at:
- `https://byhrlccxrdviqrzekpbw.supabase.co/functions/v1/create-task-with-ai`
- `https://byhrlccxrdviqrzekpbw.supabase.co/functions/v1/openai-chat`
- `https://byhrlccxrdviqrzekpbw.supabase.co/functions/v1/create-stripe-session`
- `https://byhrlccxrdviqrzekpbw.supabase.co/functions/v1/stripe-webhook`

If you get a 404, the function is not deployed. If you get any other response (even an error), the function exists.
