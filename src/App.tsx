import { useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { LandingPage } from './components/Landing/LandingPage';
import { InfluencerDashboard } from './components/Influencer/InfluencerDashboard';
import { UserDashboard } from './components/User/UserDashboard'; // Importar o novo UserDashboard
import { ProfileEditModal } from './components/Influencer/ProfileEditModal';
import { UserProfileEditModal } from './components/User/UserProfileEditModal';
import { LogOut, Sparkles } from 'lucide-react';
import { AdminDashboard } from './components/Admin/AdminDashboard';
import { Toaster } from 'react-hot-toast';

function AppContent() {
  console.log('[AppContent] Starting render...');
  const { user, profile, signOut, loading, isAdmin } = useAuth();
  const [showProfileEdit, setShowProfileEdit] = useState(false);

  console.log('[AppContent] Current state - Loading:', loading, 'User:', !!user, 'Profile:', !!profile, 'isAdmin:', isAdmin);

  if (loading) {
    console.log('[AppContent] Rendering loading state...');
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary via-secondary to-accent flex items-center justify-center">
        <div className="text-white text-xl">Carregando...</div>
      </div>
    );
  }

  if (!user || !profile) {
    console.log('[AppContent] Rendering LandingPage (no user or profile)...');
    // Reativando o componente LandingPage
    return <LandingPage />;
  }

  // Render AdminDashboard if user is an admin
  if (isAdmin) {
    console.log('[AppContent] Rendering AdminDashboard...');
    return <AdminDashboard />;
  }

  console.log('[AppContent] Rendering main dashboard (Influencer/User)...');
  return (
    <div className="min-h-screen bg-background">
      <nav className="bg-surface border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <div className="bg-gradient-to-br from-primary to-secondary p-2 rounded-xl">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <span className="text-2xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">ContentHub</span>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-sm font-medium text-text">@{profile.username}</p>
                <p className="text-xs text-textSecondary capitalize">{profile.user_type}</p>
              </div>
              {profile.user_type === 'influencer' ? (
                <button
                  onClick={() => setShowProfileEdit(true)}
                  className="group relative"
                  title="Editar perfil"
                >
                  {profile.avatar_url ? (
                    <img
                      src={profile.avatar_url}
                      alt={profile.username}
                      className="w-10 h-10 rounded-full object-cover ring-2 ring-transparent group-hover:ring-primary transition-all cursor-pointer"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-surface flex items-center justify-center ring-2 ring-transparent group-hover:ring-primary transition-all cursor-pointer">
                      <span className="text-primary font-semibold">
                        {profile.username[0].toUpperCase()}
                      </span>
                    </div>
                  )}
                </button>
              ) : (
                <button
                  onClick={() => setShowProfileEdit(true)}
                  className="group relative"
                  title="Editar perfil"
                >
                  {profile.avatar_url ? (
                    <img
                      src={profile.avatar_url}
                      alt={profile.username}
                      className="w-10 h-10 rounded-full object-cover ring-2 ring-transparent group-hover:ring-primary transition-all cursor-pointer"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-surface flex items-center justify-center ring-2 ring-transparent group-hover:ring-primary transition-all cursor-pointer">
                      <span className="text-primary font-semibold">
                        {profile.username[0].toUpperCase()}
                      </span>
                    </div>
                  )}
                </button>
              )}
              <button
                onClick={signOut}
                className="flex items-center gap-2 px-4 py-2 text-textSecondary hover:text-text transition-colors"
                title="Sair"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </nav>

      {profile.user_type === 'influencer' ? <InfluencerDashboard /> : <UserDashboard />}

      {showProfileEdit && profile.user_type === 'influencer' && (
        <ProfileEditModal
          onClose={() => setShowProfileEdit(false)}
          onSuccess={() => {
            setShowProfileEdit(false);
            window.location.reload();
          }}
        />
      )}

      {showProfileEdit && profile.user_type === 'user' && (
        <UserProfileEditModal
          onClose={() => setShowProfileEdit(false)}
          onSuccess={() => {
            setShowProfileEdit(false);
            window.location.reload();
          }}
        />
      )}
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
      <Toaster />
    </AuthProvider>
  );
}

export default App;
