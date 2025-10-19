import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { Video, Clock, Calendar, DollarSign, Play, AlertCircle } from 'lucide-react';

interface Booking {
  id: string;
  influencer_id: string;
  duration_minutes: number;
  price_paid: number;
  scheduled_date: string;
  scheduled_time: string;
  status: string;
  rejection_reason: string | null;
  created_at: string;
  influencer: {
    username: string;
    full_name: string | null;
    avatar_url: string | null;
  };
}

export function MyStreamings({ onJoinStream }: { onJoinStream?: (bookingId: string) => void }) {
  const { profile } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadBookings();

    // Subscribe to real-time updates
    const channel = supabase
      .channel('my_streaming_bookings')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'streaming_bookings',
          filter: `subscriber_id=eq.${profile?.id}`,
        },
        () => {
          loadBookings();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile]);

  const loadBookings = async () => {
    if (!profile) return;

    const { data, error } = await supabase
      .from('streaming_bookings')
      .select(`
        *,
        influencer:influencer_id (
          username,
          full_name,
          avatar_url
        )
      `)
      .eq('subscriber_id', profile.id)
      .order('scheduled_date', { ascending: false })
      .order('scheduled_time', { ascending: false });

    if (!error && data) {
      setBookings(data as any);
    }
    setLoading(false);
  };

  const getTimeUntilStream = (booking: Booking) => {
    const now = new Date();
    const streamDate = new Date(`${booking.scheduled_date}T${booking.scheduled_time}`);
    const diff = streamDate.getTime() - now.getTime();

    if (diff < 0) return null;

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  const canJoinStream = (booking: Booking) => {
    if (booking.status !== 'approved') return false;

    const now = new Date();
    const streamDate = new Date(`${booking.scheduled_date}T${booking.scheduled_time}`);
    const diff = streamDate.getTime() - now.getTime();

    // Can join 5 minutes before until duration ends
    return diff <= 5 * 60 * 1000 && diff >= -(booking.duration_minutes * 60 * 1000);
  };

  const getStatusBadge = (status: string) => {
    const badges = {
      pending: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Aguardando' },
      approved: { bg: 'bg-green-100', text: 'text-green-800', label: 'Aprovado' },
      rejected: { bg: 'bg-red-100', text: 'text-red-800', label: 'Rejeitado' },
      completed: { bg: 'bg-gray-100', text: 'text-gray-800', label: 'Concluído' },
      cancelled: { bg: 'bg-gray-100', text: 'text-gray-600', label: 'Cancelado' },
    };
    const badge = badges[status as keyof typeof badges] || badges.pending;
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${badge.bg} ${badge.text}`}>
        {badge.label}
      </span>
    );
  };

  if (loading) {
    return <div className="text-center py-12">Carregando...</div>;
  }

  const upcomingBookings = bookings.filter(b => b.status === 'approved' && getTimeUntilStream(b));
  const pendingBookings = bookings.filter(b => b.status === 'pending');
  const pastBookings = bookings.filter(b => !['pending', 'approved'].includes(b.status) || (b.status === 'approved' && !getTimeUntilStream(b)));

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Minhas Sessões de Streaming</h2>

      {upcomingBookings.length > 0 && (
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Próximas Sessões</h3>
          <div className="space-y-4">
            {upcomingBookings.map((booking) => {
              const timeUntil = getTimeUntilStream(booking);
              const canJoin = canJoinStream(booking);

              return (
                <div
                  key={booking.id}
                  className="bg-white rounded-lg shadow-md p-6 border-l-4 border-green-400"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4 flex-1">
                      {booking.influencer.avatar_url ? (
                        <img
                          src={booking.influencer.avatar_url}
                          alt={booking.influencer.username}
                          className="w-16 h-16 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-16 h-16 rounded-full bg-pink-100 flex items-center justify-center">
                          <span className="text-pink-600 font-semibold text-xl">
                            {booking.influencer.username[0].toUpperCase()}
                          </span>
                        </div>
                      )}
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-900 text-lg mb-1">
                          {booking.influencer.full_name || `@${booking.influencer.username}`}
                        </h4>

                        <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 mb-3">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            {new Date(booking.scheduled_date).toLocaleDateString('pt-BR')}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            {booking.scheduled_time.slice(0, 5)} ({booking.duration_minutes} min)
                          </span>
                        </div>

                        {timeUntil && (
                          <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-50 border border-blue-200 rounded-lg text-sm">
                            <Clock className="w-4 h-4 text-blue-600" />
                            <span className="text-blue-800 font-semibold">
                              Começa em {timeUntil}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {canJoin && onJoinStream && (
                      <button
                        onClick={() => onJoinStream(booking.id)}
                        className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-pink-600 to-purple-600 text-white rounded-lg hover:from-pink-700 hover:to-purple-700 transition-all font-semibold shadow-lg"
                      >
                        <Play className="w-5 h-5" />
                        Entrar na Transmissão
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {pendingBookings.length > 0 && (
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Aguardando Aprovação ({pendingBookings.length})
          </h3>
          <div className="space-y-4">
            {pendingBookings.map((booking) => (
              <div
                key={booking.id}
                className="bg-white rounded-lg shadow-md p-6 border-l-4 border-yellow-400"
              >
                <div className="flex items-start gap-4">
                  {booking.influencer.avatar_url ? (
                    <img
                      src={booking.influencer.avatar_url}
                      alt={booking.influencer.username}
                      className="w-12 h-12 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-pink-100 flex items-center justify-center">
                      <span className="text-pink-600 font-semibold">
                        {booking.influencer.username[0].toUpperCase()}
                      </span>
                    </div>
                  )}
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-900">
                      {booking.influencer.full_name || `@${booking.influencer.username}`}
                    </h4>
                    <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600 mt-2">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {new Date(booking.scheduled_date).toLocaleDateString('pt-BR')} às{' '}
                        {booking.scheduled_time.slice(0, 5)}
                      </span>
                      <span>•</span>
                      <span>{booking.duration_minutes} minutos</span>
                      <span>•</span>
                      {getStatusBadge(booking.status)}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {pastBookings.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Histórico</h3>
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Influencer</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Data</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Duração</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Valor</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {pastBookings.map((booking) => (
                    <tr key={booking.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {booking.influencer.full_name || `@${booking.influencer.username}`}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {new Date(booking.scheduled_date).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {booking.duration_minutes} min
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                        R$ {booking.price_paid.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(booking.status)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {bookings.length === 0 && (
        <div className="text-center py-12 bg-white rounded-lg">
          <Video className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Nenhuma sessão ainda</h3>
          <p className="text-gray-600">
            Reserve uma sessão de streaming privada com seus influencers favoritos
          </p>
        </div>
      )}
    </div>
  );
}
