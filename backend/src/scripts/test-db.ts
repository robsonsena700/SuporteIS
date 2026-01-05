import { Client } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

console.log('Testing connection with:');
console.log(`User: ${process.env.DB_USER}`);
console.log(`Host: ${process.env.DB_HOST}`);
console.log(`Port: ${process.env.DB_PORT}`);
console.log(`Database: ${process.env.DB_NAME}`);
console.log(`Password length: ${process.env.DB_PASSWORD?.length}`);
console.log(`Password first char: ${process.env.DB_PASSWORD?.[0]}`);
console.log(`Password last char: ${process.env.DB_PASSWORD?.[process.env.DB_PASSWORD!.length - 1]}`);

const client = new Client({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: parseInt(process.env.DB_PORT || '5432'),
});

async function test() {
  try {
    await client.connect();
    console.log('✅ Connection successful!');
    await client.end();
  } catch (err: any) {
    console.error('❌ Connection failed:', err.message);
  }
}

test();