
import { pool } from '../config/database';

async function checkSchema() {
    try {
        const res = await pool.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'tickets';
        `);
        console.log('Columns in tickets table:');
        console.table(res.rows);
    } catch (e) {
        console.error(e);
    } finally {
        process.exit();
    }
}

checkSchema();
