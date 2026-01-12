import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthService } from '../services/api';

interface SignupProps {
  onSignup: () => void;
}

const Signup: React.FC<SignupProps> = ({ onSignup }) => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    company: '',
    password: '',
    agreeTerms: false
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const getPasswordStrength = (password: string) => {
    if (!password) return 0;
    let score = 0;
    if (password.length >= 8) score += 1;
    if (/[a-zA-Z]/.test(password)) score += 1;
    if (/[0-9]/.test(password)) score += 1;
    if (/[^a-zA-Z0-9]/.test(password)) score += 1;
    return score; // Max 4
  };

  const validatePasswordStrength = (password: string) => {
    return /[a-zA-Z]/.test(password) && /[0-9]/.test(password);
  };

  const passwordScore = getPasswordStrength(formData.password);

  const handleSignupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (formData.password.length < 8) {
      setError('A senha deve ter no mínimo 8 caracteres.');
      return;
    }

    if (!validatePasswordStrength(formData.password)) {
        setError('A senha deve conter letras e números.');
        return;
    }

    if (formData.password !== (formData as any).confirmPassword) {
        setError('As senhas não coincidem.');
        return;
    }

    setLoading(true);

    try {
      await AuthService.register({
        name: `${formData.firstName} ${formData.lastName}`.trim(),
        email: formData.email,
        company: formData.company,
        password: formData.password,
        role: 'Cliente', // Default for self-signup
        profile: 'Cliente' // Default profile
      });
      
      alert('Cadastro realizado com sucesso! Faça login para continuar.');
      navigate('/login');
    } catch (err: any) {
      console.error(err);
      const msg = err.response?.data?.message || 'Erro de conexão ou servidor. Tente novamente mais tarde.';
      setError(msg);
    } finally {
      setLoading(false);
    }
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
      <div className="w-full lg:w-7/12 flex flex-col bg-background-dark overflow-y-auto">
        <header className="flex items-center justify-between px-6 py-6 lg:px-20 lg:py-8">
          <div className="lg:hidden flex items-center gap-2 text-white">
            <span className="material-symbols-outlined text-primary text-3xl">hub</span>
            <span className="text-xl font-bold">SupportIS</span>
          </div>
          <p className="ml-auto text-sm font-medium text-text-secondary">
            Já tem uma conta? 
            <button onClick={() => navigate('/login')} className="text-primary hover:underline font-bold ml-1">Fazer Login</button>
          </p>
        </header>

        <main className="flex-1 flex flex-col justify-center px-6 lg:px-24 max-w-2xl mx-auto w-full pb-10">
          <div className="mb-8 lg:mb-10">
            <h2 className="text-3xl lg:text-5xl font-black text-white mb-3 tracking-tight">Criar nova conta</h2>
            <p className="text-text-secondary text-sm lg:text-base">Inicie seu teste gratuito de 14 dias hoje mesmo.</p>
          </div>

          {error && (
            <div className="mb-6 bg-red-500/10 border border-red-500/50 text-red-500 text-sm p-4 rounded-xl">
              {error}
            </div>
          )}

          <form className="flex flex-col gap-5" onSubmit={handleSignupSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <label className="text-white text-xs font-bold uppercase tracking-widest ml-1">Nome</label>
                <input 
                  required
                  type="text" 
                  placeholder="Seu nome"
                  value={formData.firstName}
                  onChange={e => setFormData({...formData, firstName: e.target.value})}
                  className="w-full h-12 px-4 bg-background-input border border-border-dark rounded-xl text-white focus:ring-1 focus:ring-primary outline-none transition-all"
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-white text-xs font-bold uppercase tracking-widest ml-1">Sobrenome</label>
                <input 
                  required
                  type="text" 
                  placeholder="Seu sobrenome"
                  value={formData.lastName}
                  onChange={e => setFormData({...formData, lastName: e.target.value})}
                  className="w-full h-12 px-4 bg-background-input border border-border-dark rounded-xl text-white focus:ring-1 focus:ring-primary outline-none transition-all"
                />
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-white text-xs font-bold uppercase tracking-widest ml-1">E-mail ou Usuário</label>
              <input 
                required
                type="email" 
                placeholder="nome@empresa.com"
                value={formData.email}
                onChange={e => setFormData({...formData, email: e.target.value})}
                className="w-full h-12 px-4 bg-background-input border border-border-dark rounded-xl text-white focus:ring-1 focus:ring-primary outline-none transition-all"
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-white text-xs font-bold uppercase tracking-widest ml-1">Empresa / Unidade</label>
              <input 
                required
                type="text" 
                placeholder="Ex: TechSolutions Ltda"
                value={formData.company}
                onChange={e => setFormData({...formData, company: e.target.value})}
                className="w-full h-12 px-4 bg-background-input border border-border-dark rounded-xl text-white focus:ring-1 focus:ring-primary outline-none transition-all"
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-white text-xs font-bold uppercase tracking-widest ml-1">Senha de Acesso</label>
              <div className="relative">
                <input 
                  required
                  type="password" 
                  placeholder="Mínimo 8 caracteres (letras e números)"
                  value={formData.password}
                  onChange={e => setFormData({...formData, password: e.target.value})}
                  className="w-full h-12 px-4 pr-12 bg-background-input border border-border-dark rounded-xl text-white focus:ring-1 focus:ring-primary outline-none transition-all"
                />
                <button type="button" className="absolute right-4 top-1/2 -translate-y-1/2 text-text-muted hover:text-white transition-colors">
                  <span className="material-symbols-outlined text-[20px]">visibility</span>
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-white text-xs font-bold uppercase tracking-widest ml-1">Confirmar Senha</label>
              <div className="relative">
                <input 
                  required
                  type="password" 
                  placeholder="Confirme sua senha"
                  value={formData.confirmPassword}
                  onChange={e => setFormData({...formData, confirmPassword: e.target.value})}
                  className={`w-full h-12 px-4 pr-12 bg-background-input border rounded-xl text-white focus:ring-1 focus:ring-primary outline-none transition-all ${
                    formData.confirmPassword && formData.password !== formData.confirmPassword 
                    ? 'border-red-500 focus:border-red-500' 
                    : 'border-border-dark'
                  }`}
                />
              </div>
            </div>

            <div className="flex items-start gap-3 mt-2">
              <input 
                type="checkbox" 
                required 
                id="terms" 
                checked={formData.agreeTerms}
                onChange={e => setFormData({...formData, agreeTerms: e.target.checked})}
                className="mt-1 size-5 rounded border-border-dark bg-background-input text-primary focus:ring-primary/40 focus:ring-offset-background-dark" 
              />
              <label htmlFor="terms" className="text-sm text-text-secondary leading-relaxed">
                Eu concordo com os <button type="button" className="text-primary font-bold hover:underline">Termos de Serviço</button> e confirmo que li a <button type="button" className="text-primary font-bold hover:underline">Política de Privacidade</button>.
              </label>
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className="mt-4 w-full h-14 bg-primary hover:bg-primary-hover text-white font-black text-base rounded-xl shadow-xl shadow-primary/30 transition-all flex items-center justify-center gap-2 group active:scale-[0.98] disabled:opacity-50"
            >
              {loading ? 'Criando conta...' : 'Começar agora'}
              {!loading && <span className="material-symbols-outlined transition-transform group-hover:translate-x-1">arrow_forward</span>}
            </button>
          </form>
        </main>

        <footer className="p-6 px-6 lg:px-24 border-t border-border-dark/50">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <p className="text-[10px] text-text-muted font-bold uppercase tracking-widest text-center sm:text-left">
              © 2026 SupportIS. Security Verified.
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
