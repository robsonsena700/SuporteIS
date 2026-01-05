import { pool } from '../config/database';

async function clearTickets() {
  console.log('🧹 Clearing all tickets...');
  try {
    const client = await pool.connect();
    
    // Disable triggers/constraints if necessary, but standard delete should work if order is correct
    // Delete messages first due to FK constraint
    await client.query('DELETE FROM messages');
    await client.query('DELETE FROM tickets');
    
    console.log('✅ Tickets and messages cleared successfully.');
    client.release();
    process.exit(0);
  } catch (error) {
    console.error('❌ Failed to clear tickets:', error);
    process.exit(1);
  }
}

clearTickets();