# Planejamento do Backend - SuporteIS

## 1. Arquitetura do Backend

A arquitetura seguirá o padrão MVC (Model-View-Controller) adaptado para API REST (Controller-Service-Model), utilizando **Node.js** com **Express** e **TypeScript**.

### Estrutura de Pastas
```
backend/
├── src/
│   ├── config/         # Configurações de DB, Variáveis de Ambiente
│   ├── controllers/    # Lógica de entrada/saída HTTP
│   ├── middlewares/    # Autenticação, Validação, Error Handling
│   ├── models/         # Definições de tipos e acesso a dados (Repositories)
│   ├── routes/         # Definição das rotas da API
│   ├── services/       # Regras de negócio
│   ├── utils/          # Funções utilitárias (Logger, Hash, JWT)
│   ├── app.ts          # Configuração do Express
│   └── server.ts       # Ponto de entrada do servidor
├── tests/              # Testes unitários e de integração
├── .env.example        # Modelo de variáveis de ambiente
├── package.json
└── tsconfig.json
```

## 2. Banco de Dados PostgreSQL (Schema)

### Diagrama ER (Entidade-Relacionamento)

#### Tabela: `users`
Responsável por armazenar os dados de usuários (Técnicos, Admins, Clientes).

| Coluna | Tipo | Restrições | Descrição |
|---|---|---|---|
| id | UUID | PK, Default: uuid_generate_v4() | Identificador único |
| name | VARCHAR(255) | NOT NULL | Nome completo |
| email | VARCHAR(255) | UNIQUE, NOT NULL | Email para login |
| password_hash | VARCHAR(255) | NOT NULL | Hash da senha (Bcrypt) |
| role | VARCHAR(50) | NOT NULL | Cargo (ex: Admin Principal) |
| profile | VARCHAR(50) | NOT NULL | Perfil de acesso (ADMIN, TECH, CLIENT) |
| avatar | TEXT | NULL | URL da foto de perfil |
| status | VARCHAR(20) | DEFAULT 'ACTIVE' | Status da conta |
| created_at | TIMESTAMP | DEFAULT NOW() | Data de criação |
| updated_at | TIMESTAMP | DEFAULT NOW() | Data de atualização |

#### Tabela: `tickets`
Armazena os chamados de suporte.

| Coluna | Tipo | Restrições | Descrição |
|---|---|---|---|
| id | UUID | PK, Default: uuid_generate_v4() | Identificador único |
| code | VARCHAR(20) | UNIQUE, NOT NULL | Código legível (ex: #CH-2049) |
| subject | VARCHAR(255) | NOT NULL | Assunto do chamado |
| description | TEXT | NOT NULL | Descrição detalhada |
| equipment | VARCHAR(255) | NOT NULL | Equipamento afetado |
| client_name | VARCHAR(255) | NOT NULL | Nome do cliente/empresa |
| priority | VARCHAR(20) | NOT NULL | LOW, MEDIUM, HIGH |
| status | VARCHAR(20) | NOT NULL | OPEN, IN_PROGRESS, RESOLVED |
| technician_id | UUID | FK -> users(id), NULLABLE | Técnico responsável |
| created_at | TIMESTAMP | DEFAULT NOW() | Data de abertura |
| updated_at | TIMESTAMP | DEFAULT NOW() | Última atualização |
| last_interaction | TIMESTAMP | DEFAULT NOW() | Data da última mensagem/ação |

#### Tabela: `ticket_details` (Opcional - Normalização)
Detalhes específicos do equipamento.

| Coluna | Tipo | Restrições | Descrição |
|---|---|---|---|
| ticket_id | UUID | PK, FK -> tickets(id) | Vínculo com chamado |
| model | VARCHAR(100) | NULL | Modelo do equipamento |
| serial_number | VARCHAR(100) | NULL | Número de série |
| warranty_info | VARCHAR(255) | NULL | Informações de garantia |

#### Tabela: `messages`
Histórico de conversas dentro do chamado.

| Coluna | Tipo | Restrições | Descrição |
|---|---|---|---|
| id | UUID | PK, Default: uuid_generate_v4() | Identificador único |
| ticket_id | UUID | FK -> tickets(id) | Chamado vinculado |
| sender_id | UUID | FK -> users(id) | Quem enviou |
| content | TEXT | NOT NULL | Conteúdo da mensagem |
| is_internal | BOOLEAN | DEFAULT FALSE | Se é nota interna |
| created_at | TIMESTAMP | DEFAULT NOW() | Data de envio |

## 3. Segurança

1.  **Autenticação**:
    *   JWT (JSON Web Token) com curto tempo de expiração (ex: 15min).
    *   Refresh Token para renovação de sessão.
2.  **Senhas**:
    *   Hashing robusto com `bcrypt`.
3.  **Proteção de Rotas**:
    *   Middleware para verificar JWT.
    *   RBAC (Role-Based Access Control) para restringir endpoints por perfil.
4.  **Infraestrutura**:
    *   Helmet para headers de segurança HTTP.
    *   Rate Limiting para evitar brute-force.
    *   CORS configurado para aceitar apenas o domínio do frontend.
    *   Validação de entrada com Zod ou Joi.

## 4. Documentação

*   **Swagger/OpenAPI**: Rota `/api-docs` expondo a documentação interativa das rotas.

## 5. Próximos Passos (Implementação)

1.  Inicializar projeto Node.js/TypeScript.
2.  Configurar Docker Compose para banco de dados PostgreSQL (local).
3.  Criar scripts de migração do banco.
4.  Implementar autenticação (Login/Register).
5.  Implementar CRUD de Tickets.
6.  Gerar documentação Swagger.
