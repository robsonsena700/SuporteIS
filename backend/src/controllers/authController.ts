import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { pool } from '../config/database';
import { AuthRequest } from '../middleware/authMiddleware';

export const register = async (req: Request, res: Response) => {
  const { name, email, password, role, profile, company, phone, department, uf, municipality } = req.body;

  try {
    // Check if user exists
    const userCheck = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (userCheck.rows.length > 0) {
      return res.status(400).json({ message: 'Email já cadastrado' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create user
    const newUser = await pool.query(
      'INSERT INTO users (name, email, password_hash, role, profile, company, phone, department, uf, municipality) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id, name, email, role, profile, avatar, status, company, phone, department, uf, municipality',
      [name, email, hashedPassword, role || 'Técnico', profile || 'Suporte Técnico', company, phone, department, uf, municipality]
    );

    res.status(201).json(newUser.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erro ao registrar usuário' });
  }
};

export const login = async (req: Request, res: Response) => {
  const { email, password } = req.body;

  try {
    console.log(`[Auth] Tentativa de login para: ${email}`);

    if (!email || !password) {
        return res.status(400).json({ message: 'Email e senha são obrigatórios.' });
    }

    const userResult = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    
    if (userResult.rows.length === 0) {
      console.warn(`[Auth] Usuário não encontrado: ${email}`);
      return res.status(404).json({ message: 'Usuário não encontrado. Verifique o e-mail digitado.' });
    }

    const user = userResult.rows[0];
    const validPassword = await bcrypt.compare(password, user.password_hash);

    if (!validPassword) {
      console.warn(`[Auth] Senha incorreta para usuário: ${email}`);
      return res.status(401).json({ message: 'Senha incorreta. Tente novamente.' });
    }

    // Update last_access
    await pool.query('UPDATE users SET last_access = NOW() WHERE id = $1', [user.id]);
    
    // Fetch updated user with last_access (or use current time)
    user.last_access = new Date().toISOString();

    // Create Token
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, profile: user.profile },
      process.env.JWT_SECRET || 'secret',
      { expiresIn: '8h' } // Extended session
    );

    console.log(`[Auth] Login bem-sucedido para: ${email} (${user.role})`);

    // Remove password from response
    delete user.password_hash;

    res.json({ token, user });
  } catch (error) {
    console.error('[Auth] Erro fatal no login:', error);
    res.status(500).json({ message: 'Erro interno no servidor ao realizar login.' });
  }
};

export const updateProfile = async (req: AuthRequest, res: Response) => {
    const userId = req.user?.id;
    const { name, phone, department, avatar } = req.body;
  
    try {
      const updatedUser = await pool.query(
        `UPDATE users 
         SET name = COALESCE($1, name), 
             phone = COALESCE($2, phone), 
             department = COALESCE($3, department), 
             avatar = COALESCE($4, avatar),
             updated_at = NOW() 
         WHERE id = $5 
         RETURNING id, name, email, role, profile, avatar, status, company, phone, department`,
        [name, phone, department, avatar, userId]
      );
  
      if (updatedUser.rows.length === 0) {
        return res.status(404).json({ message: 'Usuário não encontrado' });
      }
  
      res.json(updatedUser.rows[0]);
    } catch (error) {
      console.error('Update Profile Error:', error); // Better logging
      res.status(500).json({ message: 'Erro ao atualizar perfil', details: (error as any).message });
    }
  };
