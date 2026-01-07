
import { pool } from './src/config/database';

const createHistoryTable = async () => {
  try {
    console.log('Creating ticket_history table...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS ticket_history (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
        user_id UUID REFERENCES users(id),
        change_type VARCHAR(50) NOT NULL,
        old_value TEXT,
        new_value TEXT,
        details TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    // Create index for performance
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_ticket_history_ticket_id ON ticket_history(ticket_id);`);
    
    console.log('ticket_history table created successfully.');
  } catch (err) {
    console.error('Error creating table:', err);
  } finally {
    await pool.end();
  }
};

createHistoryTable();
