import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getTicketById, getTickets } from '../controllers/ticketController';
import { pool } from '../config/database';
import { Request, Response } from 'express';

// Mock database pool
vi.mock('../config/database', () => ({
  pool: {
    query: vi.fn(),
  },
}));

describe('Access Control', () => {
  let req: any;
  let res: any;

  beforeEach(() => {
    vi.clearAllMocks();
    req = {
      params: {},
      query: {},
      user: {},
      body: {},
    };
    res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };
  });

  describe('Rating Visibility', () => {
    const mockTicket = {
      id: '1',
      rating: 5,
      feedback: 'Great service',
      user_id: 'client-1',
      technician_id: 'tech-1',
      status: 'Resolvido',
    };

    it('should show rating to Client', async () => {
      req.user = { id: 'client-1', role: 'Cliente' };
      req.params.id = '1';

      (pool.query as any).mockResolvedValueOnce({ rows: [mockTicket] }); // getTicketById query
      (pool.query as any).mockResolvedValueOnce({ rows: [] }); // messages query

      await getTicketById(req, res);

      const responseData = res.json.mock.calls[0][0];
      expect(responseData.rating).toBe(5);
      expect(responseData.feedback).toBe('Great service');
    });

    it('should show rating to Administrator', async () => {
      req.user = { id: 'admin-1', role: 'Administrador' };
      req.params.id = '1';

      (pool.query as any).mockResolvedValueOnce({ rows: [mockTicket] });
      (pool.query as any).mockResolvedValueOnce({ rows: [] });

      await getTicketById(req, res);

      const responseData = res.json.mock.calls[0][0];
      expect(responseData.rating).toBe(5);
      expect(responseData.feedback).toBe('Great service');
    });

    it('should HIDE rating from Technician', async () => {
      req.user = { id: 'tech-1', role: 'Técnico' };
      req.params.id = '1';

      (pool.query as any).mockResolvedValueOnce({ rows: [{ ...mockTicket }] });
      (pool.query as any).mockResolvedValueOnce({ rows: [] });

      await getTicketById(req, res);

      const responseData = res.json.mock.calls[0][0];
      expect(responseData.rating).toBeNull();
      expect(responseData.feedback).toBeNull();
    });

    it('should HIDE rating from Support', async () => {
      req.user = { id: 'support-1', role: 'Suporte Técnico' };
      req.params.id = '1';

      (pool.query as any).mockResolvedValueOnce({ rows: [{ ...mockTicket }] });
      (pool.query as any).mockResolvedValueOnce({ rows: [] });

      await getTicketById(req, res);

      const responseData = res.json.mock.calls[0][0];
      expect(responseData.rating).toBeNull();
      expect(responseData.feedback).toBeNull();
    });
  });

  describe('Ticket List Rating Visibility', () => {
    const mockTickets = [
      { id: '1', rating: 5, feedback: 'Good' },
      { id: '2', rating: 4, feedback: 'Okay' },
    ];

    it('should hide ratings in list for Technician', async () => {
      req.user = { id: 'tech-1', role: 'Técnico' };
      req.query = {};

      (pool.query as any).mockResolvedValueOnce({ rows: mockTickets.map(t => ({...t})) });

      await getTickets(req, res);

      const responseData = res.json.mock.calls[0][0];
      expect(responseData[0].rating).toBeNull();
      expect(responseData[0].feedback).toBeNull();
      expect(responseData[1].rating).toBeNull();
      expect(responseData[1].feedback).toBeNull();
    });

    it('should show ratings in list for Admin', async () => {
        req.user = { id: 'admin-1', role: 'Administrador' };
        req.query = {};
  
        (pool.query as any).mockResolvedValueOnce({ rows: mockTickets.map(t => ({...t})) });
  
        await getTickets(req, res);
  
        const responseData = res.json.mock.calls[0][0];
        expect(responseData[0].rating).toBe(5);
        expect(responseData[0].feedback).toBe('Good');
      });
  });
});
