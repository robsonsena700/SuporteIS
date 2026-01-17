import { describe, it, expect, vi } from 'vitest';
import { authorizeRole, AuthRequest } from './authMiddleware';
import { Response, NextFunction } from 'express';

const createMocks = (user: any) => {
  const req: AuthRequest = { user } as AuthRequest;
  const json = vi.fn();
  const status = vi.fn().mockReturnValue({ json });
  const res = { status } as unknown as Response;
  const next = vi.fn() as unknown as NextFunction;
  return { req, res, next, status, json };
};

describe('authorizeRole middleware', () => {
  it('denies access when user is not authenticated', () => {
    const { req, res, next, status, json } = createMocks(null);
    const middleware = authorizeRole(['Administrador', 'Líder']);
    middleware(req, res, next);
    expect(status).toHaveBeenCalledWith(401);
    expect(json).toHaveBeenCalledWith({ message: 'Não autenticado' });
    expect(next).not.toHaveBeenCalled();
  });

  it('denies access for Técnico profile', () => {
    const { req, res, next, status, json } = createMocks({ role: 'Técnico', profile: 'Suporte Técnico' });
    const middleware = authorizeRole(['Administrador', 'Líder']);
    middleware(req, res, next);
    expect(status).toHaveBeenCalledWith(403);
    expect(json).toHaveBeenCalledWith({ message: 'Acesso negado: Permissão insuficiente' });
    expect(next).not.toHaveBeenCalled();
  });

  it('allows access for Administrador role', () => {
    const { req, res, next, status } = createMocks({ role: 'Administrador', profile: 'Administrador' });
    const middleware = authorizeRole(['Administrador', 'Líder']);
    middleware(req, res, next);
    expect(status).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalled();
  });

  it('allows access for Líder profile', () => {
    const { req, res, next, status } = createMocks({ role: 'Técnico', profile: 'Líder' });
    const middleware = authorizeRole(['Administrador', 'Líder']);
    middleware(req, res, next);
    expect(status).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalled();
  });
});

