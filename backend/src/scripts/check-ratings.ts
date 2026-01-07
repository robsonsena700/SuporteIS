
import { pool } from '../config/database';

async function checkRatings() {
  try {
    const res = await pool.query(`
      SELECT id, rating, status 
      FROM tickets 
      WHERE status = 'Resolvido'
      ORDER BY created_at DESC
      LIMIT 10
    `);
    console.log('Resolved Tickets Ratings:', res.rows);
  } catch (error) {
    console.error('Error checking ratings:', error);
  } finally {
    await pool.end();
  }
}

checkRatings();
