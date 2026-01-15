import { Request, Response } from 'express';
import { pool } from '../config/database';
import bcrypt from 'bcryptjs';
import { AuthRequest } from '../middleware/authMiddleware';

export const getAllUsers = async (req: Request, res: Response) => {
  try {
    // Determine online status based on last_active_at (e.g., active in last 2 minutes)
    // We can compute this dynamically or return the raw timestamp
    const result = await pool.query(`
      SELECT 
        id, name, email, role, profile, status, last_access, avatar, department, company, phone, uf, municipality, created_at, chat_status, last_active_at,
        CASE 
          WHEN last_active_at > NOW() - INTERVAL '2 minutes' THEN 'online'
          ELSE 'offline'
        END as calculated_status
      FROM users 
      ORDER BY created_at DESC
    `);
    
    // Merge calculated status if chat_status is not manually set to 'busy' or 'offline' by user preference
    // Or prioritize real-time activity?
    // Requirement: "Exibir verdadeiramente se os usuários estão realmente on-line"
    // Let's return the calculated one as a separate field or override if needed.
    // For now, let's just return all data and let frontend decide logic or use calculated_status
    
    res.json(result.rows);
  } catch (error) {
    console.error('Get Users Error:', error);
    res.status(500).json({ message: 'Erro ao buscar usuários' });
  }
};

export const getUserById = async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const result = await pool.query(`
      SELECT 
        id, name, email, role, profile, status, last_access, avatar, department, company, phone, uf, municipality, created_at, chat_status, last_active_at,
        CASE 
          WHEN last_active_at > NOW() - INTERVAL '2 minutes' THEN 'online'
          ELSE 'offline'
        END as calculated_status
      FROM users 
      WHERE id = $1
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Usuário não encontrado' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get User By ID Error:', error);
    res.status(500).json({ message: 'Erro ao buscar usuário' });
  }
};

export const pingUser = async (req: AuthRequest, res: Response) => {
    try {
        if (!req.user) return res.status(401).send();
        
        await pool.query('UPDATE users SET last_active_at = NOW() WHERE id = $1', [req.user.id]);
        res.status(200).send();
    } catch (error) {
        console.error('Ping Error:', error);
        res.status(500).send();
    }
};

export const updateUser = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { name, email, role, profile, status, department, company, phone } = req.body;

  try {
    const result = await pool.query(
      `UPDATE users 
       SET name = COALESCE($1, name), 
           email = COALESCE($2, email),
           role = COALESCE($3, role),
           profile = COALESCE($4, profile),
           status = COALESCE($5, status),
           department = COALESCE($6, department),
           company = COALESCE($7, company),
           phone = COALESCE($8, phone),
           updated_at = NOW()
       WHERE id = $9
       RETURNING id, name, email, role, profile, status, department, company, phone`,
      [name, email, role, profile, status, department, company, phone, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Usuário não encontrado' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update User Error:', error);
    res.status(500).json({ message: 'Erro ao atualizar usuário' });
  }
};

export const updateUserPassword = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { password } = req.body;

  if (!password || password.length < 6) {
    return res.status(400).json({ message: 'A senha deve ter pelo menos 6 caracteres' });
  }

  try {
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const result = await pool.query(
      'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2 RETURNING id',
      [hashedPassword, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Usuário não encontrado' });
    }

    res.json({ message: 'Senha atualizada com sucesso' });
  } catch (error) {
    console.error('Update Password Error:', error);
    res.status(500).json({ message: 'Erro ao atualizar senha' });
  }
};

export const deleteUser = async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    // Restriction 2: Prevent deletion if user has created tickets
    const ticketCheck = await pool.query('SELECT COUNT(*) FROM tickets WHERE user_id = $1', [id]);
    const ticketCount = parseInt(ticketCheck.rows[0].count);

    if (ticketCount > 0) {
        return res.status(400).json({ message: 'Não é possível excluir o usuário pois ele possui chamados criados.' });
    }

    // Ideally we should check for dependencies (tickets, messages) or use CASCADE
    // For now, assuming CASCADE or manual cleanup isn't strictly enforced by code logic but DB constraints
    await pool.query('DELETE FROM users WHERE id = $1', [id]);
    res.json({ message: 'Usuário excluído com sucesso' });
  } catch (error) {
    console.error('Delete User Error:', error);
    res.status(500).json({ message: 'Erro ao excluir usuário' });
  }
};

export const updateUserStatus = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { chat_status } = req.body; // 'online', 'busy', 'offline'

    try {
        await pool.query('UPDATE users SET chat_status = $1 WHERE id = $2', [chat_status, id]);
        res.json({ message: 'Status atualizado com sucesso' });
    } catch (error) {
        console.error('Update Status Error:', error);
        res.status(500).json({ message: 'Erro ao atualizar status' });
    }
};

export const createUser = async (req: Request, res: Response) => {
    const { name, email, password, role, profile, department, company, phone } = req.body;

    try {
        const userCheck = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        if (userCheck.rows.length > 0) {
            return res.status(400).json({ message: 'Email já cadastrado' });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const newUser = await pool.query(
            'INSERT INTO users (name, email, password_hash, role, profile, department, company, phone, status) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id, name, email, role, profile, status',
            [name, email, hashedPassword, role || 'Técnico', profile || 'Suporte Técnico', department, company, phone, 'Ativo']
        );

        res.status(201).json(newUser.rows[0]);
    } catch (error) {
        console.error('Create User Error:', error);
        res.status(500).json({ message: 'Erro ao criar usuário' });
    }
};
