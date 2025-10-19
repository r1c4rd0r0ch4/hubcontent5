import { useState } from 'react';
import { MySubscriptions } from './MySubscriptions';
import { InfluencerProfile } from './InfluencerProfile';
import { Home, Heart, DollarSign, MessageSquare, User } from 'lucide-react';

export function UserDashboard() {
  const [activeTab, setActiveTab] = useState<'home' | 'subscriptions' | 'purchases' | 'messages' | 'profile'>('home');
  const [selectedInfluencerId, setSelectedInfluencerId] = useState<string | null>(null);

  const handleViewInfluencerProfile = (influencerId: string) => {
    setSelectedInfluencerId(influencerId);
  };

  const handleBackToDashboard = () => {
    setSelectedInfluencerId(null);
    setActiveTab('subscriptions'); // Volta para a aba de assinaturas ao sair do perfil
  };

  if (selectedInfluencerId) {
    return (
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <InfluencerProfile influencerId={selectedInfluencerId} onBack={handleBackToDashboard} />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <div className="flex flex-col md:flex-row gap-8">
        {/* Sidebar Navigation */}
        <aside className="w-full md:w-64 bg-surface rounded-xl p-6 border border-border shadow-lg">
          <nav className="space-y-2">
            <button
              onClick={() => setActiveTab('home')}
              className={`flex items-center gap-3 w-full px-4 py-3 rounded-lg text-left transition-colors ${
                activeTab === 'home' ? 'bg-primary text-white shadow-md' : 'text-textSecondary hover:bg-background'
              }`}
            >
              <Home className="w-5 h-5" />
              <span className="font-medium">Início</span>
            </button>
            <button
              onClick={() => setActiveTab('subscriptions')}
              className={`flex items-center gap-3 w-full px-4 py-3 rounded-lg text-left transition-colors ${
                activeTab === 'subscriptions' ? 'bg-primary text-white shadow-md' : 'text-textSecondary hover:bg-background'
              }`}
            >
              <DollarSign className="w-5 h-5" />
              <span className="font-medium">Minhas Assinaturas</span>
            </button>
            {/* Add other tabs as needed */}
            <button
              onClick={() => setActiveTab('purchases')}
              className={`flex items-center gap-3 w-full px-4 py-3 rounded-lg text-left transition-colors ${
                activeTab === 'purchases' ? 'bg-primary text-white shadow-md' : 'text-textSecondary hover:bg-background'
              }`}
            >
              <Heart className="w-5 h-5" /> {/* Usando Heart para compras por enquanto, pode ser alterado */}
              <span className="font-medium">Conteúdo Comprado</span>
            </button>
            <button
              onClick={() => setActiveTab('messages')}
              className={`flex items-center gap-3 w-full px-4 py-3 rounded-lg text-left transition-colors ${
                activeTab === 'messages' ? 'bg-primary text-white shadow-md' : 'text-textSecondary hover:bg-background'
              }`}
            >
              <MessageSquare className="w-5 h-5" />
              <span className="font-medium">Mensagens</span>
            </button>
            <button
              onClick={() => setActiveTab('profile')}
              className={`flex items-center gap-3 w-full px-4 py-3 rounded-lg text-left transition-colors ${
                activeTab === 'profile' ? 'bg-primary text-white shadow-md' : 'text-textSecondary hover:bg-background'
              }`}
            >
              <User className="w-5 h-5" />
              <span className="font-medium">Meu Perfil</span>
            </button>
          </nav>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1">
          {activeTab === 'home' && (
            <div className="bg-surface rounded-xl p-8 border border-border shadow-lg">
              <h2 className="text-3xl font-bold text-text mb-6">Bem-vindo ao seu Painel!</h2>
              <p className="text-textSecondary mb-4">
                Explore novos conteúdos, gerencie suas assinaturas e interaja com seus influencers favoritos.
              </p>
              <p className="text-textSecondary">
                Use a navegação lateral para acessar diferentes seções.
              </p>
            </div>
          )}
          {activeTab === 'subscriptions' && <MySubscriptions onViewProfile={handleViewInfluencerProfile} />}
          {activeTab === 'purchases' && (
            <div className="bg-surface rounded-xl p-8 border border-border shadow-lg">
              <h2 className="text-3xl font-bold text-text mb-6">Conteúdo Comprado</h2>
              <p className="text-textSecondary">
                Aqui você verá todo o conteúdo que comprou individualmente.
              </p>
              {/* Placeholder for purchased content list */}
            </div>
          )}
          {activeTab === 'messages' && (
            <div className="bg-surface rounded-xl p-8 border border-border shadow-lg">
              <h2 className="text-3xl font-bold text-text mb-6">Mensagens</h2>
              <p className="text-textSecondary">
                Gerencie suas conversas com influencers e outros usuários.
              </p>
              {/* Placeholder for messages component */}
            </div>
          )}
          {activeTab === 'profile' && (
            <div className="bg-surface rounded-xl p-8 border border-border shadow-lg">
              <h2 className="text-3xl font-bold text-text mb-6">Meu Perfil</h2>
              <p className="text-textSecondary">
                Gerencie suas informações de perfil e configurações de conta.
              </p>
              {/* Placeholder for user profile edit component */}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
