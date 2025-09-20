# Vercel Deployment Checklist

## ✅ Pre-Deployment Setup

### 1. Environment Variables in Vercel
- [ ] Go to Vercel Dashboard → Your Project → Settings → Environment Variables
- [ ] Add `VITE_SUPABASE_URL` with value: `https://aknhtapidbkwksvjsqsu.supabase.co`
- [ ] Add `VITE_SUPABASE_ANON_KEY` with value: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFrbmh0YXBpZGJrd2tzdmpzcXN1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgzMTMxMzgsImV4cCI6MjA3Mzg4OTEzOH0.l3oaU9sO1HfTpLKI8xkl0gikIofmYdmW3sYKJHq3zVE`
- [ ] Enable for all environments: Production, Preview, Development

### 2. Test Environment Variables
- [ ] Deploy to Vercel
- [ ] Visit `https://your-app.vercel.app/test-env.html`
- [ ] Verify both environment variables are loaded
- [ ] Verify Supabase connection is successful

### 3. Test Application Functionality
- [ ] Test login functionality
- [ ] Test inventory management
- [ ] Test billing system
- [ ] Test all major features

## ✅ Post-Deployment Cleanup

### 4. Remove Hardcoded Credentials (After Verification)
- [ ] Update `supabase.config.js` to remove fallback values
- [ ] Update `batch.html` to remove fallback values
- [ ] Update `metrics.html` to remove fallback values
- [ ] Test locally to ensure fallbacks still work
- [ ] Deploy updated version to Vercel

### 5. Final Verification
- [ ] Test all functionality in production
- [ ] Verify no hardcoded credentials remain
- [ ] Clean up test files (`test-env.html`)
- [ ] Update documentation

## 🚨 Important Notes

- **DO NOT** remove hardcoded credentials until environment variables are confirmed working in Vercel
- **ALWAYS** test in Vercel before removing fallbacks
- **KEEP** the `.env` file for local development
- **DO NOT** commit `.env` file to git

## 🔧 Troubleshooting

### If Environment Variables Don't Work:
1. Check Vercel dashboard for typos in variable names
2. Ensure variables are enabled for the correct environment
3. Redeploy after adding variables
4. Check Vercel build logs for errors

### If Supabase Connection Fails:
1. Verify the URL and key are correct
2. Check Supabase project is active
3. Verify RLS policies allow access
4. Test with the test-env.html page
