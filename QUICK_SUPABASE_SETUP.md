# 🚀 Quick Supabase Setup (5 minutes)

## The Problem
Your `.env.local` file has placeholder values like `your-project.supabase.co`. You need to replace these with your **real** Supabase project credentials.

## Step-by-Step Fix

### Step 1: Get Your Supabase Credentials

**Option A: If you already have a Supabase project:**
1. Go to [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Select your project (or create a new one)
3. Go to **Settings** (gear icon) → **API**
4. Copy these two values:
   - **Project URL**: Looks like `https://abcdefghijklmnop.supabase.co`
   - **anon public key**: A long string starting with `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

**Option B: If you need to create a new project:**
1. Go to [https://supabase.com](https://supabase.com)
2. Click **"Start your project"** or **"New Project"**
3. Sign up/login with GitHub (easiest)
4. Click **"New Project"**
5. Fill in:
   - **Name**: `lifemax` 
   - **Database Password**: Create a strong password (save it!)
   - **Region**: Choose closest to you
6. Click **"Create new project"** (takes 1-2 minutes)
7. Once created, go to **Settings** → **API** and copy the URL and anon key

### Step 2: Update `.env.local`

1. Open `lifemax-app/.env.local` in your code editor
2. Find these lines:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-key-here
   ```
3. Replace with your **real** values:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://your-actual-project-id.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlvdXItcHJvamVjdC1pZCIsInJvbGUiOiJhbm9uIiwiaWF0IjoxNjE2MjM5MDIyfQ.your-actual-key-here
   ```

   ⚠️ **Important:**
   - The URL must start with `https://`
   - The URL must end with `.supabase.co`
   - The key is very long (usually 200+ characters)
   - No quotes, no spaces, no extra characters

### Step 3: Verify Your Setup

Run this command to check:
```bash
cd lifemax-app
node check-env.js
```

### Step 4: Restart Your Server

The dev server needs to be restarted to pick up the new environment variables:

```bash
# Stop the server (Ctrl+C in the terminal where it's running)
# Then restart:
cd lifemax-app
npm run dev
```

### Step 5: Test Authentication

1. Open http://localhost:3000/auth
2. Try to sign up with your email
3. The error should be gone!

## Still Having Issues?

**Error: "DNS_PROBE_FINISHED_NXDOMAIN"**
- Your Supabase URL is wrong or still has placeholder text
- Make sure it's the full URL: `https://xxxxx.supabase.co`

**Error: "Invalid API key"**
- You might have copied the wrong key
- Make sure it's the **anon/public** key, not the service_role key
- The key should be very long (200+ characters)

**Error: "Failed to fetch"**
- Check your internet connection
- Make sure your Supabase project is **active** (not paused)
- Verify the URL and key are correct (no typos)

## Need Help?

If you're stuck, share:
1. The first few characters of your Supabase URL (e.g., `https://abc...`)
2. Whether you see your project in the Supabase dashboard
3. Any error messages you're seeing
