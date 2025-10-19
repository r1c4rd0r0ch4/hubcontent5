import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext'; // CORRIGIDO: Caminho de importação
import { supabase } from '../../lib/supabase';
import { DollarSign, TrendingUp, Calendar } from 'lucide-react';

interface Payment {
  id: string;
  amount: number;
  platform_fee: number;
  influencer_earnings: number;
  payment_status: string;
  created_at: string;
  profiles: {
    username: string;
  };
}

export function EarningsOverview() {
  const { profile } = useAuth();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [dateFilter, setDateFilter] = useState<'all' | 'month' | 'week'>('month');
  const [stats, setStats] = useState({
    totalEarnings: 0,
    monthlyEarnings: 0,
    weeklyEarnings: 0,
    pendingPayments: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPayments();
  }, [profile]);

  const loadPayments = async () => {
    if (!profile) return;

    const { data, error } = await supabase
      .from('payments')
      .select(`
        *,
        profiles:subscriber_id (
          username
        )
      `)
      .eq('influencer_id', profile.id)
      .order('created_at', { ascending: false })
      .limit(50);

    if (!error && data) {
      setPayments(data as any);

      const now = new Date();
      const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const firstDayOfWeek = new Date(now);
      firstDayOfWeek.setDate(now.getDate() - now.getDay());

      const total = data.reduce((sum, p) => sum + (p.payment_status === 'completed' ? p.influencer_earnings : 0), 0);
      const monthly = data
        .filter(p => new Date(p.created_at) >= firstDayOfMonth && p.payment_status === 'completed')
        .reduce((sum, p) => sum + p.influencer_earnings, 0);
      const weekly = data
        .filter(p => new Date(p.created_at) >= firstDayOfWeek && p.payment_status === 'completed')
        .reduce((sum, p) => sum + p.influencer_earnings, 0);
      const pending = data
        .filter(p => p.payment_status === 'pending')
        .reduce((sum, p) => sum + p.influencer_earnings, 0);

      setStats({
        totalEarnings: total,
        monthlyEarnings: monthly,
        weeklyEarnings: weekly,
        pendingPayments: pending,
      });
    }
    setLoading(false);
  };

  if (loading) {
    return <div className="text-center py-12 text-text">Carregando...</div>;
  }

  return (
    <div>
      <h2 className="text-2xl font-bold text-text mb-6">Visão Geral dos Ganhos</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <div className="bg-gradient-to-br from-success to-green-700 rounded-xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <DollarSign className="w-8 h-8" />
            <span className="text-sm opacity-90">Total</span>
          </div>
          <div className="text-3xl font-bold">R$ {stats.totalEarnings.toFixed(2)}</div>
          <p className="text-sm opacity-90 mt-1">Ganhos totais confirmados</p>
        </div>

        <div className="bg-gradient-to-br from-primary to-secondary rounded-xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <TrendingUp className="w-8 h-8" />
            <span className="text-sm opacity-90">Este Mês</span>
          </div>
          <div className="text-3xl font-bold">R$ {stats.monthlyEarnings.toFixed(2)}</div>
          <p className="text-sm opacity-90 mt-1">Ganhos do mês atual</p>
        </div>

        <div className="bg-gradient-to-br from-warning to-orange-700 rounded-xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <Calendar className="w-8 h-8" />
            <span className="text-sm opacity-90">Pendente</span>
          </div>
          <div className="text-3xl font-bold">R$ {stats.pendingPayments.toFixed(2)}</div>
          <p className="text-sm opacity-90 mt-1">Aguardando processamento</p>
        </div>
      </div>

      <div className="bg-surface rounded-xl shadow-lg border border-border overflow-hidden">
        <div className="px-6 py-4 border-b border-border bg-background flex items-center justify-between">
          <h3 className="text-lg font-semibold text-text">Histórico de Pagamentos</h3>
          <div className="flex gap-2">
            <button
              onClick={() => setDateFilter('all')}
              className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                dateFilter === 'all'
                  ? 'bg-primary text-white'
                  : 'bg-background text-textSecondary hover:bg-border'
              }`}
            >
              Todos
            </button>
            <button
              onClick={() => setDateFilter('month')}
              className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                dateFilter === 'month'
                  ? 'bg-primary text-white'
                  : 'bg-background text-textSecondary hover:bg-border'
              }`}
            >
              Este Mês
            </button>
            <button
              onClick={() => setDateFilter('week')}
              className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                dateFilter === 'week'
                  ? 'bg-primary text-white'
                  : 'bg-background text-textSecondary hover:bg-border'
              }`}
            >
              Esta Semana
            </button>
          </div>
        </div>

        {payments.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-textSecondary">Nenhum pagamento registrado ainda</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-background border-b border-border">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-textSecondary uppercase tracking-wider">
                    Data
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-textSecondary uppercase tracking-wider">
                    Assinante
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-textSecondary uppercase tracking-wider">
                    Valor Total
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-textSecondary uppercase tracking-wider">
                    Taxa (10%)
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-textSecondary uppercase tracking-wider">
                    Seus Ganhos
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-textSecondary uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="bg-surface divide-y divide-border">
                {payments
                  .filter(payment => {
                    if (dateFilter === 'all') return true;
                    const paymentDate = new Date(payment.created_at);
                    const now = new Date();
                    if (dateFilter === 'month') {
                      const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
                      return paymentDate >= firstDayOfMonth;
                    }
                    if (dateFilter === 'week') {
                      const firstDayOfWeek = new Date(now);
                      firstDayOfWeek.setDate(now.getDate() - now.getDay());
                      return paymentDate >= firstDayOfWeek;
                    }
                    return true;
                  })
                  .map((payment) => (
                  <tr key={payment.id} className="hover:bg-background">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-textSecondary">
                      {new Date(payment.created_at).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-text">
                      @{payment.profiles.username}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-text">
                      R$ {payment.amount.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-error">
                      - R$ {payment.platform_fee.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-success">
                      R$ {payment.influencer_earnings.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        payment.payment_status === 'completed'
                          ? 'bg-success/20 text-success'
                          : payment.payment_status === 'pending'
                          ? 'bg-warning/20 text-warning'
                          : 'bg-error/20 text-error'
                      }`}>
                        {payment.payment_status === 'completed' ? 'Confirmado' :
                         payment.payment_status === 'pending' ? 'Pendente' : 'Falhou'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="mt-6 bg-primary/10 border border-primary/30 rounded-lg p-6">
        <h4 className="font-semibold text-primary mb-2">Como funciona o pagamento</h4>
        <ul className="text-sm text-textSecondary space-y-1">
          <li>• A plataforma cobra 10% de taxa sobre cada assinatura</li>
          <li>• Você recebe 90% do valor de cada assinatura</li>
          <li>• Os pagamentos são processados automaticamente</li>
          <li>• Configure suas informações de pagamento nas configurações</li>
        </ul>
      </div>
    </div>
  );
}
