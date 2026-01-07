import { pool } from '../config/database';

const update = async () => {
  try {
    console.log('Starting schema update for message attachments...');

    // Add attachment to messages
    await pool.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='messages' AND column_name='attachment') THEN
          ALTER TABLE messages ADD COLUMN attachment TEXT;
          RAISE NOTICE 'Added attachment to messages';
        END IF;
      END $$;
    `);

    console.log('Schema updated successfully');
    process.exit(0);
  } catch (error) {
    console.error('Schema update failed:', error);
    process.exit(1);
  }
};

update();
