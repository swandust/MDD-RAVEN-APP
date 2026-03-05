import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { createClient, type User } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
export const supabase = createClient(supabaseUrl, supabaseKey);

type AuthContextValue = {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ data: unknown; error: { message: string } | null }>;
  signUp: (email: string, password: string, username?: string, fullName?: string) => Promise<{ data: unknown; error: { message: string } | null }>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    supabase.auth.getUser().then(({ data }) => {
      if (!isMounted) return;
      setUser(data.user ?? null);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!isMounted) return;
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const value = useMemo<AuthContextValue>(() => ({
    user,
    loading,
    signIn: async (email, password) => {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      return { data, error: error ? { message: error.message } : null };
    },
    signUp: async (email, password, username, fullName) => {
      const metadata: Record<string, string> = {};
      if (username) metadata.username = username;
      if (fullName) metadata.full_name = fullName;

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: Object.keys(metadata).length > 0 ? { data: metadata } : undefined,
      });
      return { data, error: error ? { message: error.message } : null };
    },
    signOut: async () => {
      await supabase.auth.signOut();
    },
  }), [user, loading]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
