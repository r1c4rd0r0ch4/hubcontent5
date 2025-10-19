import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { X, Calendar, Clock, DollarSign } from 'lucide-react';

interface StreamingBookModalProps {
  influencerId: string;
  influencerName: string;
  onClose: () => void;
  onSuccess: () => void;
}

export function StreamingBookModal({ influencerId, influencerName, onClose, onSuccess }: StreamingBookModalProps) {
  const { profile } = useAuth();
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [durationMinutes, setDurationMinutes] = useState(30); // Default duration
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleBookStreaming = async () => {
    if (!profile) {
      setError('Você precisa estar logado para agendar um streaming.');
      return;
    }

    if (!scheduledDate || !scheduledTime) {
      setError('Por favor, selecione uma data e hora.');
      return;
    }

    setLoading(true);
    setError(null);

    const selectedDateTime = new Date(`${scheduledDate}T${scheduledTime}:00`);
    const now = new Date();
    const minBookingTime = new Date(now.getTime() + 5 * 60 * 1000); // 5 minutes from now

    if (selectedDateTime < minBookingTime) {
      setError('O agendamento deve ser feito com pelo menos 5 minutos de antecedência.');
      setLoading(false);
      return;
    }

    // For simplicity, let's assume a fixed price per minute or a base price
    // In a real app, this would come from influencer settings
    const pricePerMinute = 2.00; // Example price
    const pricePaid = durationMinutes * pricePerMinute;
    const platformFee = pricePaid * 0.1; // 10% platform fee
    const influencerEarnings = pricePaid - platformFee;

    const { error: bookingError } = await supabase
      .from('streaming_bookings')
      .insert({
        subscriber_id: profile.id,
        influencer_id: influencerId,
        duration_minutes: durationMinutes,
        price_paid: pricePaid,
        influencer_earnings: influencerEarnings,
        scheduled_date: scheduledDate,
        scheduled_time: scheduledTime,
        status: 'pending', // Always pending for influencer approval
      });

    if (bookingError) {
      console.error('Error booking streaming:', bookingError);
      setError('Falha ao agendar streaming. Tente novamente.');
    } else {
      onSuccess();
    }
    setLoading(false);
  };

  const today = new Date().toISOString().split('T')[0];
  const minTime = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', hour12: false });

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-surface rounded-lg max-w-md w-full p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-2xl font-bold text-text">Agendar Streaming com {influencerName}</h3>
          <button onClick={onClose} className="text-textSecondary hover:text-text">
            <X className="w-6 h-6" />
          </button>
        </div>

        {error && <p className="text-error text-sm mb-4">{error}</p>}

        <div className="space-y-4 mb-6">
          <div>
            <label htmlFor="scheduledDate" className="block text-sm font-medium text-textSecondary mb-2">
              Data
            </label>
            <div className="relative">
              <input
                type="date"
                id="scheduledDate"
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
                min={today}
                className="w-full px-4 py-3 pr-10 border border-border rounded-lg bg-background text-text focus:ring-2 focus:ring-primary focus:border-transparent"
              />
              <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 text-textSecondary" size={20} />
            </div>
          </div>
          <div>
            <label htmlFor="scheduledTime" className="block text-sm font-medium text-textSecondary mb-2">
              Hora
            </label>
            <div className="relative">
              <input
                type="time"
                id="scheduledTime"
                value={scheduledTime}
                onChange={(e) => setScheduledTime(e.target.value)}
                min={scheduledDate === today ? minTime : '00:00'} // Enforce min time for today
                className="w-full px-4 py-3 pr-10 border border-border rounded-lg bg-background text-text focus:ring-2 focus:ring-primary focus:border-transparent"
              />
              <Clock className="absolute right-3 top-1/2 -translate-y-1/2 text-textSecondary" size={20} />
            </div>
          </div>
          <div>
            <label htmlFor="durationMinutes" className="block text-sm font-medium text-textSecondary mb-2">
              Duração (minutos)
            </label>
            <select
              id="durationMinutes"
              value={durationMinutes}
              onChange={(e) => setDurationMinutes(parseInt(e.target.value))}
              className="w-full px-4 py-3 border border-border rounded-lg bg-background text-text focus:ring-2 focus:ring-primary focus:border-transparent"
            >
              <option value={15}>15 minutos</option>
              <option value={30}>30 minutos</option>
              <option value={45}>45 minutos</option>
              <option value={60}>60 minutos</option>
            </select>
          </div>
          <div className="flex items-center justify-between bg-background rounded-lg p-4 border border-border">
            <span className="text-textSecondary flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-success" /> Preço Estimado:
            </span>
            <span className="text-text text-xl font-bold">
              R$ {(durationMinutes * 2.00).toFixed(2)}
            </span>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-6 py-3 border border-border text-textSecondary rounded-lg font-semibold hover:bg-background transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleBookStreaming}
            disabled={loading}
            className="flex-1 px-6 py-3 bg-accent text-white rounded-lg font-semibold hover:bg-accent/90 transition-colors disabled:opacity-50"
          >
            {loading ? 'Agendando...' : 'Agendar Streaming'}
          </button>
        </div>
      </div>
    </div>
  );
}
