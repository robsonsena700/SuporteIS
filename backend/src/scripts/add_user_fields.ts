import { pool } from '../config/database';

async function migrate() {
  try {
    console.log('Running migration to add user fields...');
    
    await pool.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS company VARCHAR(255),
      ADD COLUMN IF NOT EXISTS phone VARCHAR(50),
      ADD COLUMN IF NOT EXISTS department VARCHAR(100);
    `);

    console.log('✅ Users table updated successfully.');
  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    pool.end();
  }
}

migrate();
