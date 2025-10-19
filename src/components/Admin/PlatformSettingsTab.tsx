<boltAction type="file" filePath="src/components/Influencer/InfluencerDashboard.tsx" contentType="text/plain">import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import type { Database } from '../../lib/database.types';
import { Sparkles, Upload, DollarSign, Users, Eye, Heart, Loader2, XCircle, Settings, User, Video, FileText, Instagram, Twitter, Link, MessageSquare, LayoutDashboard, Calendar, ShieldCheck } from 'lucide-react'; // Adicionado LayoutDashboard, Calendar, ShieldCheck
import { ProfileEditModal } from './ProfileEditModal';
import { KycSubmissionSection } from './KycSubmissionSection';
import { ContentManager } from './ContentManager';
import { StreamingSettings } from './StreamingSettings';
import { EarningsOverview } from './EarningsOverview';
import { StreamingBookings } from './StreamingBookings';
import { Messages } from '../Shared/Messages'; // Import Messages component

type Content = Database['public']['Tables']['content']['Row'];
type Subscription = Database['public']['Tables']['subscriptions']['Row'];
type InfluencerProfile = Database['public']['Tables']['influencer_profiles']['Row'];

export function InfluencerDashboard() {
  const { profile, isInfluencerPendingApproval } = useAuth();
  const [content, setContent] = useState<Content[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [influencerProfileData, setInfluencerProfileData] = useState<InfluencerProfile | null>(null);
  const [loadingContent, setLoadingContent] = useState(true);
  const [loadingSubscriptions, setLoadingSubscriptions] = useState(true);
  const [loadingInfluencerProfile, setLoadingInfluencerProfile] = true);
  const [error, setError] = useState<string | null>(null);
  const [showEditProfileModal, setShowEditProfileModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'content' | 'streaming-settings' | 'streaming-bookings' | 'earnings' | 'kyc' | 'messages'>('dashboard'); // Add 'messages' tab

  const fetchInfluencerData = useCallback(async () => {
    if (!profile) {
      setLoadingContent(false);
      setLoadingSubscriptions(false);
      setLoadingInfluencerProfile(false);
      return;
    }

    setError(null);

    setLoadingInfluencerProfile(true);
    const { data: influencerData, error: influencerError } = await supabase
      .from('influencer_profiles')
      .select('*')
      .eq('user_id', profile.id)
      .maybeSingle();

    if (influencerError) {
      console.error('Error fetching influencer profile:', influencerError.message);
      setError('Não foi possível carregar o perfil do influenciador.');
      setLoadingContent(false);
      setLoadingSubscriptions(false);
      setLoadingInfluencerProfile(false);
      return;
    }

    setInfluencerProfileData(influencerData);
    setLoadingInfluencerProfile(false);

    if (!influencerData) {
      setLoadingContent(false);
      setLoadingSubscriptions(false);
      return;
    }

    const influencerId = influencerData.id;

    setLoadingContent(true);
    try {
      const { data, error } = await supabase
        .from('content')
        .select('*')
        .eq('influencer_id', influencerId)
        .eq('status', 'approved') // Only show approved content
        .order('created_at', { ascending: false });

      if (error) throw error;
      setContent(data || []);
    } catch (err: any) {
      console.error('Error fetching content:', err.message);
      setError('Falha ao carregar conteúdo: ' + err.message);
    } finally {
      setLoadingContent(false);
    }

    setLoadingSubscriptions(true);
    try {
      const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('influencer_id', influencerId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSubscriptions(data || []);
    } catch (err: any) {
      console.error('Error fetching subscriptions:', err.message);
      setError('Falha ao carregar assinaturas: ' + err.message);
    } finally {
      setLoadingSubscriptions(false);
    }
  }, [profile]);

  useEffect(() => {
    if (profile && profile.user_type === 'influencer') {
      fetchInfluencerData();
    }
  }, [profile, fetchInfluencerData]);

  const handleModalClose = () => {
    setShowEditProfileModal(false);
  };

  const handleModalSuccess = () => {
    setShowEditProfileModal(false);
    fetchInfluencerData();
  };

  const totalEarnings = subscriptions.reduce((sum, sub) => sum + (sub.price_paid || 0), 0);

  const renderDashboardTabContent = () => {
    if (isInfluencerPendingApproval) {
      return (
        <div className="flex items-center justify-center py-16">
          <div className="bg-surface rounded-xl p-8 text-center shadow-lg border border-border max-w-md">
            <XCircle className="w-16 h-16 text-warning mx-auto mb-4" />
            <h3 className="text-2xl font-bold text-text mb-2">Conta de Influenciador Pendente</h3>
            <p className="text-textSecondary mb-4">
              Sua conta de influenciador está aguardando aprovação. Por favor, aguarde enquanto nossa equipe revisa seus dados.
            </p>
            <p className="text-sm text-textSecondary">Você será notificado assim que sua conta for aprovada.</p>
          </div>
        </div>
      );
    }

    return (
      <>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
          <div className="bg-surface rounded-xl p-6 shadow-lg border border-border flex items-center gap-4">
            <Users className="text-primary" size={32} />
            <div>
              <p className="text-textSecondary text-sm">Total de Assinantes</p>
              <p className="text-text text-2xl font-bold">{subscriptions.length}</p>
            </div>
          </div>
          <div className="bg-surface rounded-xl p-6 shadow-lg border border-border flex items-center gap-4">
            <Sparkles className="text-accent" size={32} />
            <div>
              <p className="text-textSecondary text-sm">Total de Conteúdo</p>
              <p className="text-text text-2xl font-bold">{content.length}</p>
            </div>
          </div>
          <div className="bg-surface rounded-xl p-6 shadow-lg border border-border flex items-center gap-4">
            <DollarSign className="text-success" size={32} />
            <div>
              <p className="text-textSecondary text-sm">Ganhos Estimados</p>
              <p className="text-text text-2xl font-bold">R$ {totalEarnings.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
            </div>
          </div>
        </div>

        {profile && (
          <div className="bg-surface rounded-xl p-6 shadow-lg border border-border mb-10 animate-fade-in">
            <h3 className="text-2xl font-bold text-text mb-6 border-b border-border pb-4">Seu Perfil</h3>

            {/* Profile Header: Avatar, Username, Full Name, Bio */}
            <div className="flex flex-col md:flex-row items-center md:items-start gap-6 mb-8">
              {profile.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt="Avatar"
                  className="w-28 h-28 rounded-full object-cover border-4 border-primary shadow-lg"
                />
              ) : (
                <div className="w-28 h-28 rounded-full bg-primary/20 flex items-center justify-center border-4 border-primary shadow-lg">
                  <User className="w-14 h-14 text-primary" />
                </div>
              )}
              <div className="text-center md:text-left flex-1">
                <p className="text-text text-3xl font-extrabold mb-1 leading-tight">{profile.username}</p>
                <p className="text-textSecondary text-lg mb-3">{profile.full_name}</p>
                <p className="text-textSecondary text-base max-w-prose leading-relaxed">
                  {profile.bio || 'Nenhuma biografia definida. Clique em "Editar Perfil" para adicionar uma descrição cativante sobre você e seu conteúdo!'}
                </p>
              </div>
            </div>

            {influencerProfileData && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8 pt-8 border-t border-border">
                {/* Subscription Price Section */}
                <div className="bg-background rounded-lg p-5 border border-border flex items-center gap-4 animate-fade-in">
                  <DollarSign className="w-8 h-8 text-success" />
                  <div>
                    <p className="text-textSecondary text-sm">Preço Mensal da Assinatura</p>
                    <p className="text-text text-2xl font-bold">
                      R$ {(influencerProfileData.subscription_price || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>

                {/* Social Media Section */}
                <div className="bg-background rounded-lg p-5 border border-border animate-fade-in delay-100">
                  <h4 className="text-lg font-semibold text-text mb-4 flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-accent" /> Redes Sociais
                  </h4>
                  <div className="flex flex-wrap gap-3">
                    {influencerProfileData.instagram && (
                      <a
                        href={`https://instagram.com/${influencerProfileData.instagram.replace('@', '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary rounded-full hover:bg-primary/20 transition-colors text-sm font-medium group"
                      >
                        <Instagram className="w-4 h-4 group-hover:scale-110 transition-transform" />
                        {influencerProfileData.instagram}
                      </a>
                    )}
                    {influencerProfileData.twitter && (
                      <a
                        href={`https://twitter.com/${influencerProfileData.twitter.replace('@', '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 px-4 py-2 bg-secondary/10 text-secondary rounded-full hover:bg-secondary/20 transition-colors text-sm font-medium group"
                      >
                        <Twitter className="w-4 h-4 group-hover:scale-110 transition-transform" />
                        {influencerProfileData.twitter}
                      </a>
                    )}
                    {influencerProfileData.tiktok && (
                      <a
                        href={`https://tiktok.com/@${influencerProfileData.tiktok.replace('@', '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 px-4 py-2 bg-accent/10 text-accent rounded-full hover:bg-accent/20 transition-colors text-sm font-medium group"
                      >
                        {/* Usando um ícone genérico de Link para TikTok, pois não está no lucide-react */}
                        <Link className="w-4 h-4 group-hover:scale-110 transition-transform" />
                        {influencerProfileData.tiktok}
                      </a>
                    )}
                    {!influencerProfileData.instagram && !influencerProfileData.twitter && !influencerProfileData.tiktok && (
                      <p className="text-textSecondary text-sm">Nenhuma rede social configurada. Adicione-as em "Editar Perfil".</p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}


        <div className="mb-10">
          <h3 className="text-2xl font-bold text-text mb-6 border-b border-border pb-4">Seu Conteúdo Recente</h3>
          {loadingContent && (
            <div className="flex items-center justify-center text-primary text-lg">
              <Loader2 className="animate-spin mr-2" size={24} /> Carregando conteúdo...
            </div>
          )}
          {!loadingContent && content.length === 0 && (
            <p className="text-textSecondary text-center">Nenhum conteúdo enviado ainda. <button onClick={() => setActiveTab('content')} className="text-primary hover:underline">Envie seu primeiro conteúdo!</button></p>
          )}
          {!loadingContent && content.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {content.map((item) => (
                <div key={item.id} className="bg-surface rounded-xl shadow-lg border border-border overflow-hidden">
                  <img src={item.thumbnail_url || item.media_url} alt={item.title} className="w-full h-48 object-cover" />
                  <div className="p-4">
                    <h4 className="text-lg font-semibold text-text mb-2">{item.title}</h4>
                    <p className="text-sm text-textSecondary mb-3 line-clamp-2">{item.description}</p>
                    <div className="flex items-center justify-between text-textSecondary text-sm">
                      <span className="flex items-center gap-1"><Eye size={16} /> {item.views_count}</span>
                      <span className="flex items-center gap-1"><Heart size={16} /> {item.likes_count}</span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${item.status === 'approved' ? 'bg-success/20 text-success' : item.status === 'pending' ? 'bg-warning/20 text-warning' : 'bg-error/20 text-error'}`}>
                        {item.status}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <h3 className="text-2xl font-bold text-text mb-6 border-b border-border pb-4">Assinaturas Recentes</h3>
          {loadingSubscriptions && (
            <div className="flex items-center justify-center text-primary text-lg">
              <Loader2 className="animate-spin mr-2" size={24} /> Carregando assinaturas...
            </div>
          )}
          {!loadingSubscriptions && subscriptions.length === 0 && (
            <p className="text-textSecondary text-center">Nenhuma assinatura ainda.</p>
          )}
          {!loadingSubscriptions && subscriptions.length > 0 && (
            <div className="overflow-x-auto">
              <table className="min-w-full bg-surface rounded-xl shadow-lg border border-border">
                <thead>
                  <tr className="bg-background text-textSecondary text-left">
                    <th className="py-3 px-4 font-semibold">Assinante</th>
                    <th className="py-3 px-4 font-semibold">Status</th>
                    <th className="py-3 px-4 font-semibold">Preço Pago</th>
                    <th className="py-3 px-4 font-semibold">Início</th>
                    <th className="py-3 px-4 font-semibold">Fim</th>
                  </tr>
                </thead>
                <tbody>
                  {subscriptions.map((sub) => (
                    <tr key={sub.id} className="border-b border-border last:border-b-0 hover:bg-background transition-colors">
                      <td className="py-3 px-4 text-text">{sub.subscriber_id}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${sub.status === 'active' ? 'bg-success/20 text-success' : sub.status === 'pending' ? 'bg-warning/20 text-warning' : 'bg-error/20 text-error'}`}>
                          {sub.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-text">R$ {(sub.price_paid || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                      <td className="py-3 px-4 text-text">{new Date(sub.created_at).toLocaleDateString()}</td> {/* Changed to created_at for start date */}
                      <td className="py-3 px-4 text-text">{sub.expires_at ? new Date(sub.expires_at).toLocaleDateString() : 'N/A'}</td> {/* Changed to expires_at for end date */}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </>
    );
  };

  return (
    <div className="container mx-auto p-8 bg-background text-text min-h-[calc(100vh-64px)]">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-10 gap-4">
        <h2 className="text-4xl font-extrabold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
          {activeTab === 'dashboard' ? 'Painel do Influenciador' :
           activeTab === 'content' ? 'Gerenciar Conteúdo' :
           activeTab === 'streaming-settings' ? 'Configurações de Streaming' :
           activeTab === 'streaming-bookings' ? 'Reservas de Streaming' :
           activeTab === 'earnings' ? 'Meus Ganhos' :
           activeTab === 'messages' ? 'Minhas Mensagens' : // New tab title
           'Meus Documentos KYC'}
        </h2>
        <div className="flex flex-wrap items-center gap-4">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`flex items-center gap-2 px-5 py-2 rounded-lg font-semibold transition-colors ${
              activeTab === 'dashboard'
                ? 'bg-primary text-white shadow-md'
                : 'bg-surface text-textSecondary hover:bg-border'
            }`}
          >
            <LayoutDashboard className="w-5 h-5" /> Painel
          </button>
          <button
            onClick={() => setActiveTab('content')}
            className={`flex items-center gap-2 px-5 py-2 rounded-lg font-semibold transition-colors ${
              activeTab === 'content'
                ? 'bg-primary text-white shadow-md'
                : 'bg-surface text-textSecondary hover:bg-border'
            }`}
          >
            <FileText className="w-5 h-5" /> Conteúdo
          </button>
          <button
            onClick={() => setActiveTab('streaming-settings')}
            className={`flex items-center gap-2 px-5 py-2 rounded-lg font-semibold transition-colors ${
              activeTab === 'streaming-settings'
                ? 'bg-primary text-white shadow-md'
                : 'bg-surface text-textSecondary hover:bg-border'
            }`}
          >
            <Video className="w-5 h-5" /> Config. Streaming
          </button>
          <button
            onClick={() => setActiveTab('streaming-bookings')}
            className={`flex items-center gap-2 px-5 py-2 rounded-lg font-semibold transition-colors ${
              activeTab === 'streaming-bookings'
                ? 'bg-primary text-white shadow-md'
                : 'bg-surface text-textSecondary hover:bg-border'
            }`}
          >
            <Calendar className="w-5 h-5" /> Reservas Streaming
          </button>
          <button
            onClick={() => setActiveTab('earnings')}
            className={`flex items-center gap-2 px-5 py-2 rounded-lg font-semibold transition-colors ${
              activeTab === 'earnings'
                ? 'bg-primary text-white shadow-md'
                : 'bg-surface text-textSecondary hover:bg-border'
            }`}
          >
            <DollarSign className="w-5 h-5" /> Ganhos
          </button>
          <button
            onClick={() => setActiveTab('kyc')}
            className={`flex items-center gap-2 px-5 py-2 rounded-lg font-semibold transition-colors ${
              activeTab === 'kyc'
                ? 'bg-primary text-white shadow-md'
                : 'bg-surface text-textSecondary hover:bg-border'
            }`}
          >
            <ShieldCheck className="w-5 h-5" /> KYC
          </button>
          <button
            onClick={() => setActiveTab('messages')} // New Messages tab
            className={`flex items-center gap-2 px-5 py-2 rounded-lg font-semibold transition-colors ${
              activeTab === 'messages'
                ? 'bg-primary text-white shadow-md'
                : 'bg-surface text-textSecondary hover:bg-border'
            }`}
          >
            <MessageSquare className="w-5 h-5" /> Mensagens
          </button>
          {(activeTab === 'dashboard' || activeTab === 'kyc') && (
            <button
              onClick={() => setShowEditProfileModal(true)}
              className="flex items-center gap-2 px-5 py-2 bg-primary text-white rounded-lg font-semibold hover:bg-secondary transition-colors shadow-md"
            >
              <Settings className="w-5 h-5" />
              Editar Perfil
            </button>
          )}
        </div>
      </div>

      {error && <p className="text-error text-center mb-4">{error}</p>}

      {influencerProfileData?.id ? (
        <>
          {activeTab === 'dashboard' && renderDashboardTabContent()}
          {activeTab === 'content' && <ContentManager onUpdate={fetchInfluencerData} />}
          {activeTab === 'streaming-settings' && <StreamingSettings />}
          {activeTab === 'streaming-bookings' && <StreamingBookings />}
          {activeTab === 'earnings' && <EarningsOverview />}
          {activeTab === 'kyc' && <KycSubmissionSection />}
          {activeTab === 'messages' && <Messages />} {/* Render Messages component */}
        </>
      ) : (
        !loadingInfluencerProfile && <p className="text-textSecondary text-center py-10">Carregando perfil do influenciador...</p>
      )}


      {showEditProfileModal && (
        <ProfileEditModal onClose={handleModalClose} onSuccess={handleModalSuccess} />
      )}
    </div>
  );
}
