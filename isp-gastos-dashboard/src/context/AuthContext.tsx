import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabaseClient';
import type { Profile } from '../types';

interface AuthContextValue {
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  const ultimoUserId = useRef<string | null>(null);

  useEffect(() => {
    let activo = true;

    async function loadProfile() {
      if (!session?.user) {
        ultimoUserId.current = null;
        setProfile(null);
        setLoading(false);
        return;
      }

      // Supabase revalida la sesión (y dispara este efecto) cada vez que la
      // pestaña vuelve a estar activa. Si sigue siendo el mismo usuario, no
      // hace falta mostrar el loading de nuevo ni repetir el fetch.
      if (ultimoUserId.current === session.user.id) return;
      ultimoUserId.current = session.user.id;

      setLoading(true);
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', session.user.id)
        .eq('activo', true)
        .maybeSingle();
      if (activo) {
        setProfile(data as Profile | null);
        setLoading(false);
      }
    }

    loadProfile();
    return () => {
      activo = false;
    };
  }, [session]);

  async function signInWithGoogle() {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    });
  }

  async function signOut() {
    await supabase.auth.signOut();
  }

  return (
    <AuthContext.Provider value={{ session, profile, loading, signInWithGoogle, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return ctx;
}
