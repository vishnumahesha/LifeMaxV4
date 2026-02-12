# Google OAuth Setup Guide

## Step-by-Step Setup

### Step 1: Create Google OAuth Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Sign in with your Google account
3. Create a new project (or select existing):
   - Click "Select a project" → "New Project"
   - Name: `LifeMAX` (or any name)
   - Click "Create"
4. Enable Google+ API:
   - Go to "APIs & Services" → "Library"
   - Search for "Google+ API"
   - Click "Enable"
5. Create OAuth credentials:
   - Go to "APIs & Services" → "Credentials"
   - Click "Create Credentials" → "OAuth client ID"
   - If prompted, configure OAuth consent screen:
     - User Type: "External" (or Internal if you have Google Workspace)
     - App name: `LifeMAX`
     - User support email: Your email
     - Developer contact: Your email
     - Click "Save and Continue"
     - Scopes: Click "Save and Continue" (default is fine)
     - Test users: Add your email, click "Save and Continue"
   - Application type: "Web application"
   - Name: `LifeMAX Web Client`
   - Authorized JavaScript origins:
     - Add: `http://localhost:3000`
     - Add: `https://ijufieiipczurizckdec.supabase.co` (your Supabase URL)
   - Authorized redirect URIs:
     - Add: `https://ijufieiipczurizckdec.supabase.co/auth/v1/callback`
     - (This is the Supabase callback URL - Supabase handles the OAuth flow)
   - Click "Create"
6. Copy your credentials:
   - **Client ID**: (starts with something like `123456789-abc...googleusercontent.com`)
   - **Client Secret**: (click "Show" to reveal it)

### Step 2: Configure in Supabase

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project (LifeMAX)
3. Go to **Authentication** → **Providers**
4. Find "Google" and click on it (or the arrow/icon)
5. Toggle "Enable Google provider" to **ON**
6. Enter your credentials:
   - **Client ID (for OAuth)**: Paste your Google Client ID
   - **Client Secret (for OAuth)**: Paste your Google Client Secret
7. Click "Save"

### Step 3: Test It

1. Go to http://localhost:3000/auth
2. Click "Continue with Google"
3. You should be redirected to Google to sign in
4. After signing in, you'll be redirected back to your app

## Troubleshooting

**"Redirect URI mismatch" error:**
- Make sure you added `https://ijufieiipczurizckdec.supabase.co/auth/v1/callback` to Authorized redirect URIs in Google Cloud Console

**"Invalid client" error:**
- Double-check your Client ID and Client Secret in Supabase
- Make sure there are no extra spaces

**Google sign-in button doesn't appear:**
- Make sure you've re-enabled it in the code (it was removed earlier)
