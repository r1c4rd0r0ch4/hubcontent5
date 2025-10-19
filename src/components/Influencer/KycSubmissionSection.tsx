import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { Database } from '../../lib/database.types';
import { useAuth } from '../../contexts/AuthContext';
import { uploadKycDocument, validateDocumentFile } from '../../lib/upload';
import { Loader2, CheckCircle, XCircle, Clock, Upload, ExternalLink } from 'lucide-react';
import { toast } from 'react-hot-toast';

type KycDocument = Database['public']['Tables']['kyc_documents']['Row'];

const documentTypeLabels: Record<KycDocument['document_type'], string> = {
  id_front: 'Frente do Documento de Identidade',
  id_back: 'Verso do Documento de Identidade',
  proof_of_address: 'Comprovante de Endereço',
  selfie_with_id: 'Selfie com Documento de Identidade',
};

export const KycSubmissionSection: React.FC = () => {
  const { user, profile } = useAuth();
  const [kycDocuments, setKycDocuments] = useState<KycDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadingDocType, setUploadingDocType] = useState<KycDocument['document_type'] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchKycDocuments = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase
        .from('kyc_documents')
        .select('*')
        .eq('user_id', user.id)
        .order('uploaded_at', { ascending: false }); // Get latest first

      if (error) throw error;

      // Filter to show only the latest submission for each document type
      const latestDocsMap = new Map<KycDocument['document_type'], KycDocument>();
      data.forEach(doc => {
        if (!latestDocsMap.has(doc.document_type)) {
          latestDocsMap.set(doc.document_type, doc);
        }
      });
      setKycDocuments(Array.from(latestDocsMap.values()));
    } catch (err: any) {
      console.error('Error fetching KYC documents:', err);
      setError(err.message || 'Falha ao carregar seus documentos KYC.');
      toast.error(err.message || 'Falha ao carregar seus documentos KYC.');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchKycDocuments();
  }, [fetchKycDocuments]);

  const handleDocumentUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
    documentType: KycDocument['document_type']
  ) => {
    const file = event.target.files?.[0];
    if (!file || !user?.id) return;

    const validation = validateDocumentFile(file);
    if (!validation.valid) {
      toast.error(validation.error || 'Arquivo inválido.');
      return;
    }

    setUploadingDocType(documentType);
    try {
      const { data, error } = await uploadKycDocument(file, user.id, documentType);

      if (error) {
        throw error;
      }

      // Insert a new record into kyc_documents table
      const { error: insertError } = await supabase.from('kyc_documents').insert({
        user_id: user.id,
        document_type: documentType,
        file_url: data.url,
        file_path: data.path,
        status: 'pending', // New submission is always pending
      });

      if (insertError) {
        throw insertError;
      }

      toast.success('Documento enviado com sucesso! Aguardando revisão.');
      fetchKycDocuments(); // Refresh the list
    } catch (err: any) {
      console.error('Error uploading KYC document:', err);
      toast.error(err.message || 'Falha ao enviar documento.');
    } finally {
      setUploadingDocType(null);
      // Clear the input field value to allow re-uploading the same file if needed
      event.target.value = '';
    }
  };

  const getDocumentStatusIcon = (status: KycDocument['status']) => {
    switch (status) {
      case 'approved': return <CheckCircle className="w-5 h-5 text-success" />;
      case 'rejected': return <XCircle className="w-5 h-5 text-error" />;
      case 'pending': return <Clock className="w-5 h-5 text-warning" />;
      default: return null;
    }
  };

  const getDocumentStatusText = (status: KycDocument['status']) => {
    switch (status) {
      case 'approved': return 'Aprovado';
      case 'rejected': return 'Rejeitado';
      case 'pending': return 'Pendente';
      default: return 'Desconhecido';
    }
  };

  const allDocumentTypes: KycDocument['document_type'][] = ['id_front', 'id_back', 'proof_of_address', 'selfie_with_id'];

  return (
    <div className="bg-surface p-6 rounded-lg shadow-md border border-border">
      <h2 className="text-2xl font-bold text-text mb-6">Meus Documentos KYC</h2>
      <p className="text-textSecondary mb-4">
        Aqui você pode gerenciar seus documentos de verificação de identidade.
        Se um documento for rejeitado, você poderá reenviá-lo.
      </p>

      {loading ? (
        <div className="flex items-center justify-center py-8 text-textSecondary">
          <Loader2 className="w-5 h-5 animate-spin mr-2" /> Carregando documentos...
        </div>
      ) : error ? (
        <div className="text-error text-center py-8">{error}</div>
      ) : (
        <div className="space-y-6">
          {allDocumentTypes.map((type) => {
            const latestDoc = kycDocuments.find(doc => doc.document_type === type);
            const isRejected = latestDoc?.status === 'rejected';
            const isPending = latestDoc?.status === 'pending';
            const isApproved = latestDoc?.status === 'approved';
            const canUpload = !isPending && !isApproved; // Can upload if rejected or not yet submitted

            return (
              <div key={type} className="bg-background p-4 rounded-lg border border-border flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-text mb-1">{documentTypeLabels[type]}</h3>
                  {latestDoc ? (
                    <>
                      <div className="flex items-center gap-2 text-sm text-textSecondary mb-2">
                        {getDocumentStatusIcon(latestDoc.status)}
                        <span>Status: <span className={`font-medium ${
                          isApproved ? 'text-success' :
                          isPending ? 'text-warning' : 'text-error'
                        }`}>{getDocumentStatusText(latestDoc.status)}</span></span>
                        <span className="ml-2">Último envio: {new Date(latestDoc.uploaded_at).toLocaleDateString()}</span>
                      </div>
                      {latestDoc.file_url && (
                        <a
                          href={latestDoc.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center text-primary hover:underline text-sm transition-colors mb-2"
                        >
                          Ver Documento Enviado <ExternalLink className="w-3 h-3 ml-1" />
                        </a>
                      )}
                      {isRejected && latestDoc.rejection_reason && (
                        <p className="text-sm text-error mt-2">
                          <span className="font-semibold">Motivo da Rejeição:</span> {latestDoc.rejection_reason}
                        </p>
                      )}
                    </>
                  ) : (
                    <p className="text-sm text-textSecondary italic">Nenhum documento enviado para este tipo.</p>
                  )}
                </div>

                <div className="flex-shrink-0">
                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    onChange={(e) => handleDocumentUpload(e, type)}
                    disabled={uploadingDocType === type || isPending || isApproved}
                    className="hidden"
                    id={`upload-${type}`}
                  />
                  <label
                    htmlFor={`upload-${type}`}
                    className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg transition-colors cursor-pointer
                      ${canUpload ? 'bg-primary/20 text-primary hover:bg-primary/30' : 'bg-gray-700 text-gray-400 cursor-not-allowed opacity-50'}
                    `}
                  >
                    {uploadingDocType === type ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Upload className="w-4 h-4" />
                    )}
                    {uploadingDocType === type ? 'Enviando...' : (isRejected || !latestDoc ? 'Reenviar / Enviar Documento' : 'Documento Aprovado')}
                  </label>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
