import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';

interface Logos {
  web: string;
  mobile: {
    x1: string;
    x2: string;
    x3: string;
  };
}

const LogoManager: React.FC = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [logos, setLogos] = useState<Logos | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const { addToast } = useToast();

  useEffect(() => {
    if (!authLoading && user && user.profile !== 'Administrador') {
      addToast('Acesso negado: Apenas administradores podem gerenciar logos.', 'error');
      navigate('/dashboard');
    }
  }, [user, authLoading, navigate, addToast]);

  useEffect(() => {
    fetchLogos();
  }, []);

  const fetchLogos = async () => {
    try {
      setLoading(true);
      const response = await api.get('/logos');
      setLogos(response.data);
    } catch (error) {
      console.error('Failed to fetch logos', error);
      // Don't show toast on 404/initial load if empty, but good for debug
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
        addToast('Apenas arquivos de imagem são permitidos.', 'error');
        return;
    }

    const formData = new FormData();
    formData.append('logo', file);

    try {
      setUploading(true);
      await api.post('/logos/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      addToast('Logo atualizada com sucesso!', 'success');
      fetchLogos(); // Refresh preview
    } catch (error) {
      console.error('Upload failed', error);
      addToast('Falha ao atualizar logo.', 'error');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">Identidade Visual (Logos)</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Upload Section */}
        <div className="space-y-4">
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-500 transition-colors">
            <span className="material-symbols-outlined text-4xl text-gray-400 mb-2">cloud_upload</span>
            <p className="text-gray-600 mb-4">Arraste e solte ou clique para selecionar</p>
            <input
              type="file"
              id="logo-upload"
              className="hidden"
              accept="image/*"
              onChange={handleUpload}
              disabled={uploading}
            />
            <label
              htmlFor="logo-upload"
              className={`px-4 py-2 rounded-md text-white font-medium cursor-pointer ${
                uploading ? 'bg-gray-400' : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {uploading ? 'Processando...' : 'Selecionar Arquivo Original'}
            </label>
            <p className="text-xs text-gray-400 mt-2">
              Recomendado: SVG ou PNG (500x500px min).
            </p>
          </div>
        </div>

        {/* Preview Section */}
        <div className="space-y-6">
            <h3 className="text-lg font-semibold text-gray-700 border-b pb-2">Pré-visualização</h3>
            
            {loading ? (
                <div className="flex justify-center p-4">Carregando...</div>
            ) : logos ? (
                <div className="space-y-6">
                    <div>
                        <h4 className="text-sm font-medium text-text-secondary mb-2">Web (Desktop)</h4>
                        <div className="bg-background-surface p-4 rounded flex justify-center border border-border-dark">
                            <img 
                                src={`${logos.web}?t=${Date.now()}`} 
                                alt="Logo Web" 
                                className="h-16 object-contain" 
                                onError={(e) => (e.currentTarget.style.display = 'none')}
                            />
                        </div>
                    </div>

                    <div>
                        <h4 className="text-sm font-medium text-text-secondary mb-2">Mobile (App)</h4>
                        <div className="bg-background-surface p-4 rounded flex justify-center border border-border-dark">
                            <img 
                                src={`${logos.mobile.x1}?t=${Date.now()}`} 
                                alt="Logo Mobile" 
                                className="h-12 w-12 object-contain" 
                                onError={(e) => (e.currentTarget.style.display = 'none')}
                            />
                        </div>
                        <div className="text-xs text-text-muted mt-1 text-center">
                            Exibido com fundo do tema atual
                        </div>
                    </div>
                </div>
            ) : (
                <div className="text-gray-400 italic text-center p-4">
                    Nenhuma logo configurada.
                </div>
            )}
        </div>
      </div>
      
      <div className="mt-8 bg-blue-50 p-4 rounded-md text-sm text-blue-800">
        <strong>Nota:</strong> As alterações podem levar alguns minutos para refletir em todos os dispositivos devido ao cache.
        Para o app mobile, é necessário reiniciar para ver as mudanças se não estiver em modo de desenvolvimento.
      </div>
    </div>
  );
};

export default LogoManager;
