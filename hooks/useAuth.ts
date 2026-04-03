import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';

/**
 * Bootstraps and subscribes to Supabase auth state.
 * Call once at the root layout. All other components read from useAuthStore.
 */
export function useAuth() {
  const { setSession, setLoading } = useAuthStore();

  useEffect(() => {
    // Restore persisted session on mount
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    // Subscribe to future auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        setLoading(false);
      },
    );

    return () => subscription.unsubscribe();
  }, []);
}
