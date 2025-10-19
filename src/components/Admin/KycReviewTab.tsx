import React from 'react';
import { useAdminData } from '../../hooks/useAdminData';
import { AdminCard } from './AdminCard';
import { supabase } from '../../lib/supabase';
import { CheckCircle, XCircle, Loader2, ExternalLink } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { Database } from '../../lib/database.types'; // Import Database type

type Profile = Database['public']['Tables']['profiles']['Row'];

export const KycReviewTab: React.FC = () => {
  const { kycDocuments, loading, error, refetch } = useAdminData();
  const [processingDocId, setProcessingDocId] = React.useState<string | null>(null);

  const sendKycStatusEmail = async (
    toEmail: string,
    userName: string,
    status: 'approved' | 'rejected',
    documentType: string
  ) => {
    const subject = status === 'approved'
      ? `Seu documento KYC foi APROVADO - HubContent`
      : `Seu documento KYC foi REJEITADO - HubContent`;

    const body = status === 'approved'
      ? `
        <p>Olá ${userName},</p>
        <p>Temos ótimas notícias! Seu documento KYC do tipo <strong>${documentType.replace(/_/g, ' ')}</strong> foi <strong>APROVADO</strong>.</p>
        <p>Sua conta agora está totalmente verificada e você pode aproveitar todos os recursos da plataforma HubContent.</p>
        <p>Obrigado por sua paciência e cooperação.</p>
        <p>Atenciosamente,</p>
        <p>A equipe HubContent</p>
      `
      : `
        <p>Olá ${userName},</p>
        <p>Informamos que seu documento KYC do tipo <strong>${documentType.replace(/_/g, ' ')}</strong> foi <strong>REJEITADO</strong>.</p>
        <p>Isso pode ter ocorrido por diversos motivos, como imagem ilegível, documento expirado ou informações inconsistentes.</p>
        <p>Por favor, faça login em sua conta e envie novamente os documentos corrigidos para revisão.</p>
        <p>Se precisar de ajuda, entre em contato com nosso suporte.</p>
        <p>Atenciosamente,</p>
        <p>A equipe HubContent</p>
      `;

    try {
      const { data, error } = await supabase.functions.invoke('send-email', {
        body: {
          to: toEmail,
          subject: subject,
          body: body,
          userId: '', // The Edge Function will fetch the user's full_name using the userId from the profile table
          status: status,
        },
      });

      if (error) throw error;
      console.log('Email function invoked successfully:', data);
      toast.success('E-mail de notificação enviado com sucesso!');
    } catch (err) {
      console.error('Error invoking send-email function:', err);
      toast.error('Falha ao enviar e-mail de notificação.');
    }
  };

  const handleKycStatusUpdate = async (docId: string, status: 'approved' | 'rejected') => {
    setProcessingDocId(docId);
    try {
      const { data: docData, error: fetchError } = await supabase
        .from('kyc_documents')
        .select('user_id, document_type') // Also select document_type
        .eq('id', docId)
        .single();

      if (fetchError) throw fetchError;

      // Fetch user profile to get email and full_name for the email notification
      const { data: userProfile, error: profileError } = await supabase
        .from('profiles')
        .select('email, full_name')
        .eq('id', docData.user_id)
        .single();

      if (profileError || !userProfile) {
        console.error('Failed to fetch user profile for email:', profileError?.message || 'User not found');
        toast.error('Falha ao buscar dados do usuário para enviar e-mail.');
        return; // Stop if user profile cannot be fetched
      }

      const { error: kycError } = await supabase
        .from('kyc_documents')
        .update({ status: status, uploaded_at: new Date().toISOString() }) // Using uploaded_at as updated_at for simplicity
        .eq('id', docId);

      if (kycError) throw kycError;

      // If KYC is approved, also approve the influencer's account status
      if (status === 'approved' && docData?.user_id) {
        const { error: profileUpdateError } = await supabase
          .from('profiles')
          .update({ account_status: 'approved', updated_at: new Date().toISOString() })
          .eq('id', docData.user_id);

        if (profileUpdateError) throw profileUpdateError;
      }

      // Log admin action
      await supabase.from('admin_logs').insert({
        admin_id: (await supabase.auth.getUser()).data.user?.id || '',
        action: `Updated KYC document status to ${status}`,
        target_user_id: docData?.user_id || null,
        details: { document_id: docId, new_status: status },
      });

      toast.success(`Documento KYC ${status === 'approved' ? 'aprovado' : 'rejeitado'} com sucesso!`);

      // Send email notification
      await sendKycStatusEmail(
        userProfile.email,
        userProfile.full_name || userProfile.email, // Use full_name or email as fallback
        status,
        docData.document_type
      );

      refetch(); // Refresh data
    } catch (err) {
      console.error('Error updating KYC status:', err);
      toast.error('Falha ao atualizar status do documento KYC.');
    } finally {
      setProcessingDocId(null);
    }
  };

  if (loading) {
    return (
      <AdminCard title="Revisão de KYC">
        <div className="flex items-center justify-center py-10 text-textSecondary">
          <Loader2 className="w-6 h-6 animate-spin mr-2" /> Carregando documentos KYC...
        </div>
      </AdminCard>
    );
  }

  if (error) {
    return (
      <AdminCard title="Revisão de KYC">
        <div className="text-error text-center py-10">{error}</div>
      </AdminCard>
    );
  }

  return (
    <AdminCard title="Documentos KYC Pendentes">
      {kycDocuments.length === 0 ? (
        <p className="text-textSecondary italic">Nenhum documento KYC pendente de revisão.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {kycDocuments.map((doc) => (
            <div key={doc.id} className="bg-surface p-5 rounded-lg border border-border shadow-md flex flex-col">
              <p className="text-lg font-semibold text-text mb-2">Tipo: <span className="capitalize">{doc.document_type.replace(/_/g, ' ')}</span></p>
              <p className="text-sm text-textSecondary mb-4">Usuário ID: {doc.user_id}</p>
              <div className="flex items-center justify-between mb-4">
                <a
                  href={doc.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center text-primary hover:underline transition-colors"
                >
                  Ver Documento <ExternalLink className="w-4 h-4 ml-1" />
                </a>
                <span className="text-xs text-textSecondary">
                  Enviado em: {new Date(doc.uploaded_at).toLocaleDateString()}
                </span>
              </div>
              <div className="flex gap-3 mt-auto pt-4 border-t border-border/50">
                <button
                  onClick={() => handleKycStatusUpdate(doc.id, 'approved')}
                  disabled={processingDocId === doc.id}
                  className="flex-1 flex items-center justify-center px-4 py-2 bg-success/20 text-success rounded-lg hover:bg-success/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {processingDocId === doc.id ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle className="w-5 h-5 mr-2" />}
                  Aprovar
                </button>
                <button
                  onClick={() => handleKycStatusUpdate(doc.id, 'rejected')}
                  disabled={processingDocId === doc.id}
                  className="flex-1 flex items-center justify-center px-4 py-2 bg-error/20 text-error rounded-lg hover:bg-error/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {processingDocId === doc.id ? <Loader2 className="w-5 h-5 animate-spin" /> : <XCircle className="w-5 h-5 mr-2" />}
                  Rejeitar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </AdminCard>
  );
};
