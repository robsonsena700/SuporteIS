
import { pool } from '../config/database';

async function addAssignedAtColumn() {
  console.log('🛠️ Adding assigned_at column to tickets table...');
  try {
    const client = await pool.connect();
    await client.query('ALTER TABLE tickets ADD COLUMN IF NOT EXISTS assigned_at TIMESTAMP');
    console.log('✅ Column assigned_at added successfully.');
    client.release();
    process.exit(0);
  } catch (error) {
    console.error('❌ Failed to add column:', error);
    process.exit(1);
  }
}

addAssignedAtColumn();
