import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase, type Business, type Profile } from './lib';

interface AuthState {
  session: Session | null;
  profile: Profile | null;
  business: Business | null;
  loading: boolean;
  refresh: () => Promise<void>;
}

const Ctx = createContext<AuthState>({
  session: null,
  profile: null,
  business: null,
  loading: true,
  refresh: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [business, setBusiness] = useState<Business | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (s: Session | null) => {
    if (!s) {
      setProfile(null);
      setBusiness(null);
      setLoading(false);
      return;
    }
    const { data: p } = await supabase.from('profiles').select('*').eq('id', s.user.id).maybeSingle();
    setProfile((p as Profile) ?? null);
    if (p && p.role === 'business') {
      const { data: b } = await supabase.from('businesses').select('*').eq('owner_id', s.user.id).maybeSingle();
      setBusiness((b as Business) ?? null);
    } else {
      setBusiness(null);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      load(data.session);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_evt, s) => {
      setSession(s);
      setTimeout(() => load(s), 0);
    });
    return () => sub.subscription.unsubscribe();
  }, [load]);

  const refresh = useCallback(async () => {
    const { data } = await supabase.auth.getSession();
    await load(data.session);
  }, [load]);

  return <Ctx.Provider value={{ session, profile, business, loading, refresh }}>{children}</Ctx.Provider>;
}

export const useAuth = () => useContext(Ctx);
