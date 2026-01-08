
import { pool } from '../config/database';

async function checkLatestTickets() {
    try {
        const res = await pool.query('SELECT id, code, created_at FROM tickets ORDER BY created_at DESC LIMIT 20');
        console.log('Latest Tickets:');
        console.table(res.rows);
    } catch (err) {
        console.error('Error:', err);
    } finally {
        await pool.end();
    }
}

checkLatestTickets();
