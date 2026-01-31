import { pool } from '../src/config/database';
import jwt from 'jsonwebtoken';
import { AuditService } from '../src/services/AuditService';

const runTest = async () => {
    try {
        console.log('Iniciando teste de auditoria...');

        // 1. Criar Usuário Admin Fake
        const adminEmail = `audit_admin_${Date.now()}@test.com`;
        const adminRes = await pool.query(
            "INSERT INTO users (name, email, password_hash, role, profile, status) VALUES ('Audit Admin', $1, 'hash', 'Administrador', 'Administrador', 'Ativo') RETURNING id",
            [adminEmail]
        );
        const adminId = adminRes.rows[0].id;
        console.log('Admin criado:', adminId);

        // 2. Criar Usuário Cliente Fake
        const clientEmail = `audit_client_${Date.now()}@test.com`;
        const clientRes = await pool.query(
            "INSERT INTO users (name, email, password_hash, role, profile, status) VALUES ('Audit Client', $1, 'hash', 'Cliente', 'Cliente', 'Ativo') RETURNING id",
            [clientEmail]
        );
        const clientId = clientRes.rows[0].id;
        console.log('Cliente criado:', clientId);

        // 3. Simular criação de mensagem de ticket (via AuditService direto para testar a gravação)
        // No mundo real, o controller chama isso. Aqui vamos testar se o service grava.
        const ticketId = '00000000-0000-0000-0000-000000000000'; // Fake UUID
        console.log('Logando mensagem de ticket...');
        await AuditService.logMessage({
            source_table: 'ticket_messages',
            context_type: 'ticket',
            context_id: ticketId,
            sender_id: clientId,
            content: 'Teste de mensagem de auditoria no ticket',
            metadata: { test: true }
        });

        // 4. Simular mensagem de chat
        console.log('Logando mensagem de chat...');
        await AuditService.logMessage({
            source_table: 'direct_messages',
            context_type: 'direct',
            context_id: adminId,
            sender_id: clientId,
            recipient_id: adminId,
            content: 'Teste de mensagem de chat',
            metadata: { test: true }
        });

        // 5. Consultar logs como Admin
        console.log('Consultando logs...');
        const logs = await AuditService.searchLogs(adminId, { senderId: clientId });
        
        console.log(`Logs encontrados: ${logs.length}`);
        if (logs.length >= 2) {
            console.log('✅ Sucesso: Logs recuperados corretamente.');
            console.log('Exemplo:', logs[0].content, logs[0].source_table);
        } else {
            console.error('❌ Falha: Menos logs do que esperado.');
        }

        // 6. Verificar log de acesso
        const accessLogs = await pool.query('SELECT * FROM audit_access_logs WHERE user_id = $1 ORDER BY accessed_at DESC LIMIT 1', [adminId]);
        if (accessLogs.rows.length > 0) {
            console.log('✅ Sucesso: Log de acesso registrado.', accessLogs.rows[0].action);
        } else {
            console.error('❌ Falha: Log de acesso não encontrado.');
        }

        // Cleanup
        await pool.query('DELETE FROM users WHERE id IN ($1, $2)', [adminId, clientId]);
        // Logs ficam lá, pois são de auditoria (ou deletaríamos no teste se quiséssemos limpar tudo)

        process.exit(0);
    } catch (error) {
        console.error('Erro no teste:', error);
        process.exit(1);
    }
};

runTest();
