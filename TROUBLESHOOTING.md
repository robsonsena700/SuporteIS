# Troubleshooting - Erro ao Atualizar Chamado

## Problema
Ao tentar encerrar (resolver) um chamado, o sistema retornava o erro genérico "Erro ao atualizar chamado" ou "Erro interno no servidor".

## Análise
A investigação revelou três causas principais:

1.  **Parâmetros Undefined**: O driver do banco de dados (node-postgres) não aceita valores `undefined` em consultas parametrizadas. Ao resolver um chamado, o campo `technician_id` era enviado como `undefined` (pois não estava sendo alterado), causando falha na query.
2.  **Conflito de Tipos (UUID vs Texto)**: A query de atualização utilizava a cláusula `WHERE id = $4 OR code = $4`. Quando o identificador passado (`$4`) era um código de chamado (ex: "CH-1234"), o PostgreSQL tentava compará-lo com a coluna `id` (do tipo UUID), gerando o erro `invalid input syntax for type uuid`.
3.  **Falta de Validação de Permissões**: Não havia bloqueio explícito para impedir que usuários com perfil "Cliente" alterassem o status ou prioridade dos chamados diretamente via API.

## Solução Implementada

### 1. Tratamento de Parâmetros
O código foi ajustado para garantir que valores opcionais sejam convertidos explicitamente para `null` antes de serem enviados ao banco:

```typescript
const params = [
    status ?? null, 
    priority ?? null, 
    technician_id ?? null, 
    id
];
```

### 2. Correção da Query SQL (Cast UUID)
A cláusula WHERE foi modificada para converter o ID para texto antes da comparação, permitindo que a mesma query funcione para UUIDs e códigos "CH-XXXX":

```sql
WHERE id::text = $4 OR code = $4
```

### 3. Controle de Acesso
Adicionada verificação no início da função `updateTicket`:

```typescript
if (req.user?.role === 'Cliente') {
    return res.status(403).json({ message: 'Permissão negada...' });
}
```

### 4. Logs Detalhados
Adicionados logs no console do servidor para rastrear os parâmetros recebidos e o sucesso da operação, facilitando diagnósticos futuros.

## Como Testar
1.  **Login como Técnico/Admin**: Acesse o sistema.
2.  **Abrir Chamado**: Selecione um chamado em aberto ou andamento.
3.  **Encerrar**: Clique no botão "Encerrar Chamado" (ícone de check).
4.  **Verificação**: O status deve mudar para "Resolvido" sem erros, e o modal deve atualizar automaticamente.
5.  **Logs**: Verifique o terminal do backend para ver a mensagem `[Ticket] Updating ticket ...`.
