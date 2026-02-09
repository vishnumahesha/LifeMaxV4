# Supabase Setup Guide

## Quick Setup Steps

### 1. Create a Supabase Project

1. Go to [https://supabase.com](https://supabase.com)
2. Sign up or log in
3. Click "New Project"
4. Fill in:
   - **Name**: `lifemax` (or any name you prefer)
   - **Database Password**: Choose a strong password (save it!)
   - **Region**: Choose closest to you
5. Click "Create new project" (takes 1-2 minutes)

### 2. Get Your Supabase Credentials

1. In your Supabase project dashboard, go to **Settings** → **API**
2. You'll see:
   - **Project URL** (e.g., `https://xxxxx.supabase.co`)
   - **anon/public key** (starts with `eyJ...`)

### 3. Add Credentials to `.env.local`

Open `lifemax-app/.env.local` and add:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

### 4. Set Up the Database Schema

1. In Supabase dashboard, go to **SQL Editor**
2. Click "New query"
3. Copy and paste the contents of `supabase/migrations/002_calorie_tracker.sql`
4. Click "Run" to execute the SQL

### 5. (Optional) Enable Google OAuth

1. Go to **Authentication** → **Providers**
2. Enable "Google"
3. Add your Google OAuth credentials (from Google Cloud Console)

### 6. Restart Your Dev Server

```bash
# Stop the current server (Ctrl+C)
# Then restart:
cd lifemax-app
npm run dev
```

## Verify Setup

After adding the credentials, refresh your browser. The error should disappear and you should be able to:
- Sign up with email/password
- Sign in with Google (if configured)
- Use the tracker features

## Troubleshooting

**Error: "Unable to connect to authentication service"**
- Check that `.env.local` has the correct variable names (must start with `NEXT_PUBLIC_`)
- Make sure there are no extra spaces or quotes around the values
- Restart your dev server after adding env variables

**Error: "Invalid API key"**
- Double-check you copied the **anon/public key**, not the service role key
- Make sure the key starts with `eyJ` (JWT format)

**Database errors**
- Make sure you ran the SQL migration in Supabase SQL Editor
- Check that all tables were created successfully
