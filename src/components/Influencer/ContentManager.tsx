import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import {
  uploadContentImage,
  uploadContentVideo,
  uploadContentDocument,
  validateImageFile,
  validateVideoFile,
  validateDocumentFile,
  generateVideoThumbnail,
  uploadVideoThumbnail,
  formatFileSize
} from '../../lib/upload';
import { Plus, Image as ImageIcon, Video, FileText, Trash2, Eye, Heart, Upload, X, DollarSign, Calendar, TrendingUp } from 'lucide-react';
import type { Database } from '../../lib/database.types';

// Type for content posts including stats from RPC
type ContentWithStats = Database['public']['Functions']['get_user_content_with_stats']['Returns'][0];
type ContentTypeFilter = 'all' | 'image' | 'video' | 'document';
type SortBy = 'created_at' | 'views_count';
type SortOrder = 'desc' | 'asc';

export function ContentManager({ onUpdate }: { onUpdate: () => void }) {
  const { profile } = useAuth();
  const [contents, setContents] = useState<ContentWithStats[]>([]);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [loading, setLoading] = useState(true);
  // Removed filter and sort states from here, as they are now managed by InfluencerDashboard

  const loadContents = useCallback(async () => {
    if (!profile) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const { data, error } = await supabase.rpc('get_user_content_with_stats', {
      p_user_id: profile.id,
    });

    if (error) {
      console.error('[ContentManager] loadContents: Error fetching content:', error);
      alert('Erro ao carregar conteúdo: ' + error.message);
      setContents([]);
    } else if (data) {
      // ContentManager now only displays, filtering is done by the dashboard
      // We still sort by created_at desc for consistency in this management view
      const sortedData = data.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setContents(sortedData);
    } else {
      setContents([]);
    }
    setLoading(false);
  }, [profile]);

  useEffect(() => {
    loadContents();
  }, [loadContents]);

  const deleteContent = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este conteúdo?')) return;

    const { error } = await supabase
      .from('content_posts')
      .delete()
      .eq('id', id);

    if (!error) {
      loadContents();
      onUpdate(); // Notify dashboard to re-fetch its content
    } else {
      console.error('[ContentManager] deleteContent: Error deleting content:', error);
      alert('Erro ao excluir conteúdo: ' + error.message);
    }
  };

  if (loading) {
    return <div className="text-center py-12 text-text">Carregando...</div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6 flex-wrap gap-4">
        <h2 className="text-2xl font-bold text-text">Meu Conteúdo</h2>
        <button
          onClick={() => setShowUploadModal(true)}
          className="flex items-center gap-2 bg-primary text-white px-6 py-3 rounded-lg font-semibold hover:bg-primary/80 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Upload Novo Conteúdo
        </button>
      </div>

      {/* Filters and Sorting removed from here */}

      {contents.length === 0 ? (
        <div className="text-center py-12 bg-surface rounded-xl border border-border">
          <Video className="w-16 h-16 text-textSecondary mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-text mb-2">Nenhum conteúdo ainda</h3>
          <p className="text-textSecondary mb-6">Comece fazendo upload de suas fotos, vídeos ou documentos</p>
          <button
            onClick={() => setShowUploadModal(true)}
            className="bg-primary text-white px-6 py-3 rounded-lg font-semibold hover:bg-primary/80 transition-colors"
          >
            Upload Primeiro Conteúdo
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {contents.map((content) => (
            <div key={content.content_id} className="bg-surface rounded-xl shadow-lg border border-border overflow-hidden hover:shadow-xl transition-shadow">
              <div className="relative aspect-video bg-background flex items-center justify-center">
                {content.type === 'video' ? (
                  <video
                    src={content.file_url}
                    className="w-full h-full object-cover"
                    muted
                    playsInline
                    poster={content.thumbnail_url || ''}
                    onError={(e) => {
                      const target = e.target as HTMLVideoElement;
                      target.poster = content.thumbnail_url || '';
                    }}
                  />
                ) : content.type === 'image' ? (
                  <img
                    src={content.thumbnail_url || content.file_url}
                    alt={content.title}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      if (content.thumbnail_url && target.src !== content.file_url) {
                        target.src = content.file_url;
                      }
                    }}
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center text-textSecondary">
                    <FileText className="w-16 h-16" />
                    <span className="mt-2 text-sm font-medium">Documento</span>
                  </div>
                )}
                <div className="absolute top-2 right-2 flex gap-2">
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                    content.is_free ? 'bg-success text-white' : 'bg-primary text-white'
                  }`}>
                    {content.is_free ? 'Gratuito' : 'Pago'}
                  </span>
                  {content.is_purchasable && (
                    <span className="px-3 py-1 rounded-full text-xs font-semibold bg-secondary text-white flex items-center gap-1">
                      <DollarSign className="w-3 h-3" />
                      {content.price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </span>
                  )}
                  <span className="px-3 py-1 rounded-full text-xs font-semibold bg-background text-textSecondary flex items-center gap-1">
                    {content.type === 'video' ? <Video className="w-3 h-3" /> :
                     content.type === 'image' ? <ImageIcon className="w-3 h-3" /> :
                     <FileText className="w-3 h-3" />}
                  </span>
                </div>
              </div>
              <div className="p-4">
                <h3 className="font-semibold text-text mb-1">{content.title}</h3>
                {content.description && (
                  <p className="text-sm text-textSecondary mb-3 line-clamp-2">{content.description}</p>
                )}
                <div className="flex items-center justify-between text-sm text-textSecondary mb-3">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1">
                      <Eye className="w-4 h-4" />
                      {content.views_count || 0}
                    </span>
                    <span className="flex items-center gap-1">
                      <Heart className="w-4 h-4" />
                      {content.likes_count || 0}
                    </span>
                  </div>
                  <span className="text-xs">{new Date(content.created_at).toLocaleDateString('pt-BR')}</span>
                </div>
                <button
                  onClick={() => deleteContent(content.content_id)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-error/10 text-error rounded-lg hover:bg-error/20 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  Excluir
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showUploadModal && (
        <UploadModal
          onClose={() => setShowUploadModal(false)}
          onSuccess={() => {
            loadContents();
            onUpdate(); // Notify dashboard to re-fetch its content
            setShowUploadModal(false);
          }}
        />
      )}
    </div>
  );
}

function UploadModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const { profile } = useAuth();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [contentType, setContentType] = useState<ContentTypeFilter>('image');
  const [fileUrl, setFileUrl] = useState('');
  const [filePath, setFilePath] = useState('');
  const [thumbnailUrl, setThumbnailUrl] = useState('');
  const [isFree, setIsFree] = useState(false);
  const [isPurchasable, setIsPurchasable] = useState(false);
  const [price, setPrice] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [uploadProgress, setUploadProgress] = useState('');

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !profile) return;

    setUploadError('');
    setUploadProgress('');

    let validation;
    let uploadFunction;
    let progressMessage: string;

    if (contentType === 'image') {
      validation = validateImageFile(file);
      uploadFunction = uploadContentImage;
      progressMessage = 'Fazendo upload da imagem...';
    } else if (contentType === 'video') {
      validation = validateVideoFile(file);
      uploadFunction = uploadContentVideo;
      progressMessage = 'Fazendo upload do vídeo... Isso pode levar alguns minutos.';
    } else { // contentType === 'document'
      validation = validateDocumentFile(file);
      uploadFunction = uploadContentDocument;
      progressMessage = 'Fazendo upload do documento...';
    }

    if (!validation.valid) {
      setUploadError(validation.error || 'Arquivo inválido');
      return;
    }

    setUploading(true);
    setUploadProgress(progressMessage);

    const { data, error } = await uploadFunction(file, profile.id);

    if (error) {
      setUploading(false);
      setUploadProgress('');
      setUploadError(error.message);
      return;
    }

    if (data) {
      setFileUrl(data.url);
      setFilePath(data.path);
      setUploadError('');

      if (contentType === 'image' || contentType === 'document') {
        setThumbnailUrl(data.url);
      } else if (contentType === 'video') {
        setUploadProgress('Gerando thumbnail do vídeo...');
        const { data: thumbnailBlob, error: thumbError } = await generateVideoThumbnail(file);

        if (!thumbError && thumbnailBlob) {
          const { data: thumbData, error: thumbUploadError } = await uploadVideoThumbnail(
            thumbnailBlob,
            profile.id,
            data.path
          );

          if (!thumbUploadError && thumbData) {
            setThumbnailUrl(thumbData.url);
          } else if (thumbUploadError) {
            console.error('Erro ao fazer upload da thumbnail:', thumbUploadError.message);
            setUploadError('Erro ao fazer upload da thumbnail: ' + thumbUploadError.message);
          }
        } else if (thumbError) {
          console.error('Erro ao gerar thumbnail:', thumbError);
          setUploadError('Erro ao gerar thumbnail: ' + thumbError);
        }
      }
    }

    setUploading(false);
    setUploadProgress('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !fileUrl || !filePath) {
      setUploadError('Por favor, faça upload do arquivo primeiro');
      return;
    }
    if (isPurchasable && price <= 0) {
      setUploadError('O preço deve ser maior que zero para conteúdo comprável.');
      return;
    }

    setLoading(true);

    const { error } = await supabase.from('content_posts').insert({
      user_id: profile.id,
      title,
      description,
      type: contentType,
      file_url: fileUrl,
      file_path: filePath,
      thumbnail_url: thumbnailUrl || null,
      is_free: isFree,
      is_purchasable: isPurchasable,
      price: isPurchasable ? price : 0,
      status: 'approved',
    });

    setLoading(false);

    if (error) {
      alert('Erro ao salvar conteúdo: ' + error.message);
    } else {
      onSuccess();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-surface rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-2xl font-bold text-text">Upload Novo Conteúdo</h3>
            <button
              type="button"
              onClick={onClose}
              className="p-2 hover:bg-background rounded-lg transition-colors"
            >
              <X className="w-6 h-6 text-textSecondary" />
            </button>
          </div>

          {uploadError && (
            <div className="bg-error/10 border border-error/30 text-error px-4 py-3 rounded-lg mb-4">
              {uploadError}
            </div>
          )}

          {uploadProgress && (
            <div className="bg-primary/10 border border-primary/30 text-primary px-4 py-3 rounded-lg mb-4">
              {uploadProgress}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-textSecondary mb-2">Título</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                className="w-full px-4 py-2 border border-border bg-background text-text rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="Dê um título ao seu conteúdo"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-textSecondary mb-2">Descrição</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="w-full px-4 py-2 border border-border bg-background text-text rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="Descreva seu conteúdo"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-textSecondary mb-2">Tipo de Conteúdo</label>
              <div className="grid grid-cols-3 gap-4">
                <button
                  type="button"
                  onClick={() => setContentType('image')}
                  className={`flex items-center justify-center gap-2 p-4 rounded-lg border-2 transition-all ${
                    contentType === 'image'
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border hover:border-textSecondary text-textSecondary'
                  }`}
                >
                  <ImageIcon className="w-5 h-5" />
                  Imagem
                </button>
                <button
                  type="button"
                  onClick={() => setContentType('video')}
                  className={`flex items-center justify-center gap-2 p-4 rounded-lg border-2 transition-all ${
                    contentType === 'video'
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border hover:border-textSecondary text-textSecondary'
                  }`}
                >
                  <Video className="w-5 h-5" />
                  Vídeo
                </button>
                <button
                  type="button"
                  onClick={() => setContentType('document')}
                  className={`flex items-center justify-center gap-2 p-4 rounded-lg border-2 transition-all ${
                    contentType === 'document'
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border hover:border-textSecondary text-textSecondary'
                  }`}
                >
                  <FileText className="w-5 h-5" />
                  Documento
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-textSecondary mb-2">
                Arquivo {contentType === 'image' ? '(Imagem)' : contentType === 'video' ? '(Vídeo)' : '(Documento)'}
              </label>

              {fileUrl && (
                <div className="mb-3 p-4 bg-success/10 border border-success/30 rounded-lg">
                  <p className="text-sm text-success font-semibold">✓ Arquivo enviado com sucesso!</p>
                  {contentType === 'image' && (
                    <img src={fileUrl} alt="Preview" className="mt-2 w-full h-40 object-cover rounded-lg" />
                  )}
                  {contentType === 'document' && (
                    <div className="mt-2 flex items-center gap-2 text-text">
                      <FileText className="w-6 h-6" />
                      <span>{fileUrl.split('/').pop()}</span>
                    </div>
                  )}
                </div>
              )}

              <input
                type="file"
                accept={
                  contentType === 'image'
                    ? 'image/*'
                    : contentType === 'video'
                    ? 'video/*'
                    : '.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip,.rar'
                }
                onChange={handleFileUpload}
                disabled={uploading}
                className="hidden"
                id="content-file-upload"
              />
              <label
                htmlFor="content-file-upload"
                className={`inline-flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary/80 transition-colors cursor-pointer font-semibold ${
                  uploading ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                <Upload className="w-5 h-5" />
                {uploading
                  ? 'Enviando...'
                  : contentType === 'image'
                  ? `Upload da Imagem (máx ${formatFileSize(2 * 1024 * 1024)})`
                  : contentType === 'video'
                  ? `Upload do Vídeo (máx ${formatFileSize(50 * 1024 * 1024)})`
                  : `Upload do Documento (máx ${formatFileSize(10 * 1024 * 1024)})`}
              </label>
              <p className="text-xs text-textSecondary mt-2">
                {contentType === 'image'
                  ? 'Formatos: JPEG, PNG, WebP'
                  : contentType === 'video'
                  ? 'Formatos: MP4, MOV, AVI, WebM'
                  : 'Formatos: PDF, DOCX, XLSX, TXT, ZIP, RAR'}
              </p>
            </div>

            {contentType === 'video' && thumbnailUrl && (
              <div>
                <label className="block text-sm font-medium text-textSecondary mb-2">Thumbnail do Vídeo</label>
                <input
                  type="url"
                  value={thumbnailUrl}
                  onChange={(e) => setThumbnailUrl(e.target.value)}
                  className="w-full px-4 py-2 border border-border bg-background text-text rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="https://exemplo.com/thumbnail.jpg"
                />
              </div>
            )}

            <div className="flex items-center gap-3 bg-background p-4 rounded-lg border border-border">
              <input
                type="checkbox"
                id="isFree"
                checked={isFree}
                onChange={(e) => setIsFree(e.target.checked)}
                className="w-5 h-5 text-primary rounded focus:ring-2 focus:ring-primary"
              />
              <label htmlFor="isFree" className="flex-1">
                <span className="font-medium text-text">Conteúdo Gratuito</span>
                <p className="text-sm text-textSecondary">Marque se este conteúdo deve ser visível para todos</p>
              </label>
            </div>

            <div className="flex items-center gap-3 bg-background p-4 rounded-lg border border-border">
              <input
                type="checkbox"
                id="isPurchasable"
                checked={isPurchasable}
                onChange={(e) => setIsPurchasable(e.target.checked)}
                className="w-5 h-5 text-secondary rounded focus:ring-2 focus:ring-secondary"
              />
              <label htmlFor="isPurchasable" className="flex-1">
                <span className="font-medium text-text">Venda Avulsa</span>
                <p className="text-sm text-textSecondary">Permitir que usuários comprem este conteúdo individualmente (mesmo sem assinatura)</p>
              </label>
            </div>

            {isPurchasable && (
              <div>
                <label className="block text-sm font-medium text-textSecondary mb-2">Preço (BRL)</label>
                <input
                  type="number"
                  value={price}
                  onChange={(e) => setPrice(parseFloat(e.target.value))}
                  min="0.01"
                  step="0.01"
                  required={isPurchasable}
                  className="w-full px-4 py-2 border border-border bg-background text-text rounded-lg focus:ring-2 focus:ring-secondary focus:border-transparent"
                  placeholder="0.00"
                />
              </div>
            )}

            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-6 py-3 border border-border text-textSecondary rounded-lg font-semibold hover:bg-background transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading || uploading}
                className="flex-1 px-6 py-3 bg-primary text-white rounded-lg font-semibold hover:bg-primary/80 transition-colors disabled:opacity-50"
              >
                {loading ? 'Publicando...' : 'Publicar'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
