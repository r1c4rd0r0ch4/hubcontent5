import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, AuthError } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import type { Database } from '../lib/database.types';

type Json = any;

type Profile = Database['public']['Tables']['profiles']['Row'];
type AccountStatus = Database['public']['Enums']['account_status_enum'];

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signUp: (
    email: string,
    password: string,
    username: string,
    userType: 'user' | 'influencer',
    kycData?: {
      fullName: string;
      dateOfBirth: string; // YYYY-MM-DD
      address: Json; // { street: string, city: string, state: string, zip: string, country: string }
      documentType: string; // RG, CPF, CNH
      documentNumber: string;
    }
  ) => Promise<{ error: AuthError | null; data?: { user: User } }>; // Adicionado 'data' ao tipo de retorno
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<Profile>) => Promise<{ error: Error | null }>;
  isAdmin: boolean;
  isInfluencerPendingApproval: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) { // Corrigido o tipo da prop children
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isInfluencerPendingApproval, setIsInfluencerPendingApproval] = useState(false);

  // Função auxiliar para carregar o perfil e atualizar estados relacionados
  const loadProfileData = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error) throw error;
      setProfile(data);
      const userIsAdmin = data?.is_admin || false;
      setIsAdmin(userIsAdmin);
      setIsInfluencerPendingApproval(data?.user_type === 'influencer' && data?.account_status === 'pending');
      console.log(`[AuthContext] User ${data?.username} (ID: ${userId}) is admin: ${userIsAdmin}`);
    } catch (error) {
      console.error('Error loading profile:', error);
      setProfile(null); // Garante que o perfil seja nulo em caso de erro
      setIsAdmin(false);
      setIsInfluencerPendingApproval(false);
    }
  };

  useEffect(() => {
    // Verificação da sessão inicial
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      try {
        setUser(session?.user ?? null);
        if (session?.user) {
          await loadProfileData(session.user.id); // Aguarda o carregamento do perfil
        }
      } catch (error) {
        console.error("Error during initial session load:", error);
      } finally {
        setLoading(false); // Sempre define loading como false após a verificação inicial
      }
    });

    // Listener de mudança de estado de autenticação
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      (async () => {
        try {
          setUser(session?.user ?? null);
          if (session?.user) {
            await loadProfileData(session.user.id);
          } else {
            setProfile(null);
            setIsAdmin(false);
            setIsInfluencerPendingApproval(false);
          }
        } catch (error) {
          console.error("Error in onAuthStateChange handler:", error);
          setProfile(null);
          setIsAdmin(false);
          setIsInfluencerPendingApproval(false);
        } finally {
          setLoading(false); // Sempre define loading como false após a mudança de estado
        }
      })();
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (
    email: string,
    password: string,
    username: string,
    userType: 'user' | 'influencer',
    kycData?: {
      fullName: string;
      dateOfBirth: string;
      address: Json;
      documentType: string;
      documentNumber: string;
    }
  ) => {
    try {
      // Basic validation before Supabase calls
      if (!email || email.trim().length === 0) {
        return { error: new AuthError('Email não pode ser vazio.') };
      }
      if (!password || password.length < 6) { // Supabase requires min 6 chars
        return { error: new AuthError('A senha deve ter no mínimo 6 caracteres.') };
      }
      if (!username || username.trim().length === 0) {
        return { error: new AuthError('Nome de usuário não pode ser vazio.') };
      }

      if (userType === 'influencer' && !kycData) {
        return { error: new AuthError('Dados KYC são obrigatórios para influenciadores.') };
      }

      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
      });

      if (error) return { error };
      if (!data.user) return { error: new AuthError('Falha ao criar usuário.') };

      const profileInsert: Database['public']['Tables']['profiles']['Insert'] = {
        id: data.user.id,
        email: email.trim(),
        username: username.trim(),
        user_type: userType,
        is_active: true,
        account_status: userType === 'influencer' ? 'pending' : 'approved', // Influencers start as pending
      };

      if (userType === 'influencer' && kycData) {
        profileInsert.full_name = kycData.fullName;
        profileInsert.date_of_birth = kycData.dateOfBirth;
        profileInsert.address = kycData.address;
        profileInsert.document_type = kycData.documentType;
        profileInsert.document_number = kycData.documentNumber;
      }

      const { error: profileError } = await supabase
        .from('profiles')
        .insert(profileInsert);

      if (profileError) {
        // In a production app, you might want to delete the auth user here
        // if profile creation fails to prevent orphaned auth entries.
        return { error: new AuthError(profileError.message) };
      }

      if (userType === 'influencer') {
        const { error: influencerError } = await supabase
          .from('influencer_profiles')
          .insert({
            user_id: data.user.id,
            subscription_price: 0,
          });

        if (influencerError) {
          return { error: new AuthError(influencerError.message) };
        }
      }

      await loadProfileData(data.user.id); // Usa a nova função auxiliar
      return { error: null, data: { user: data.user } }; // Retorna os dados do usuário
    } catch (error) {
      return { error: error as AuthError };
    }
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
    setIsAdmin(false);
    setIsInfluencerPendingApproval(false);
  };

  const updateProfile = async (updates: Partial<Profile>) => {
    if (!user) return { error: new Error('No user logged in') };

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', user.id);

      if (error) throw error;

      await loadProfileData(user.id); // Usa a nova função auxiliar
      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, signUp, signIn, signOut, updateProfile, isAdmin, isInfluencerPendingApproval }}>
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
