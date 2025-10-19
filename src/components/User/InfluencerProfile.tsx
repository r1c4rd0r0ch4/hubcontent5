import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { ArrowLeft, Heart, MessageSquare, Instagram, Twitter, Play, Eye, Video, Flag, Loader2, DollarSign, ImageIcon } from 'lucide-react';
import { Lightbox } from '../Shared/Lightbox';
import { VideoPlayer } from '../Shared/VideoPlayer';
import { StreamingBookModal } from './StreamingBookModal';
import { ReportContentModal } from './ReportContentModal';
import { PurchaseContentModal } from './PurchaseContentModal';
import { toast } from 'react-hot-toast';
import type { Database } from '../../lib/database.types';

type ContentPost = Database['public']['Tables']['content_posts']['Row'];

interface ContentWithStatsAndStatus extends ContentPost {
  isLiked: boolean;
  isPurchased: boolean;
  likes_count: number;
  views_count: number;
}

interface InfluencerData {
  profile: Database['public']['Tables']['profiles']['Row'];
  influencer_profile_id: string;
  subscription_price: number;
  instagram: string | null;
  twitter: string | null;
  tiktok: string | null;
  total_subscribers: number;
  is_subscribed: boolean;
  subscription_expires?: string;
}

export function InfluencerProfile({ influencerId, onBack }: { influencerId: string; onBack: () => void }) {
  const { profile: currentUser } = useAuth();
  const [influencer, setInfluencer] = useState<InfluencerData | null>(null);
  const [contents, setContents] = useState<ContentWithStatsAndStatus[]>([]);
  const [showSubscribeModal, setShowSubscribeModal] = useState(false);
  const [showStreamingModal, setShowStreamingModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [selectedContentToReport, setSelectedContentToReport] = useState<string | null>(null);
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [selectedContentToPurchase, setSelectedContentToPurchase] = useState<ContentPost | null>(null);
  const [streamingEnabled, setStreamingEnabled] = useState(false);
  const [selectedContentIndex, setSelectedContentIndex] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  const loadInfluencerData = useCallback(async () => {
    console.log('loadInfluencerData: Iniciando carregamento de dados do influencer...');
    setLoading(true); // Garante que o estado de carregamento é ativado

    try {
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*, influencer_profiles(id, subscription_price, instagram, twitter, tiktok, other_links)')
        .eq('id', influencerId)
        .eq('account_status', 'approved')
        .maybeSingle();

      if (profileError) {
        console.error('loadInfluencerData: Erro ao buscar perfil do influencer:', profileError.message);
        setInfluencer(null); // Define influencer como null em caso de erro
        return;
      }

      let isSubscribed = false;
      let subscriptionExpires;
      let actualInfluencerProfileId: string | null = null;
      let totalSubscribers = 0; // Inicializa totalSubscribers

      if (profileData && profileData.influencer_profiles) {
        const influencerProfile = Array.isArray(profileData.influencer_profiles) ? profileData.influencer_profiles[0] : profileData.influencer_profiles;
        actualInfluencerProfileId = influencerProfile?.id || null;

        // --- CORREÇÃO: Obter contagem de assinantes usando RPC ---
        const { data: countData, error: countError } = await supabase.rpc('get_influencer_subscriber_count', {
          p_influencer_id: influencerId, // Este RPC espera profiles.id
        });

        if (countError) {
          console.error('loadInfluencerData: Erro ao buscar contagem de assinantes:', countError.message);
        } else {
          totalSubscribers = countData || 0;
        }
        // --- FIM DA CORREÇÃO ---

        if (currentUser && actualInfluencerProfileId) {
          const { data: subData, error: subError } = await supabase
            .from('subscriptions')
            .select('*')
            .eq('subscriber_id', currentUser.id)
            .eq('influencer_id', actualInfluencerProfileId)
            .eq('status', 'active')
            .maybeSingle();

          if (subError) {
            console.error('loadInfluencerData: Erro ao buscar status da assinatura:', subError.message);
          }

          isSubscribed = !!subData;
          subscriptionExpires = subData?.expires_at;
        }

        setInfluencer({
          profile: profileData,
          influencer_profile_id: actualInfluencerProfileId || '',
          subscription_price: influencerProfile?.subscription_price || 0,
          instagram: influencerProfile?.instagram || null,
          twitter: influencerProfile?.twitter || null,
          tiktok: influencerProfile?.tiktok || null,
          total_subscribers: totalSubscribers, // Usa a contagem de assinantes obtida
          is_subscribed: isSubscribed,
          subscription_expires: subscriptionExpires,
        });
        console.log('loadInfluencerData: Dados do influencer carregados com sucesso.');
      } else {
        console.log('loadInfluencerData: Influencer não encontrado ou perfil não aprovado.');
        setInfluencer(null);
      }
    } catch (error: any) {
      console.error('loadInfluencerData: Erro inesperado ao carregar dados do influencer:', error.message);
      setInfluencer(null); // Garante que o estado do influencer é limpo em caso de erro
    } finally {
      console.log('loadInfluencerData: Finalizando carregamento, definindo loading para false.');
      setLoading(false);
    }
  }, [influencerId, currentUser]);

  const loadContents = useCallback(async () => {
    console.log('loadContents: Iniciando carregamento de conteúdo...');
    try {
      const { data: contentPosts, error: contentError } = await supabase
        .from('content_posts')
        .select(`
          *,
          likes_count:content_likes(count),
          views_count:content_views(count)
        `)
        .eq('user_id', influencerId)
        .eq('status', 'approved')
        .order('created_at', { ascending: false });

      if (contentError) {
        console.error('loadContents: Erro ao buscar posts de conteúdo:', contentError);
        setContents([]); // Define como array vazio em caso de erro
        return;
      }

      if (contentPosts) {
        const contentsWithStatsAndStatus = await Promise.all(
          contentPosts.map(async (content) => {
            const { data: likeData } = currentUser
              ? await supabase
                  .from('content_likes')
                  .select('id')
                  .eq('content_id', content.id)
                  .eq('user_id', currentUser.id)
                  .maybeSingle()
              : { data: null };

            const { data: purchasedData } = currentUser
              ? await supabase
                  .from('user_purchased_content')
                  .select('id')
                  .eq('content_id', content.id)
                  .eq('user_id', currentUser.id)
                  .maybeSingle()
              : { data: null };

            return {
              ...content,
              isLiked: !!likeData,
              isPurchased: !!purchasedData,
              likes_count: content.likes_count[0]?.count || 0,
              views_count: content.views_count[0]?.count || 0,
            };
          })
        );
        setContents(contentsWithStatsAndStatus);
        console.log('loadContents: Conteúdo carregado com sucesso.');
      }
    } catch (error: any) {
      console.error('loadContents: Erro inesperado ao carregar conteúdo:', error.message);
      setContents([]);
    }
  }, [influencerId, currentUser]);

  const checkStreamingEnabled = useCallback(async () => {
    console.log('checkStreamingEnabled: Verificando status de streaming...');
    try {
      const { data, error } = await supabase
        .from('streaming_settings')
        .select('is_enabled')
        .eq('influencer_id', influencerId)
        .eq('is_enabled', true)
        .maybeSingle();

      if (error) {
        console.error('checkStreamingEnabled: Erro ao verificar streaming:', error.message);
      }
      setStreamingEnabled(!!data);
      console.log('checkStreamingEnabled: Status de streaming verificado:', !!data);
    } catch (error: any) {
      console.error('checkStreamingEnabled: Erro inesperado ao verificar streaming:', error.message);
      setStreamingEnabled(false);
    }
  }, [influencerId]);

  useEffect(() => {
    console.log('useEffect: InfluencerProfile montado ou dependências alteradas.');
    loadInfluencerData();
    loadContents();
    checkStreamingEnabled();

    // O filtro do canal de realtime para subscriptions ainda usa profiles.id.
    // Uma solução mais robusta seria recriar o canal quando influencer.influencer_profile_id estiver disponível.
    // Por enquanto, vamos manter assim para não complicar o debug do carregamento.
    const contentIds = contents.map(c => c.id).join(',') || 'NULL';

    const channel = supabase
      .channel(`influencer_profile_updates:${influencerId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'subscriptions',
          filter: `influencer_id=eq.${influencerId}`, // Pode precisar ser ajustado para influencer_profiles.id
        },
        () => {
          console.log('Realtime: Mudança na tabela subscriptions detectada. Recarregando dados do influencer.');
          loadInfluencerData();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'content_likes',
          filter: `content_id=in.(${contentIds})`,
        },
        () => {
          console.log('Realtime: Mudança na tabela content_likes detectada. Recarregando conteúdo.');
          loadContents();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_purchased_content',
          filter: `content_id=in.(${contentIds})`,
        },
        () => {
          console.log('Realtime: Mudança na tabela user_purchased_content detectada. Recarregando conteúdo.');
          loadContents();
        }
      )
      .subscribe();

    return () => {
      console.log('useEffect cleanup: Removendo canal de realtime.');
      supabase.removeChannel(channel);
    };
  }, [influencerId, loadInfluencerData, loadContents, checkStreamingEnabled]); // Removido contents.length

  const handleLike = async (contentId: string) => {
    if (!currentUser) {
      toast.error('Você precisa estar logado para curtir conteúdo.');
      return;
    }

    console.log('handleLike: Tentando curtir/descurtir conteúdo. Content ID:', contentId, 'User ID:', currentUser.id);

    const content = contents.find(c => c.id === contentId);
    if (!content) {
      console.error('handleLike: Conteúdo não encontrado no estado local para ID:', contentId);
      toast.error('Conteúdo não encontrado para curtir/descurtir.');
      return;
    }
    console.log('handleLike: Conteúdo encontrado no estado local:', content); // Log adicional

    try {
      if (content.isLiked) {
        console.log('handleLike: Descurtindo. Content ID:', contentId, 'User ID:', currentUser.id, 'Influencer ID (content owner):', content.user_id);
        const { error } = await supabase
          .from('content_likes')
          .delete()
          .eq('content_id', contentId)
          .eq('user_id', currentUser.id);
        if (error) throw error;
        console.log('handleLike: Conteúdo descurtido com sucesso.');
      } else {
        console.log('handleLike: Curtindo. Content ID:', contentId, 'User ID:', currentUser.id, 'Influencer ID (content owner):', content.user_id);
        const { error } = await supabase
          .from('content_likes')
          .insert({
            content_id: contentId,
            user_id: currentUser.id,
          });
        if (error) throw error;
        console.log('handleLike: Conteúdo curtido com sucesso.');
      }
      loadContents();
    } catch (error: any) {
      console.error('handleLike: Erro ao curtir/descurtir conteúdo:', error.message);
      toast.error('Falha ao curtir/descurtir conteúdo: ' + error.message);
    }
  };

  const handleStartConversation = async () => {
    if (!currentUser || !influencer) {
      console.warn('handleStartConversation: Usuário atual ou influencer não definidos.');
      return;
    }

    console.log('handleStartConversation: Iniciando conversa com influencer:', influencer.profile.id);

    const { data: existingConversation, error: convError } = await supabase
      .from('conversations')
      .select('id')
      .or(`and(participant1_id.eq.${currentUser.id},participant2_id.eq.${influencer.profile.id}),and(participant1_id.eq.${influencer.profile.id},participant2_id.eq.${currentUser.id})`)
      .maybeSingle();

    if (convError) {
      console.error('handleStartConversation: Erro ao verificar conversa existente:', convError);
      toast.error('Falha ao iniciar conversa.');
      return;
    }

    let conversationId;
    if (existingConversation) {
      conversationId = existingConversation.id;
      console.log('handleStartConversation: Conversa existente encontrada:', conversationId);
    } else {
      const { data: newConversation, error: createConvError } = await supabase
        .from('conversations')
        .insert({
          participant1_id: currentUser.id,
          participant2_id: influencer.profile.id,
        })
        .select('id')
        .single();

      if (createConvError) {
        console.error('handleStartConversation: Erro ao criar nova conversa:', createConvError);
        toast.error('Falha ao criar nova conversa.');
        return;
      }
      conversationId = newConversation.id;
      console.log('handleStartConversation: Nova conversa criada:', conversationId);
    }

    const { error: messageError } = await supabase.from('messages').insert({
      conversation_id: conversationId,
      sender_id: currentUser.id,
      receiver_id: influencer.profile.id,
      content: 'Olá! Gostaria de conversar com você.',
    });

    if (messageError) {
      console.error('handleStartConversation: Erro ao enviar mensagem inicial:', messageError);
      toast.error('Falha ao enviar mensagem inicial.');
      return;
    }

    console.log('handleStartConversation: Mensagem inicial enviada. Redirecionando para mensagens.');
    window.location.hash = 'messages';
  };

  const recordView = async (contentId: string) => {
    if (!currentUser) {
      console.log('recordView: Usuário não logado, visualização não será registrada.');
      return;
    }

    console.log('recordView: Registrando visualização para Content ID:', contentId, 'Viewer ID:', currentUser.id);

    try {
      const { data, error } = await supabase.rpc('record_content_view', {
        p_content_id: contentId,
        p_viewer_id: currentUser.id,
      });

      if (error) throw error;

      if (data !== null) {
        setContents(prev =>
          prev.map(c =>
            c.id === contentId ? { ...c, views_count: data } : c
          )
        );
        console.log('recordView: Visualização registrada. Nova contagem de views:', data);
      }
    } catch (error: any) {
      console.error('recordView: Erro ao registrar visualização:', error.message);
    }
  };

  const handleReportContent = (contentId: string) => {
    console.log('handleReportContent: Abrindo modal de denúncia para Content ID:', contentId);
    setSelectedContentToReport(contentId);
    setShowReportModal(true);
  };

  const handlePurchaseContent = (content: ContentPost) => {
    console.log('handlePurchaseContent: Abrindo modal de compra para Content ID:', content.id);
    setSelectedContentToPurchase(content);
    setShowPurchaseModal(true);
  };

  if (loading) {
    console.log('Render: Exibindo estado de carregamento...');
    return (
      <div className="flex items-center justify-center text-primary text-lg py-12">
        <Loader2 className="animate-spin mr-2" size={24} /> Carregando perfil do influencer...
      </div>
    );
  }

  if (!influencer) {
    console.log('Render: Influencer não encontrado ou não aprovado.');
    return <div className="text-center py-12 text-text">Influencer não encontrado ou não aprovado.</div>;
  }

  const isContentAccessible = (content: ContentWithStatsAndStatus) => {
    if (content.is_free) return true;
    if (influencer.is_subscribed) return true;
    if (content.isPurchased) return true;
    if (currentUser?.id === influencerId) return true;
    return false;
  };

  console.log('Render: Exibindo perfil do influencer.');
  return (
    <div>
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-textSecondary hover:text-text mb-6 transition-colors"
      >
        <ArrowLeft className="w-5 h-5" />
        Voltar
      </button>

      <div className="bg-surface rounded-2xl shadow-xl overflow-hidden mb-8 border border-border">
        <div className="relative h-64 bg-gradient-to-br from-secondary to-primary">
          {influencer.profile.cover_photo_url ? (
            <img
              src={influencer.profile.cover_photo_url}
              alt="Cover"
              className="w-full h-full object-cover"
            />
          ) : influencer.profile.avatar_url ? (
            <img
              src={influencer.profile.avatar_url}
              alt={influencer.profile.username}
              className="w-full h-full object-cover opacity-50"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-white text-8xl font-bold">
              {influencer.profile.username[0].toUpperCase()}
            </div>
          )}
        </div>

        <div className="p-8">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-text mb-2">
                {influencer.profile.full_name || `@${influencer.profile.username}`}
              </h1>
              <p className="text-lg text-textSecondary mb-4">@{influencer.profile.username}</p>

              {influencer.profile.bio && (
                <p className="text-textSecondary mb-6">{influencer.profile.bio}</p>
              )}

              <div className="flex items-center gap-4 text-sm text-textSecondary mb-6">
                <span className="font-semibold">{influencer.total_subscribers} assinantes</span>
                <span>•</span>
                <span>{contents.length} posts</span>
              </div>

              <div className="flex items-center gap-4">
                {influencer.instagram && (
                  <a
                    href={`https://instagram.com/${influencer.instagram.replace('@', '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-accent hover:text-accent/90"
                  >
                    <Instagram className="w-6 h-6" />
                  </a>
                )}
                {influencer.twitter && (
                  <a
                    href={`https://twitter.com/${influencer.twitter.replace('@', '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-secondary hover:text-secondary/90"
                  >
                    <Twitter className="w-6 h-6" />
                  </a>
                )}
              </div>
            </div>

            <div className="bg-background rounded-xl p-6 min-w-[280px] border border-border">
              {influencer.is_subscribed ? (
                <div>
                  <div className="bg-success/20 text-success px-4 py-2 rounded-lg text-center font-semibold mb-4">
                    Você está inscrito
                  </div>
                  <p className="text-sm text-textSecondary text-center mb-4">
                    Válido até {new Date(influencer.subscription_expires!).toLocaleDateString('pt-BR')}
                  </p>
                  <div className="space-y-3">
                    <button
                      onClick={handleStartConversation}
                      className="w-full flex items-center justify-center gap-2 bg-accent text-white py-3 rounded-lg font-semibold hover:bg-accent/90 transition-colors"
                    >
                      <MessageSquare className="w-5 h-5" />
                      Enviar Mensagem
                    </button>
                    {streamingEnabled && (
                      <button
                        onClick={() => setShowStreamingModal(true)}
                        className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-primary to-accent text-white py-3 rounded-lg font-semibold hover:from-primary/90 hover:to-accent/90 transition-all"
                      >
                        <Video className="w-5 h-5" />
                        Reservar Streaming
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <div>
                  <div className="text-center mb-4">
                    <span className="text-textSecondary">Assinatura mensal</span>
                    <div className="text-3xl font-bold text-text mt-2">
                      R$ {influencer.subscription_price.toFixed(2)}
                    </div>
                  </div>
                  <button
                    onClick={() => setShowSubscribeModal(true)}
                    className="w-full bg-accent text-white py-3 rounded-lg font-semibold hover:bg-accent/90 transition-colors"
                  >
                    Assinar Agora
                  </button>
                  <p className="text-xs text-textSecondary text-center mt-3">
                    Acesse conteúdo exclusivo
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="mb-6">
        <h2 className="text-2xl font-bold text-text">Conteúdo</h2>
      </div>

      {contents.length === 0 ? (
        <div className="text-center py-12 bg-background rounded-xl border border-border">
          <p className="text-textSecondary">Nenhum conteúdo disponível ainda</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {contents.map((content, index) => (
            <div key={content.id} className="bg-background rounded-xl shadow-md overflow-hidden hover:shadow-lg transition-shadow border border-border">
              <div
                className="relative aspect-video bg-surface/50 group"
              >
                {isContentAccessible(content) ? (
                  <div onClick={() => {
                    setSelectedContentIndex(index);
                    recordView(content.id);
                  }} className="cursor-pointer">
                    {content.type === 'video' ? (
                      <video
                        src={content.file_url}
                        className="w-full h-full object-cover"
                        muted
                        playsInline
                        poster={content.thumbnail_url || ''}
                      />
                    ) : (
                      <img
                        src={content.thumbnail_url || content.file_url}
                        alt={content.title}
                        className="w-full h-full object-cover group-hover:opacity-90 transition-opacity"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src = content.file_url;
                        }}
                      />
                    )}
                    {content.type === 'video' && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="bg-black bg-opacity-50 rounded-full p-4">
                          <Play className="w-8 h-8 text-white" />
                        </div>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all flex items-center justify-center">
                      <span className="text-white opacity-0 group-hover:opacity-100 font-semibold">
                        Ver em tamanho completo
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center bg-background/70 text-textSecondary p-4">
                    {content.type === 'video' ? <Video className="w-12 h-12 mb-2" /> : <ImageIcon className="w-12 h-12 mb-2" />}
                    <p className="text-center text-sm font-medium">Conteúdo Exclusivo</p>
                    {content.is_purchasable && !content.isPurchased && (
                      <button
                        onClick={() => handlePurchaseContent(content)}
                        className="mt-3 flex items-center gap-1 bg-secondary text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-secondary/90 transition-colors"
                      >
                        <DollarSign className="w-4 h-4" /> Comprar por R$ {content.price.toFixed(2)}
                      </button>
                    )}
                    {!content.is_purchasable && !influencer.is_subscribed && (
                      <button
                        onClick={() => setShowSubscribeModal(true)}
                        className="mt-3 bg-accent text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-accent/90 transition-colors"
                      >
                        Assinar para ver
                      </button>
                    )}
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
                  {content.isPurchased && (
                    <span className="px-3 py-1 rounded-full text-xs font-semibold bg-success text-white">
                      Comprado
                    </span>
                  )}
                </div>
              </div>
              <div className="p-4">
                <h3 className="font-semibold text-text mb-2">{content.title}</h3>
                {content.description && (
                  <p className="text-sm text-textSecondary mb-3 line-clamp-2">{content.description}</p>
                )}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleLike(content.id);
                      }}
                      className="flex items-center gap-1 text-textSecondary hover:text-error transition-colors"
                    >
                      <Heart
                        className={`w-5 h-5 ${content.isLiked ? 'fill-error text-error' : ''}`}
                      />
                      <span className="text-sm font-semibold">{content.likes_count}</span>
                    </button>
                    <div className="flex items-center gap-1 text-textSecondary">
                      <Eye className="w-5 h-5" />
                      <span className="text-sm font-semibold">{content.views_count || 0}</span>
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleReportContent(content.id);
                    }}
                    className="flex items-center gap-1 text-textSecondary hover:text-error transition-colors"
                    title="Denunciar Conteúdo"
                  >
                    <Flag className="w-5 h-5" />
                  </button>
                  <span className="text-xs text-textSecondary">
                    {new Date(content.created_at).toLocaleDateString('pt-BR')}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedContentIndex !== null && contents[selectedContentIndex] && isContentAccessible(contents[selectedContentIndex]) && (
        <Lightbox
          imageUrl={contents[selectedContentIndex].file_url}
          title={contents[selectedContentIndex].title}
          description={contents[selectedContentIndex].description || undefined}
          likes={contents[selectedContentIndex].likes_count}
          views={contents[selectedContentIndex].views_count || 0}
          isLiked={contents[selectedContentIndex].isLiked}
          isVideo={contents[selectedContentIndex].type === 'video'}
          onClose={() => setSelectedContentIndex(null)}
          onLike={() => handleLike(contents[selectedContentIndex].id)}
          onPrevious={selectedContentIndex > 0 ? () => setSelectedContentIndex(selectedContentIndex - 1) : undefined}
          onNext={selectedContentIndex < contents.length - 1 ? () => setSelectedContentIndex(selectedContentIndex + 1) : undefined}
          hasPrevious={selectedContentIndex > 0}
          hasNext={selectedContentIndex < contents.length - 1}
        />
      )}

      {showSubscribeModal && (
        <SubscribeModal
          influencer={influencer}
          onClose={() => setShowSubscribeModal(false)}
          onSuccess={() => {
            setShowSubscribeModal(false);
            loadInfluencerData();
            loadContents();
            toast.success('Assinatura realizada com sucesso!');
          }}
        />
      )}

      {showStreamingModal && (
        <StreamingBookModal
          influencerId={influencerId}
          influencerName={influencer.profile.full_name || `@${influencer.profile.username}`}
          onClose={() => setShowStreamingModal(false)}
          onSuccess={() => {
            setShowStreamingModal(false);
            toast.success('Solicitação de streaming enviada! Aguarde a aprovação do influencer.');
          }}
        />
      )}

      {showReportModal && selectedContentToReport && (
        <ReportContentModal
          contentId={selectedContentToReport}
          onClose={() => {
            setShowReportModal(false);
            setSelectedContentToReport(null);
            loadContents();
          }}
        />
      )}

      {showPurchaseModal && selectedContentToPurchase && (
        <PurchaseContentModal
          contentId={selectedContentToPurchase.id}
          contentTitle={selectedContentToPurchase.title}
          contentPrice={selectedContentToPurchase.price}
          influencerId={influencerId}
          onClose={() => {
            setShowPurchaseModal(false);
            setSelectedContentToPurchase(null);
          }}
          onSuccess={() => {
            setShowPurchaseModal(false);
            setSelectedContentToPurchase(null);
            loadContents();
            toast.success('Conteúdo comprado com sucesso!');
          }}
        />
      )}
    </div>
  );
}

function SubscribeModal({
  influencer,
  onClose,
  onSuccess,
}: {
  influencer: InfluencerData;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const { profile } = useAuth();
  const [paymentMethod, setPaymentMethod] = useState<'credit_card' | 'pix' | 'paypal'>('credit_card');
  const [loading, setLoading] = useState(false);

  const handleSubscribe = async () => {
    if (!profile) {
      toast.error('Você precisa estar logado para assinar.');
      return;
    }

    setLoading(true);

    console.log('SubscribeModal: Tentando assinar.');
    console.log('SubscribeModal: Subscriber ID (currentUser):', profile.id);
    console.log('SubscribeModal: Influencer Profile ID (from influencer_profiles):', influencer.influencer_profile_id);
    console.log('SubscribeModal: Influencer Profile ID (from profiles for payments):', influencer.profile.id);
    console.log('SubscribeModal: Subscription Price:', influencer.subscription_price);
    console.log('SubscribeModal: Is Subscribed (before attempt):', influencer.is_subscribed);

    try {
      if (influencer.is_subscribed) {
        toast.error('Você já está inscrito neste influencer.');
        setLoading(false);
        onClose();
        return;
      }

      const expiresAt = new Date();
      expiresAt.setMonth(expiresAt.getMonth() + 1);

      const { data: subscription, error: subError } = await supabase
        .from('subscriptions')
        .insert({
          subscriber_id: profile.id,
          influencer_id: influencer.influencer_profile_id,
          status: 'active',
          price_paid: influencer.subscription_price,
          expires_at: expiresAt.toISOString(),
        })
        .select()
        .single();

      if (subError || !subscription) {
        throw new Error(subError?.message || 'Falha ao criar assinatura.');
      }

      const platformFee = influencer.subscription_price * 0.1;
      const influencerEarnings = influencer.subscription_price * 0.9;

      const { error: paymentError } = await supabase.from('payments').insert({
        subscription_id: subscription.id,
        subscriber_id: profile.id,
        influencer_id: influencer.profile.id,
        amount: influencer.subscription_price,
        platform_fee: platformFee,
        influencer_earnings: influencerEarnings,
        payment_status: 'completed',
        payment_method: paymentMethod,
      });

      if (paymentError) {
        throw new Error(paymentError.message || 'Falha ao registrar pagamento.');
      }

      onSuccess();
    } catch (error: any) {
      console.error('SubscribeModal: Erro ao processar assinatura:', error.message);
      toast.error('Erro ao processar assinatura: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-surface rounded-lg max-w-md w-full p-6">
        <h3 className="text-2xl font-bold text-text mb-4">Assinar @{influencer.profile.username}</h3>

        <div className="bg-background rounded-lg p-4 mb-6 border border-border">
          <div className="flex items-center justify-between mb-2">
            <span className="text-textSecondary">Valor mensal</span>
            <div className="text-3xl font-bold text-text mt-2">
              R$ {influencer.subscription_price.toFixed(2)}
            </div>
          </div>
          <p className="text-sm text-textSecondary">Renovação automática mensal</p>
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
            onClick={handleSubscribe}
            disabled={loading}
            className="flex-1 px-6 py-3 bg-accent text-white rounded-lg font-semibold hover:bg-accent/90 transition-colors disabled:opacity-50"
          >
            {loading ? 'Processando...' : 'Confirmar'}
          </button>
        </div>
      </div>
    </div>
  );
}
