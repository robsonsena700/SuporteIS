
import { pool } from '../config/database';

async function addUserLocationColumns() {
  console.log('🛠️ Adding location columns to users table...');
  try {
    const client = await pool.connect();
    
    // Add municipality column
    await client.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS municipality VARCHAR(255)');
    console.log('✅ Column municipality added successfully.');

    // Add uf column
    await client.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS uf VARCHAR(2)');
    console.log('✅ Column uf added successfully.');

    client.release();
    process.exit(0);
  } catch (error) {
    console.error('❌ Failed to add columns:', error);
    process.exit(1);
  }
}

addUserLocationColumns();
