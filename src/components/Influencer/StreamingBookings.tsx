import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext'; // CORRIGIDO: Caminho de importação
import { supabase } from '../../lib/supabase';
import { Video, Check, X, Clock, Calendar, DollarSign, Play } from 'lucide-react';

interface Booking {
  id: string;
  subscriber_id: string;
  duration_minutes: number;
  price_paid: number;
  influencer_earnings: number;
  scheduled_date: string;
  scheduled_time: string;
  status: string;
  rejection_reason: string | null;
  created_at: string;
  profiles: {
    username: string;
    full_name: string | null;
    avatar_url: string | null;
  };
}

export function StreamingBookings({ onStartStream }: { onStartStream?: (bookingId: string) => void }) {
  const { profile } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [selectedBooking, setSelectedBooking] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadBookings();

    // Subscribe to real-time updates
    const channel = supabase
      .channel('streaming_bookings_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'streaming_bookings',
          filter: `influencer_id=eq.${profile?.id}`,
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
        profiles:subscriber_id (
          username,
          full_name,
          avatar_url
        )
      `)
      .eq('influencer_id', profile.id)
      .order('scheduled_date', { ascending: true })
      .order('scheduled_time', { ascending: true });

    if (!error && data) {
      setBookings(data as any);
    }
    setLoading(false);
  };

  const handleApprove = async (bookingId: string) => {
    const booking = bookings.find(b => b.id === bookingId);
    if (!booking) return;

    const { error } = await supabase
      .from('streaming_bookings')
      .update({ status: 'approved' })
      .eq('id', bookingId);

    if (!error) {
      // Send notification message to subscriber
      const scheduledDate = new Date(booking.scheduled_date).toLocaleDateString('pt-BR');
      const scheduledTime = booking.scheduled_time.slice(0, 5);

      await supabase.from('messages').insert({
        sender_id: profile!.id,
        receiver_id: booking.subscriber_id,
        content: `🎉 Sua sessão de streaming foi APROVADA!

📅 Data: ${scheduledDate}
⏰ Horário: ${scheduledTime}
⏱️ Duração: ${booking.duration_minutes} minutos

Por favor, esteja presente no horário agendado. Você poderá acessar a transmissão através da área de Streaming no seu painel.`,
      });

      loadBookings();
    }
  };

  const handleReject = async (bookingId: string) => {
    if (!rejectionReason.trim()) {
      alert('Por favor, informe o motivo da rejeição');
      return;
    }

    const { error } = await supabase
      .from('streaming_bookings')
      .update({
        status: 'rejected',
        rejection_reason: rejectionReason
      })
      .eq('id', bookingId);

    if (!error) {
      setSelectedBooking(null);
      setRejectionReason('');
      loadBookings();
    }
  };

  const handleCancelApproved = async (bookingId: string, reason: string) => {
    const booking = bookings.find(b => b.id === bookingId);
    if (!booking) return;

    const { error } = await supabase
      .from('streaming_bookings')
      .update({
        status: 'cancelled',
        rejection_reason: reason
      })
      .eq('id', bookingId);

    if (!error) {
      // Send notification message to subscriber
      const scheduledDate = new Date(booking.scheduled_date).toLocaleDateString('pt-BR');
      const scheduledTime = booking.scheduled_time.slice(0, 5);

      await supabase.from('messages').insert({
        sender_id: profile!.id,
        receiver_id: booking.subscriber_id,
        content: `⚠️ Sua sessão de streaming foi CANCELADA

📅 Data: ${scheduledDate}
⏰ Horário: ${scheduledTime}
⏱️ Duração: ${booking.duration_minutes} minutos

Motivo: ${reason}

Pedimos desculpas pelo inconveniente. Você pode reservar uma nova sessão quando desejar.`,
      });

      setSelectedBooking(null);
      setRejectionReason('');
      loadBookings();
    }
  };

  const canStartStream = (booking: Booking) => {
    if (booking.status !== 'approved') return false;

    const now = new Date();
    const scheduledDateTime = new Date(`${booking.scheduled_date}T${booking.scheduled_time}`);
    const timeDiff = scheduledDateTime.getTime() - now.getTime();

    // Can start 5 minutes before scheduled time
    return timeDiff <= 5 * 60 * 1000 && timeDiff >= -10 * 60 * 1000;
  };

  const getStatusBadge = (status: string) => {
    const badges = {
      pending: 'bg-warning/20 text-warning',
      approved: 'bg-success/20 text-success',
      rejected: 'bg-error/20 text-error',
      completed: 'bg-border text-textSecondary',
      cancelled: 'bg-border text-textSecondary',
    };
    const labels = {
      pending: 'Pendente',
      approved: 'Aprovado',
      rejected: 'Rejeitado',
      completed: 'Concluído',
      cancelled: 'Cancelado',
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${badges[status as keyof typeof badges]}`}>
        {labels[status as keyof typeof labels]}
      </span>
    );
  };

  if (loading) {
    return <div className="text-center py-12 text-text">Carregando...</div>;
  }

  const pendingBookings = bookings.filter(b => b.status === 'pending');
  const approvedBookings = bookings.filter(b => b.status === 'approved');
  const otherBookings = bookings.filter(b => !['pending', 'approved'].includes(b.status));

  return (
    <div>
      <h2 className="text-2xl font-bold text-text mb-6">Solicitações de Streaming</h2>

      {pendingBookings.length > 0 && (
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-text mb-4">
            Aguardando Aprovação ({pendingBookings.length})
          </h3>
          <div className="space-y-4">
            {pendingBookings.map((booking) => (
              <div key={booking.id} className="bg-surface rounded-xl shadow-lg p-6 border-l-4 border-warning">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4 flex-1">
                    {booking.profiles.avatar_url ? (
                      <img
                        src={booking.profiles.avatar_url}
                        alt={booking.profiles.username}
                        className="w-12 h-12 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                        <span className="text-primary font-semibold">
                          {booking.profiles.username[0].toUpperCase()}
                        </span>
                      </div>
                    )}
                    <div className="flex-1">
                      <h4 className="font-semibold text-text">
                        {booking.profiles.full_name || `@${booking.profiles.username}`}
                      </h4>
                      <p className="text-sm text-textSecondary mb-2">@{booking.profiles.username}</p>

                      <div className="flex flex-wrap items-center gap-4 text-sm text-textSecondary">
                        <span className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          {booking.duration_minutes} minutos
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          {new Date(booking.scheduled_date).toLocaleDateString('pt-BR')} às{' '}
                          {booking.scheduled_time.slice(0, 5)}
                        </span>
                        <span className="flex items-center gap-1 text-success font-semibold">
                          <DollarSign className="w-4 h-4" />
                          R$ {booking.influencer_earnings.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleApprove(booking.id)}
                      className="flex items-center gap-1 px-4 py-2 bg-success text-white rounded-lg hover:bg-success/80 transition-colors"
                    >
                      <Check className="w-4 h-4" />
                      Aprovar
                    </button>
                    <button
                      onClick={() => setSelectedBooking(booking.id)}
                      className="flex items-center gap-1 px-4 py-2 bg-error text-white rounded-lg hover:bg-error/80 transition-colors"
                    >
                      <X className="w-4 h-4" />
                      Rejeitar
                    </button>
                  </div>
                </div>

                {selectedBooking === booking.id && (
                  <div className="mt-4 pt-4 border-t border-border">
                    <label className="block text-sm font-medium text-textSecondary mb-2">
                      Motivo da rejeição
                    </label>
                    <textarea
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                      rows={3}
                      className="w-full px-3 py-2 border border-border bg-background text-text rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                      placeholder="Explique por que está rejeitando esta solicitação..."
                    />
                    <div className="flex items-center gap-2 mt-2">
                      <button
                        onClick={() => handleReject(booking.id)}
                        className="px-4 py-2 bg-error text-white rounded-lg hover:bg-error/80 transition-colors"
                      >
                        Confirmar Rejeição
                      </button>
                      <button
                        onClick={() => {
                          setSelectedBooking(null);
                          setRejectionReason('');
                        }}
                        className="px-4 py-2 bg-background text-textSecondary rounded-lg hover:bg-border transition-colors border border-border"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {approvedBookings.length > 0 && (
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-text mb-4">
            Agendadas ({approvedBookings.length})
          </h3>
          <div className="space-y-4">
            {approvedBookings.map((booking) => (
              <div key={booking.id} className="bg-surface rounded-xl shadow-lg p-6 border-l-4 border-success">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4 flex-1">
                    {booking.profiles.avatar_url ? (
                      <img
                        src={booking.profiles.avatar_url}
                        alt={booking.profiles.username}
                        className="w-12 h-12 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                        <span className="text-primary font-semibold">
                          {booking.profiles.username[0].toUpperCase()}
                        </span>
                      </div>
                    )}
                    <div className="flex-1">
                      <h4 className="font-semibold text-text">
                        {booking.profiles.full_name || `@${booking.profiles.username}`}
                      </h4>
                      <div className="flex flex-wrap items-center gap-4 text-sm text-textSecondary mt-2">
                        <span className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          {booking.duration_minutes} minutos
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          {new Date(booking.scheduled_date).toLocaleDateString('pt-BR')} às{' '}
                          {booking.scheduled_time.slice(0, 5)}
                        </span>
                        <span className="flex items-center gap-1 text-success font-semibold">
                          <DollarSign className="w-4 h-4" />
                          R$ {booking.influencer_earnings.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {canStartStream(booking) && onStartStream && (
                      <button
                        onClick={() => onStartStream(booking.id)}
                        className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/80 transition-colors font-semibold"
                      >
                        <Play className="w-5 h-5" />
                        Iniciar Streaming
                      </button>
                    )}
                    <button
                      onClick={() => setSelectedBooking(booking.id)}
                      className="flex items-center gap-1 px-4 py-2 bg-error text-white rounded-lg hover:bg-error/80 transition-colors"
                    >
                      <X className="w-4 h-4" />
                      Cancelar
                    </button>
                  </div>
                </div>

                {selectedBooking === booking.id && (
                  <div className="mt-4 pt-4 border-t border-border">
                    <label className="block text-sm font-medium text-textSecondary mb-2">
                      Motivo do cancelamento
                    </label>
                    <textarea
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                      rows={3}
                      className="w-full px-3 py-2 border border-border bg-background text-text rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                      placeholder="Explique por que está cancelando esta sessão..."
                    />
                    <div className="flex items-center gap-2 mt-2">
                      <button
                        onClick={() => {
                          if (!rejectionReason.trim()) {
                            alert('Por favor, informe o motivo do cancelamento');
                            return;
                          }
                          handleCancelApproved(booking.id, rejectionReason);
                        }}
                        className="px-4 py-2 bg-error text-white rounded-lg hover:bg-error/80 transition-colors"
                      >
                        Confirmar Cancelamento
                      </button>
                      <button
                        onClick={() => {
                          setSelectedBooking(null);
                          setRejectionReason('');
                        }}
                        className="px-4 py-2 bg-background text-textSecondary rounded-lg hover:bg-border transition-colors border border-border"
                      >
                        Voltar
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {otherBookings.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-text mb-4">
            Histórico
          </h3>
          <div className="bg-surface rounded-xl shadow-lg border border-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-background border-b border-border">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-textSecondary uppercase">Assinante</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-textSecondary uppercase">Data</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-textSecondary uppercase">Duração</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-textSecondary uppercase">Ganho</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-textSecondary uppercase">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {otherBookings.map((booking) => (
                    <tr key={booking.id} className="hover:bg-background">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-text">
                          {booking.profiles.full_name || `@${booking.profiles.username}`}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-textSecondary">
                        {new Date(booking.scheduled_date).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-textSecondary">
                        {booking.duration_minutes} min
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-success">
                        R$ {booking.influencer_earnings.toFixed(2)}
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
        <div className="text-center py-12 bg-surface rounded-xl border border-border">
          <Video className="w-16 h-16 text-textSecondary mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-text mb-2">Nenhuma solicitação ainda</h3>
          <p className="text-textSecondary">
            Quando assinantes solicitarem sessões de streaming, elas aparecerão aqui
          </p>
        </div>
      )}
    </div>
  );
}
