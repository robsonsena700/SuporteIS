import fs from 'fs';
import path from 'path';
import { pool } from '../src/config/database';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const runMigration = async () => {
    try {
        const sqlPath = path.resolve(__dirname, '../audit_store.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');
        
        console.log('Running Audit Store Migration...');
        await pool.query(sql);
        console.log('Migration completed successfully.');
        process.exit(0);
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
};

runMigration();
