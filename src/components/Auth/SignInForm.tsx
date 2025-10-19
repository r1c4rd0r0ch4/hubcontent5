import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { LogIn, X } from 'lucide-react';

export function SignInForm({ onToggle, onClose }: { onToggle: () => void; onClose?: () => void }) {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const { error } = await signIn(email, password);

    if (error) {
      setError('Email ou senha incorretos');
    }

    setLoading(false);
  };

  return (
    <div className="w-full max-w-xl mx-auto">
      <div className="bg-surface rounded-2xl shadow-xl p-8 relative border border-border">
        {onClose && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 text-textSecondary hover:text-text hover:bg-surface/50 rounded-lg transition-colors"
            type="button"
          >
            <X className="w-5 h-5" />
          </button>
        )}
        <div className="flex items-center justify-center mb-6">
          <div className="bg-primary/20 p-3 rounded-full">
            <LogIn className="w-8 h-8 text-primary" />
          </div>
        </div>

        <h2 className="text-3xl font-bold text-text mb-2 text-center">Bem-vindo de volta</h2>
        <p className="text-textSecondary mb-8 text-center">Entre para acessar conteúdos exclusivos</p>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-textSecondary mb-2">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-3 rounded-lg border border-border bg-background focus:ring-2 focus:ring-primary focus:border-transparent transition-all text-text"
              placeholder="seu@email.com"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-textSecondary mb-2">
              Senha
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-4 py-3 rounded-lg border border-border bg-background focus:ring-2 focus:ring-primary focus:border-transparent transition-all text-text"
              placeholder="Sua senha"
            />
          </div>

          {error && (
            <div className="bg-error/10 text-error px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-primary to-accent text-white py-3 rounded-lg font-semibold hover:from-primary/80 hover:to-accent/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-primary/30"
          >
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={onToggle}
            className="text-primary hover:text-primary/80 font-medium"
          >
            Não tem conta? Criar agora
          </button>
        </div>
      </div>
    </div>
  );
}
