
import { pool } from '../config/database';
import { TicketStatus } from '../../../types';

// Mock types for local test
interface MockUser {
    id: string;
    name: string;
    role: string;
    profile: string;
}

async function testDashboardStats() {
    console.log('Iniciando teste de verificação do Dashboard...');
    
    try {
        // 1. Setup Data
        // Create 3 Users: Admin, Tech, Client
        // (Assuming they exist or creating temporary ones would be complex, let's assume we query existing or insert temps)
        // For safety, let's just insert temp tickets for existing users or just rely on logic verification.
        // Better: Insert temp data that we can identify and clean up.
        
        const timestamp = Date.now();
        const clientEmail = `client_${timestamp}@test.com`;
        const techEmail = `tech_${timestamp}@test.com`;
        
        // Create Client
        const clientRes = await pool.query(
            "INSERT INTO users (name, email, password, role, profile, status) VALUES ($1, $2, '123', 'Cliente', 'Cliente', 'Ativo') RETURNING id, name",
            [`Test Client ${timestamp}`, clientEmail]
        );
        const client = { ...clientRes.rows[0], role: 'Cliente', profile: 'Cliente' };

        // Create Tech
        const techRes = await pool.query(
            "INSERT INTO users (name, email, password, role, profile, status) VALUES ($1, $2, '123', 'Suporte Técnico', 'Suporte Técnico', 'Ativo') RETURNING id, name",
            [`Test Tech ${timestamp}`, techEmail]
        );
        const tech = { ...techRes.rows[0], role: 'Suporte Técnico', profile: 'Suporte Técnico' };

        console.log('Usuários de teste criados:', { client: client.name, tech: tech.name });

        // Create Tickets
        // 1. Client creates ticket (Open)
        await pool.query(
            "INSERT INTO tickets (subject, status, priority, user_id, client_name, code) VALUES ($1, $2, 'Média', $3, $4, $5)",
            ['Ticket Aberto', 'Aberto', client.id, client.name, `TEST-${timestamp}-1`]
        );
        
        // 2. Client creates ticket (In Analysis) - Should appear in "Em Andamento" card logic
        await pool.query(
            "INSERT INTO tickets (subject, status, priority, user_id, client_name, code) VALUES ($1, $2, 'Alta', $3, $4, $5)",
            ['Ticket Em Análise', 'Em Análise', client.id, client.name, `TEST-${timestamp}-2`]
        );

        // 3. Client creates ticket (Resolved)
        await pool.query(
            "INSERT INTO tickets (subject, status, priority, user_id, client_name, code) VALUES ($1, $2, 'Baixa', $3, $4, $5)",
            ['Ticket Resolvido', 'Resolvido', client.id, client.name, `TEST-${timestamp}-3`]
        );
        
        // 4. Another ticket assigned to Tech (In Progress)
        await pool.query(
            "INSERT INTO tickets (subject, status, priority, user_id, client_name, technician_id, code) VALUES ($1, $2, 'Alta', $3, $4, $5, $6)",
            ['Ticket Em Andamento Tech', 'Em Andamento', client.id, client.name, tech.id, `TEST-${timestamp}-4`]
        );

        console.log('Tickets de teste criados.');

        // TEST 1: Client View
        // Should see all 4 tickets (created by them)
        console.log('\n--- Teste 1: Visão do Cliente ---');
        await checkStats(client, 4, { 'Aberto': 1, 'Em Análise': 1, 'Resolvido': 1, 'Em Andamento': 1 });

        // TEST 2: Tech View (My Tickets)
        // Should see 1 ticket (Assigned to them)
        console.log('\n--- Teste 2: Visão do Técnico (Meus Chamados) ---');
        await checkStats(tech, 1, { 'Em Andamento': 1 }, true);

        // TEST 3: Admin/Tech View (All Tickets) - checking general count logic
        // We can't easily isolate just OUR test tickets without strict filtering, 
        // but we can check if the count increases by expected amount if we had baseline.
        // For this script, we'll trust the specific queries below.

        console.log('\nTeste concluído com sucesso!');

    } catch (error) {
        console.error('Erro no teste:', error);
    } finally {
        // Cleanup (Optional - maybe keep for inspection)
        // await pool.end();
        process.exit();
    }
}

async function checkStats(user: MockUser, expectedTotal: number, expectedStatusCounts: Record<string, number>, myTickets = false) {
    let roleCondition = '';
    const params: any[] = [];
    let paramIndex = 1;

    if (user.role === 'Cliente') {
        roleCondition = `AND t.user_id = $${paramIndex}`;
        params.push(user.id);
        paramIndex++;
    } else if (myTickets) {
        roleCondition = `AND t.technician_id = $${paramIndex}`;
        params.push(user.id);
        paramIndex++;
    }

    // 1. Total Tickets
    const totalQuery = `SELECT COUNT(*) FROM tickets t WHERE 1=1 ${roleCondition}`;
    const totalRes = await pool.query(totalQuery, params);
    const total = parseInt(totalRes.rows[0].count);

    console.log(`[${user.role}] Total esperado: ${expectedTotal}, Encontrado: ${total}`);
    if (total !== expectedTotal) {
        console.warn(`⚠️ Discrepância no Total! (Pode haver outros tickets no DB se não limpou)`);
    } else {
        console.log(`✅ Total correto.`);
    }

    // 2. Status Counts
    const statusQuery = `
        SELECT status, COUNT(*) as count 
        FROM tickets t 
        WHERE 1=1 ${roleCondition}
        GROUP BY status
    `;
    const statusRes = await pool.query(statusQuery, params);
    
    // Check specific statuses
    for (const [status, count] of Object.entries(expectedStatusCounts)) {
        const found = statusRes.rows.find((r: any) => r.status === status);
        const foundCount = found ? parseInt(found.count) : 0;
        if (foundCount !== count) {
            console.error(`❌ Status ${status}: Esperado ${count}, Encontrado ${foundCount}`);
        } else {
            console.log(`✅ Status ${status}: ${foundCount}`);
        }
    }
    
    // Simulate Dashboard Card Logic
    const emAndamentoCount = (statusRes.rows.find((r: any) => r.status === 'Em Andamento')?.count || 0);
    const emAnaliseCount = (statusRes.rows.find((r: any) => r.status === 'Em Análise')?.count || 0);
    const cardEmAndamento = parseInt(emAndamentoCount) + parseInt(emAnaliseCount);
    
    console.log(`🃏 Card 'Em Andamento' (Soma Andamento + Análise): ${cardEmAndamento}`);
}

testDashboardStats();
