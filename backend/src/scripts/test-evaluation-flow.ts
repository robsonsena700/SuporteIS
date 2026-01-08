
import { pool } from '../config/database';

enum TicketStatus {
  OPEN = 'Aberto',
  IN_ANALYSIS = 'Em Análise',
  IN_PROGRESS = 'Em Andamento',
  RESOLVED = 'Resolvido'
}

enum TicketPriority {
  MEDIUM = 'Média'
}

async function testEvaluationFlow() {
    console.log('🚀 Iniciando teste do fluxo de avaliação...');
    
    let client;
    let ticketId: string | null = null;
    
    try {
        // 1. Setup User (Cliente)
        const timestamp = Date.now();
        const email = `client_rating_${timestamp}@example.com`;
        
        const userRes = await pool.query(
            "INSERT INTO users (name, email, password_hash, role, profile, status) VALUES ($1, $2, '123', 'Cliente', 'Cliente', 'Ativo') RETURNING id, name, email",
            [`Test Client ${timestamp}`, email]
        );
        client = userRes.rows[0];
        console.log(`👤 Usuário de teste criado: ${client.name} (${client.email})`);

        // 2. Create Ticket
        const code = `AV-${timestamp}`;
        const insertRes = await pool.query(
            `INSERT INTO tickets (code, subject, equipment, description, priority, user_id, client_name, status, unit, municipality, uf)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
             RETURNING id`,
            [code, 'Teste Avaliação', 'Sistema', 'Teste', TicketPriority.MEDIUM, client.id, 'Cliente Teste', TicketStatus.RESOLVED, 'Matriz', 'SP', 'SP']
        );
        ticketId = insertRes.rows[0].id;
        console.log(`🎫 Ticket criado e resolvido: ${ticketId}`);

        // 3. Evaluate Ticket (Simulate API logic)
        const rating = 5;
        const feedback = 'Atendimento excelente!';
        
        console.log(`⭐ Enviando avaliação: Rating=${rating}, Feedback="${feedback}"`);

        const updateRes = await pool.query(
            `UPDATE tickets 
             SET rating = $1, feedback = $2 
             WHERE id = $3 
             RETURNING id, rating, feedback, status`,
            [rating, feedback, ticketId]
        );
        
        const updatedTicket = updateRes.rows[0];
        console.log('✅ Ticket atualizado:', updatedTicket);

        // 4. Verification
        if (updatedTicket.rating !== rating) {
            throw new Error(`Rating mismatch: expected ${rating}, got ${updatedTicket.rating}`);
        }
        if (updatedTicket.feedback !== feedback) {
            throw new Error(`Feedback mismatch: expected "${feedback}", got "${updatedTicket.feedback}"`);
        }

        console.log('🎉 Teste de Avaliação passou com sucesso!');

    } catch (err) {
        console.error('❌ Teste falhou:', err);
    } finally {
        // Cleanup
        if (ticketId) {
            await pool.query('DELETE FROM tickets WHERE id = $1', [ticketId]);
        }
        if (client) {
            await pool.query('DELETE FROM users WHERE id = $1', [client.id]);
        }
        await pool.end();
    }
}

testEvaluationFlow();
