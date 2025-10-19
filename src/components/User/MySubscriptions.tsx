import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { Calendar, DollarSign } from 'lucide-react';

interface SubscriptionWithInfluencer {
  id: string;
  // Este influencer_id é o profiles.id do influencer, extraído da junção
  influencer_id: string;
  status: string;
  price_paid: number;
  started_at: string;
  expires_at: string;
  profiles: { // Este é o objeto de perfil do influencer
    id: string;
    username: string;
    full_name: string | null;
    avatar_url: string | null;
  };
}

interface MySubscriptionsProps {
  onViewProfile?: (influencerId: string) => void;
}

export function MySubscriptions({ onViewProfile }: MySubscriptionsProps = {}) {
  const { profile } = useAuth();
  const [subscriptions, setSubscriptions] = useState<SubscriptionWithInfluencer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSubscriptions();
  }, [profile]);

  const loadSubscriptions = async () => {
    if (!profile) {
      setLoading(false);
      return;
    }

    console.log('MySubscriptions: Loading subscriptions for subscriber_id:', profile.id);

    const { data, error } = await supabase
      .from('subscriptions')
      .select(`
        *,
        influencer_profiles!subscriptions_influencer_id_fkey(
          profiles(
            id,
            username,
            full_name,
            avatar_url
          )
        )
      `)
      .eq('subscriber_id', profile.id)
      .order('created_at', { ascending: false });

    if (!error && data) {
      console.log('MySubscriptions: Subscriptions data fetched:', data);
      // Mapeia os dados para achatar o objeto de perfil aninhado para fácil acesso no JSX
      const mappedData: SubscriptionWithInfluencer[] = data.map((sub: any) => ({
        ...sub,
        // Extrai o profiles.id para ser o influencer_id para navegação
        influencer_id: sub.influencer_profiles?.profiles?.id,
        // Achata o objeto de perfil para ser diretamente acessível como 'profiles'
        profiles: sub.influencer_profiles?.profiles,
      })).filter(sub => sub.profiles !== null); // Filtra assinaturas sem perfil de influencer válido

      setSubscriptions(mappedData);
    } else if (error) {
      console.error('MySubscriptions: Erro ao carregar assinaturas:', error.message);
      setSubscriptions([]); // Garante que o estado seja limpo em caso de erro
    }
    setLoading(false);
  };

  const cancelSubscription = async (subscriptionId: string) => {
    if (!confirm('Tem certeza que deseja cancelar esta assinatura?')) return;

    const { error } = await supabase
      .from('subscriptions')
      .update({ status: 'cancelled' })
      .eq('id', subscriptionId);

    if (!error) {
      loadSubscriptions();
    } else {
      console.error('Erro ao cancelar assinatura:', error.message);
    }
  };

  if (loading) {
    return <div className="text-center py-12 text-text">Carregando assinaturas...</div>;
  }

  const activeSubscriptions = subscriptions.filter(s => s.status === 'active');
  const inactiveSubscriptions = subscriptions.filter(s => s.status !== 'active');

  return (
    <div>
      <h2 className="text-2xl font-bold text-text mb-6">Minhas Assinaturas</h2>

      {activeSubscriptions.length === 0 && inactiveSubscriptions.length === 0 ? (
        <div className="text-center py-12 bg-surface rounded-xl border border-border shadow-lg">
          <h3 className="text-xl font-semibold text-text mb-2">Nenhuma assinatura ainda</h3>
          <p className="text-textSecondary">Explore influencers e assine para acessar conteúdo exclusivo</p>
        </div>
      ) : (
        <>
          {activeSubscriptions.length > 0 && (
            <div className="mb-8">
              <h3 className="text-lg font-semibold text-text mb-4">Ativas</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {activeSubscriptions.map((sub) => (
                  <div
                    key={sub.id}
                    className="bg-surface rounded-xl shadow-md p-6 hover:shadow-lg transition-shadow cursor-pointer border border-border"
                    onClick={() => onViewProfile?.(sub.influencer_id)}
                  >
                    <div className="flex items-start gap-4">
                      {sub.profiles.avatar_url ? (
                        <img
                          src={sub.profiles.avatar_url}
                          alt={sub.profiles.username}
                          className="w-16 h-16 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center">
                          <span className="text-primary font-semibold text-xl">
                            {sub.profiles.username[0].toUpperCase()}
                          </span>
                        </div>
                      )}
                      <div className="flex-1">
                        <h4 className="font-semibold text-text mb-1">
                          {sub.profiles.full_name || `@${sub.profiles.username}`}
                        </h4>
                        <p className="text-sm text-textSecondary mb-3">@{sub.profiles.username}</p>

                        <div className="space-y-2 text-sm text-textSecondary">
                          <div className="flex items-center gap-2">
                            <DollarSign className="w-4 h-4 text-success" />
                            <span>R$ {sub.price_paid?.toFixed(2) || '0.00'}/mês</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-accent" />
                            <span>Expira em {new Date(sub.expires_at!).toLocaleDateString('pt-BR')}</span>
                          </div>
                        </div>

                        <button
                          onClick={(e) => {
                            e.stopPropagation(); // Evita que o clique no botão acione o onViewProfile do card
                            cancelSubscription(sub.id);
                          }}
                          className="mt-4 text-sm text-error hover:text-error/80 font-medium transition-colors"
                        >
                          Cancelar assinatura
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {inactiveSubscriptions.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-text mb-4">Inativas</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {inactiveSubscriptions.map((sub) => (
                  <div
                    key={sub.id}
                    className="bg-surface/50 rounded-xl shadow-md p-6 opacity-75 cursor-pointer hover:opacity-100 transition-opacity border border-border"
                    onClick={() => onViewProfile?.(sub.influencer_id)}
                  >
                    <div className="flex items-start gap-4">
                      {sub.profiles.avatar_url ? (
                        <img
                          src={sub.profiles.avatar_url}
                          alt={sub.profiles.username}
                          className="w-16 h-16 rounded-full object-cover grayscale"
                        />
                      ) : (
                        <div className="w-16 h-16 rounded-full bg-background flex items-center justify-center">
                          <span className="text-textSecondary font-semibold text-xl">
                            {sub.profiles.username[0].toUpperCase()}
                          </span>
                        </div>
                      )}
                      <div className="flex-1">
                        <h4 className="font-semibold text-text mb-1">
                          {sub.profiles.full_name || `@${sub.profiles.username}`}
                        </h4>
                        <p className="text-sm text-textSecondary mb-2">@{sub.profiles.username}</p>
                        <span className="inline-block px-3 py-1 bg-border text-textSecondary text-xs font-semibold rounded-full">
                          {sub.status === 'cancelled' ? 'Cancelada' : 'Expirada'}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
