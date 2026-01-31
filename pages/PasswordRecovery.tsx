
import React from 'react';
import { useNavigate } from 'react-router-dom';

const PasswordRecovery: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen w-full bg-background-dark justify-center items-center p-4">
      <div className="w-full max-w-lg bg-background-card border border-border-dark rounded-3xl overflow-hidden shadow-2xl flex flex-col animate-fade-in">
        <div className="w-full h-40 bg-cover bg-center relative" style={{ backgroundImage: 'url("https://picsum.photos/seed/repair/800/400")' }}>
          <div className="absolute inset-0 bg-gradient-to-t from-background-card to-transparent"></div>
          <div className="absolute inset-0 bg-primary/10 mix-blend-overlay"></div>
        </div>

        <div className="px-6 md:px-10 pb-10 pt-4 flex flex-col gap-6 md:gap-8">
          <div className="text-center flex flex-col gap-3">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-2 text-primary">
              <span className="material-symbols-outlined text-4xl filled">lock_reset</span>
            </div>
            <h1 className="text-2xl md:text-4xl font-black text-text-primary leading-tight tracking-tight">Recuperação de Senha</h1>
            <p className="text-text-secondary text-sm md:text-base font-normal leading-relaxed max-w-sm mx-auto">
              Não se preocupe. Insira o e-mail associado à sua conta de suporte e enviaremos instruções para redefinir sua senha.
            </p>
          </div>

          <form className="flex flex-col gap-6" onSubmit={(e) => e.preventDefault()}>
            <div className="flex flex-col gap-2">
              <label className="text-text-secondary text-sm font-bold ml-1">Endereço de e-mail</label>
              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted flex items-center pointer-events-none">
                  <span className="material-symbols-outlined text-[24px]">mail</span>
                </div>
                <input 
                  type="email" 
                  placeholder="exemplo@manutencao.com"
                  className="w-full h-14 pl-12 pr-4 rounded-xl bg-background-input border border-border-dark text-text-primary focus:ring-2 focus:ring-primary focus:border-transparent transition-all outline-none"
                />
              </div>
            </div>

            <button className="w-full h-14 bg-primary hover:bg-primary-hover text-white font-black text-base rounded-xl shadow-xl shadow-primary/30 transition-all flex items-center justify-center gap-2 group">
              <span>Enviar link de recuperação</span>
              <span className="material-symbols-outlined transition-transform group-hover:translate-x-1">arrow_forward</span>
            </button>
          </form>

          <div className="flex justify-center pt-2">
            <button onClick={() => navigate('/login')} className="flex items-center gap-2 text-text-secondary hover:text-text-primary transition-colors text-sm font-bold">
              <span className="material-symbols-outlined text-[20px]">arrow_back</span>
              Voltar para o Login
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PasswordRecovery;
