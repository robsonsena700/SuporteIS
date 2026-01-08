
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import NewTicket from './NewTicket';
import { BrowserRouter } from 'react-router-dom';

// Mocks
vi.mock('../services/api', () => ({
  TicketService: {
    create: vi.fn(),
  }
}));

vi.mock('../context/ToastContext', () => ({
  useToast: () => ({
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
  })
}));

// Mock ReactQuill to avoid issues in test environment if necessary, 
// BUT we want to catch if it breaks. However, ReactQuill usually needs document.
// Let's try to NOT mock it first to see if it renders. 
// If it fails due to "document is not defined" or similar in JSDOM, we mock it.
// But we suspect React 19 compatibility.

describe('NewTicket Component', () => {
  it('renders correctly', () => {
    render(
      <BrowserRouter>
        <NewTicket onAdd={() => {}} />
      </BrowserRouter>
    );

    expect(screen.getByText('Novo Chamado')).toBeInTheDocument();
    expect(screen.getByText('Localização e Contato')).toBeInTheDocument();
  });
});
