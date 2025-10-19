import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { uploadAvatar, validateImageFile } from '../../lib/upload';
import { X, User, Save, Upload } from 'lucide-react';

interface UserProfileEditModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export function UserProfileEditModal({ onClose, onSuccess }: UserProfileEditModalProps) {
  const { profile, updateProfile } = useAuth(); // Import updateProfile
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');

  const [profileData, setProfileData] = useState({
    full_name: '',
    bio: '',
    avatar_url: '',
  });

  useEffect(() => {
    if (profile) {
      setProfileData({
        full_name: profile.full_name || '',
        bio: profile.bio || '',
        avatar_url: profile.avatar_url || '',
      });
    }
  }, [profile]);

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !profile) return;

    setUploadError('');
    const validation = validateImageFile(file);
    if (!validation.valid) {
      setUploadError(validation.error || 'Arquivo inválido');
      return;
    }

    setUploading(true);
    const { data, error } = await uploadAvatar(file, profile.id);
    setUploading(false);

    if (error) {
      setUploadError(error.message);
    } else if (data) {
      setProfileData({ ...profileData, avatar_url: data.url });
      setUploadError('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    setLoading(true);

    // Use the updateProfile function from AuthContext
    const { error } = await updateProfile({
      full_name: profileData.full_name,
      bio: profileData.bio,
      avatar_url: profileData.avatar_url,
    });

    if (error) {
      alert('Erro ao salvar perfil: ' + error.message);
    } else {
      onSuccess(); // This will close the modal and trigger any parent success logic
    }

    setLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-surface rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-surface border-b border-border px-6 py-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-text">Editar Perfil</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-surface/50 rounded-lg transition-colors"
          >
            <X className="w-6 h-6 text-textSecondary" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          <div className="space-y-6">
            <div className="border-b border-border pb-8">
              <h3 className="text-lg font-semibold text-text mb-4 flex items-center gap-2">
                <div className="w-1 h-6 bg-accent rounded-full"></div>
                Informações Pessoais
              </h3>

              <div className="space-y-4">
                {uploadError && (
                  <div className="bg-error/10 border border-error/30 text-error px-4 py-3 rounded-lg mb-4">
                    {uploadError}
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-textSecondary mb-2">
                    Foto de Perfil
                  </label>
                  <div className="flex items-center gap-4">
                    {profileData.avatar_url ? (
                      <img
                        src={profileData.avatar_url}
                        alt="Avatar"
                        className="w-20 h-20 rounded-full object-cover border-4 border-primary/20"
                      />
                    ) : (
                      <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center border-4 border-primary/30">
                        <User className="w-10 h-10 text-primary" />
                      </div>
                    )}
                    <div className="flex-1 space-y-2">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleAvatarUpload}
                        disabled={uploading}
                        className="hidden"
                        id="user-avatar-upload"
                      />
                      <label
                        htmlFor="user-avatar-upload"
                        className={`inline-flex items-center gap-2 px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent/90 transition-colors cursor-pointer ${
                          uploading ? 'opacity-50 cursor-not-allowed' : ''
                        }`}
                      >
                        <Upload className="w-4 h-4" />
                        {uploading ? 'Enviando...' : 'Fazer Upload (máx 2MB)'}
                      </label>
                      <p className="text-xs text-textSecondary">Formatos: JPEG, PNG, WebP</p>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-textSecondary mb-2">
                    Nome Completo
                  </label>
                  <input
                    type="text"
                    value={profileData.full_name}
                    onChange={(e) => setProfileData({ ...profileData, full_name: e.target.value })}
                    className="w-full px-4 py-3 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent !bg-background text-text placeholder-textSecondary"
                    placeholder="Seu nome completo"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-textSecondary mb-2">
                    Bio
                  </label>
                  <textarea
                    value={profileData.bio}
                    onChange={(e) => setProfileData({ ...profileData, bio: e.target.value })}
                    rows={4}
                    className="w-full px-4 py-3 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent resize-none !bg-background text-text placeholder-textSecondary"
                    placeholder="Conte um pouco sobre você..."
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="flex gap-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 border border-border text-textSecondary rounded-lg font-semibold hover:bg-surface/50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-accent text-white rounded-lg font-semibold hover:bg-accent/90 transition-colors disabled:opacity-50"
            >
              <Save className="w-5 h-5" />
              {loading ? 'Salvando...' : 'Salvar Alterações'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
