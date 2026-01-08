import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getNextCode } from './ticketController';

// Mock do pool
const mockQuery = vi.fn();
vi.mock('../config/database', () => ({
  pool: {
    query: (...args: any[]) => mockQuery(...args)
  }
}));

describe('getNextCode', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve gerar o primeiro código (0000000001) se não houver tickets no novo formato', async () => {
    // Simula que a query retornou vazio (nenhum ticket com length 14 encontrado)
    mockQuery.mockResolvedValue({ rows: [] }); 

    const code = await getNextCode('EQP');
    expect(code).toBe('EQP-0000000001');
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('LENGTH(code) = 14'),
      ['EQP-%']
    );
  });

  it('deve incrementar o código se já houver tickets no novo formato', async () => {
    // Simula que o último ticket foi EQP-0000000001
    mockQuery.mockResolvedValue({ 
      rows: [{ code: 'EQP-0000000001' }] 
    });

    const code = await getNextCode('EQP');
    expect(code).toBe('EQP-0000000002');
  });
  
  it('deve lidar corretamente com SUP', async () => {
      mockQuery.mockResolvedValue({ rows: [] });
      const code = await getNextCode('SUP');
      expect(code).toBe('SUP-0000000001');
  });

  it('deve ignorar tickets antigos (simulado pelo retorno vazio da query filtrada)', async () => {
      // A query real filtra por LENGTH=14.
      // Se houver tickets EQP-260002 (length 10) no banco, a query retornará vazio para length 14.
      // O mock simula esse retorno vazio.
      mockQuery.mockResolvedValue({ rows: [] });
      
      const code = await getNextCode('EQP');
      expect(code).toBe('EQP-0000000001');
  });
});
