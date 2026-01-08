
import { pool } from '../config/database';

async function checkDetailsSchema() {
    try {
        const res = await pool.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'ticket_details';
        `);
        console.table(res.rows);
    } catch (e) {
        console.error(e);
    } finally {
        process.exit();
    }
}

checkDetailsSchema();
