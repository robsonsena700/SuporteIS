
import { pool } from '../config/database';

async function analyzeRatings() {
    console.log('📊 Analisando Avaliações...');
    try {
        const totalResolved = await pool.query("SELECT COUNT(*) FROM tickets WHERE status = 'Resolvido'");
        const ratedTickets = await pool.query("SELECT COUNT(*) FROM tickets WHERE status = 'Resolvido' AND rating IS NOT NULL");
        const unratedTickets = await pool.query("SELECT COUNT(*) FROM tickets WHERE status = 'Resolvido' AND rating IS NULL");
        
        const avgRating = await pool.query("SELECT AVG(rating) FROM tickets WHERE rating IS NOT NULL");
        
        const distribution = await pool.query(`
            SELECT rating, COUNT(*) as count 
            FROM tickets 
            WHERE rating IS NOT NULL 
            GROUP BY rating 
            ORDER BY rating DESC
        `);

        console.log(`\n📋 Resumo:`);
        console.log(`- Total de Chamados Resolvidos: ${totalResolved.rows[0].count}`);
        console.log(`- Com Avaliação: ${ratedTickets.rows[0].count}`);
        console.log(`- Sem Avaliação: ${unratedTickets.rows[0].count}`);
        console.log(`- Média Geral: ${parseFloat(avgRating.rows[0].avg).toFixed(2)}`);
        
        console.log(`\n⭐ Distribuição:`);
        distribution.rows.forEach(row => {
            console.log(`- ${row.rating} Estrelas: ${row.count}`);
        });

    } catch (e) {
        console.error(e);
    } finally {
        process.exit();
    }
}

analyzeRatings();
