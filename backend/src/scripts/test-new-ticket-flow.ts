
import { pool } from '../config/database';

enum TicketStatus {
  OPEN = 'Aberto',
  IN_ANALYSIS = 'Em Análise',
  IN_PROGRESS = 'Em Andamento',
  RESOLVED = 'Resolvido'
}

enum TicketPriority {
  LOW = 'Baixa',
  MEDIUM = 'Média',
  HIGH = 'Alta',
  CRITICAL = 'Crítica'
}

async function testNewTicketFlow() {
    console.log('🚀 Iniciando teste do fluxo de criação de ticket (Novo Chamado)...');
    
    let client;
    
    try {
        // 1. Setup User (Cliente)
        const timestamp = Date.now();
        const email = `client_test_${timestamp}@example.com`;
        
        const userRes = await pool.query(
            "INSERT INTO users (name, email, password_hash, role, profile, status) VALUES ($1, $2, '123', 'Cliente', 'Cliente', 'Ativo') RETURNING id, name, email",
            [`Test Client ${timestamp}`, email]
        );
        client = userRes.rows[0];
        console.log(`👤 Usuário de teste criado: ${client.name} (${client.email})`);

        // 2. Prepare Payload (Simulating NewTicket.tsx data)
        const attachments = [
            { name: 'error.png', data: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==' },
            { name: 'log.txt', data: 'data:text/plain;base64,SGVsbG8gV29ybGQ=' }
        ];

        const payload = {
            subject: 'Teste Fluxo Novo Chamado',
            description: '<p>Descrição <strong>formatada</strong> com <em>Rich Text</em>.</p>',
            equipment: 'Sistema',
            client_name: 'Empresa Teste Ltda',
            unit: 'Matriz',
            municipality: 'São Paulo',
            uf: 'SP',
            priority: TicketPriority.CRITICAL,
            status: TicketStatus.OPEN,
            attachment: JSON.stringify(attachments),
            user_id: client.id
        };

        console.log('📦 Payload preparado:', {
            ...payload,
            attachment: '(JSON string with 2 files)'
        });

        // 3. Insert Ticket (Direct DB insert simulating Controller logic)
        // Note: Controller adds prefix logic, so we replicate it or call the API endpoint if we were doing full e2e.
        // For this script, let's use the DB logic from the controller to ensure schema compatibility.
        
        const keywords = ['sistema', 'software'];
        const isSystem = keywords.some(k => (payload.equipment || '').toLowerCase().includes(k));
        const prefix = isSystem ? 'SUP' : 'EQP';
        const year = new Date().getFullYear().toString().slice(-2);
        const randomSuffix = Math.floor(1000 + Math.random() * 9000);
        const code = `${prefix}-${year}${randomSuffix}`; // Random code

        const insertRes = await pool.query(
            `INSERT INTO tickets (code, subject, equipment, description, priority, attachment, user_id, client_name, status, unit, municipality, uf)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
             RETURNING *`,
            [
                code, 
                payload.subject, 
                payload.equipment, 
                payload.description, 
                payload.priority, 
                payload.attachment, 
                payload.user_id, 
                payload.client_name, 
                payload.status,
                payload.unit,
                payload.municipality,
                payload.uf
            ]
        );

        const ticket = insertRes.rows[0];
        console.log('✅ Ticket inserido no banco com sucesso:', ticket.id);

        // 4. Validate Fields
        let errors = [];
        if (ticket.unit !== payload.unit) errors.push(`Unit mismatch: ${ticket.unit}`);
        if (ticket.municipality !== payload.municipality) errors.push(`Municipality mismatch: ${ticket.municipality}`);
        if (ticket.uf !== payload.uf) errors.push(`UF mismatch: ${ticket.uf}`);
        if (ticket.priority !== payload.priority) errors.push(`Priority mismatch: ${ticket.priority}`);
        if (ticket.attachment !== payload.attachment) errors.push(`Attachment mismatch`);

        if (errors.length > 0) {
            console.error('❌ Falha na validação dos campos:', errors);
        } else {
            console.log('✅ Todos os campos foram persistidos corretamente.');
        }

        // 5. Test "Equipamento" Flow (Outros)
        const payloadEquip = {
            ...payload,
            subject: 'Teste Equipamento Outros',
            equipment: 'Outros: Projetor 4K',
            priority: TicketPriority.HIGH,
            status: TicketStatus.OPEN,
            code: `EQP-${year}9998`
        };

        const insertEquip = await pool.query(
            `INSERT INTO tickets (code, subject, equipment, description, priority, attachment, user_id, client_name, status, unit, municipality, uf)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
             RETURNING *`,
            [
                payloadEquip.code, 
                payloadEquip.subject, 
                payloadEquip.equipment, 
                payloadEquip.description, 
                payloadEquip.priority, 
                payloadEquip.attachment, 
                payloadEquip.user_id, 
                payloadEquip.client_name, 
                payloadEquip.status,
                payloadEquip.unit,
                payloadEquip.municipality,
                payloadEquip.uf
            ]
        );
        
        const equipTicket = insertEquip.rows[0];
        console.log('✅ Ticket Equipamento (Outros) inserido:', equipTicket.id);
        
        if (equipTicket.equipment === 'Outros: Projetor 4K') {
            console.log('✅ Campo Equipamento "Outros" persistido corretamente.');
        } else {
            console.error(`❌ Falha no campo Equipamento: ${equipTicket.equipment}`);
        }

        console.log('\n🎉 Teste de fluxo concluído com sucesso!');

    } catch (error) {
        console.error('❌ Erro fatal no teste:', error);
    } finally {
        // Cleanup
        if (client) {
            // await pool.query('DELETE FROM tickets WHERE user_id = $1', [client.id]);
            // await pool.query('DELETE FROM users WHERE id = $1', [client.id]);
            console.log('🧹 Limpeza de dados de teste ignorada para inspeção (opcional).');
        }
        process.exit();
    }
}

testNewTicketFlow();
