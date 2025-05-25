import { useContext } from 'react';
import { AuthContext } from '@/contexts/AuthContext';
import { createClient } from '@/lib/supabase/client';

export function useAuth() {
  const context = useContext(AuthContext);
  const supabase = createClient();

  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      throw new Error(error.message);
    }
  };

  const signUp = async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      throw new Error(error.message);
    }
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      throw new Error(error.message);
    }
  };

  return {
    ...context,
    signIn,
    signUp,
    signOut,
  };
} 