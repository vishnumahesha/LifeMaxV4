# ✅ Supabase Setup Checklist

## Current Status

Run this command to check:
```bash
cd lifemax-app
node validate-supabase.js
```

---

## Step-by-Step Checklist

### ☐ Step 1: Create Supabase Account
- [ ] Go to https://supabase.com
- [ ] Sign up with GitHub or email
- [ ] Verify your email if needed

### ☐ Step 2: Create New Project
- [ ] Click "New Project" in Supabase dashboard
- [ ] Enter project name: `lifemax`
- [ ] Create a strong database password (SAVE IT!)
- [ ] Choose region closest to you
- [ ] Click "Create new project"
- [ ] Wait 1-2 minutes for project to be created

### ☐ Step 3: Get Your Credentials
- [ ] In Supabase dashboard, click **Settings** (⚙️)
- [ ] Click **API** in settings menu
- [ ] Copy the **Project URL** (looks like `https://xxxxx.supabase.co`)
- [ ] Copy the **anon public key** (very long, starts with `eyJ...`)

### ☐ Step 4: Update `.env.local`
- [ ] Open `lifemax-app/.env.local` in your code editor
- [ ] Find `NEXT_PUBLIC_SUPABASE_URL=`
- [ ] Replace `https://your-project.supabase.co` with your **real** URL
- [ ] Find `NEXT_PUBLIC_SUPABASE_ANON_KEY=`
- [ ] Replace `your-supabase-anon-key` with your **real** key
- [ ] Save the file

### ☐ Step 5: Verify Configuration
Run:
```bash
cd lifemax-app
node validate-supabase.js
```
- [ ] All checks should be green ✅

### ☐ Step 6: Set Up Database
- [ ] In Supabase dashboard, click **SQL Editor** (📝)
- [ ] Click "New query"
- [ ] Open `lifemax-app/supabase/migrations/002_calorie_tracker.sql`
- [ ] Copy ALL the SQL code
- [ ] Paste into Supabase SQL Editor
- [ ] Click "Run" (or Ctrl+Enter)
- [ ] Should see "Success. No rows returned"

### ☐ Step 7: Restart Dev Server
- [ ] Stop your current dev server (Ctrl+C)
- [ ] Run: `cd lifemax-app && npm run dev`
- [ ] Wait for server to start

### ☐ Step 8: Test Connection
Run:
```bash
cd lifemax-app
node test-supabase-connection.js
```
- [ ] Should see "✅ Connection successful!"

### ☐ Step 9: Test Authentication
- [ ] Open http://localhost:3000/auth
- [ ] Try to sign up with your email
- [ ] Should work without errors! 🎉

---

## Common Issues

**Still seeing "Failed to fetch"?**
1. Make sure you updated `.env.local` with REAL values (not placeholders)
2. Restart your dev server after updating `.env.local`
3. Check that your Supabase project is **active** (not paused)

**"DNS_PROBE_FINISHED_NXDOMAIN" error?**
- Your Supabase URL is still a placeholder
- Make sure you copied the full URL from Supabase dashboard

**"Invalid API key" error?**
- You might have copied the wrong key
- Make sure it's the **anon public** key (not service_role)
- The key should be 200+ characters long

---

## Need Help?

If you're stuck at any step, check:
- `SETUP_SUPABASE_NOW.md` - Detailed setup guide
- `QUICK_SUPABASE_SETUP.md` - Quick reference
