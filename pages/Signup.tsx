
import React from 'react';
import { useNavigate } from 'react-router-dom';

interface SignupProps {
  onSignup: () => void;
}

const Signup: React.FC<SignupProps> = ({ onSignup }) => {
  const navigate = useNavigate();

  const handleSignupSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSignup();
  };

  return (
    <div className="flex min-h-screen w-full bg-background-dark">
      {/* Left Panel - Visual & Info */}
      <div className="hidden lg:flex lg:w-5/12 relative bg-background-surface overflow-hidden items-center justify-center p-16">
        <div className="absolute inset-0 z-0">
          <img 
            className="w-full h-full object-cover opacity-20 scale-105" 
            src="https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&q=80&w=1200" 
            alt="Data center infrastructure" 
          />
          <div className="absolute inset-0 bg-gradient-to-br from-background-dark via-background-dark/90 to-primary/10"></div>
        </div>
        
        <div className="relative z-10 max-w-md">
          <div className="mb-10 flex items-center gap-4">
            <div className="size-14 bg-primary rounded-2xl flex items-center justify-center text-white shadow-xl shadow-primary/40">
              <span className="material-symbols-outlined text-4xl filled">hub</span>
            </div>
            <h1 className="text-4xl font-black tracking-tight text-white uppercase italic">Support<span className="text-primary">Tech</span></h1>
          </div>
          
          <h2 className="text-5xl font-black text-white leading-tight mb-6">Pronto para otimizar sua TI?</h2>
          <p className="text-lg text-text-secondary leading-relaxed mb-12">
            Junte-se a mais de 500 empresas que utilizam nossa plataforma para reduzir o tempo de inatividade em até 40%.
          </p>

          <div className="space-y-6">
            {[
              { icon: 'bolt', title: 'Abertura Rápida', desc: 'Crie chamados em menos de 30 segundos.' },
              { icon: 'query_stats', title: 'Análise Preditiva', desc: 'Identificamos falhas antes que elas aconteçam.' },
              { icon: 'support_agent', title: 'Suporte 24/7', desc: 'Nossa equipe técnica sempre à disposição.' }
            ].map((item, i) => (
              <div key={i} className="flex gap-4 group">
                <div className="size-10 rounded-lg bg-background-card border border-border-dark flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                  <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
                </div>
                <div>
                  <h4 className="text-white font-bold text-sm">{item.title}</h4>
                  <p className="text-text-muted text-xs">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Panel - Form */}
      <div className="w-full lg:w-7/12 flex flex-col bg-background-dark">
        <header className="flex items-center justify-between px-8 py-8 lg:px-20">
          <div className="lg:hidden flex items-center gap-2 text-white">
            <span className="material-symbols-outlined text-primary text-3xl">hub</span>
            <span className="text-xl font-bold">SupportTech</span>
          </div>
          <p className="ml-auto text-sm font-medium text-text-secondary">
            Já tem uma conta? 
            <button onClick={() => navigate('/login')} className="text-primary hover:underline font-bold ml-1">Fazer Login</button>
          </p>
        </header>

        <main className="flex-1 flex flex-col justify-center px-8 lg:px-24 max-w-2xl mx-auto w-full pb-10">
          <div className="mb-10">
            <h2 className="text-4xl lg:text-5xl font-black text-white mb-3 tracking-tight">Criar nova conta</h2>
            <p className="text-text-secondary text-base">Inicie seu teste gratuito de 14 dias hoje mesmo.</p>
          </div>

          <form className="flex flex-col gap-5" onSubmit={handleSignupSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <label className="text-white text-xs font-bold uppercase tracking-widest ml-1">Nome</label>
                <input 
                  required
                  type="text" 
                  placeholder="Seu nome"
                  className="w-full h-12 px-4 bg-background-input border border-border-dark rounded-xl text-white focus:ring-1 focus:ring-primary outline-none transition-all"
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-white text-xs font-bold uppercase tracking-widest ml-1">Sobrenome</label>
                <input 
                  required
                  type="text" 
                  placeholder="Seu sobrenome"
                  className="w-full h-12 px-4 bg-background-input border border-border-dark rounded-xl text-white focus:ring-1 focus:ring-primary outline-none transition-all"
                />
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-white text-xs font-bold uppercase tracking-widest ml-1">E-mail Corporativo</label>
              <input 
                required
                type="email" 
                placeholder="nome@empresa.com"
                className="w-full h-12 px-4 bg-background-input border border-border-dark rounded-xl text-white focus:ring-1 focus:ring-primary outline-none transition-all"
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-white text-xs font-bold uppercase tracking-widest ml-1">Empresa / Unidade</label>
              <input 
                required
                type="text" 
                placeholder="Ex: TechSolutions Ltda"
                className="w-full h-12 px-4 bg-background-input border border-border-dark rounded-xl text-white focus:ring-1 focus:ring-primary outline-none transition-all"
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-white text-xs font-bold uppercase tracking-widest ml-1">Senha de Acesso</label>
              <div className="relative">
                <input 
                  required
                  type="password" 
                  placeholder="Mínimo 8 caracteres"
                  className="w-full h-12 px-4 pr-12 bg-background-input border border-border-dark rounded-xl text-white focus:ring-1 focus:ring-primary outline-none transition-all"
                />
                <button type="button" className="absolute right-4 top-1/2 -translate-y-1/2 text-text-muted hover:text-white transition-colors">
                  <span className="material-symbols-outlined text-[20px]">visibility</span>
                </button>
              </div>
            </div>

            <div className="flex items-start gap-3 mt-2">
              <input type="checkbox" required id="terms" className="mt-1 size-5 rounded border-border-dark bg-background-input text-primary focus:ring-primary/40 focus:ring-offset-background-dark" />
              <label htmlFor="terms" className="text-sm text-text-secondary leading-relaxed">
                Eu concordo com os <button type="button" className="text-primary font-bold hover:underline">Termos de Serviço</button> e confirmo que li a <button type="button" className="text-primary font-bold hover:underline">Política de Privacidade</button>.
              </label>
            </div>

            <button type="submit" className="mt-4 w-full h-14 bg-primary hover:bg-primary-hover text-white font-black text-base rounded-xl shadow-xl shadow-primary/30 transition-all flex items-center justify-center gap-2 group active:scale-[0.98]">
              Começar agora
              <span className="material-symbols-outlined transition-transform group-hover:translate-x-1">arrow_forward</span>
            </button>
          </form>
        </main>

        <footer className="p-8 px-8 lg:px-24 border-t border-border-dark/50">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <p className="text-[10px] text-text-muted font-bold uppercase tracking-widest">
              © 2024 SupportTech Pro. Security Verified.
            </p>
            <div className="flex gap-4">
              <span className="material-symbols-outlined text-text-muted text-[18px]">verified_user</span>
              <span className="material-symbols-outlined text-text-muted text-[18px]">encrypted</span>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default Signup;
