import { pool } from '../config/database';

async function addLastAccess() {
  console.log('🛠️ Adding last_access column to users table...');
  try {
    const client = await pool.connect();
    await client.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS last_access TIMESTAMP');
    console.log('✅ Column last_access added successfully.');
    client.release();
    process.exit(0);
  } catch (error) {
    console.error('❌ Failed to add column:', error);
    process.exit(1);
  }
}

addLastAccess();
