import { pool } from '../config/database';
import bcrypt from 'bcryptjs';

async function createAdmin() {
  console.log('👑 Creating/Promoting Admin User...');
  const email = 'admin@suporteis.com';
  const password = 'adminpassword123';
  const name = 'Administrador do Sistema';
  const department = 'TI';
  const role = 'Administrador';
  const profile = 'Administrador';
  
  try {
    const client = await pool.connect();

    // Check if user exists
    const checkUser = await client.query('SELECT * FROM users WHERE email = $1', [email]);
    
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    if (checkUser.rows.length > 0) {
      // Update existing user to be Admin
      await client.query(
        `UPDATE users SET 
            name = $1, 
            password_hash = $2, 
            role = $3, 
            profile = $4,
            department = $5,
            status = 'Ativo'
         WHERE email = $6`,
        [name, hashedPassword, role, profile, department, email]
      );
      console.log(`✅ User ${email} updated to Admin.`);
    } else {
      // Create new Admin
      await client.query(
        `INSERT INTO users (name, email, password_hash, role, profile, department, status) 
         VALUES ($1, $2, $3, $4, $5, $6, 'Ativo')`,
        [name, email, hashedPassword, role, profile, department]
      );
      console.log(`✅ Admin user ${email} created.`);
    }

    console.log(`🔑 Credentials:\nEmail: ${email}\nPassword: ${password}`);
    
    client.release();
    process.exit(0);
  } catch (error) {
    console.error('❌ Failed to create admin:', error);
    process.exit(1);
  }
}

createAdmin();