import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { X, DollarSign } from 'lucide-react';

interface PurchaseContentModalProps {
  contentId: string;
  contentTitle: string;
  contentPrice: number;
  influencerId: string;
  onClose: () => void;
  onSuccess: () => void;
}

export function PurchaseContentModal({
  contentId,
  contentTitle,
  contentPrice,
  influencerId,
  onClose,
  onSuccess,
}: PurchaseContentModalProps) {
  const { profile } = useAuth();
  const [paymentMethod, setPaymentMethod] = useState<'credit_card' | 'pix' | 'paypal'>('credit_card');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePurchase = async () => {
    if (!profile) {
      setError('Você precisa estar logado para comprar conteúdo.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // 1. Insert into user_purchased_content
      const { data: purchasedContent, error: purchaseError } = await supabase
        .from('user_purchased_content')
        .insert({
          user_id: profile.id,
          content_id: contentId,
          price_paid: contentPrice,
        })
        .select()
        .single();

      if (purchaseError) {
        if (purchaseError.code === '23505') { // Unique violation code
          setError('Você já comprou este conteúdo.');
        } else {
          setError('Erro ao registrar a compra: ' + purchaseError.message);
        }
        setLoading(false);
        return;
      }

      // 2. Simulate payment record
      const platformFee = contentPrice * 0.1; // 10% fee
      const influencerEarnings = contentPrice * 0.9; // 90% for influencer

      const { error: paymentError } = await supabase.from('payments').insert({
        subscriber_id: profile.id, // Using subscriber_id for content purchaser
        influencer_id: influencerId,
        amount: contentPrice,
        platform_fee: platformFee,
        influencer_earnings: influencerEarnings,
        payment_status: 'completed', // Assuming immediate completion for simulation
        payment_method: paymentMethod,
        // No subscription_id for individual content purchase
      });

      if (paymentError) {
        console.error('Erro ao registrar pagamento:', paymentError);
        // Potentially revert user_purchased_content if payment fails in a real scenario
        setError('Erro ao registrar o pagamento: ' + paymentError.message);
        setLoading(false);
        return;
      }

      onSuccess();
    } catch (err: any) {
      console.error('Erro inesperado durante a compra:', err);
      setError('Ocorreu um erro inesperado. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-surface rounded-xl max-w-md w-full p-6 shadow-2xl border border-border">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-2xl font-bold text-text">Comprar Conteúdo</h3>
          <button
            type="button"
            onClick={onClose}
            className="p-2 hover:bg-background rounded-lg transition-colors"
          >
            <X className="w-6 h-6 text-textSecondary" />
          </button>
        </div>

        {error && (
          <div className="bg-error/10 border border-error/30 text-error px-4 py-3 rounded-lg mb-4">
            {error}
          </div>
        )}

        <div className="bg-background rounded-lg p-4 mb-6 border border-border">
          <p className="text-sm text-textSecondary mb-2">Você está comprando:</p>
          <h4 className="text-xl font-semibold text-text mb-3">{contentTitle}</h4>
          <div className="flex items-center justify-between">
            <span className="text-textSecondary">Preço:</span>
            <span className="text-3xl font-bold text-primary">
              R$ {contentPrice.toFixed(2)}
            </span>
          </div>
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium text-textSecondary mb-3">Método de Pagamento</label>
          <div className="space-y-2">
            <button
              type="button"
              onClick={() => setPaymentMethod('credit_card')}
              className={`w-full p-4 rounded-lg border-2 text-left transition-all ${
                paymentMethod === 'credit_card'
                  ? 'border-primary bg-primary/10'
                  : 'border-border hover:border-textSecondary/50'
              } text-text`}
            >
              <span className="font-medium">Cartão de Crédito</span>
            </button>
            <button
              type="button"
              onClick={() => setPaymentMethod('pix')}
              className={`w-full p-4 rounded-lg border-2 text-left transition-all ${
                paymentMethod === 'pix'
                  ? 'border-primary bg-primary/10'
                  : 'border-border hover:border-textSecondary/50'
              } text-text`}
            >
              <span className="font-medium">PIX</span>
            </button>
            <button
              type="button"
              onClick={() => setPaymentMethod('paypal')}
              className={`w-full p-4 rounded-lg border-2 text-left transition-all ${
                paymentMethod === 'paypal'
                  ? 'border-primary bg-primary/10'
                  : 'border-border hover:border-textSecondary/50'
              } text-text`}
            >
              <span className="font-medium">PayPal</span>
            </button>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-6 py-3 border border-border text-textSecondary rounded-lg font-semibold hover:bg-background transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handlePurchase}
            disabled={loading}
            className="flex-1 px-6 py-3 bg-accent text-white rounded-lg font-semibold hover:bg-accent/90 transition-colors disabled:opacity-50"
          >
            {loading ? 'Processando...' : 'Confirmar Compra'}
          </button>
        </div>
      </div>
    </div>
  );
}
