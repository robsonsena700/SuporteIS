import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthService } from '../services/api';
import { User } from '../types';

interface LoginProps {
  onLogin: (user: User) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    // Basic validation
    if (!email || !password) {
        setError('Por favor, preencha todos os campos.');
        return;
    }
    
    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        setError('Por favor, insira um email válido.');
        return;
    }

    setLoading(true);

    try {
      const response = await AuthService.login(email, password);
      // AuthService already sets token and user in localStorage
      onLogin(response.user);
    } catch (err: any) {
      console.error('Login Error:', err);
      if (!err.response) {
        setError('Erro de conexão. Verifique sua internet ou tente novamente mais tarde.');
      } else if (err.response.status >= 500) {
        setError('Erro no servidor. Tente novamente em instantes.');
      } else {
        setError(err.response?.data?.message || `Erro ao realizar login (${err.response.status}). Verifique suas credenciais.`);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen w-full bg-background-dark justify-center items-center p-4">
      <div className="w-full max-w-md bg-background-card border border-border-dark rounded-3xl overflow-hidden shadow-2xl animate-fade-in">
        <div className="h-32 bg-primary/10 relative overflow-hidden">
           <img className="w-full h-full object-cover opacity-20" src="https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&q=80&w=800" alt="" />
           <div className="absolute inset-0 bg-gradient-to-t from-background-card to-transparent"></div>
           <div className="absolute inset-0 flex items-center justify-center">
             <div className="size-16 bg-primary/20 rounded-2xl flex items-center justify-center text-primary border border-primary/20">
               <span className="material-symbols-outlined text-4xl filled">security</span>
             </div>
           </div>
        </div>

        <div className="p-6 md:p-10 flex flex-col gap-8">
          <div className="text-center">
            <h2 className="text-3xl font-black text-white mb-2">Bem-vindo de volta</h2>
            <p className="text-text-secondary text-sm">Acesse sua conta para gerenciar seus chamados.</p>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/50 text-red-500 text-sm p-3 rounded-xl text-center">
              {error}
            </div>
          )}

          <form className="flex flex-col gap-5" onSubmit={handleLoginSubmit}>
            <div className="flex flex-col gap-2">
              <label className="text-white text-xs font-bold uppercase tracking-widest">E-mail Corporativo</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-text-muted text-[20px]">mail</span>
                <input 
                  required
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="usuario@empresa.com"
                  className="w-full h-12 pl-12 pr-4 bg-background-input border border-border-dark rounded-xl text-white focus:ring-1 focus:ring-primary outline-none transition-all"
                />
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <div className="flex justify-between items-center">
                <label className="text-white text-xs font-bold uppercase tracking-widest">Senha</label>
                <button type="button" onClick={() => navigate('/recovery')} className="text-[11px] text-primary font-bold hover:underline">Esqueceu a senha?</button>
              </div>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-text-muted text-[20px]">lock</span>
                <input 
                  required
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="******"
                  className="w-full h-12 pl-12 pr-4 bg-background-input border border-border-dark rounded-xl text-white focus:ring-1 focus:ring-primary outline-none transition-all"
                />
              </div>
            </div>

            <button disabled={loading} type="submit" className="mt-4 w-full h-12 bg-primary hover:bg-primary-hover text-white font-bold text-sm rounded-xl shadow-lg shadow-primary/20 transition-all flex items-center justify-center gap-2 group active:scale-95 disabled:opacity-50">
              {loading ? 'Entrando...' : 'Acessar Painel'}
              {!loading && <span className="material-symbols-outlined text-[20px] transition-transform group-hover:translate-x-1">login</span>}
            </button>
          </form>

          <div className="flex flex-col gap-4 text-center">
            <div className="flex items-center gap-4">
              <div className="flex-1 h-px bg-border-dark"></div>
              <span className="text-[10px] text-text-muted font-bold uppercase tracking-widest">Ou continue com</span>
              <div className="flex-1 h-px bg-border-dark"></div>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <button className="h-10 border border-border-dark rounded-lg flex items-center justify-center gap-2 hover:bg-background-input transition-all">
                <img src="https://www.google.com/favicon.ico" className="w-4" alt="" />
                <span className="text-xs text-white font-bold">Google</span>
              </button>
              <button className="h-10 border border-border-dark rounded-lg flex items-center justify-center gap-2 hover:bg-background-input transition-all">
                <span className="material-symbols-outlined text-white text-[18px]">domain</span>
                <span className="text-xs text-white font-bold">SSO Empresa</span>
              </button>
            </div>

             <p className="text-sm text-text-secondary mt-4">
               Não tem uma conta? 
               <button onClick={() => navigate('/signup')} className="text-primary font-bold ml-1 hover:underline">Solicitar Acesso</button>
             </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
