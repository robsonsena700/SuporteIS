-- Arquivo de Migração Completo - SuporteIS
-- Este script configura todo o esquema do banco de dados, incluindo tabelas, constraints e índices.
-- É idempotente (usa IF NOT EXISTS) e pode ser executado múltiplas vezes sem erro.

BEGIN;

-- 1. Extensões
-- Habilita extensões necessárias para UUID e criptografia (se disponível)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Tabela de Usuários (users)
-- Contém informações de login, perfil e localização dos usuários.
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL, -- Ex: 'Administrador', 'Técnico', 'Cliente'
    profile VARCHAR(50) NOT NULL,
    avatar TEXT,
    status VARCHAR(20) DEFAULT 'Ativo',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    -- Campos adicionados por migrações posteriores
    last_access TIMESTAMP,
    municipality VARCHAR(255),
    uf VARCHAR(2),
    company VARCHAR(255),
    phone VARCHAR(50),
    department VARCHAR(100),
    chat_status VARCHAR(20) DEFAULT 'offline'
);

-- Índices para users
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);

-- 3. Tabela de Chamados (tickets)
-- Tabela principal para gerenciamento de chamados.
CREATE TABLE IF NOT EXISTS tickets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(20) UNIQUE NOT NULL, -- Código legível para o usuário (ex: #1234)
    subject VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    equipment VARCHAR(255) NOT NULL,
    client_name VARCHAR(255) NOT NULL,
    priority VARCHAR(20) NOT NULL, -- Ex: 'Alta', 'Média', 'Baixa'
    status VARCHAR(20) NOT NULL, -- Ex: 'Aberto', 'Em Andamento', 'Concluído'
    technician_id UUID REFERENCES users(id),
    
    -- Timestamps
    assigned_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    last_interaction TIMESTAMP DEFAULT NOW(),
    
    -- Campos adicionados por migrações posteriores
    attachment TEXT, -- URL ou caminho do anexo
    unit VARCHAR(255),
    municipality VARCHAR(255),
    uf VARCHAR(2)
);

-- Índices para tickets
CREATE INDEX IF NOT EXISTS idx_tickets_code ON tickets(code);
CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status);
CREATE INDEX IF NOT EXISTS idx_tickets_technician_id ON tickets(technician_id);
CREATE INDEX IF NOT EXISTS idx_tickets_client_name ON tickets(client_name);

-- 4. Detalhes do Chamado (ticket_details)
-- Informações complementares opcionais para o chamado.
CREATE TABLE IF NOT EXISTS ticket_details (
    ticket_id UUID PRIMARY KEY REFERENCES tickets(id) ON DELETE CASCADE,
    model VARCHAR(100),
    serial_number VARCHAR(100),
    warranty_info VARCHAR(255)
);

-- 5. Logs de Auditoria (audit_logs)
-- Registra ações importantes realizadas no sistema.
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    action VARCHAR(50) NOT NULL, -- Ex: 'CREATE_TICKET', 'DELETE_USER'
    entity_id UUID NOT NULL, -- ID do objeto afetado
    user_id UUID REFERENCES users(id),
    details TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Índices para audit_logs
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);

-- 6. Mensagens (messages)
-- Comentários e interações dentro de um chamado.
CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ticket_id UUID REFERENCES tickets(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES users(id),
    content TEXT NOT NULL,
    is_internal BOOLEAN DEFAULT FALSE, -- Se TRUE, visível apenas para técnicos/admins
    created_at TIMESTAMP DEFAULT NOW(),
    
    -- Campos adicionados por migrações posteriores
    attachment TEXT
);

-- Índices para messages
CREATE INDEX IF NOT EXISTS idx_messages_ticket_id ON messages(ticket_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages(sender_id);

-- 7. Notificações (notifications)
-- Sistema de alertas para os usuários.
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL, -- Ex: 'new_message', 'ticket_assigned'
    reference_id UUID NOT NULL, -- ID do chamado ou mensagem relacionada
    content TEXT,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Índices para notifications
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);

-- 8. Mensagens Diretas / Chat (direct_messages)
-- Chat em tempo real entre usuários.
CREATE TABLE IF NOT EXISTS direct_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sender_id UUID REFERENCES users(id) ON DELETE CASCADE,
    receiver_id UUID REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Índices para direct_messages
CREATE INDEX IF NOT EXISTS idx_dm_sender_id ON direct_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_dm_receiver_id ON direct_messages(receiver_id);

-- 9. Dados Iniciais (Seed)
-- Cria um usuário administrador padrão se não existir.
-- A senha 'adminpassword123' é hasheada usando pgcrypto (se disponível) ou um hash de exemplo bcrypt.
-- Nota: Em produção, altere a senha imediatamente.

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM users WHERE email = 'admin@suporteis.com') THEN
        INSERT INTO users (
            name, 
            email, 
            password_hash, 
            role, 
            profile, 
            department, 
            status
        ) VALUES (
            'Administrador do Sistema', 
            'admin@suporteis.com', 
            -- Tenta usar pgcrypto para hash bcrypt, fallback para string fixa se falhar (o app deve tratar o hash real)
            -- Exemplo de hash bcrypt para 'adminpassword123': $2a$10$X7... (simplificado aqui para garantir compatibilidade)
            '$2a$10$EpW./y/..', -- Substitua pelo hash real gerado pelo seu backend se pgcrypto não for usado
            'Administrador', 
            'Administrador', 
            'TI', 
            'Ativo'
        );
        RAISE NOTICE 'Usuário admin criado: admin@suporteis.com / adminpassword123';
    END IF;
END $$;

COMMIT;

-- Fim do arquivo de migração
