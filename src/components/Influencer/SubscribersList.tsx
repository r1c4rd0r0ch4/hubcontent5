import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { Ban, MessageSquare, Calendar } from 'lucide-react';

interface SubscriberWithProfile {
  id: string;
  subscriber_id: string;
  status: string;
  price_paid: number;
  started_at: string;
  expires_at: string;
  profiles: {
    username: string;
    avatar_url: string | null;
    email: string;
  };
}

export function SubscribersList({ onOpenChat }: { onOpenChat?: (userId: string) => void }) {
  const { profile } = useAuth();
  const [subscribers, setSubscribers] = useState<SubscriberWithProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSubscribers();
  }, [profile]);

  const loadSubscribers = async () => {
    if (!profile) return;

    const { data, error } = await supabase
      .from('subscriptions')
      .select(`
        *,
        profiles:subscriber_id (
          username,
          avatar_url,
          email
        )
      `)
      .eq('influencer_id', profile.id)
      .eq('status', 'active')
      .order('started_at', { ascending: false });

    if (!error && data) {
      setSubscribers(data as any);
    }
    setLoading(false);
  };

  const blockUser = async (subscriberId: string) => {
    if (!profile || !confirm('Tem certeza que deseja bloquear este usuário?')) return;

    const { error } = await supabase.from('blocked_users').insert({
      influencer_id: profile.id,
      blocked_user_id: subscriberId,
      reason: 'Bloqueado pelo influencer',
    });

    if (!error) {
      alert('Usuário bloqueado com sucesso');
      loadSubscribers();
    } else {
      alert('Erro ao bloquear usuário');
    }
  };

  if (loading) {
    return <div className="text-center py-12">Carregando...</div>;
  }

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Meus Assinantes</h2>

      {subscribers.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg">
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Nenhum assinante ainda</h3>
          <p className="text-gray-600">Compartilhe seu perfil para atrair assinantes</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Assinante
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Valor Pago
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Data de Início
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Expira em
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {subscribers.map((sub) => (
                  <tr key={sub.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          {sub.profiles.avatar_url ? (
                            <img
                              className="h-10 w-10 rounded-full object-cover"
                              src={sub.profiles.avatar_url}
                              alt={sub.profiles.username}
                            />
                          ) : (
                            <div className="h-10 w-10 rounded-full bg-pink-100 flex items-center justify-center">
                              <span className="text-pink-600 font-semibold">
                                {sub.profiles.username[0].toUpperCase()}
                              </span>
                            </div>
                          )}
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">@{sub.profiles.username}</div>
                          <div className="text-sm text-gray-500">{sub.profiles.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-semibold text-green-600">
                        R$ {sub.price_paid.toFixed(2)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {new Date(sub.started_at).toLocaleDateString('pt-BR')}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(sub.expires_at).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex gap-2">
                        <button
                          onClick={() => onOpenChat && onOpenChat(sub.subscriber_id)}
                          className="text-pink-600 hover:text-pink-900 flex items-center gap-1"
                          title="Enviar mensagem"
                        >
                          <MessageSquare className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => blockUser(sub.subscriber_id)}
                          className="text-red-600 hover:text-red-900 flex items-center gap-1"
                          title="Bloquear usuário"
                        >
                          <Ban className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
