import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getNextCode, getTickets, updateTicket, getTicketById, getTicketHistory, addMessage } from './ticketController';

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
    mockQuery.mockResolvedValue({ rows: [] }); 

    const code = await getNextCode('EQP');
    expect(code).toBe('EQP-0000000001');
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('LENGTH(code) = 14'),
      ['EQP-%']
    );
  });

  it('deve incrementar o código se já houver tickets no novo formato', async () => {
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
      mockQuery.mockResolvedValue({ rows: [] });
      
      const code = await getNextCode('EQP');
      expect(code).toBe('EQP-0000000001');
  });
});

describe('getTickets - regras de visualização por perfil', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve filtrar por user_id quando usuário é Cliente via role', async () => {
    const req: any = {
      user: { id: 'user-1', role: 'Cliente' },
      query: {}
    };
    const json = vi.fn();
    const res: any = {
      json,
      status: vi.fn().mockReturnValue({ json })
    };

    mockQuery.mockResolvedValue({ rows: [] });

    await getTickets(req, res);

    expect(mockQuery).toHaveBeenCalledTimes(1);
    const [sql, params] = mockQuery.mock.calls[0];
    expect(sql).toContain('t.user_id = $1');
    expect(params).toEqual(['user-1']);
  });

  it('deve filtrar por user_id quando usuário é Cliente via profile', async () => {
    const req: any = {
      user: { id: 'user-2', role: 'Outro', profile: 'Cliente' },
      query: {}
    };
    const json = vi.fn();
    const res: any = {
      json,
      status: vi.fn().mockReturnValue({ json })
    };

    mockQuery.mockResolvedValue({ rows: [] });

    await getTickets(req, res);

    expect(mockQuery).toHaveBeenCalledTimes(1);
    const [sql, params] = mockQuery.mock.calls[0];
    expect(sql).toContain('t.user_id = $1');
    expect(params).toEqual(['user-2']);
  });

  it('deve aplicar filtro myTickets para usuário de suporte', async () => {
    const req: any = {
      user: { id: 'tech-1', role: 'Técnico', profile: 'Suporte Técnico' },
      query: { myTickets: 'true' }
    };
    const json = vi.fn();
    const res: any = {
      json,
      status: vi.fn().mockReturnValue({ json })
    };

    mockQuery.mockResolvedValue({ rows: [] });

    await getTickets(req, res);

    expect(mockQuery).toHaveBeenCalledTimes(1);
    const [sql, params] = mockQuery.mock.calls[0];
    expect(sql).toContain('t.technician_id = $1');
    expect(sql).toContain('t.user_id = $1');
    expect(params).toEqual(['tech-1']);
  });

  it('não deve aplicar filtro myTickets extra para Cliente', async () => {
    const req: any = {
      user: { id: 'client-1', role: 'Cliente', profile: 'Cliente' },
      query: { myTickets: 'true' }
    };
    const json = vi.fn();
    const res: any = {
      json,
      status: vi.fn().mockReturnValue({ json })
    };

    mockQuery.mockResolvedValue({ rows: [] });

    await getTickets(req, res);

    expect(mockQuery).toHaveBeenCalledTimes(1);
    const [sql, params] = mockQuery.mock.calls[0];
    expect(sql).toContain('t.user_id = $1');
    expect(sql).not.toContain('t.technician_id = $1');
    expect(params).toEqual(['client-1']);
  });
});

describe('updateTicket - validações de avaliação', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('retorna 400 quando rating está fora do intervalo permitido', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [
        {
          id: 'ticket-1',
          status: 'Resolvido',
          user_id: 'client-1',
          feedback: null,
        },
      ],
    });

    const req: any = {
      params: { id: 'ticket-1' },
      body: { rating: 6 },
      user: { id: 'client-1', role: 'Cliente' },
    };

    const json = vi.fn();
    const res: any = {
      json,
      status: vi.fn().mockReturnValue({ json }),
    };

    await updateTicket(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith({ message: 'Avaliação deve ser um número entre 1 e 5.' });
    expect(mockQuery).toHaveBeenCalledTimes(1);
  });

  it('retorna 400 quando rating baixo não possui feedback', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [
        {
          id: 'ticket-2',
          status: 'Resolvido',
          user_id: 'client-1',
          feedback: null,
        },
      ],
    });

    const req: any = {
      params: { id: 'ticket-2' },
      body: { rating: 1 },
      user: { id: 'client-1', role: 'Cliente' },
    };

    const json = vi.fn();
    const res: any = {
      json,
      status: vi.fn().mockReturnValue({ json }),
    };

    await updateTicket(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith({
      message: 'Por favor, informe o motivo da insatisfação ao registrar uma avaliação baixa.',
    });
    expect(mockQuery).toHaveBeenCalledTimes(1);
  });

  it('impede cliente de avaliar chamado de outro usuário', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [
        {
          id: 'ticket-3',
          status: 'Resolvido',
          user_id: 'client-1',
          feedback: null,
        },
      ],
    });

    const req: any = {
      params: { id: 'ticket-3' },
      body: { rating: 5, feedback: 'Ok' },
      user: { id: 'client-2', role: 'Cliente' },
    };

    const json = vi.fn();
    const res: any = {
      json,
      status: vi.fn().mockReturnValue({ json }),
    };

    await updateTicket(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(json).toHaveBeenCalledWith({
      message: 'Permissão negada. Apenas o solicitante do chamado pode avaliar ou reabrir este chamado.',
    });
  });

  it('impede suporte técnico de avaliar chamado', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [
        {
          id: 'ticket-4',
          status: 'Resolvido',
          user_id: 'client-1',
          feedback: null,
        },
      ],
    });

    const req: any = {
      params: { id: 'ticket-4' },
      body: { rating: 5 },
      user: { id: 'tech-1', role: 'Técnico', profile: 'Suporte Técnico' },
    };

    const json = vi.fn();
    const res: any = {
      json,
      status: vi.fn().mockReturnValue({ json }),
    };

    await updateTicket(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(json).toHaveBeenCalledWith({
      message: 'Permissão negada. Apenas Administradores e Clientes podem avaliar chamados.',
    });
  });
});

describe('getTicketById - restrições para clientes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('impede cliente de visualizar chamado de outro usuário', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [
        {
          id: 'ticket-1',
          user_id: 'client-1',
        },
      ],
    });

    const req: any = {
      params: { id: 'ticket-1' },
      user: { id: 'client-2', role: 'Cliente' },
    };

    const json = vi.fn();
    const res: any = {
      json,
      status: vi.fn().mockReturnValue({ json }),
    };

    await getTicketById(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(json).toHaveBeenCalledWith({ message: 'Acesso não autorizado' });
    // Expect 2 calls: 1 for fetching ticket, 1 for logging unauthorized access
    expect(mockQuery).toHaveBeenCalledTimes(2);
  });
});

describe('getTicketHistory - restrições para clientes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('impede cliente de acessar histórico de chamado de outro usuário', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [
        {
          id: 'ticket-1',
          user_id: 'client-1',
        },
      ],
    });

    const req: any = {
      params: { id: 'ticket-1' },
      user: { id: 'client-2', role: 'Cliente' },
    };

    const json = vi.fn();
    const res: any = {
      json,
      status: vi.fn().mockReturnValue({ json }),
    };

    await getTicketHistory(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(json).toHaveBeenCalledWith({ message: 'Acesso não autorizado' });
    expect(mockQuery).toHaveBeenCalledTimes(1);
  });
});

describe('addMessage - restrições para clientes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('impede cliente de enviar mensagem em chamado de outro usuário', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [
        {
          id: 'ticket-1',
          technician_id: null,
          user_id: 'client-1',
          code: 'SUP-0000000001',
          status: 'Aberto',
        },
      ],
    });

    const req: any = {
      params: { id: 'ticket-1' },
      body: { content: 'Mensagem do cliente' },
      user: { id: 'client-2', role: 'Cliente' },
    };

    const json = vi.fn();
    const res: any = {
      json,
      status: vi.fn().mockReturnValue({ json }),
    };

    await addMessage(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(json).toHaveBeenCalledWith({ message: 'Acesso não autorizado' });
    expect(mockQuery).toHaveBeenCalledTimes(1);
  });
});
