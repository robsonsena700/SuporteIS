import { describe, it, expect, vi, beforeEach } from 'vitest';
import { changeTicketType, getNextCode } from './ticketController';
import { pool } from '../config/database';
import { Request, Response } from 'express';

// Mock dependencies
vi.mock('../config/database', () => ({
  pool: {
    query: vi.fn(),
    connect: vi.fn(),
  }
}));

// Mock getNextCode specifically for this test file if needed, or rely on implementation if it calls pool.query
// Since getNextCode is exported and used inside changeTicketType, mocking it might be tricky if it's in the same module.
// However, since we are importing changeTicketType from the module, and it calls getNextCode from the SAME module,
// mocking getNextCode via vi.mock('./ticketController') might not work for internal calls depending on how it's bundled/compiled.
// BUT, getNextCode uses pool.query. So we can just mock pool.query responses for getNextCode as well.

type AuthRequestLike = Request & { user?: any };

describe('changeTicketType', () => {
  let mockReq: Partial<AuthRequestLike>;
  let mockRes: Partial<Response>;
  let mockJson: any;
  let mockStatus: any;
  let mockClient: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockJson = vi.fn();
    mockStatus = vi.fn().mockReturnValue({ json: mockJson });
    mockReq = {
      params: { id: 'ticket-uuid' },
      user: {
        id: 'user-uuid',
        role: 'Suporte',
        profile: 'Suporte',
        name: 'Test User',
        email: 'test@example.com',
        company: 'Test Company',
        municipality: 'Test City',
        uf: 'TS'
      } as any
    };
    mockRes = {
      status: mockStatus,
      json: mockJson
    };

    mockClient = {
      query: vi.fn(),
      release: vi.fn(),
    };
    (pool.connect as any).mockResolvedValue(mockClient);
  });

  it('should change ticket type from SUP to EQP successfully', async () => {
    // 1. BEGIN
    mockClient.query.mockResolvedValueOnce({ rows: [] }); 
    // 2. SELECT ticket (SUP ticket)
    mockClient.query.mockResolvedValueOnce({ 
      rows: [{ id: 'ticket-uuid', code: 'SUP-000001', status: 'Aberto', subject: 'Test' }]
    });
    // 3. SELECT code (check existing EQP tickets)
    mockClient.query.mockResolvedValueOnce({ rows: [] }); 
    // 4. UPDATE ticket
    mockClient.query.mockResolvedValueOnce({ rowCount: 1 }); 
    // 5. INSERT history
    mockClient.query.mockResolvedValueOnce({ rowCount: 1 }); 
    // 6. COMMIT
    mockClient.query.mockResolvedValueOnce({});
    // 7. SELECT updated ticket
    mockClient.query.mockResolvedValueOnce({ 
       rows: [{ id: 'ticket-uuid', code: 'EQP-0000000001', status: 'Aberto' }] 
    });

    await changeTicketType(mockReq as Request, mockRes as Response);

    expect(pool.connect).toHaveBeenCalled();
    expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
    expect(mockClient.query).toHaveBeenCalledWith(expect.stringContaining('SELECT * FROM tickets'), ['ticket-uuid']);
    // Check for code generation query
    expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT code FROM tickets'), 
        expect.arrayContaining(['EQP-%'])
    );
    expect(mockClient.query).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE tickets SET code = $1 WHERE id = $2'),
      expect.arrayContaining(['EQP-0000000001', 'ticket-uuid'])
    );
    expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
    expect(mockStatus).not.toHaveBeenCalledWith(400);
    expect(mockStatus).not.toHaveBeenCalledWith(403);
    expect(mockStatus).not.toHaveBeenCalledWith(500);
    expect(mockJson).toHaveBeenCalledWith(expect.objectContaining({ code: 'EQP-0000000001' }));
  });

  it('should deny access if user does not have permission', async () => {
    mockReq.user!.role = 'Cliente';
    mockReq.user!.profile = 'Cliente';

    await changeTicketType(mockReq as Request, mockRes as Response);

    expect(mockStatus).toHaveBeenCalledWith(403);
    expect(mockJson).toHaveBeenCalledWith(expect.objectContaining({ message: expect.stringContaining('Permissão negada') }));
    expect(pool.connect).not.toHaveBeenCalled();
  });

  it('should fail if ticket is not Open', async () => {
    mockClient.query.mockResolvedValueOnce({ rows: [] }); // BEGIN
    mockClient.query.mockResolvedValueOnce({ // SELECT ticket
      rows: [{ id: 'ticket-uuid', code: 'SUP-000001', status: 'Em Andamento' }]
    });

    await changeTicketType(mockReq as Request, mockRes as Response);

    expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
    expect(mockStatus).toHaveBeenCalledWith(400);
    expect(mockJson).toHaveBeenCalledWith(expect.objectContaining({ message: expect.stringContaining('Apenas chamados com status "Aberto"') }));
  });

  it('should fail if ticket is already EQP', async () => {
    mockClient.query.mockResolvedValueOnce({ rows: [] }); // BEGIN
    mockClient.query.mockResolvedValueOnce({ // SELECT ticket
      rows: [{ id: 'ticket-uuid', code: 'EQP-000001', status: 'Aberto' }]
    });

    await changeTicketType(mockReq as Request, mockRes as Response);

    expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
    expect(mockStatus).toHaveBeenCalledWith(400);
    expect(mockJson).toHaveBeenCalledWith(expect.objectContaining({ message: expect.stringContaining('Este chamado já é do tipo Equipamento') }));
  });
});
