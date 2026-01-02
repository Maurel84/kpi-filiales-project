/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import type { Database } from '../lib/database.types';

type UserProfile = Database['public']['Tables']['users_profiles']['Row'];

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  loading: boolean;
  profileLoading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, userData: {
    prenom: string;
    nom: string;
    filiale_id?: string;
    role: UserProfile['role'];
    poste?: string;
    actif?: boolean;
  }) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);

  const getGeoSnapshot = async () => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      return null;
    }
    if (navigator.permissions?.query) {
      try {
        const status = await navigator.permissions.query({ name: 'geolocation' as PermissionName });
        if (status.state !== 'granted') {
          return null;
        }
      } catch {
        return null;
      }
    } else {
      return null;
    }

    return new Promise<{ lat: number; lon: number; accuracy: number } | null>((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          resolve({
            lat: pos.coords.latitude,
            lon: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
          });
        },
        () => resolve(null),
        { enableHighAccuracy: false, timeout: 2000, maximumAge: 600000 }
      );
    });
  };

  const logAuthEvent = async (event: 'signed_in' | 'signed_out', userId: string | null) => {
    if (!userId) return;
    if (typeof window !== 'undefined') {
      try {
        const key = `auth_event_${userId}`;
        const raw = window.sessionStorage.getItem(key);
        if (raw) {
          const last = JSON.parse(raw) as { event: string; at: number; userAgent: string };
          if (
            last.event === event &&
            last.userAgent === navigator.userAgent &&
            Date.now() - last.at < 30000
          ) {
            return;
          }
        }
        window.sessionStorage.setItem(
          key,
          JSON.stringify({ event, at: Date.now(), userAgent: navigator.userAgent })
        );
      } catch {
        // Ignore session storage errors.
      }
    }
    try {
      const timeZone = typeof Intl !== 'undefined' ? Intl.DateTimeFormat().resolvedOptions().timeZone : null;
      const locale = typeof navigator !== 'undefined' ? navigator.language : null;
      const geo = await getGeoSnapshot();
      await supabase.from('auth_events').insert({
        user_id: userId,
        event,
        user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
        ip_address: null,
        time_zone: timeZone,
        locale,
        geo_lat: geo?.lat ?? null,
        geo_lon: geo?.lon ?? null,
        geo_accuracy: geo?.accuracy ?? null,
      });
    } catch {
      // Ignore audit errors to avoid blocking auth.
    }
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      (async () => {
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          setProfileLoading(true);
          await loadProfile(session.user.id);
          setProfileLoading(false);
        }
        setLoading(false);
      })();
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      (async () => {
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          setProfileLoading(true);
          if (event === 'SIGNED_IN') {
            void logAuthEvent('signed_in', session.user.id);
          }
          await loadProfile(session.user.id);
          setProfileLoading(false);
        } else {
          setProfile(null);
          setProfileLoading(false);
        }
      })();
    });

    return () => subscription.unsubscribe();
  }, []);

  const loadProfile = async (userId: string) => {
    setProfileLoading(true);
    const { data, error } = await supabase
      .from('users_profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (!error && data) {
      setProfile(data as UserProfile);
    }
    setProfileLoading(false);
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  const signUp = async (email: string, password: string, userData: {
    prenom: string;
    nom: string;
    filiale_id?: string;
    role: UserProfile['role'];
    poste?: string;
    actif?: boolean;
  }) => {
    if (profile?.role !== 'admin_siege') {
      return { error: new Error('Création de comptes réservée à l\'administrateur siège.') };
    }

    const adminSession = session;

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (authError) {
      if (adminSession?.access_token && adminSession.refresh_token) {
        await supabase.auth.setSession({
          access_token: adminSession.access_token,
          refresh_token: adminSession.refresh_token,
        });
      }
      return { error: authError };
    }

    if (authData.user) {
      const { error: profileError } = await supabase
        .from('users_profiles')
        .insert({
          id: authData.user.id,
          email,
          prenom: userData.prenom,
          nom: userData.nom,
          filiale_id: userData.filiale_id || null,
          role: userData.role,
          poste: userData.poste || null,
          actif: userData.actif ?? true,
        });

      if (profileError) {
        if (adminSession?.access_token && adminSession.refresh_token) {
          await supabase.auth.setSession({
            access_token: adminSession.access_token,
            refresh_token: adminSession.refresh_token,
          });
        }
        return { error: profileError };
      }
    }

    if (adminSession?.access_token && adminSession.refresh_token) {
      await supabase.auth.setSession({
        access_token: adminSession.access_token,
        refresh_token: adminSession.refresh_token,
      });
      if (adminSession.user?.id) {
        await loadProfile(adminSession.user.id);
      }
    }

    return { error: null };
  };

  const signOut = async () => {
    await logAuthEvent('signed_out', user?.id ?? null);
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
  };

  return (
    <AuthContext.Provider value={{ user, session, profile, loading, profileLoading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
