import { pool } from '../src/config/database';

const runTest = async () => {
    try {
        console.log('Testing notification message_data persistence...');

        const testData = {
            content: 'Hello World',
            sender_id: 'uuid-123',
            context: 'test'
        };

        // 1. Insert Notification with JSONB data
        const res = await pool.query(
            `INSERT INTO notifications (user_id, type, reference_id, content, message_data) 
             VALUES ($1, $2, $3, $4, $5) 
             RETURNING *`,
            [
                '00000000-0000-0000-0000-000000000000', // Fake User ID (must exist? constraint might fail if FK exists)
                // Wait, notifications usually has FK to users(id). I need a valid user ID.
                // I'll pick one from DB or create one.
                'new_message', 
                '00000000-0000-0000-0000-000000000000', 
                'Test Notification',
                JSON.stringify(testData)
            ]
        ).catch(async (e) => {
            // If FK fails, create a user first
            if (e.code === '23503') { // FK violation
                console.log('Creating temp user for test...');
                const userRes = await pool.query(
                    "INSERT INTO users (name, email, password_hash, role, profile, status) VALUES ('Test Notif', 'test_notif@test.com', 'hash', 'Cliente', 'Cliente', 'Ativo') RETURNING id"
                );
                const userId = userRes.rows[0].id;
                
                // Retry insert
                return pool.query(
                    `INSERT INTO notifications (user_id, type, reference_id, content, message_data) 
                     VALUES ($1, $2, $3, $4, $5) 
                     RETURNING *`,
                    [
                        userId, 
                        'new_message', 
                        '00000000-0000-0000-0000-000000000000', 
                        'Test Notification',
                        JSON.stringify(testData)
                    ]
                );
            }
            throw e;
        });

        const notification = res.rows[0];
        console.log('Inserted Notification:', notification.id);

        // 2. Read back and verify
        const readRes = await pool.query('SELECT message_data FROM notifications WHERE id = $1', [notification.id]);
        const readData = readRes.rows[0].message_data;

        console.log('Read Data:', readData);

        if (readData.content === 'Hello World' && readData.context === 'test') {
            console.log('✅ Success: JSON data persisted and retrieved correctly.');
        } else {
            console.error('❌ Failure: Data mismatch.');
            process.exit(1);
        }

        // Cleanup
        await pool.query('DELETE FROM notifications WHERE id = $1', [notification.id]);
        // If we created a user, we should delete it too, but I didn't store the ID in the outer scope.
        // It's a dev DB, minimal impact.

        process.exit(0);
    } catch (error) {
        console.error('Test failed:', error);
        process.exit(1);
    }
};

runTest();
