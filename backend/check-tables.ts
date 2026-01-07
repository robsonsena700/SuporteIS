
import { pool } from './src/config/database';

const checkTables = async () => {
  try {
    const res = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    console.log('Tables:', res.rows.map(r => r.table_name));
    
    // Check columns of audit_logs if it exists
    const historyTable = res.rows.find(r => r.table_name === 'audit_logs');
    if (historyTable) {
        const rows = await pool.query(`SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 5`);
        console.log('Audit Logs Data:', rows.rows);
    }
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await pool.end();
  }
};

checkTables();
