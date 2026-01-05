
import { pool } from '../config/database';

async function addAttachmentColumn() {
  console.log('🛠️ Adding attachment column to tickets table...');
  try {
    const client = await pool.connect();
    await client.query('ALTER TABLE tickets ADD COLUMN IF NOT EXISTS attachment TEXT');
    console.log('✅ Column attachment added successfully.');
    client.release();
    process.exit(0);
  } catch (error) {
    console.error('❌ Failed to add column:', error);
    process.exit(1);
  }
}

addAttachmentColumn();
