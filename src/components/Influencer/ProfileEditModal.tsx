import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { uploadAvatar, uploadContentImage, validateImageFile } from '../../lib/upload';
import { X, Save, User, Upload, Image as ImageIcon } from 'lucide-react';

interface ProfileEditModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export function ProfileEditModal({ onClose, onSuccess }: ProfileEditModalProps) {
  const { profile, updateProfile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [saveError, setSaveError] = useState('');

  const [profileData, setProfileData] = useState({
    full_name: '',
    bio: '',
    avatar_url: '',
    cover_photo_url: '',
  });

  const [influencerData, setInfluencerData] = useState({
    subscription_price: 0,
    instagram: '',
    twitter: '',
    tiktok: '',
    payment_email: '',
    payment_pix: '',
  });

  // State for the display value of the subscription price input (string for free typing)
  const [displaySubscriptionPrice, setDisplaySubscriptionPrice] = useState('');

  useEffect(() => {
    if (profile) {
      setProfileData({
        full_name: profile.full_name || '',
        bio: profile.bio || '',
        avatar_url: profile.avatar_url || '',
        cover_photo_url: profile.cover_photo_url || '',
      });
      loadInfluencerData();
    }
  }, [profile]);

  // Effect to update the display value when the numeric subscription_price changes
  useEffect(() => {
    setDisplaySubscriptionPrice(
      (influencerData.subscription_price || 0).toLocaleString('pt-BR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    );
  }, [influencerData.subscription_price]);


  const loadInfluencerData = async () => {
    if (!profile) return;

    const { data, error } = await supabase
      .from('influencer_profiles')
      .select('*')
      .eq('user_id', profile.id)
      .maybeSingle();

    if (error) {
      console.error('Error loading influencer data:', error);
      setSaveError('Erro ao carregar dados do influenciador.');
      return;
    }

    if (data) {
      setInfluencerData({
        subscription_price: data.subscription_price,
        instagram: data.instagram || '',
        twitter: data.twitter || '',
        tiktok: data.tiktok || '',
        payment_email: data.payment_email || '',
        payment_pix: data.payment_pix || '',
      });
      // Also update the display state for the input
      setDisplaySubscriptionPrice(
        (data.subscription_price || 0).toLocaleString('pt-BR', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })
      );
    } else {
      // If no influencer profile exists, initialize with defaults
      setInfluencerData({
        subscription_price: 0,
        instagram: '',
        twitter: '',
        tiktok: '',
        payment_email: '',
        payment_pix: '',
      });
      setDisplaySubscriptionPrice('0,00');
    }
  };

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

  const handleCoverUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !profile) return;

    setUploadError('');
    const validation = validateImageFile(file);
    if (!validation.valid) {
      setUploadError(validation.error || 'Arquivo inválido');
      return;
    }

    setUploading(true);
    const { data, error } = await uploadContentImage(file, profile.id);
    setUploading(false);

    if (error) {
      setUploadError(error.message);
    } else if (data) {
      setProfileData({ ...profileData, cover_photo_url: data.url });
      setUploadError('');
    }
  };

  const handleSubscriptionPriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let input = e.target.value;

    // Update the display state immediately with what the user typed
    setDisplaySubscriptionPrice(input);

    // Clean the input for numeric parsing
    // Remove all non-digit characters except for the first comma/dot
    input = input.replace(/[^0-9,.]/g, '');
    // Replace comma with dot for parsing
    input = input.replace(',', '.');

    // Ensure only one dot for decimals
    const parts = input.split('.');
    if (parts.length > 2) {
      input = parts[0] + '.' + parts.slice(1).join('');
    }

    let parsedValue = parseFloat(input);
    if (isNaN(parsedValue)) {
      parsedValue = 0;
    }

    // Update the numeric state
    setInfluencerData((prev) => ({ ...prev, subscription_price: parsedValue }));
  };

  const handleSave = async () => {
    if (!profile) {
      setSaveError('Nenhum perfil de usuário logado.');
      return;
    }

    setLoading(true);
    setSaveError(''); // Clear previous errors

    console.log('[ProfileEditModal] Attempting to save profileData:', profileData);
    const { error: profileError } = await updateProfile(profileData);

    if (profileError) {
      console.error('[ProfileEditModal] Error saving main profile:', profileError);
      setSaveError(`Erro ao salvar perfil principal: ${profileError.message}`);
      setLoading(false);
      return; // Stop if main profile save fails
    }
    console.log('[ProfileEditModal] Main profile saved successfully.');

    // Now attempt to save influencer data
    console.log('[ProfileEditModal] Attempting to save influencerData:', influencerData);
    console.log('[ProfileEditModal] Target user_id for influencer_profiles update:', profile.id);

    // Check if an influencer profile already exists for this user
    const { data: existingInfluencerProfile, error: fetchError } = await supabase
      .from('influencer_profiles')
      .select('id')
      .eq('user_id', profile.id)
      .maybeSingle();

    if (fetchError) {
      console.error('[ProfileEditModal] Error fetching existing influencer profile:', fetchError);
      setSaveError(`Erro ao verificar perfil do influenciador: ${fetchError.message}`);
      setLoading(false);
      return;
    }

    let influencerError = null;
    if (existingInfluencerProfile) {
      // Update existing influencer profile
      const { error } = await supabase
        .from('influencer_profiles')
        .update(influencerData)
        .eq('user_id', profile.id);
      influencerError = error;
      console.log('[ProfileEditModal] Influencer profile UPDATE result:', { data: null, error: influencerError });
    } else {
      // This case should ideally not happen if signup creates the profile, but as a fallback:
      console.warn('[ProfileEditModal] No existing influencer profile found, attempting to INSERT.');
      const { error } = await supabase
        .from('influencer_profiles')
        .insert({ ...influencerData, user_id: profile.id });
      influencerError = error;
      console.log('[ProfileEditModal] Influencer profile INSERT result:', { data: null, error: influencerError });
    }

    setLoading(false);

    if (influencerError) {
      console.error('Erro ao salvar dados do influenciador:', influencerError);
      setSaveError(`Erro ao salvar configurações do influenciador: ${influencerError.message}`);
    } else {
      console.log('[ProfileEditModal] Influencer data saved successfully.');
      onSuccess();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] shadow-2xl flex flex-col">
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between rounded-t-2xl flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="bg-pink-100 p-2 rounded-lg">
              <User className="w-6 h-6 text-pink-600" />
            </div>
            <div>
              <h3 className="text-2xl font-bold text-gray-900">Editar Perfil</h3>
              <p className="text-sm text-gray-600">Atualize suas informações e configurações</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-6 h-6 text-gray-600" />
          </button>
        </div>

        <div className="p-6 space-y-8 flex-grow overflow-y-auto">
          {saveError && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
              {saveError}
            </div>
          )}
          <div>
            <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <div className="w-1 h-6 bg-pink-600 rounded-full"></div>
              Perfil Público
            </h4>
            {uploadError && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                {uploadError}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Foto de Perfil
                </label>
                <div className="flex items-center gap-4">
                  {profileData.avatar_url ? (
                    <img
                      src={profileData.avatar_url}
                      alt="Avatar"
                      className="w-20 h-20 rounded-full object-cover border-4 border-pink-100"
                    />
                  ) : (
                    <div className="w-20 h-20 rounded-full bg-pink-100 flex items-center justify-center border-4 border-pink-200">
                      <User className="w-10 h-10 text-pink-600" />
                    </div>
                  )}
                  <div className="flex-1 space-y-2">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarUpload}
                      disabled={uploading}
                      className="hidden"
                      id="avatar-upload"
                    />
                    <label
                      htmlFor="avatar-upload"
                      className={`inline-flex items-center gap-2 px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700 transition-colors cursor-pointer ${
                        uploading ? 'opacity-50 cursor-not-allowed' : ''
                      }`}
                    >
                      <Upload className="w-4 h-4" />
                      {uploading ? 'Enviando...' : 'Fazer Upload (máx 2MB)'}
                    </label>
                    <p className="text-xs text-gray-500">Formatos: JPEG, PNG, WebP</p>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nome Completo
                </label>
                <input
                  type="text"
                  value={profileData.full_name}
                  onChange={(e) => setProfileData({ ...profileData, full_name: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent text-gray-900 placeholder-gray-500"
                  placeholder="Seu nome completo"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Foto de Capa
                </label>
                {profileData.cover_photo_url && (
                  <div className="mb-3">
                    <img
                      src={profileData.cover_photo_url}
                      alt="Capa"
                      className="w-full h-32 object-cover rounded-lg border-2 border-pink-100"
                    />
                  </div>
                )}
                <div className="space-y-2">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleCoverUpload}
                    disabled={uploading}
                    className="hidden"
                    id="cover-upload"
                  />
                  <label
                    htmlFor="cover-upload"
                    className={`inline-flex items-center gap-2 px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700 transition-colors cursor-pointer ${
                      uploading ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                  >
                    <ImageIcon className="w-4 h-4" />
                    {uploading ? 'Enviando...' : 'Fazer Upload da Capa (máx 2MB)'}
                  </label>
                  <p className="text-xs text-gray-500">Banner para seu perfil (1200x400px recomendado)</p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Bio
                </label>
                <textarea
                  value={profileData.bio}
                  onChange={(e) => setProfileData({ ...profileData, bio: e.target.value })}
                  rows={4}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent resize-none text-gray-900 placeholder-gray-500"
                  placeholder="Conte um pouco sobre você..."
                />
              </div>
            </div>
          </div>

          <div className="border-t pt-8">
            <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <div className="w-1 h-6 bg-green-600 rounded-full"></div>
              Assinatura
            </h4>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Preço Mensal da Assinatura (R$)
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-semibold">
                  R$
                </span>
                <input
                  type="text"
                  value={displaySubscriptionPrice} // Use the display state for free typing
                  onChange={handleSubscriptionPriceChange}
                  onBlur={() => { // Format on blur for final presentation
                    setDisplaySubscriptionPrice(
                      (influencerData.subscription_price || 0).toLocaleString('pt-BR', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })
                    );
                  }}
                  className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent text-gray-900 placeholder-gray-500"
                  placeholder="0,00"
                />
              </div>
              <div className="mt-2 bg-pink-50 border border-blue-200 rounded-lg p-3">
                <p className="text-sm text-blue-800">
                  <span className="font-semibold">Você receberá:</span> R$ {(influencerData.subscription_price * 0.9).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} por assinante (90%)
                </p>
                <p className="text-xs text-pink-600 mt-1">Taxa da plataforma: 10%</p>
              </div>
            </div>
          </div>

          <div className="border-t pt-8">
            <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <div className="w-1 h-6 bg-purple-600 rounded-full"></div>
              Redes Sociais
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Instagram
                </label>
                <input
                  type="text"
                  value={influencerData.instagram}
                  onChange={(e) => setInfluencerData({ ...influencerData, instagram: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent text-gray-900 placeholder-gray-500"
                  placeholder="@seuusuario"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Twitter
                </label>
                <input
                  type="text"
                  value={influencerData.twitter}
                  onChange={(e) => setInfluencerData({ ...influencerData, twitter: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent text-gray-900 placeholder-gray-500"
                  placeholder="@seuusuario"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  TikTok
                </label>
                <input
                  type="text"
                  value={influencerData.tiktok}
                  onChange={(e) => setInfluencerData({ ...influencerData, tiktok: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent text-gray-900 placeholder-gray-500"
                  placeholder="@seuusuario"
                />
              </div>
            </div>
          </div>

          <div className="border-t pt-8">
            <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <div className="w-1 h-6 bg-orange-600 rounded-full"></div>
              Informações de Pagamento
            </h4>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email para Pagamento (PayPal)
                </label>
                <input
                  type="email"
                  value={influencerData.payment_email}
                  onChange={(e) => setInfluencerData({ ...influencerData, payment_email: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent text-gray-900 placeholder-gray-500"
                  placeholder="seu@email.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Chave PIX
                </label>
                <input
                  type="text"
                  value={influencerData.payment_pix}
                  onChange={(e) => setInfluencerData({ ...influencerData, payment_pix: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent text-gray-900 placeholder-gray-500"
                  placeholder="CPF, email, telefone ou chave aleatória"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="sticky bottom-0 bg-gray-50 border-t px-6 py-4 flex gap-3 rounded-b-2xl flex-shrink-0">
          <button
            onClick={onClose}
            className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-100 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={loading}
            className="flex-1 px-6 py-3 bg-gradient-to-r from-pink-600 to-purple-700 text-white rounded-lg font-semibold hover:from-blue-700 hover:to-purple-800 transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-blue-500/30"
          >
            <Save className="w-5 h-5" />
            {loading ? 'Salvando...' : 'Salvar Alterações'}
          </button>
        </div>
      </div>
    </div>
  );
}
