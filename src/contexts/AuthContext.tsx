import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { Session, User } from '@supabase/supabase-js';
import { Database } from '../lib/database.types';

type Profile = Database['public']['Tables']['profiles']['Row'];

interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ user: User | null; error: Error | null }>;
  signUp: (email: string, password: string, fullName: string, username: string) => Promise<{ user: User | null; error: Error | null }>;
  signOut: () => Promise<{ error: Error | null }>;
  isInfluencerPendingApproval: boolean;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isInfluencerPendingApproval, setIsInfluencerPendingApproval] = useState(false);

  const fetchUserProfile = useCallback(async (userId: string) => {
    console.log('[AuthContext] Fetching profile for user:', userId);
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('[AuthContext] Error fetching profile:', error);
      setProfile(null);
      setIsInfluencerPendingApproval(false);
      return null;
    }
    console.log('[AuthContext] Profile fetched successfully:', data);
    setProfile(data);
    setIsInfluencerPendingApproval(data.is_influencer && data.account_status === 'pending');
    return data;
  }, []);

  useEffect(() => {
    console.log('[AuthContext] useEffect: Initializing auth listener and session check.');
    const { data: authListener } = supabase.auth.onAuthStateChange(async (_event, session) => {
      console.log(`[AuthContext] onAuthStateChange event: ${_event}, Session: ${session ? 'present' : 'null'}`);
      setSession(session);
      setUser(session?.user || null);
      if (session?.user) {
        await fetchUserProfile(session.user.id);
      } else {
        setProfile(null);
        setIsInfluencerPendingApproval(false);
      }
      setLoading(false);
      console.log('[AuthContext] onAuthStateChange: Loading set to false.');
    });

    // Initial session check
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      console.log(`[AuthContext] getSession result: ${session ? 'present' : 'null'}`);
      setSession(session);
      setUser(session?.user || null);
      if (session?.user) {
        await fetchUserProfile(session.user.id);
      }
      setLoading(false);
      console.log('[AuthContext] getSession: Loading set to false.');
    }).catch(error => {
      console.error('[AuthContext] Error during initial getSession:', error);
      setLoading(false); // Ensure loading is set to false even on error
    });

    return () => {
      console.log('[AuthContext] Unsubscribing auth listener.');
      authListener.subscription.unsubscribe();
    };
  }, [fetchUserProfile]);

  const logUserLogin = async (userId: string, userEmail: string) => {
    try {
      const ipResponse = await fetch('https://api.ipify.org?format=json');
      const ipData = await ipResponse.json();
      const ipAddress = ipData.ip || 'Unknown';
      const userAgent = navigator.userAgent;

      const { error: logError } = await supabase.from('user_login_logs').insert({
        user_id: userId,
        email: userEmail,
        ip_address: ipAddress,
        user_agent: userAgent,
      });

      if (logError) {
        console.error('[AuthContext] Error logging user login:', logError);
      } else {
        console.log('[AuthContext] User login logged successfully.');
      }
    } catch (logErr) {
      console.error('[AuthContext] Failed to get IP or log login:', logErr);
    }
  };

  const signIn = async (email: string, password: string) => {
    setLoading(true);
    console.log('[AuthContext] Attempting sign in...');
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);

    if (error) {
      console.error('[AuthContext] Sign in error:', error);
      return { user: null, error };
    }

    if (data.user) {
      console.log('[AuthContext] User signed in:', data.user.id);
      await logUserLogin(data.user.id, data.user.email!);
      await fetchUserProfile(data.user.id); // Refresh profile after login
    }

    return { user: data.user, error: null };
  };

  const signUp = async (email: string, password: string, fullName: string, username: string) => {
    setLoading(true);
    console.log('[AuthContext] Attempting sign up...');
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          username: username,
        },
      },
    });
    setLoading(false);

    if (error) {
      console.error('[AuthContext] Sign up error:', error);
      return { user: null, error };
    }

    if (data.user) {
      console.log('[AuthContext] User signed up:', data.user.id);
      const { error: profileError } = await supabase.from('profiles').insert({
        id: data.user.id,
        email: data.user.email!,
        full_name: fullName,
        username: username,
        is_admin: false,
        is_influencer: false,
        account_status: 'active',
      });

      if (profileError) {
        console.error('[AuthContext] Error creating profile after signup:', profileError);
        return { user: null, error: profileError };
      }
      console.log('[AuthContext] Profile created after signup.');
      await logUserLogin(data.user.id, data.user.email!);
      await fetchUserProfile(data.user.id);
    }

    return { user: data.user, error: null };
  };

  const signOut = async () => {
    setLoading(true);
    console.log('[AuthContext] Attempting sign out...');
    const { error } = await supabase.auth.signOut();
    setLoading(false);
    if (!error) {
      console.log('[AuthContext] User signed out.');
      setSession(null);
      setUser(null);
      setProfile(null);
      setIsInfluencerPendingApproval(false);
    } else {
      console.error('[AuthContext] Sign out error:', error);
    }
    return { error };
  };

  const value = {
    session,
    user,
    profile,
    loading,
    signIn,
    signUp,
    signOut,
    isInfluencerPendingApproval,
    isAdmin: profile?.is_admin || false,
  };

  console.log('[AuthContext] Provider rendering. Current states: Loading:', loading, 'User:', !!user, 'Profile:', !!profile);

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
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
