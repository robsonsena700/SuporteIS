-- Tabela unificada para auditoria de mensagens
-- Armazena mensagens de Tickets, Chat Direto e (futuramente) Equipes
CREATE TABLE IF NOT EXISTS message_audit_store (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    original_message_id UUID, -- ID na tabela original (tickets.messages ou direct_messages)
    source_table VARCHAR(50) NOT NULL, -- 'ticket_messages', 'direct_messages', 'team_messages'
    context_type VARCHAR(50) NOT NULL, -- 'ticket', 'direct', 'team'
    context_id UUID, -- Ticket ID, Receiver ID (para direct), ou Team ID
    sender_id UUID NOT NULL, -- Quem enviou
    recipient_id UUID, -- Quem recebeu (para direct) ou NULL para tickets/equipes
    content TEXT NOT NULL,
    metadata JSONB, -- Metadados extras (IP, User Agent, etc.)
    message_created_at TIMESTAMP NOT NULL, -- Data original da mensagem
    archived_at TIMESTAMP DEFAULT NOW() -- Quando foi arquivado para auditoria
);

-- Índices para busca eficiente na auditoria
CREATE INDEX IF NOT EXISTS idx_audit_store_sender ON message_audit_store(sender_id);
CREATE INDEX IF NOT EXISTS idx_audit_store_context ON message_audit_store(context_type, context_id);
CREATE INDEX IF NOT EXISTS idx_audit_store_created_at ON message_audit_store(message_created_at);
CREATE INDEX IF NOT EXISTS idx_audit_store_source ON message_audit_store(source_table, original_message_id);

-- Tabela de Logs de Acesso à Auditoria
-- Registra quem consultou, buscou ou exportou logs de mensagens
CREATE TABLE IF NOT EXISTS audit_access_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    action VARCHAR(50) NOT NULL, -- 'SEARCH', 'VIEW', 'EXPORT'
    query_details TEXT, -- JSON stringificado ou texto descrevendo o filtro usado
    ip_address VARCHAR(45),
    accessed_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_access_user ON audit_access_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_access_date ON audit_access_logs(accessed_at);
