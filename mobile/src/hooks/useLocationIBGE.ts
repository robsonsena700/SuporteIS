import { useState, useEffect, useCallback } from 'react';

export interface Estado {
  id: number;
  sigla: string;
  nome: string;
}

export interface Municipio {
  id: number;
  nome: string;
}

export interface UseLocationIBGEReturn {
  estados: Estado[];
  municipios: Municipio[];
  loadingEstados: boolean;
  loadingMunicipios: boolean;
  error: string | null;
  fetchMunicipios: (uf: string) => Promise<void>;
  clearMunicipios: () => void;
}

export const useLocationIBGE = (): UseLocationIBGEReturn => {
  const [estados, setEstados] = useState<Estado[]>([]);
  const [municipios, setMunicipios] = useState<Municipio[]>([]);
  const [loadingEstados, setLoadingEstados] = useState(false);
  const [loadingMunicipios, setLoadingMunicipios] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchEstados = async () => {
      setLoadingEstados(true);
      try {
        const response = await fetch('https://servicodados.ibge.gov.br/api/v1/localidades/estados?orderBy=nome');
        if (!response.ok) throw new Error('Falha ao carregar estados');
        const data = await response.json();
        setEstados(data);
      } catch (err) {
        console.error(err);
        setError('Não foi possível carregar os estados.');
      } finally {
        setLoadingEstados(false);
      }
    };

    fetchEstados();
  }, []);

  const fetchMunicipios = useCallback(async (uf: string) => {
    if (!uf) {
      setMunicipios([]);
      return;
    }
    setLoadingMunicipios(true);
    try {
      const response = await fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${uf}/municipios`);
      if (!response.ok) throw new Error('Falha ao carregar municípios');
      const data = await response.json();
      setMunicipios(data);
    } catch (err) {
      console.error(err);
      setError('Não foi possível carregar os municípios.');
    } finally {
      setLoadingMunicipios(false);
    }
  }, []);

  const clearMunicipios = useCallback(() => {
    setMunicipios([]);
  }, []);

  return {
    estados,
    municipios,
    loadingEstados,
    loadingMunicipios,
    error,
    fetchMunicipios,
    clearMunicipios
  };
};
