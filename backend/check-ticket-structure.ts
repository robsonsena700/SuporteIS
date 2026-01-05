import { pool } from './src/config/database';
import dotenv from 'dotenv';

dotenv.config();

const checkTicketStructure = async () => {
  try {
    console.log('Checking table structure for tickets...');
    const res = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'tickets';
    `);
    console.log('Columns:', res.rows);
  } catch (err) {
    console.error('Error querying DB:', err);
  } finally {
    await pool.end();
  }
};

checkTicketStructure();
