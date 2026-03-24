'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Navigation } from './Navigation';
import { PageTransition } from './PageTransition';
import { createClient } from '@/lib/supabase/client';
import type { User } from '@supabase/supabase-js';

interface AppShellProps {
  children: React.ReactNode;
  requireAuth?: boolean;
}

export function AppShell({ children, requireAuth = false }: AppShellProps) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    // Handle missing Supabase configuration
    if (!supabase) {
      console.warn('Supabase client not available - auth features disabled');
      setLoading(false);
      // If auth is required but Supabase is not configured, show error
      if (requireAuth) {
        console.error('Authentication required but Supabase is not configured');
      }
      return;
    }

    const getUser = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        setUser(user);
        setLoading(false);

        if (requireAuth && !user) {
          router.push('/auth');
        }
      } catch (error) {
        console.error('Error getting user:', error);
        setLoading(false);
      }
    };

    getUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null);
        if (requireAuth && !session?.user) {
          router.push('/auth');
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [requireAuth, router, supabase]);

  const handleSignOut = async () => {
    if (!supabase) {
      console.warn('Cannot sign out - Supabase client not available');
      return;
    }
    await supabase.auth.signOut();
    router.push('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation
        user={user ? { email: user.email || '' } : null}
        onSignOut={handleSignOut}
      />
      <main className="pt-16">
        <PageTransition>
          {children}
        </PageTransition>
      </main>
    </div>
  );
}
