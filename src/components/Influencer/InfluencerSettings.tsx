import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { Save } from 'lucide-react';

export function InfluencerSettings() {
  const { profile, updateProfile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const [profileData, setProfileData] = useState({
    full_name: '',
    bio: '',
    avatar_url: '',
  });

  const [influencerData, setInfluencerData] = useState({
    subscription_price: 0,
    instagram: '',
    twitter: '',
    tiktok: '',
    payment_email: '',
    payment_pix: '',
  });

  useEffect(() => {
    if (profile) {
      setProfileData({
        full_name: profile.full_name || '',
        bio: profile.bio || '',
        avatar_url: profile.avatar_url || '',
      });
      loadInfluencerData();
    }
  }, [profile]);

  const loadInfluencerData = async () => {
    if (!profile) return;

    const { data } = await supabase
      .from('influencer_profiles')
      .select('*')
      .eq('user_id', profile.id)
      .maybeSingle();

    if (data) {
      setInfluencerData({
        subscription_price: data.subscription_price,
        instagram: data.instagram || '',
        twitter: data.twitter || '',
        tiktok: data.tiktok || '',
        payment_email: data.payment_email || '',
        payment_pix: data.payment_pix || '',
      });
    }
  };

  const handleSave = async () => {
    if (!profile) return;

    setLoading(true);
    setSuccess(false);

    const { error: profileError } = await updateProfile(profileData);

    const { error: influencerError } = await supabase
      .from('influencer_profiles')
      .update(influencerData)
      .eq('user_id', profile.id);

    setLoading(false);

    if (!profileError && !influencerError) {
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } else {
      alert('Erro ao salvar configurações');
    }
  };

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Configurações</h2>

      <div className="bg-white rounded-lg shadow-md p-6 space-y-8">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Perfil Público</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nome Completo
              </label>
              <input
                type="text"
                value={profileData.full_name}
                onChange={(e) => setProfileData({ ...profileData, full_name: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                placeholder="Seu nome completo"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Bio
              </label>
              <textarea
                value={profileData.bio}
                onChange={(e) => setProfileData({ ...profileData, bio: e.target.value })}
                rows={4}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                placeholder="Conte um pouco sobre você..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                URL da Foto de Perfil
              </label>
              <input
                type="url"
                value={profileData.avatar_url}
                onChange={(e) => setProfileData({ ...profileData, avatar_url: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                placeholder="https://exemplo.com/sua-foto.jpg"
              />
            </div>
          </div>
        </div>

        <div className="border-t pt-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Assinatura</h3>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Preço Mensal da Assinatura (R$)
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={influencerData.subscription_price}
              onChange={(e) => setInfluencerData({ ...influencerData, subscription_price: parseFloat(e.target.value) || 0 })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
              placeholder="0.00"
            />
            <p className="text-sm text-gray-500 mt-1">
              Você receberá 80% deste valor (taxa de 20% da plataforma)
            </p>
          </div>
        </div>

        <div className="border-t pt-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Redes Sociais</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Instagram
              </label>
              <input
                type="text"
                value={influencerData.instagram}
                onChange={(e) => setInfluencerData({ ...influencerData, instagram: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
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
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
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
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                placeholder="@seuusuario"
              />
            </div>
          </div>
        </div>

        <div className="border-t pt-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Informações de Pagamento</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email para Pagamento (PayPal)
              </label>
              <input
                type="email"
                value={influencerData.payment_email}
                onChange={(e) => setInfluencerData({ ...influencerData, payment_email: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
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
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                placeholder="CPF, email, telefone ou chave aleatória"
              />
            </div>
          </div>
        </div>

        {success && (
          <div className="bg-green-50 text-green-700 px-4 py-3 rounded-lg">
            Configurações salvas com sucesso!
          </div>
        )}

        <button
          onClick={handleSave}
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 bg-pink-600 text-white py-3 rounded-lg font-semibold hover:bg-pink-700 transition-colors disabled:opacity-50"
        >
          <Save className="w-5 h-5" />
          {loading ? 'Salvando...' : 'Salvar Configurações'}
        </button>
      </div>
    </div>
  );
}
