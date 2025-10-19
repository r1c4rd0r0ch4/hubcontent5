import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { Database } from '../../lib/database.types';
import { Loader2, Search, Calendar, User, XCircle } from 'lucide-react';

type UserLoginLog = Database['public']['Tables']['user_login_logs']['Row'];
type Profile = Database['public']['Tables']['profiles']['Row'];

export function LogManagementTab() {
  const [logs, setLogs] = useState<UserLoginLog[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]); // Para o dropdown de filtro de usuário
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterUser, setFilterUser] = useState<string>(''); // ID do usuário ou email
  const [filterStartDate, setFilterStartDate] = useState<string>('');
  const [filterEndDate, setFilterEndDate] = useState<string>('');

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let query = supabase
        .from('user_login_logs')
        .select('*')
        .order('logged_in_at', { ascending: false });

      if (filterUser) {
        // Tenta corresponder por user_id ou email
        query = query.or(`user_id.eq.${filterUser},email.ilike.%${filterUser}%`);
      }
      if (filterStartDate) {
        query = query.gte('logged_in_at', filterStartDate);
      }
      if (filterEndDate) {
        query = query.lte('logged_in_at', filterEndDate + 'T23:59:59'); // Fim do dia
      }

      const { data, error: logsError } = await query;

      if (logsError) {
        console.error('Erro ao buscar logs:', logsError);
        throw logsError;
      }
      setLogs(data || []);
    } catch (err: any) {
      console.error('Erro geral ao buscar logs:', err);
      setError(err.message || 'Falha ao carregar logs de acesso.');
    } finally {
      setLoading(false);
    }
  }, [filterUser, filterStartDate, filterEndDate]);

  const fetchProfilesForFilter = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, email, full_name, username')
        .order('email', { ascending: true });
      if (error) throw error;
      setProfiles(data || []);
    } catch (err: any) {
      console.error('Erro ao buscar perfis para filtro:', err);
    }
  }, []);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  useEffect(() => {
    fetchProfilesForFilter();
  }, [fetchProfilesForFilter]);

  const handleClearFilters = () => {
    setFilterUser('');
    setFilterStartDate('');
    setFilterEndDate('');
  };

  return (
    <div className="p-6 bg-surface rounded-2xl shadow-xl border border-border animate-fade-in">
      <h3 className="text-3xl font-bold text-text mb-6">Logs de Acesso de Usuários</h3>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8 p-4 bg-background rounded-lg border border-border">
        <div className="flex flex-col">
          <label htmlFor="filterUser" className="text-textSecondary text-sm font-medium mb-2">
            Filtrar por Usuário (Email ou ID)
          </label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 text-textSecondary w-5 h-5" />
            <input
              id="filterUser"
              type="text"
              value={filterUser}
              onChange={(e) => setFilterUser(e.target.value)}
              placeholder="email@exemplo.com ou ID do usuário"
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-border bg-surface focus:ring-2 focus:ring-primary focus:border-transparent transition-all text-text"
            />
          </div>
        </div>

        <div className="flex flex-col">
          <label htmlFor="filterStartDate" className="text-textSecondary text-sm font-medium mb-2">
            Data Início
          </label>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-textSecondary w-5 h-5" />
            <input
              id="filterStartDate"
              type="date"
              value={filterStartDate}
              onChange={(e) => setFilterStartDate(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-border bg-surface focus:ring-2 focus:ring-primary focus:border-transparent transition-all text-text"
            />
          </div>
        </div>

        <div className="flex flex-col">
          <label htmlFor="filterEndDate" className="text-textSecondary text-sm font-medium mb-2">
            Data Fim
          </label>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-textSecondary w-5 h-5" />
            <input
              id="filterEndDate"
              type="date"
              value={filterEndDate}
              onChange={(e) => setFilterEndDate(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-border bg-surface focus:ring-2 focus:ring-primary focus:border-transparent transition-all text-text"
            />
          </div>
        </div>

        <div className="md:col-span-3 flex justify-end gap-4 mt-4">
          <button
            onClick={handleClearFilters}
            className="flex items-center gap-2 px-5 py-2 bg-error/20 text-error rounded-lg font-semibold hover:bg-error/30 transition-colors"
          >
            <XCircle className="w-5 h-5" /> Limpar Filtros
          </button>
          <button
            onClick={fetchLogs}
            className="flex items-center gap-2 px-5 py-2 bg-primary text-white rounded-lg font-semibold hover:bg-primary/80 transition-colors shadow-md shadow-primary/30"
          >
            <Search className="w-5 h-5" /> Aplicar Filtros
          </button>
        </div>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-10 text-primary text-lg">
          <Loader2 className="animate-spin mr-2" size={24} /> Carregando logs...
        </div>
      )}

      {error && (
        <div className="bg-error/10 text-error px-4 py-3 rounded-lg text-sm mb-4">
          {error}
        </div>
      )}

      {!loading && logs.length === 0 && !error && (
        <p className="text-textSecondary text-center py-10">Nenhum log de acesso encontrado com os filtros aplicados.</p>
      )}

      {!loading && logs.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-border shadow-lg">
          <table className="min-w-full divide-y divide-border">
            <thead className="bg-background">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-textSecondary uppercase tracking-wider">
                  Data e Hora
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-textSecondary uppercase tracking-wider">
                  Usuário (Email)
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-textSecondary uppercase tracking-wider">
                  Endereço IP
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-textSecondary uppercase tracking-wider">
                  Navegador (User Agent)
                </th>
              </tr>
            </thead>
            <tbody className="bg-surface divide-y divide-border">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-background transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-text">
                    {new Date(log.logged_in_at).toLocaleString('pt-BR', {
                      year: 'numeric',
                      month: '2-digit',
                      day: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                    })}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-primary font-medium">
                    {log.email}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-textSecondary">
                    {log.ip_address || 'N/A'}
                  </td>
                  <td className="px-6 py-4 text-sm text-textSecondary max-w-xs truncate">
                    {log.user_agent || 'N/A'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
