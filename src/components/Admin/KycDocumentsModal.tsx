import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { Database } from '../../lib/database.types';
import { Loader2, CheckCircle, XCircle, ExternalLink } from 'lucide-react';
import { toast } from 'react-hot-toast';

type Profile = Database['public']['Tables']['profiles']['Row'];
type KycDocument = Database['public']['Tables']['kyc_documents']['Row'] & {
  profiles: Pick<Profile, 'full_name' | 'email'> | null;
};

interface KycDocumentsModalProps {
  userId: string;
  userName: string;
  userEmail: string;
  onClose: () => void;
  onKycStatusChange: () => void; // Callback to refetch profiles in parent
}

// Mapeamento de tipos de documento para termos em português
const documentTypeLabels: Record<KycDocument['document_type'], string> = {
  id_front: 'Documento de Identidade (Frente)',
  id_back: 'Documento de Identidade (Verso)',
  proof_of_address: 'Comprovante de Endereço',
  selfie_with_id: 'Selfie com Documento de Identidade',
};

export const KycDocumentsModal: React.FC<KycDocumentsModalProps> = ({ userId, userName, userEmail, onClose, onKycStatusChange }) => {
  const [kycDocuments, setKycDocuments] = useState<KycDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processingDocId, setProcessingDocId] = useState<string | null>(null);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [currentDocToReject, setCurrentDocToReject] = useState<KycDocument | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  const fetchKycDocuments = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      console.log(`[KycDocumentsModal] Fetching KYC documents for user_id: ${userId}`);
      const { data, error } = await supabase
        .from('kyc_documents')
        .select(`
          *,
          profiles (
            full_name,
            email
          )
        `)
        .eq('user_id', userId)
        .order('uploaded_at', { ascending: false });

      if (error) throw error;
      console.log(`[KycDocumentsModal] Fetched ${data?.length} documents. Example file_url:`, data?.[0]?.file_url);
      console.log('[KycDocumentsModal] Data fetched from DB:', data); // Log raw data from DB
      setKycDocuments(data || []);
      console.log('[KycDocumentsModal] kycDocuments state after set:', data?.map(d => ({ id: d.id, status: d.status }))); // Log state after update
    } catch (err: any) {
      console.error('[KycDocumentsModal] Error fetching KYC documents for user:', err);
      setError(err.message || 'Falha ao carregar documentos KYC.');
      toast.error(err.message || 'Falha ao carregar documentos KYC.');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchKycDocuments();
  }, [fetchKycDocuments]);

  const sendKycStatusEmail = async (
    toEmail: string,
    name: string,
    status: 'approved' | 'rejected',
    documentType: string,
    targetUserId: string,
    reason?: string
  ) => {
    const localizedDocumentType = documentTypeLabels[documentType as KycDocument['document_type']] || documentType.replace(/_/g, ' ');

    const subject = status === 'approved'
      ? `Seu documento KYC (${localizedDocumentType}) foi APROVADO - HubContent`
      : `Seu documento KYC (${localizedDocumentType}) foi REJEITADO - HubContent`;

    const body = status === 'approved'
      ? `
        <p>Olá ${name},</p>
        <p>Temos ótimas notícias! Seu documento KYC do tipo <strong>${localizedDocumentType}</strong> foi <strong>APROVADO</strong>.</p>
        <p>Obrigado por sua paciência e cooperação.</p>
        <p>Atenciosamente,</p>
        <p>A equipe HubContent</p>
      `
      : `
        <p>Olá ${name},</p>
        <p>Informamos que seu documento KYC do tipo <strong>${localizedDocumentType}</strong> foi <strong>REJEITADO</strong>.</p>
        ${reason ? `<p><strong>Motivo da Rejeição:</strong> ${reason}</p>` : ''}
        <p>Isso pode ter ocorrido por diversos motivos, como imagem ilegível, documento expirado ou informações inconsistentes.</p>
        <p>Por favor, faça login em sua conta e envie novamente os documentos corrigidos para revisão.</p>
        <p>Se precisar de ajuda, entre em contato com nosso suporte.</p>
        <p>Atenciosamente,</p>
        <p>A equipe HubContent</p>
      `;

    try {
      // Log the exact URL that Supabase client will try to invoke
      const functionUrl = `${supabase.supabaseUrl}/functions/v1/send-email`;
      console.log(`[KycDocumentsModal] Attempting to invoke Edge Function at URL: ${functionUrl}`);
      console.log(`[KycDocumentsModal] Invoking send-email function for user ${targetUserId} with status ${status}.`);
      const { data, error } = await supabase.functions.invoke('send-email', {
        body: {
          to: toEmail,
          subject: subject,
          body: body,
          userId: targetUserId,
          status: status,
        },
      });

      if (error) {
        console.error('[KycDocumentsModal] Error from send-email function invocation:', error);
        throw error;
      }
      console.log('[KycDocumentsModal] Email function invoked successfully:', data);
      toast.success('E-mail de notificação enviado com sucesso!');
    } catch (err) {
      console.error('[KycDocumentsModal] Error invoking send-email function:', err);
      toast.error('Falha ao enviar e-mail de notificação.');
      throw err; // Re-throw the error so handleKycStatusUpdate can catch it
    }
  };

  const handleKycStatusUpdate = async (docId: string, status: 'approved' | 'rejected', reason?: string) => {
    setProcessingDocId(docId);
    try {
      console.log(`[KycDocumentsModal] Updating KYC document ${docId} status to ${status}.`);
      const { data: docData, error: fetchError } = await supabase
        .from('kyc_documents')
        .select('user_id, document_type')
        .eq('id', docId)
        .single();

      if (fetchError) throw fetchError;

      const updatePayload: Partial<KycDocument> = {
        status: status,
        updated_at: new Date().toISOString(),
      };

      if (status === 'rejected' && reason) {
        updatePayload.rejection_reason = reason;
      } else {
        updatePayload.rejection_reason = null; // Clear reason if approved or no reason provided
      }

      const { data: updateData, error: kycError } = await supabase
        .from('kyc_documents')
        .update(updatePayload)
        .eq('id', docId)
        .select(); // Select the updated row to confirm

      if (kycError) throw kycError;
      console.log('[KycDocumentsModal] KYC document status updated in DB:', updateData); // Log DB update result

      await supabase.from('admin_logs').insert({
        admin_id: (await supabase.auth.getUser()).data.user?.id || '',
        action: `Updated KYC document status to ${status}`,
        target_user_id: docData?.user_id || null,
        details: { document_id: docId, new_status: status, rejection_reason: reason || null },
      });

      // Show success toast for DB update immediately
      toast.success(`Documento KYC ${status === 'approved' ? 'aprovado' : 'rejeitado'} com sucesso!`);

      // Attempt to send email. If it fails, the error will be caught below.
      await sendKycStatusEmail(
        userEmail,
        userName,
        status,
        docData.document_type,
        docData.user_id,
        reason
      );

    } catch (err) {
      console.error('[KycDocumentsModal] Error during KYC status update or email sending:', err);
      // The toast for email failure is already handled in sendKycStatusEmail
      // The toast for KYC update success/failure is handled here
      if (!String(err).includes('Falha ao enviar e-mail')) { // Avoid duplicate toast if email failed
        toast.error('Falha ao atualizar status do documento KYC.');
      }
    } finally {
      setProcessingDocId(null);
      setShowRejectModal(false);
      setCurrentDocToReject(null);
      setRejectionReason('');
      console.log('[KycDocumentsModal] Before calling fetchKycDocuments, current kycDocuments state:', kycDocuments.map(d => ({ id: d.id, status: d.id === docId ? status : d.status }))); // Log state before refresh
      fetchKycDocuments(); // Ensure UI refresh always happens
      onKycStatusChange(); // Trigger parent refetch as well
    }
  };

  const handleRejectClick = (doc: KycDocument) => {
    setCurrentDocToReject(doc);
    setRejectionReason('');
    setShowRejectModal(true);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-surface p-8 rounded-lg shadow-xl max-w-3xl w-full border border-border relative">
        <h3 className="text-2xl font-bold text-text mb-4">Documentos KYC para {userName}</h3>
        <p className="text-textSecondary mb-6">Email: {userEmail}</p>

        {loading ? (
          <div className="flex items-center justify-center py-10 text-textSecondary">
            <Loader2 className="w-6 h-6 animate-spin mr-2" /> Carregando documentos KYC...
          </div>
        ) : error ? (
          <div className="text-error text-center py-10">{error}</div>
        ) : kycDocuments.length === 0 ? (
          <p className="text-textSecondary italic py-10">Nenhum documento KYC encontrado para este usuário.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-h-[60vh] overflow-y-auto pr-2">
            {kycDocuments.map((doc) => {
              console.log(`[KycDocumentsModal] Document ID: ${doc.id}, File URL: ${doc.file_url}, Current Status: ${doc.status}`); // Debug log for file_url and status
              return (
                <div key={doc.id} className="bg-background p-5 rounded-lg border border-border shadow-sm flex flex-col">
                  <p className="text-lg font-semibold text-text mb-2">Tipo: <span className="capitalize">{documentTypeLabels[doc.document_type] || doc.document_type.replace(/_/g, ' ')}</span></p>
                  <p className="text-sm text-textSecondary mb-2">
                    Status: <span className={`font-medium capitalize ${
                      doc.status === 'approved' ? 'text-success' :
                      doc.status === 'pending' ? 'text-warning' : 'text-error'
                    }`}>{doc.status}</span>
                  </p>
                  {doc.rejection_reason && doc.status === 'rejected' && (
                    <p className="text-sm text-error mb-2">
                      <span className="font-semibold">Motivo:</span> {doc.rejection_reason}
                    </p>
                  )}
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
                  {doc.status === 'pending' && (
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
                        onClick={() => handleRejectClick(doc)}
                        disabled={processingDocId === doc.id}
                        className="flex-1 flex items-center justify-center px-4 py-2 bg-error/20 text-error rounded-lg hover:bg-error/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {processingDocId === doc.id ? <Loader2 className="w-5 h-5 animate-spin" /> : <XCircle className="w-5 h-5 mr-2" />}
                        Rejeitar
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <div className="flex justify-end mt-8">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-surface text-textSecondary rounded-lg border border-border hover:bg-border transition-colors"
          >
            Fechar
          </button>
        </div>

        {showRejectModal && currentDocToReject && (
          <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
            <div className="bg-surface p-8 rounded-lg shadow-xl max-w-md w-full border border-border">
              <h3 className="text-2xl font-bold text-text mb-4">Rejeitar Documento KYC</h3>
              <p className="text-textSecondary mb-4">
                Você está prestes a rejeitar o documento KYC do tipo{' '}
                <span className="font-semibold capitalize">{documentTypeLabels[currentDocToReject.document_type] || currentDocToReject.document_type.replace(/_/g, ' ')}</span>{' '}
                para o usuário <span className="font-semibold">{userName}</span>.
                Por favor, forneça um motivo para a rejeição.
              </p>
              <textarea
                className="w-full p-3 bg-background border border-border rounded-md text-text focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                rows={4}
                placeholder="Ex: Documento ilegível, documento expirado, informações inconsistentes, etc."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
              ></textarea>
              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => {
                    setShowRejectModal(false);
                    setCurrentDocToReject(null);
                    setRejectionReason('');
                  }}
                  className="px-5 py-2 bg-surface text-textSecondary rounded-lg border border-border hover:bg-border transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => handleKycStatusUpdate(currentDocToReject.id, 'rejected', rejectionReason)}
                  disabled={!rejectionReason.trim() || processingDocId === currentDocToReject.id}
                  className="px-5 py-2 bg-error/20 text-error rounded-lg hover:bg-error/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                >
                  {processingDocId === currentDocToReject.id ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <XCircle className="w-5 h-5 mr-2" />}
                  Confirmar Rejeição
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
