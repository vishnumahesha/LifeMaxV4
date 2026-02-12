'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { Sparkles, Mail, Lock, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardContent } from '@/components/ui/Card';
import { createClient } from '@/lib/supabase/client';

type AuthMode = 'signin' | 'signup';

export default function AuthContent() {
  const [mode, setMode] = useState<AuthMode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!supabase) {
      toast.error('Supabase is not configured. Please set up your Supabase credentials in .env.local', {
        duration: 8000,
      });
      return;
    }
    
    // Check if Supabase URL is still a placeholder
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    if (supabaseUrl.includes('your-project') || supabaseUrl.includes('placeholder')) {
      toast.error('Please update your Supabase credentials in .env.local with your real project URL and key. See SETUP_SUPABASE_NOW.md for instructions.', {
        duration: 10000,
      });
      return;
    }
    
    setLoading(true);

    try {
      if (mode === 'signup') {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback`,
          },
        });

        if (error) throw error;

        // Check if user is automatically signed in (email confirmation may be disabled)
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          // User is automatically signed in
          toast.success('Account created! Welcome to LifeMAX!');
          router.push('/face');
        } else {
          // Email confirmation required
          toast.success('Account created! Please check your email to confirm your account.', {
            duration: 8000,
          });
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;

        toast.success('Welcome back!');
        router.push('/face');
      }
    } catch (error: any) {
      let message = 'Something went wrong';
      
      // Handle Supabase error objects
      if (error?.msg || error?.message) {
        const errorMsg = error.msg || error.message || '';
        
        // Handle provider not enabled error
        if (errorMsg.includes('provider is not enabled') || errorMsg.includes('Unsupported provider') || error?.error_code === 'validation_failed') {
          message = 'Email authentication is not enabled in your Supabase project.\n\nTo fix this:\n1. Go to https://supabase.com/dashboard\n2. Select your project\n3. Go to Authentication → Providers\n4. Enable "Email" provider\n5. Click "Save changes"';
        }
        // Handle network/Supabase configuration errors
        else if (errorMsg.includes('Failed to fetch') || errorMsg.includes('NetworkError')) {
          if (supabaseUrl.includes('your-project') || supabaseUrl.includes('placeholder')) {
            message = 'Supabase is not configured. Please update .env.local with your real Supabase credentials. See SETUP_SUPABASE_NOW.md';
          } else {
            message = 'Unable to connect to Supabase. Check: 1) Your Supabase project is active, 2) Your credentials are correct, 3) Your internet connection.';
          }
        } else {
          message = errorMsg;
        }
      } else if (error instanceof Error) {
        message = error.message;
      }
      
      toast.error(message, {
        duration: 12000,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    if (!supabase) {
      toast.error('Authentication is not configured. Please set up Supabase.');
      return;
    }
    
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) throw error;
      // User will be redirected to Google, then back to /auth/callback
    } catch (error: any) {
      let message = 'Something went wrong';
      if (error instanceof Error) {
        message = error.message;
        // Handle provider not enabled error
        if (error.message.includes('provider is not enabled') || error.message.includes('Unsupported provider')) {
          message = 'Google sign-in is not enabled. Please enable it in Supabase Dashboard → Authentication → Providers → Google. See GOOGLE_OAUTH_SETUP.md for instructions.';
        }
        // Handle network/Supabase configuration errors
        else if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
          message = 'Unable to connect to authentication service. Please check your internet connection and ensure Supabase is configured.';
        }
      }
      toast.error(message, {
        duration: 10000,
      });
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="p-4">
        <Link 
          href="/" 
          className="inline-flex items-center gap-2 text-foreground-muted hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </Link>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-sm"
        >
          {/* Logo */}
          <div className="flex flex-col items-center mb-8">
            <div className="w-12 h-12 rounded-xl bg-accent flex items-center justify-center shadow-[var(--glow-md)] mb-4">
              <Sparkles className="w-7 h-7 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">
              {mode === 'signin' ? 'Welcome Back' : 'Create Account'}
            </h1>
            <p className="text-foreground-muted mt-1">
              {mode === 'signin' 
                ? 'Sign in to continue your journey' 
                : 'Start maximizing your potential'}
            </p>
          </div>

          <Card>
            <CardContent className="pt-6">
              {/* Google Sign In */}
              <Button
                variant="secondary"
                className="w-full mb-4"
                onClick={handleGoogleSignIn}
                loading={loading}
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path
                    fill="currentColor"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="currentColor"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                Continue with Google
              </Button>

              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background-secondary px-2 text-foreground-muted">
                    Or continue with
                  </span>
                </div>
              </div>

              {/* Email Form */}
              <form onSubmit={handleSubmit} className="space-y-4">
                <Input
                  type="email"
                  label="Email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
                <Input
                  type="password"
                  label="Password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  hint={mode === 'signup' ? 'At least 6 characters' : undefined}
                />
                <Button type="submit" className="w-full" loading={loading}>
                  {mode === 'signin' ? (
                    <>
                      <Mail className="w-4 h-4" />
                      Sign In
                    </>
                  ) : (
                    <>
                      <Lock className="w-4 h-4" />
                      Create Account
                    </>
                  )}
                </Button>
              </form>

              {/* Toggle Mode */}
              <p className="mt-6 text-center text-sm text-foreground-muted">
                {mode === 'signin' ? (
                  <>
                    Don&apos;t have an account?{' '}
                    <button
                      onClick={() => setMode('signup')}
                      className="text-accent hover:underline font-medium"
                    >
                      Sign up
                    </button>
                  </>
                ) : (
                  <>
                    Already have an account?{' '}
                    <button
                      onClick={() => setMode('signin')}
                      className="text-accent hover:underline font-medium"
                    >
                      Sign in
                    </button>
                  </>
                )}
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </main>
    </div>
  );
}
