
import { pool } from '../config/database';

const getNextCode = async (prefix: string) => {
    const year = new Date().getFullYear().toString().slice(-2);
    const pattern = `${prefix}-${year}%`;
    
    const res = await pool.query(
        `SELECT code FROM tickets WHERE code LIKE $1 ORDER BY created_at DESC LIMIT 1`,
        [pattern]
    );
    
    let sequence = 1;
    if (res.rows.length > 0) {
        const lastCode = res.rows[0].code;
        const parts = lastCode.split('-');
        if (parts.length === 2) {
            const numPart = parts[1];
            if (numPart.startsWith(year)) {
                const seqStr = numPart.substring(2);
                const seq = parseInt(seqStr, 10);
                if (!isNaN(seq)) sequence = seq + 1;
            }
        }
    }
    
    return `${prefix}-${year}${String(sequence).padStart(4, '0')}`;
};

async function testDirectCreate() {
    const userId = '11111111-1111-1111-1111-111111111111'; // ID fictício ou real se soubermos um
    // Precisamos de um ID de usuário válido se houver FK constraint.
    // Vou tentar buscar um usuário primeiro.
    
    try {
        const userRes = await pool.query('SELECT id FROM users LIMIT 1');
        if (userRes.rows.length === 0) {
            console.error("Nenhum usuário encontrado no banco para vincular ao ticket.");
            return;
        }
        const validUserId = userRes.rows[0].id;
        console.log("Usando User ID:", validUserId);

        const payload = {
            subject: "Teste Direct Create " + Date.now(),
            description: "Descrição direta no banco",
            equipment: "PC Teste",
            client_name: "Cliente Direto",
            unit: "Matriz",
            municipality: "São Paulo",
            uf: "SP",
            priority: "medium",
            status: "Aberto",
            attachment: null
        };

        const prefix = 'SUP';
        const code = await getNextCode(prefix);
        console.log("Código gerado:", code);

        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            
            const result = await client.query(
              `INSERT INTO tickets (code, subject, equipment, description, priority, attachment, user_id, client_name, status, unit, municipality, uf)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
               RETURNING *`,
              [code, payload.subject, payload.equipment, payload.description, payload.priority, payload.attachment, validUserId, payload.client_name, payload.status, payload.unit, payload.municipality, payload.uf]
            );
            
            console.log("Ticket inserido com sucesso:", result.rows[0]);
            
            await client.query('ROLLBACK'); // Rollback para não sujar o banco
            console.log("Rollback realizado com sucesso (teste apenas).");
        } catch (e) {
            await client.query('ROLLBACK');
            console.error("Erro no INSERT:", e);
        } finally {
            client.release();
        }

    } catch (err) {
        console.error("Erro geral:", err);
    } finally {
        await pool.end();
    }
}

testDirectCreate();
