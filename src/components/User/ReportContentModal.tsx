import { useState } from 'react';
import { X, Flag, Send } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { toast } from 'react-hot-toast';
import type { Database } from '../../lib/database.types';

interface ReportContentModalProps {
  contentId: string;
  onClose: () => void;
}

export function ReportContentModal({ contentId, onClose }: ReportContentModalProps) {
  const [reason, setReason] = useState('');
  const [details, setDetails] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { data: userData, error: userError } = await supabase.auth.getUser();
    const reporterId = userData.user?.id;

    console.log('ReportContentModal: Submitting report for content ID:', contentId);
    console.log('ReportContentModal: Reporter ID:', reporterId);
    console.log('ReportContentModal: Reason:', reason);
    console.log('ReportContentModal: Details:', details);

    if (userError || !reporterId) {
      setError('Você precisa estar logado para denunciar conteúdo.');
      toast.error('Você precisa estar logado para denunciar conteúdo.');
      setLoading(false);
      return;
    }

    if (!reason) {
      setError('Por favor, selecione um motivo para a denúncia.');
      toast.error('Por favor, selecione um motivo para a denúncia.');
      setLoading(false);
      return;
    }

    try {
      // 1. Insert report into reported_content table
      const insertObject = {
        content_id: contentId,
        reporter_id: reporterId,
        reason: reason,
        details: details,
        status: 'pending' as Database['public']['Enums']['reported_content_status_enum'], // Explicitly cast to enum type
      };
      console.log('ReportContentModal: Objeto de inserção para reported_content:', insertObject);

      const { error: insertError } = await supabase
        .from('reported_content')
        .insert(insertObject);

      if (insertError) throw insertError;

      // 2. Update content_posts status to 'pending_review'
      const { error: updateContentError } = await supabase
        .from('content_posts')
        .update({ status: 'pending_review', updated_at: new Date().toISOString() })
        .eq('id', contentId);

      if (updateContentError) throw updateContentError;

      // 3. Fetch admin emails to send notification
      const { data: admins, error: adminError } = await supabase
        .from('profiles')
        .select('email')
        .eq('is_admin', true);

      if (adminError) {
        console.error('ReportContentModal: Failed to fetch admin emails:', adminError);
        // Continue without sending email if admin emails cannot be fetched
      }

      if (admins && admins.length > 0) {
        const adminEmails = admins.map(admin => admin.email).filter((email): email is string => email !== null);
        const adminSubject = 'Nova Denúncia de Conteúdo Pendente de Revisão';
        const adminBody = `
          <p>Olá Administrador,</p>
          <p>Um novo conteúdo foi denunciado na plataforma e está aguardando sua revisão.</p>
          <p><strong>ID do Conteúdo:</strong> ${contentId}</p>
          <p><strong>Motivo da Denúncia:</strong> ${reason}</p>
          <p><strong>Detalhes:</strong> ${details || 'Nenhum detalhe adicional fornecido.'}</p>
          <p>Por favor, acesse o painel de administração para revisar a denúncia e tomar as ações necessárias.</p>
          <p>Obrigado,<br/>Sua Equipe de Moderação</p>
        `;

        // Call the Edge Function to send email to all admins
        for (const email of adminEmails) {
          const { error: emailError } = await supabase.functions.invoke('send-email', {
            body: JSON.stringify({
              to: email,
              subject: adminSubject,
              body: adminBody,
              userId: reporterId,
              status: 'new_report_admin_notification',
            }),
            headers: { 'Content-Type': 'application/json' },
          });

          if (emailError) {
            console.error(`ReportContentModal: Failed to send admin notification email to ${email}:`, emailError);
          }
        }
      } else {
        console.warn('ReportContentModal: No admin emails found to send notification.');
      }

      toast.success('Conteúdo denunciado com sucesso! A equipe de moderação será notificada.');
      onClose(); // Close modal on success
    } catch (err: any) {
      console.error('ReportContentModal: Error submitting report:', err);
      setError('Falha ao enviar denúncia: ' + err.message);
      toast.error('Falha ao enviar denúncia: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-surface rounded-lg max-w-md w-full p-6 shadow-xl border border-border">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-2xl font-bold text-text">Denunciar Conteúdo</h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-surface/50 rounded-lg transition-colors"
          >
            <X className="w-6 h-6 text-textSecondary" />
          </button>
        </div>

        {error && <p className="text-error text-center mb-4">{error}</p>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="reason" className="block text-sm font-medium text-textSecondary mb-2">
              Motivo da Denúncia
            </label>
            <select
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-4 py-3 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-background text-text"
              required
            >
              <option value="">Selecione um motivo</option>
              <option value="conteudo_inapropriado">Conteúdo Inapropriado</option>
              <option value="violencia">Violência ou Ódio</option>
              <option value="spam">Spam ou Engano</option>
              <option value="direitos_autorais">Violação de Direitos Autorais</option>
              <option value="outros">Outros</option>
            </select>
          </div>

          <div>
            <label htmlFor="details" className="block text-sm font-medium text-textSecondary mb-2">
              Detalhes Adicionais (opcional)
            </label>
            <textarea
              id="details"
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              rows={4}
              className="w-full px-4 py-3 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent resize-none bg-background text-text"
              placeholder="Forneça mais detalhes sobre a denúncia..."
            ></textarea>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 border border-border text-textSecondary rounded-lg font-semibold hover:bg-background transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-error text-white rounded-lg font-semibold hover:bg-error/90 transition-colors disabled:opacity-50"
            >
              <Send className="w-5 h-5" />
              {loading ? 'Enviando...' : 'Denunciar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
