# PM Dashboard Deployment Guide

## ✅ Already Done

1. **Supabase Project Created**
   - Organization: DiMuro PM
   - Project: pm-dashboard
   - Database schema deployed
   - RLS policies configured
   - Auth triggers set up

2. **Code Pushed to GitHub**
   - Repository: https://github.com/michaeldimuro/pm-dashboard
   - All features implemented
   - Build verified working

## 🚀 To Deploy to Vercel

### Option 1: Quick Deploy (Recommended)

1. Go to [vercel.com](https://vercel.com) and log in with your account
2. Click "Add New Project"
3. Import from GitHub: `michaeldimuro/pm-dashboard`
4. Add Environment Variables:
   ```
   VITE_SUPABASE_URL=https://hbadziugeagzdfbcacly.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhiYWR6aXVnZWFnemRmYmNhY2x5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA4NDMxOTQsImV4cCI6MjA4NjQxOTE5NH0.-lP54rBqh-RCVzl3x8ws2o4kMQyOCk8OVRlXomx9Gro
   SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhiYWR6aXVnZWFnemRmYmNhY2x5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDg0MzE5NCwiZXhwIjoyMDg2NDE5MTk0fQ.TW5wMRNMBhZCeO9kCqI4g_Y_TOj-zv9Sp6q9tySrs2c
   ```
5. Click Deploy!

### Option 2: CLI Deploy

```bash
cd pm-dashboard
vercel login
vercel --prod
```

When prompted, add the environment variables above.

## 🔧 After Deployment

1. **Get your Vercel URL** (e.g., `pm-dashboard-xxx.vercel.app`)
2. **Add custom domain** (optional):
   - Vercel Dashboard → Project → Settings → Domains
   - Add your domain (e.g., `pm.dimuro.com`)

## 📱 Enable GitHub Actions CI/CD (Optional)

For automatic deployments on every push:

1. Get Vercel tokens from Vercel Dashboard → Settings → Tokens
2. Add these secrets to GitHub repo (Settings → Secrets → Actions):
   - `VERCEL_TOKEN` - Your Vercel API token
   - `VERCEL_ORG_ID` - Your org ID (from `.vercel/project.json` after first deploy)
   - `VERCEL_PROJECT_ID` - Project ID (same file)

## 🔗 Supabase Dashboard

Access at: https://supabase.com/dashboard/project/hbadziugeagzdfbcacly

- **Auth Users:** /auth/users
- **Table Editor:** /editor
- **SQL Editor:** /sql
- **API Docs:** /api

## 📋 Next Steps After Deploy

1. Create your first user account at the deployed URL
2. Create projects for each business
3. Start adding tasks, leads, and events!

---

Need help? The code is production-ready - just needs Vercel deployment.
