import { pool } from '../src/config/database';

const runMigration = async () => {
    try {
        console.log('Adding message_data column to notifications table...');
        
        await pool.query(`
            ALTER TABLE notifications 
            ADD COLUMN IF NOT EXISTS message_data JSONB;
        `);

        console.log('Adding GIN index for efficient JSONB querying...');
        await pool.query(`
            CREATE INDEX IF NOT EXISTS idx_notifications_message_data 
            ON notifications USING gin (message_data);
        `);

        console.log('Migration completed successfully.');
        process.exit(0);
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
};

runMigration();
