import React from 'react';
import { useAdminData, ReportedContentWithDetails } from '../../hooks/useAdminData'; // Importado: ReportedContentWithDetails
import { AdminCard } from './AdminCard';
import { supabase } from '../../lib/supabase';
import { CheckCircle, XCircle, Loader2, Eye, Trash2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { Tables } from '../../lib/database.types';

export const ReportedContentTab: React.FC = () => {
  const { reportedContent, loading, error, refetch } = useAdminData();
  const [processingReportId, setProcessingReportId] = React.useState<string | null>(null);

  // Filtrar por relatórios pendentes
  const pendingReports = reportedContent.filter(
    (report) => report.status === 'pending'
  );

  const handleReportStatusUpdate = async (
    reportId: string,
    contentId: string,
    contentOwnerEmail: string | null,
    contentTitle: string | null,
    action: 'approve_content' | 'reject_content',
    adminNotes: string = ''
  ) => {
    setProcessingReportId(reportId);
    try {
      const adminUser = await supabase.auth.getUser();
      const adminId = adminUser.data.user?.id;

      if (!adminId) {
        toast.error('Erro: Administrador não autenticado.');
        return;
      }

      let newContentStatus: Tables<'content_posts'>['status'] = 'active';
      let reportResolutionStatus: Tables<'reported_content'>['status'] = 'resolved';
      let emailSubject = '';
      let emailBody = '';

      if (action === 'reject_content') {
        newContentStatus = 'rejected';
        emailSubject = `Seu Conteúdo "${contentTitle}" Foi Removido`;
        emailBody = `
          <p>Olá,</p>
          <p>Informamos que seu conteúdo "${contentTitle}" (ID: ${contentId}) foi revisado e removido da plataforma devido a uma violação de nossas diretrizes.</p>
          <p><strong>Motivo da Remoção:</strong> ${adminNotes || 'Conteúdo considerado inapropriado.'}</p>
          <p>Agradecemos sua compreensão.</p>
          <p>Atenciosamente,<br/>A Equipe de Moderação</p>
        `;
      } else { // approve_content
        newContentStatus = 'active';
        emailSubject = `Atualização sobre Seu Conteúdo Denunciado: "${contentTitle}"`;
        emailBody = `
          <p>Olá,</p>
          <p>Informamos que seu conteúdo "${contentTitle}" (ID: ${contentId}), que havia sido denunciado, foi revisado e <strong>aprovado</strong>.</p>
          <p>Ele permanece ativo na plataforma.</p>
          <p>Agradecemos sua paciência.</p>
          <p>Atenciosamente,<br/>A Equipe de Moderação</p>
        `;
      }

      // 1. Update reported_content status
      const { error: reportError } = await supabase
        .from('reported_content')
        .update({
          status: reportResolutionStatus,
          admin_notes: adminNotes,
          resolved_at: new Date().toISOString(),
        })
        .eq('id', reportId);

      if (reportError) throw reportError;

      // 2. Update content_posts status based on admin action
      const { error: contentError } = await supabase
        .from('content_posts')
        .update({ status: newContentStatus, updated_at: new Date().toISOString() })
        .eq('id', contentId);

      if (contentError) throw contentError;

      // 3. Log admin action
      await supabase.from('admin_logs').insert({
        admin_id: adminId,
        action: `Reported content ${action === 'approve_content' ? 'approved' : 'rejected'}`,
        target_user_id: null, // No specific user target for content action, but could be influencer_id
        details: { report_id: reportId, content_id: contentId, action_taken: action, new_content_status: newContentStatus },
      });

      // 4. Send email notification to content owner
      if (contentOwnerEmail) {
        const { error: emailError } = await supabase.functions.invoke('send-email', {
          body: JSON.stringify({
            to: contentOwnerEmail,
            subject: emailSubject,
            body: emailBody,
            userId: adminId, // Admin ID for context in edge function
            status: action, // 'approve_content' or 'reject_content'
          }),
          headers: { 'Content-Type': 'application/json' },
        });

        if (emailError) {
          console.error('Failed to send content owner notification email:', emailError);
          toast.error('Falha ao enviar e-mail de notificação ao criador do conteúdo.');
        }
      }

      toast.success(`Conteúdo reportado ${action === 'approve_content' ? 'aprovado' : 'removido'} com sucesso!`);
      refetch(); // Refresh data
    } catch (err: any) {
      console.error('Error updating reported content status:', err);
      toast.error('Falha ao atualizar status do conteúdo reportado: ' + err.message);
    } finally {
      setProcessingReportId(null);
    }
  };

  if (loading) {
    return (
      <AdminCard title="Moderação de Conteúdo">
        <div className="flex items-center justify-center py-10 text-textSecondary">
          <Loader2 className="w-6 h-6 animate-spin mr-2" /> Carregando conteúdo reportado...
        </div>
      </AdminCard>
    );
  }

  if (error) {
    return (
      <AdminCard title="Moderação de Conteúdo">
        <div className="text-error text-center py-10">{error}</div>
      </AdminCard>
    );
  }

  return (
    <AdminCard title="Conteúdo Reportado Pendente">
      {pendingReports.length === 0 ? (
        <p className="text-textSecondary italic">Nenhum conteúdo reportado pendente de revisão.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {pendingReports.map((report) => (
            <div key={report.id} className="bg-surface p-5 rounded-lg border border-border shadow-md flex flex-col">
              <p className="text-lg font-semibold text-text mb-2">{report.content_posts?.title || 'Conteúdo Desconhecido'}</p>
              <p className="text-sm text-textSecondary mb-2">
                Reportado por: <span className="font-medium text-text">{report.reporter?.full_name || report.reporter_id}</span>
              </p>
              <p className="text-sm text-textSecondary mb-4">
                Motivo: <span className="font-medium text-text">{report.reason}</span>
              </p>
              {report.details && (
                <p className="text-sm text-textSecondary mb-4">
                  Detalhes: <span className="font-medium text-text">{report.details}</span>
                </p>
              )}
              <p className="text-xs text-textSecondary mb-4">
                Reportado em: {new Date(report.reported_at).toLocaleString()}
              </p>

              {report.content_posts && (
                <div className="mb-4 p-3 bg-background rounded-md border border-border/70">
                  <p className="text-sm font-medium text-text mb-2">Detalhes do Conteúdo:</p>
                  <div className="flex items-center gap-3">
                    {report.content_posts.thumbnail_url && (
                      <img src={report.content_posts.thumbnail_url} alt={report.content_posts.title || 'Thumbnail'} className="w-16 h-16 object-cover rounded-md" />
                    )}
                    <div>
                      <p className="text-sm text-text">{report.content_posts.description?.substring(0, 50)}...</p>
                      <a
                        href={`/content/${report.content_posts.id}`} // Assuming a content detail page
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center text-primary hover:underline text-xs transition-colors mt-1"
                      >
                        Ver Conteúdo <Eye className="w-3 h-3 ml-1" />
                      </a>
                    </div>
                  </div>
                  <p className="text-xs text-textSecondary mt-2">
                    Criador: {report.content_owner?.full_name || report.content_posts.user_id}
                  </p>
                </div>
              )}

              <div className="flex gap-3 mt-auto pt-4 border-t border-border/50">
                <button
                  onClick={() =>
                    handleReportStatusUpdate(
                      report.id,
                      report.content_id, // Usar report.content_id diretamente
                      report.content_owner?.email || null,
                      report.content_posts?.title || null,
                      'approve_content',
                      'Conteúdo revisado e considerado adequado.'
                    )
                  }
                  disabled={processingReportId === report.id}
                  className="flex-1 flex items-center justify-center px-4 py-2 bg-success/20 text-success rounded-lg hover:bg-success/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {processingReportId === report.id ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle className="w-5 h-5 mr-2" />}
                  Manter Conteúdo
                </button>
                <button
                  onClick={() =>
                    handleReportStatusUpdate(
                      report.id,
                      report.content_id, // Usar report.content_id diretamente
                      report.content_owner?.email || null,
                      report.content_posts?.title || null,
                      'reject_content',
                      'Conteúdo removido por violar as diretrizes da plataforma.'
                    )
                  }
                  disabled={processingReportId === report.id}
                  className="flex-1 flex items-center justify-center px-4 py-2 bg-error/20 text-error rounded-lg hover:bg-error/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {processingReportId === report.id ? <Loader2 className="w-5 h-5 animate-spin" /> : <Trash2 className="w-5 h-5 mr-2" />}
                  Remover Conteúdo
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </AdminCard>
  );
};
