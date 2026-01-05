import fs from 'fs';
import path from 'path';
import { pool } from '../config/database';

const migrate = async () => {
  try {
    const schemaPath = path.join(__dirname, '../models/schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');

    console.log('Running migration...');
    await pool.query(schema);
    console.log('Migration completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
};

migrate();