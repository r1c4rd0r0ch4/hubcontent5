import { useState } from 'react';
import { SignInForm } from '../Auth/SignInForm';
import { SignUpForm } from '../Auth/SignUpForm';
import {
  Sparkles,
  TrendingUp,
  Shield,
  MessageCircle,
  CreditCard,
  Users,
  Video,
  Heart,
  Lock,
  Zap,
  CheckCircle,
  ArrowRight,
  Eye,
  Star
} from 'lucide-react';

export function LandingPage() {
  console.log('[LandingPage] Rendering LandingPage component...'); // Adicionado log para depuração
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showSignUp, setShowSignUp] = useState(false);

  const heroImageUrl = "https://images.pexels.com/photos/3861969/pexels-photo-3861969.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2"; // Neutral, creative image from Pexels

  return (
    <div className="min-h-screen bg-background">
      <nav className="fixed top-0 w-full bg-background/40 backdrop-blur-md border-b border-border z-50">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 sm:h-20">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="bg-gradient-to-br from-primary to-secondary p-1.5 sm:p-2 rounded-lg sm:rounded-xl">
                <Sparkles className="w-5 h-5 sm:w-8 sm:h-8 text-white" />
              </div>
              <span className="text-xl sm:text-2xl md:text-3xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                ContentHub
              </span>
            </div>
            <div className="flex items-center gap-2 sm:gap-4">
              <button
                onClick={() => {
                  setShowSignUp(false);
                  setShowAuthModal(true);
                }}
                className="px-3 py-2 sm:px-6 sm:py-2.5 text-sm sm:text-base text-textSecondary font-semibold hover:text-text transition-colors"
              >
                Entrar
              </button>
              <button
                onClick={() => {
                  setShowSignUp(true);
                  setShowAuthModal(true);
                }}
                className="px-3 py-2 sm:px-6 sm:py-2.5 text-sm sm:text-base bg-gradient-to-r from-primary to-secondary text-white rounded-lg font-semibold hover:from-primary/80 hover:to-secondary/80 transition-all shadow-lg shadow-primary/50 whitespace-nowrap"
              >
                Começar Agora
              </button>
            </div>
          </div>
        </div>
      </nav>

      <section
        className="pt-20 sm:pt-28 md:pt-32 pb-12 sm:pb-16 md:pb-20 px-3 sm:px-6 lg:px-8 relative overflow-hidden bg-cover bg-center"
        style={{ backgroundImage: `url(${heroImageUrl})` }}
      >
        <div className="absolute inset-0 bg-background/70 backdrop-blur-sm"></div>
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/20 via-background/20 to-transparent"></div>

        <div className="max-w-6xl mx-auto relative z-10 text-center">
          <div className="inline-flex items-center gap-2 px-3 sm:px-5 py-2 sm:py-2.5 bg-surface/30 border border-border text-primary rounded-full text-xs sm:text-sm font-semibold mb-6 sm:mb-8 backdrop-blur-sm">
            <Sparkles className="w-3 h-3 sm:w-4 sm:h-4" />
            <span className="whitespace-nowrap">Plataforma Criativa e Aberta</span>
          </div>

          <h1 className="text-3xl sm:text-4xl md:text-6xl lg:text-8xl font-black text-white mb-6 sm:mb-8 leading-tight px-2">
            Transforme Seu Conteúdo em
            <br />
            <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">Oportunidades Reais</span>
          </h1>

          <p className="text-lg sm:text-xl md:text-2xl lg:text-3xl text-text mb-6 leading-relaxed max-w-4xl mx-auto font-light px-2">
            Milhares de criadores já monetizam seu talento e conhecimento, publicando fotos, vídeos e muito mais.
          </p>

          <p className="text-xl text-textSecondary mb-12 max-w-3xl mx-auto">
            Sem limites, sem intermediários. Você define seu preço, seu conteúdo, suas regras.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <button
              onClick={() => {
                setShowSignUp(true);
                setShowAuthModal(true);
              }}
              className="px-10 py-5 bg-gradient-to-r from-primary to-secondary text-white rounded-xl font-bold text-xl hover:from-primary/80 hover:to-secondary/80 transition-all shadow-2xl shadow-primary/50 flex items-center justify-center gap-3 hover:scale-105 transform"
            >
              <Sparkles className="w-6 h-6" />
              Começar a Criar Agora
              <ArrowRight className="w-6 h-6" />
            </button>
            <button
              onClick={() => {
                setShowSignUp(false);
                setShowAuthModal(true);
              }}
              className="px-10 py-5 bg-surface/10 backdrop-blur-sm text-white border-2 border-border rounded-xl font-bold text-xl hover:bg-surface/20 hover:border-primary transition-all"
            >
              Já Sou Criador
            </button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
            <div className="bg-surface/50 backdrop-blur-md border border-border rounded-2xl p-6 hover:border-primary/40 transition-all">
              <div className="text-4xl font-black text-white mb-2">90%</div>
              <div className="text-textSecondary text-sm">Você fica com 90% do lucro</div>
            </div>
            <div className="bg-surface/50 backdrop-blur-md border border-border rounded-2xl p-6 hover:border-primary/40 transition-all">
              <div className="text-4xl font-black text-white mb-2">50k+</div>
              <div className="text-textSecondary text-sm">Criadores ativos</div>
            </div>
            <div className="bg-surface/50 backdrop-blur-md border border-border rounded-2xl p-6 hover:border-primary/40 transition-all">
              <div className="text-4xl font-black text-white mb-2">R$ 5k+</div>
              <div className="text-textSecondary text-sm">Média de ganhos/mês</div>
            </div>
            <div className="bg-surface/50 backdrop-blur-md border border-border rounded-2xl p-6 hover:border-primary/40 transition-all">
              <div className="text-4xl font-black text-white mb-2">24h</div>
              <div className="text-textSecondary text-sm">Para começar a lucrar</div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-surface/40 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
              Por Que Milhares de Criadores Escolheram o ContentHub?
            </h2>
            <p className="text-xl text-textSecondary">
              A plataforma que te dá total controle e os melhores ganhos
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            <div className="bg-surface/50 backdrop-blur-sm rounded-3xl p-10 shadow-lg hover:shadow-2xl transition-all border border-border hover:border-primary/50 hover:scale-105 transform duration-300">
              <div className="bg-gradient-to-br from-primary to-secondary w-16 h-16 rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-primary/50">
                <TrendingUp className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-3xl font-black text-white mb-3">90% É Seu</h3>
              <p className="text-textSecondary text-lg leading-relaxed">
                Enquanto outras plataformas ficam com até 50% do seu dinheiro, aqui você recebe <span className="text-primary font-bold">90% de cada venda</span>. Cada conteúdo, o dinheiro é seu.
              </p>
            </div>

            <div className="bg-surface/50 backdrop-blur-sm rounded-3xl p-10 shadow-lg hover:shadow-2xl transition-all border border-border hover:border-primary/50 hover:scale-105 transform duration-300">
              <div className="bg-gradient-to-br from-primary to-secondary w-16 h-16 rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-secondary/50">
                <Shield className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-3xl font-black text-white mb-3">Privacidade Total</h3>
              <p className="text-textSecondary text-lg leading-relaxed">
                <span className="text-primary font-bold">Controle quem vê</span> seu conteúdo. Bloqueie países, cidades ou usuários específicos. Seu conteúdo, suas regras.
              </p>
            </div>

            <div className="bg-surface/50 backdrop-blur-sm rounded-3xl p-10 shadow-lg hover:shadow-2xl transition-all border border-border hover:border-primary/50 hover:scale-105 transform duration-300">
              <div className="bg-gradient-to-br from-primary to-secondary w-16 h-16 rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-primary/50">
                <CreditCard className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-3xl font-black text-white mb-3">Saque Imediato</h3>
              <p className="text-textSecondary text-lg leading-relaxed">
                Receba seus ganhos <span className="text-primary font-bold">na hora via PIX</span>. Sem esperar dias ou semanas. Vendeu? O dinheiro já é seu.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary/20 via-background/20 to-transparent"></div>

        <div className="max-w-6xl mx-auto relative z-10">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
              Como Funciona? Simples em 3 Passos
            </h2>
            <p className="text-xl text-textSecondary">
              Comece a lucrar hoje mesmo, sem complicação
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="relative">
              <div className="bg-surface/50 backdrop-blur-md border-2 border-border rounded-3xl p-8 hover:border-primary/60 transition-all">
                <div className="absolute -top-6 left-8 bg-gradient-to-br from-primary to-secondary w-14 h-14 rounded-2xl flex items-center justify-center shadow-xl shadow-primary/50">
                  <span className="text-2xl font-black text-white">1</span>
                </div>
                <div className="mt-4">
                  <h3 className="text-2xl font-bold text-white mb-4">Crie Sua Conta</h3>
                  <p className="text-textSecondary text-lg">
                    Cadastro rápido em menos de 2 minutos. Grátis e sem taxas iniciais.
                  </p>
                </div>
              </div>
            </div>

            <div className="relative">
              <div className="bg-surface/50 backdrop-blur-md border-2 border-border rounded-3xl p-8 hover:border-primary/60 transition-all">
                <div className="absolute -top-6 left-8 bg-gradient-to-br from-primary to-secondary w-14 h-14 rounded-2xl flex items-center justify-center shadow-xl shadow-primary/50">
                  <span className="text-2xl font-black text-white">2</span>
                </div>
                <div className="mt-4">
                  <h3 className="text-2xl font-bold text-white mb-4">Publique Conteúdo</h3>
                  <p className="text-textSecondary text-lg">
                    Faça upload de suas fotos, vídeos, documentos e muito mais. Defina seu preço.
                  </p>
                </div>
              </div>
            </div>

            <div className="relative">
              <div className="bg-surface/50 backdrop-blur-md border-2 border-border rounded-3xl p-8 hover:border-primary/60 transition-all">
                <div className="absolute -top-6 left-8 bg-gradient-to-br from-primary to-secondary w-14 h-14 rounded-2xl flex items-center justify-center shadow-xl shadow-primary/50">
                  <span className="text-2xl font-black text-white">3</span>
                </div>
                <div className="mt-4">
                  <h3 className="text-2xl font-bold text-white mb-4">Receba Dinheiro</h3>
                  <p className="text-textSecondary text-lg">
                    Saque seus ganhos via PIX sempre que quiser. Simples assim!
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-16 text-center">
            <div className="bg-surface/50 backdrop-blur-lg border border-border rounded-3xl p-12 max-w-4xl mx-auto">
              <Sparkles className="w-16 h-16 text-primary mx-auto mb-6" />
              <h3 className="text-3xl md:text-4xl font-bold text-white mb-4">
                "Minha vida mudou completamente!"
              </h3>
              <p className="text-textSecondary text-xl mb-6 leading-relaxed">
                "Em 3 meses já estava faturando <span className="text-primary font-bold">R$ 8 mil por mês</span>. Larguei meu emprego e agora tenho liberdade total para trabalhar de onde quiser. Melhor decisão que já tomei!"
              </p>
              <div className="flex items-center justify-center gap-4">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
                  <Star className="w-6 h-6 text-white fill-white" />
                </div>
                <div className="text-left">
                  <p className="text-white font-bold">Juliana M.</p>
                  <p className="text-textSecondary text-sm">Criadora desde 2024</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-surface/40 backdrop-blur-sm">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
              Números Que Impressionam
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="bg-gradient-to-br from-primary to-secondary w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-primary/50">
                <Users className="w-10 h-10 text-white" />
              </div>
              <div className="text-5xl font-bold text-white mb-2">50k+</div>
              <div className="text-textSecondary">Criadores Ativos</div>
            </div>

            <div className="text-center">
              <div className="bg-gradient-to-br from-primary to-secondary w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-primary/50">
                <Star className="w-10 h-10 text-white" />
              </div>
              <div className="text-5xl font-bold text-white mb-2">90%</div>
              <div className="text-textSecondary">Dos ganhos são seus</div>
            </div>

            <div className="text-center">
              <div className="bg-gradient-to-br from-primary to-secondary w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-primary/50">
                <Zap className="w-10 h-10 text-white" />
              </div>
              <div className="text-5xl font-bold text-white mb-2">24/7</div>
              <div className="text-textSecondary">Suporte disponível</div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary/30 via-transparent to-transparent"></div>

        <div className="max-w-5xl mx-auto text-center relative z-10">
          <div className="bg-surface/50 backdrop-blur-lg rounded-3xl p-16 border-2 border-border shadow-2xl">
            <div className="mb-8">
              <Sparkles className="w-20 h-20 text-primary mx-auto mb-4 animate-pulse" />
              <div className="inline-block bg-surface/30 border border-border px-6 py-2 rounded-full mb-6">
                <p className="text-primary font-semibold">✨ Mais de 200 contas criadas hoje!</p>
              </div>
            </div>

            <h2 className="text-5xl md:text-6xl font-black text-white mb-6 leading-tight">
              Não Perca Mais Tempo
              <br />
              <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">Comece a Criar Agora!</span>
            </h2>

            <p className="text-xl text-text mb-4 max-w-3xl mx-auto">
              Enquanto você pensa, outros criadores já estão <span className="text-primary font-bold">monetizando seu talento</span>
            </p>

            <p className="text-lg text-textSecondary mb-10 max-w-2xl mx-auto">
              É GRÁTIS para começar. Sem taxas, sem compromisso. Você só paga quando começar a ganhar!
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
              <button
                onClick={() => {
                  setShowSignUp(true);
                  setShowAuthModal(true);
                }}
                className="px-12 py-6 bg-gradient-to-r from-primary to-secondary text-white rounded-2xl font-black text-2xl hover:from-primary/80 hover:to-secondary/80 transition-all shadow-2xl shadow-primary/60 inline-flex items-center justify-center gap-3 hover:scale-105 transform"
              >
                <Sparkles className="w-7 h-7" />
                CRIAR CONTA GRÁTIS
                <ArrowRight className="w-7 h-7" />
              </button>
            </div>

            <div className="flex items-center justify-center gap-8 text-textSecondary">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-success" />
                <span>100% Grátis</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-success" />
                <span>Sem cartão</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-success" />
                <span>2 minutos</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <footer className="bg-surface/60 backdrop-blur-sm border-t border-border py-12 px-4">
        <div className="max-w-7xl mx-auto text-center">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="bg-gradient-to-br from-primary to-secondary p-2 rounded-xl">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              ContentHub
            </span>
          </div>
          <p className="text-textSecondary text-sm">
            © 2025 ContentHub. Todos os direitos reservados.
          </p>
        </div>
      </footer>

      {showAuthModal && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-surface/90 backdrop-blur-lg rounded-2xl max-w-5xl w-full border border-border p-8 shadow-2xl">
            {showSignUp ? (
              <SignUpForm
                onClose={() => setShowAuthModal(false)}
                onToggle={() => setShowSignUp(false)}
              />
            ) : (
              <SignInForm
                onClose={() => setShowAuthModal(false)}
                onToggle={() => setShowSignUp(true)}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
