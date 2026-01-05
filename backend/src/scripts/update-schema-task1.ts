import { pool } from '../config/database';

const update = async () => {
  try {
    console.log('Starting schema update...');

    // Add assigned_at to tickets
    await pool.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tickets' AND column_name='assigned_at') THEN
          ALTER TABLE tickets ADD COLUMN assigned_at TIMESTAMP;
          RAISE NOTICE 'Added assigned_at to tickets';
        END IF;
      END $$;
    `);
    
    // Create audit_logs table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        action VARCHAR(50) NOT NULL,
        entity_id UUID NOT NULL,
        user_id UUID REFERENCES users(id),
        details TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Add chat_status to users
    await pool.query(`
        DO $$
        BEGIN
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='chat_status') THEN
                ALTER TABLE users ADD COLUMN chat_status VARCHAR(20) DEFAULT 'offline';
                RAISE NOTICE 'Added chat_status to users';
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
